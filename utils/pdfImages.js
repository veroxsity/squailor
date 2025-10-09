const fs = require('fs');
const path = require('path');

/**
 * Best-effort PDF image extraction using pdfjs-dist.
 * Returns up to maxImages images as data URLs by rasterizing pages and cropping image operators is complex,
 * so we take a pragmatic approach: render first N pages to small thumbnails when possible.
 * This gives the model visual context without heavy processing.
 *
 * Note: This adds a dependency on pdfjs-dist at runtime; make sure it's installed.
 */
async function extractPdfImages(filePath, maxImages = 2) {
  try {
    const pdfjsLib = require('pdfjs-dist');
    const { createCanvas } = require('canvas');

    // Node canvas is required for rendering; if unavailable, skip.
    if (!createCanvas) return [];

    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const results = [];
    const pagesToRender = Math.min(pdf.numPages, maxImages);

    for (let i = 1; i <= pagesToRender; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.5 }); // small thumbnail
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');

      const renderContext = {
        canvasContext: ctx,
        viewport
      };
      await page.render(renderContext).promise;

      const dataUrl = canvas.toDataURL('image/png');
      results.push({ mimeType: 'image/png', dataUrl, altText: `PDF page ${i}` });

      if (results.length >= maxImages) break;
    }

    return results;
  } catch (e) {
    // If any part fails or dependencies are missing, fall back to empty
    return [];
  }
}

module.exports = { extractPdfImages };
