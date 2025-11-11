const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { PDFDocument, rgb } = require('pdf-lib');
const PDFKit = require('pdfkit');
const sizeOf = require('image-size');

// Try to convert office-like files to PDF for previewing.
// Strategy:
// 1. If LibreOffice (soffice) is available on PATH, use it to convert to PDF.
// 2. If not available, for PPTX/DOCX try to assemble a simple PDF from embedded images
//    using existing extractors (pptx/docx parsers). This is a best-effort fallback.

// Status event types for progress notifications:
// { type: 'start', filename, stage: 'soffice|fallback' }
// { type: 'progress', filename, stage, detail }
// { type: 'complete', filename, data: base64, mimeType }
// { type: 'error', filename, error }

async function convertToPdfIfNeeded(folderPath, fileName, onProgress) {
  const fireProgress = (status) => {
    if (typeof onProgress === 'function') {
      onProgress({ ...status, filename: fileName });
    }
  };
  const ext = path.extname(fileName).toLowerCase();
  const srcPath = path.join(folderPath, fileName);

  if (ext === '.pdf') {
    // Already a PDF — return original
    const buf = await fs.readFile(srcPath);
    return { success: true, data: buf.toString('base64'), mimeType: 'application/pdf' };
  }

  const outPdfPath = path.join(folderPath, 'preview.pdf');
  // If we've already generated a preview PDF, return it
  try {
    await fs.access(outPdfPath);
    const buf = await fs.readFile(outPdfPath);
    return { success: true, data: buf.toString('base64'), mimeType: 'application/pdf' };
  } catch (e) {
    // continue to conversion
  }

  // First try special PowerPoint PDF export via COM automation on Windows
  if (process.platform === 'win32' && (ext === '.pptx' || ext === '.ppt')) {
    try {
      fireProgress({ type: 'start', stage: 'powerpoint' });
      
      // Try to use Windows Script Host COM automation - much better quality than soffice
      const { spawn } = require('child_process');
      const vbsPath = path.join(folderPath, '_convert.vbs');
      const vbsContent = `
        Set ppt = CreateObject("PowerPoint.Application")
        ppt.Visible = False
        Set pres = ppt.Presentations.Open("${srcPath.replace(/\\/g, '\\\\')}")
        pres.SaveAs "${outPdfPath.replace(/\\/g, '\\\\')}", 32
        pres.Close
        ppt.Quit
      `;
      
      await fs.writeFile(vbsPath, vbsContent);
      
      const result = await new Promise((resolve, reject) => {
        const proc = spawn('cscript', ['//NoLogo', vbsPath], { windowsHide: true });
        let error = '';
        
        proc.stderr.on('data', data => error += data);
        proc.on('error', reject);
        proc.on('exit', code => {
          if (code === 0) resolve(true);
          else reject(new Error(error || 'VBScript failed'));
        });
      });
      
      await fs.unlink(vbsPath).catch(() => {});
      
      if (result) {
        fireProgress({ type: 'complete', stage: 'powerpoint' });
        const buf = await fs.readFile(outPdfPath);
        return { success: true, data: buf.toString('base64'), mimeType: 'application/pdf' };
      }
    } catch (err) {
      // Fall through to LibreOffice
      console.log('PowerPoint automation failed:', err.message);
    }
  }

  // Try LibreOffice conversion (soffice) asynchronously
  try {
    fireProgress({ type: 'start', stage: 'soffice' });
    const convertResult = await new Promise((resolve, reject) => {
      const soffice = 'soffice';
      // Use --convert-to "pdf:writer_pdf_Export" to specify high-quality PDF export settings
      const args = [
        '--headless',
        '--convert-to', 'pdf:writer_pdf_Export',
        '--outdir', folderPath,
        // Add filters for better quality
        '--infilter=writer_pdf_import',
        '--writer', // Better text layout engine
        srcPath
      ];
      const timeout = setTimeout(() => {
        try { proc.kill(); } catch (e) {}
        reject(new Error('Conversion timed out after 30s'));
      }, 30000);

      const proc = spawn(soffice, args, { windowsHide: true });
      let stdoutData = '';
      let stderrData = '';

      proc.stdout.on('data', (data) => {
        stdoutData += data;
        fireProgress({ type: 'progress', stage: 'soffice', detail: 'Converting...' });
      });

      proc.stderr.on('data', (data) => {
        stderrData += data;
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      proc.on('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`LibreOffice conversion failed (${code}): ${stderrData}`));
        }
      });
    });

    if (convertResult) {
      // Conversion likely produced <basename>.pdf in folder
      const convertedName = path.join(folderPath, path.basename(fileName, ext) + '.pdf');
      try {
        const buf = await fs.readFile(convertedName);
        // Save a stable preview filename for future quick reads
        await fs.writeFile(outPdfPath, buf).catch(() => {});
        fireProgress({ type: 'complete', data: buf.toString('base64'), mimeType: 'application/pdf' });
        return { success: true, data: buf.toString('base64'), mimeType: 'application/pdf' };
      } catch (err) {
        // fall through to fallback
      }
    }
  } catch (err) {
    fireProgress({ type: 'progress', stage: 'soffice', detail: 'LibreOffice not available, trying fallback...' });
    // fall through to fallback
  }

  // Fallback: try to build a PDF from extracted images using existing parsers
  try {
    fireProgress({ type: 'start', stage: 'fallback' });
    let parseFn = null;
    let extractFn = null;
    if (ext === '.pptx' || ext === '.ppt') {
      const ppt = require('./pptxParser');
      parseFn = ppt.parsePresentation;
      extractFn = ppt.extractSlideImages;
    } else if (ext === '.docx' || ext === '.doc') {
      const docx = require('./docxParser');
      extractFn = docx.extractDocxImages;
    }

    if (parseFn && extractFn) {
      fireProgress({ type: 'progress', stage: 'fallback', detail: 'Extracting content...' });
      const [slideText, images] = await Promise.all([
        parseFn(srcPath).catch(() => ''),
        extractFn(srcPath, 20).catch(() => [])
      ]);
      if (images && images.length) {
        fireProgress({ type: 'progress', stage: 'fallback', detail: 'Building PDF...' });
        try {
          const pdfBytes = await new Promise(async (resolve, reject) => {
            // Use PDFKit for better text layout with consistent slide dimensions
            const pageWidth = 1056;  // Standard 4:3 aspect ratio at 96 DPI
            const pageHeight = 792;
            const margin = 72;  // 0.75 inch margins
            
            const doc = new PDFKit({
              autoFirstPage: false,
              size: [pageWidth, pageHeight],
              margin: margin
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            
            let pageCount = 0;

            // First add pages for the text content
            if (slideText) {
              const slides = slideText.split(/--- Slide \d+ ---/g).filter(s => s.trim());
              
              for (const [i, slide] of slides.entries()) {
                if (!slide.trim()) continue;
                pageCount++;
                
                // Add page for this slide
                doc.addPage();
                
                // Slide number in gray
                doc.fontSize(14)
                   .fillColor('#666666')
                   .text(`Slide ${i + 1}`, 40, 40);
                
                // Add slide content with nice formatting
                doc.moveDown()
                   .fontSize(12)
                   .fillColor('black');

                // Split content into paragraphs and lists
                const paragraphs = slide.trim().split(/\n\n+/);
                
                for (const p of paragraphs) {
                  // Detect bullet points and format as lists
                  if (p.match(/^[•\-\*]\s/m)) {
                    const items = p.split(/\n/).map(i => i.replace(/^[•\-\*]\s+/, '').trim());
                    doc.moveDown(0.5).fontSize(12);
                    for (const item of items) {
                      if (!item) continue;
                      doc.moveDown(0.2)
                         .fontSize(12)
                         .text('•', 40, doc.y)
                         .moveUp()
                         .text(item, 60);
                    }
                    doc.moveDown(0.5);
                  }
                  // Headers (lines ending with :)
                  else if (p.match(/^[^:\n]+:$/m)) {
                    doc.moveDown(0.5)
                       .fontSize(14)
                       .font('Helvetica-Bold')
                       .text(p)
                       .font('Helvetica')
                       .fontSize(12);
                  }
                  // Regular paragraphs
                  else {
                    doc.moveDown(0.5)
                       .fontSize(12)
                       .text(p, {
                         align: 'left',
                         lineGap: 2
                       });
                  }
                }
              }
            }

            // Then add images
            for (const img of images) {
              const imgData = await fs.promises.readFile(img.path);
              doc.addPage();
              
              // Calculate dimensions to fit the image within the page while maintaining aspect ratio
              const maxWidth = pageWidth - (2 * margin);  // Available width
              const maxHeight = pageHeight - (2 * margin); // Available height
              
              const dims = sizeOf(imgData);
              let { width, height } = dims;
              
              if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = height * ratio;
              }
              
              if (height > maxHeight) {
                const ratio = maxHeight / height;
                height = maxHeight;
                width = width * ratio;
              }
              
              // Center the image on the page
              const x = 40 + (maxWidth - width) / 2;
              const y = 40 + (maxHeight - height) / 2;
              
              doc.image(imgData, x, y, {
                width,
                height
              });
            }

            doc.end();
          });
          
          return pdfBytes;
        } catch (err) {
          console.error('Error generating PDF with PDFKit:', err);
          throw err;
        }
          // Save generated PDF
          fireProgress({ type: 'progress', stage: 'fallback', detail: 'Saving PDF...' });
          await fs.writeFile(outPdfPath, pdfBytes).catch(() => {});
          fireProgress({ type: 'complete', data: pdfBytes.toString('base64'), mimeType: 'application/pdf' });
          return { success: true, data: pdfBytes.toString('base64'), mimeType: 'application/pdf' };
      }
    }
  } catch (err) {
    fireProgress({ type: 'error', error: err.message });
  }

  // As a last resort, return the original file bytes so renderer can decide what to show
  try {
    const buf = await fs.readFile(srcPath);
    return { success: true, data: buf.toString('base64'), mimeType: getMimeType(fileName) };
  } catch (err) {
    fireProgress({ type: 'error', error: err.message });
    return { success: false, error: err.message };
  }
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword'
  };
  return map[ext] || 'application/octet-stream';
}

module.exports = { convertToPdfIfNeeded };
