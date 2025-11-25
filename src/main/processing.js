const path = require('path');
const fs = require('fs').promises;
const validators = require('../utils/validators');
const { getPaths } = require('./storage');
const {
  generateShortUUID,
  saveSummaryToFolder,
  findDuplicateDocument,
} = require('./documents');

let pdfParse;
let parsePresentation;
let extractSlideImages;
let parseDocx;
let extractDocxImages;
let summarizeText;
let modelSupportsVision;
let answerQuestionAboutSummary;
let calculateFileHash;
let extractPdfImages;

async function ensureAiLoaded() {
  if (!summarizeText || !modelSupportsVision || !answerQuestionAboutSummary) {
    const ai = require('../utils/aiSummarizer');
    summarizeText = ai.summarizeText;
    modelSupportsVision = ai.modelSupportsVision;
    answerQuestionAboutSummary = ai.answerQuestionAboutSummary;
  }
}

async function ensurePdfLoaded() {
  if (!pdfParse) {
    pdfParse = require('pdf-parse-fork');
  }
}

async function ensurePptxLoaded() {
  if (!parsePresentation || !extractSlideImages) {
    const ppt = require('../utils/pptxParser');
    parsePresentation = ppt.parsePresentation;
    extractSlideImages = ppt.extractSlideImages;
  }
}

async function ensureDocxLoaded() {
  if (!parseDocx || !extractDocxImages) {
    const docx = require('../utils/docxParser');
    parseDocx = docx.parseDocx;
    extractDocxImages = docx.extractDocxImages;
  }
}

async function ensureHashLoaded() {
  if (!calculateFileHash) {
    calculateFileHash = require('../utils/fileHash').calculateFileHash;
  }
}

async function ensurePdfImagesLoaded() {
  if (!extractPdfImages) {
    extractPdfImages = require('../utils/pdfImages').extractPdfImages;
  }
}

function getProviderAndConfig(settings) {
  const provider = (settings && settings.aiProvider) ? settings.aiProvider : 'openrouter';
  const providerConfig = (settings && settings.aiConfig && settings.aiConfig[provider]) ? settings.aiConfig[provider] : {};
  return { provider, providerConfig };
}

async function processDocuments({
  event,
  filePaths,
  summaryType,
  apiKey,
  responseTone,
  model,
  summaryStyle,
  processImagesFlag,
  mcqCount,
  loadSettings,
}) {
  const v = validators.validateProcessDocumentsArgs({ filePaths, summaryType, responseTone, model, summaryStyle, processImagesFlag });
  if (!v.ok) {
    return [{ success: false, fileName: '(input)', error: v.error, errorType: 'error' }];
  }
  ({ summaryType, responseTone, model, summaryStyle } = v.value);
  const results = [];
  const totalFiles = filePaths.length;

  const userSettings = await loadSettings();
  const maxImages = Number(userSettings.maxImageCount) || 3;
  const processImages = typeof v.value.processImages === 'boolean' ? v.value.processImages : (typeof userSettings.processImages === 'boolean' ? userSettings.processImages : true);
  const { provider, providerConfig } = getProviderAndConfig(userSettings);

  await ensureHashLoaded();
  await ensurePdfLoaded();
  await ensurePptxLoaded();
  await ensureAiLoaded();

  const { documentsStoragePath } = getPaths();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Starting...',
        stage: 'init'
      });

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Checking for duplicates...',
        stage: 'duplicate-check'
      });

      const fileHash = await calculateFileHash(filePath);
      let legacyMd5 = '';
      try {
        const fh = require('../utils/fileHash');
        if (fh.calculateLegacyMd5) legacyMd5 = await fh.calculateLegacyMd5(filePath);
      } catch (_) { legacyMd5 = ''; }

      const duplicateCheck = await findDuplicateDocument(fileHash, legacyMd5);

      if (duplicateCheck.exists) {
        // Let caller handle UI decision; here we just return the duplicate info
        results.push({
          fileName,
          success: false,
          duplicate: true,
          duplicateInfo: duplicateCheck,
          filePath,
          index: i,
        });
        continue;
      }

      const folderId = generateShortUUID();
      const folderPath = path.join(documentsStoragePath, folderId);

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Creating storage folder...',
        stage: 'setup'
      });

      await fs.mkdir(folderPath, { recursive: true });

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Storing document...',
        stage: 'storing'
      });

      const storedFilePath = path.join(folderPath, fileName);
      await fs.copyFile(filePath, storedFilePath);

      let text = '';
      let imagesForVision = [];

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: ext === '.pdf' ? 'Extracting text from PDF...' : (ext === '.docx' || ext === '.doc') ? 'Extracting text from Word document...' : 'Extracting text from PowerPoint...',
        stage: 'extracting'
      });

      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
        if (processImages) {
          try {
            await ensurePdfImagesLoaded();
            imagesForVision = await extractPdfImages(filePath, 2);
          } catch (_) { imagesForVision = []; }
        }
      } else if (ext === '.docx' || ext === '.doc') {
        await ensureDocxLoaded();
        text = await parseDocx(filePath);
        if (processImages) {
          try {
            imagesForVision = await extractDocxImages(filePath, 2);
          } catch (_) { imagesForVision = []; }
        }
      } else if (ext === '.pptx' || ext === '.ppt') {
        await ensurePptxLoaded();
        text = await parsePresentation(filePath);
        if (processImages) {
          try {
            imagesForVision = await extractSlideImages(filePath, maxImages);
          } catch (_) { imagesForVision = []; }
        }
      }

      if (!text || text.trim().length === 0) {
        await fs.rm(folderPath, { recursive: true, force: true }).catch(() => {});
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: 'Failed - No text found',
          stage: 'error'
        });
        results.push({
          fileName,
          success: false,
          error: 'No text content found in document'
        });
        continue;
      }

      if (imagesForVision && imagesForVision.length) {
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: `Found ${imagesForVision.length} image(s) for analysis`,
          stage: 'extracted'
        });
      }

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Generating AI summary...',
        stage: 'summarizing',
        charCount: text.length
      });

      const visionAllowed = processImages && (typeof modelSupportsVision === 'function' ? modelSupportsVision(model, provider) : false);
      const imagesToUse = visionAllowed ? imagesForVision : [];
      if (!visionAllowed && imagesForVision && imagesForVision.length) {
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: processImages ? 'Model does not support images — using text only' : 'Image analysis disabled — using text only',
          stage: 'summarizing'
        });
      }

      const summary = await summarizeText(
        text,
        summaryType,
        {
          apiKey,
          provider,
          model,
          responseTone,
          summaryStyle,
          images: imagesToUse,
          mcqCount,
          onProgress: (progress) => {
            if (!progress) return;
            if (progress.type === 'delta') {
              event.sender.send('processing-progress', {
                fileName,
                fileIndex: i + 1,
                totalFiles,
                status: 'Generating AI summary…',
                stage: 'summarizing',
                delta: progress.deltaText,
                summarizedChars: progress.totalChars
              });
            } else if (progress.type === 'chunk-start' || progress.type === 'chunk-done' || progress.type === 'combine-start') {
              event.sender.send('processing-progress', {
                fileName,
                fileIndex: i + 1,
                totalFiles,
                status: progress.type === 'chunk-start' ? `Summarizing part ${progress.chunkIndex}/${progress.totalChunks}…` : (progress.type === 'chunk-done' ? `Finished part ${progress.chunkIndex}/${progress.totalChunks}` : 'Combining parts…'),
                stage: 'summarizing'
              });
            } else if (progress.type === 'done') {
              event.sender.send('processing-progress', {
                fileName,
                fileIndex: i + 1,
                totalFiles,
                status: 'Summary generated',
                stage: 'saving'
              });
            }
          },
          baseURL: providerConfig.baseURL,
          endpoint: providerConfig.endpoint,
          deployment: providerConfig.deployment,
          apiVersion: providerConfig.apiVersion
        }
      );

      // Emit the full summary to the renderer so UI can display final content immediately
      try {
        event.sender.send('processing-progress', {
          fileName,
          fileIndex: i + 1,
          totalFiles,
          status: 'Summary generated',
          stage: 'generated',
          summary
        });
      } catch (_) {}

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Saving summary...',
        stage: 'saving'
      });

      let previewText = text.substring(0, 500);
      if (ext === '.pptx' || ext === '.ppt') {
        const slideMatch = text.match(/--- Slide \d+ ---\n([\s\S]*?)(?=\n--- Slide \d+ ---|$)/);
        if (slideMatch && slideMatch[1]) {
          previewText = slideMatch[1].substring(0, 500);
        }
      }

      const summaryData = {
        fileName,
        fileType: ext,
        fileHash,
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
        summaryType,
        responseTone,
        summaryStyle,
        timestamp: new Date().toISOString(),
        model,
        preview: previewText.trim() + (text.length > 500 ? '...' : '')
      };

      await saveSummaryToFolder(folderId, summaryData);

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Complete! ✓',
        stage: 'complete'
      });

      results.push({
        fileName,
        folderId,
        fileType: ext,
        success: true,
        originalLength: text.length,
        summary
      });
    } catch (error) {
      let errorType = 'error';
      let displayMessage = error.message;
      if (error.message && error.message.startsWith('RATE_LIMIT:')) {
        errorType = 'rate-limit';
        displayMessage = error.message.replace('RATE_LIMIT: ', '');
      } else if (error.message && error.message.startsWith('QUOTA_EXCEEDED:')) {
        errorType = 'quota';
        displayMessage = error.message.replace('QUOTA_EXCEEDED: ', '');
      } else if (error.message && error.message.startsWith('INVALID_API_KEY:')) {
        errorType = 'api-key';
        displayMessage = error.message.replace('INVALID_API_KEY: ', '');
      }

      event.sender.send('processing-progress', {
        fileName: path.basename(filePath),
        fileIndex: i + 1,
        totalFiles,
        status: displayMessage,
        stage: 'error',
        errorType
      });

      results.push({
        fileName: path.basename(filePath),
        success: false,
        error: displayMessage,
        errorType
      });
    }
  }

  return results;
}

async function processDocumentsCombined({
  event,
  filePaths,
  summaryType,
  apiKey,
  responseTone,
  model,
  summaryStyle,
  processImagesFlag,
  mcqCount,
  loadSettings,
}) {
  const v = validators.validateCombinedArgs({ filePaths, summaryType, responseTone, model, summaryStyle, processImagesFlag });
  if (!v.ok) {
    return { success: false, error: v.error };
  }
  ({ summaryType, responseTone, model, summaryStyle } = v.value);

  const userSettings = await loadSettings();
  const cfgMaxCombined = Math.max(1, Math.min(10, Number(userSettings.maxCombinedFiles) || 3));
  const inputFiles = Array.isArray(filePaths) ? filePaths.slice(0, cfgMaxCombined) : [];
  const totalFiles = inputFiles.length;
  if (totalFiles === 0) {
    return { success: false, error: 'No files provided' };
  }

  const maxImages = Number(userSettings.maxImageCount) || 3;
  const processImages = typeof v.value.processImages === 'boolean' ? v.value.processImages : (typeof userSettings.processImages === 'boolean' ? userSettings.processImages : true);
  const { provider, providerConfig } = getProviderAndConfig(userSettings);

  await ensurePdfLoaded();
  await ensurePptxLoaded();
  await ensureDocxLoaded();
  await ensureAiLoaded();
  await ensureHashLoaded();

  const extracted = [];
  const collectedImages = [];

  for (let i = 0; i < inputFiles.length; i++) {
    const filePath = inputFiles[i];
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    try {
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Reading and extracting text...',
        stage: 'extracting'
      });

      let text = '';
      let imagesForVision = [];
      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text || '';
        if (processImages) {
          try {
            await ensurePdfImagesLoaded();
            imagesForVision = await extractPdfImages(filePath, 1);
          } catch (_) { imagesForVision = []; }
        }
      } else if (ext === '.pptx' || ext === '.ppt') {
        text = await parsePresentation(filePath);
        if (processImages) {
          try {
            imagesForVision = await extractSlideImages(filePath, maxImages);
          } catch (_) { imagesForVision = []; }
        }
      } else if (ext === '.docx' || ext === '.doc') {
        await ensureDocxLoaded();
        text = await parseDocx(filePath);
        if (processImages) {
          try { imagesForVision = await extractDocxImages(filePath, 1); } catch (_) { imagesForVision = []; }
        }
      } else {
        text = '';
      }

      if (!text || !text.trim()) {
        throw new Error('No text content found in document');
      }

      extracted.push({ fileName, ext, text });
      if (imagesForVision && imagesForVision.length) {
        collectedImages.push(...imagesForVision);
      }

      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: 'Text extracted',
        stage: 'extracted',
        charCount: text.length
      });
    } catch (err) {
      event.sender.send('processing-progress', {
        fileName,
        fileIndex: i + 1,
        totalFiles,
        status: err.message || 'Failed to extract',
        stage: 'error'
      });
      return { success: false, error: `Failed to extract ${fileName}: ${err.message}` };
    }
  }

  const MAX_PER_FILE_CHARS = 20000;
  const cleanedParts = extracted.map((item, idx) => {
    let t = item.text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length > MAX_PER_FILE_CHARS) {
      t = t.slice(0, MAX_PER_FILE_CHARS) + `\n...[truncated ${t.length - MAX_PER_FILE_CHARS} chars]`;
    }
    return `--- Source ${idx + 1}: ${item.fileName} (${item.ext}) ---\n${t}\n`;
  }).join('\n');

  const aggregationIntro = `You are given ${totalFiles} documents. Produce a single cohesive summary that:
- Identifies themes that span multiple documents
- Resolves or notes contradictions
- Clearly attributes unique points to their sources when important (Source 1/2/3)
- Avoids repetition and keeps a logical flow\n\n`;

  const combinedText = aggregationIntro + cleanedParts;

  if (collectedImages.length) {
    const note = `Collected ${collectedImages.length} image(s) from sources`;
    extracted.forEach((info, idx) => {
      event.sender.send('processing-progress', {
        fileName: info.fileName,
        fileIndex: idx + 1,
        totalFiles,
        status: note,
        stage: 'extracted'
      });
    });
  }

  extracted.forEach((info, idx) => {
    event.sender.send('processing-progress', {
      fileName: info.fileName,
      fileIndex: idx + 1,
      totalFiles,
      status: 'Combining sources...',
      stage: 'combining'
    });
  });

  extracted.forEach((info, idx) => {
    event.sender.send('processing-progress', {
      fileName: info.fileName,
      fileIndex: idx + 1,
      totalFiles,
      status: 'Generating combined AI summary...',
      stage: 'summarizing'
    });
  });

  let combinedSummary;
  try {
    const visionAllowed = processImages && (typeof modelSupportsVision === 'function' ? modelSupportsVision(model, provider) : false);
    const imagesToUse = visionAllowed ? collectedImages.slice(0, 3) : [];
    if (!visionAllowed && collectedImages.length) {
      const first = extracted[0];
      event.sender.send('processing-progress', {
        fileName: first.fileName,
        fileIndex: 1,
        totalFiles,
        status: processImages ? 'Model does not support images — combining text only' : 'Image analysis disabled — combining text only',
        stage: 'summarizing'
      });
    }

    combinedSummary = await summarizeText(
      combinedText,
      summaryType,
      {
        apiKey,
        provider,
        model,
        responseTone,
        summaryStyle,
        images: imagesToUse,
        mcqCount,
        onProgress: (progress) => {
          if (!progress) return;
          if (progress.type === 'delta') {
            extracted.forEach((info, k) => {
              event.sender.send('processing-progress', {
                fileName: info.fileName,
                fileIndex: k + 1,
                totalFiles,
                status: 'Generating combined AI summary…',
                stage: 'summarizing',
                delta: progress.deltaText
              });
            });
          } else if (progress.type === 'chunk-start' || progress.type === 'chunk-done' || progress.type === 'combine-start') {
            extracted.forEach((info, k) => {
              event.sender.send('processing-progress', {
                fileName: info.fileName,
                fileIndex: k + 1,
                totalFiles,
                status: progress.type === 'chunk-start' ? `Summarizing part ${progress.chunkIndex}/${progress.totalChunks}…` : (progress.type === 'chunk-done' ? `Finished part ${progress.chunkIndex}/${progress.totalChunks}` : 'Combining parts…'),
                stage: 'summarizing'
              });
            });
          } else if (progress.type === 'done') {
            extracted.forEach((info, k) => {
              event.sender.send('processing-progress', {
                fileName: info.fileName,
                fileIndex: k + 1,
                totalFiles,
                status: 'Summary generated',
                stage: 'saving'
              });
            });
          }
        },
        baseURL: providerConfig.baseURL,
        endpoint: providerConfig.endpoint,
        deployment: providerConfig.deployment,
        apiVersion: providerConfig.apiVersion
      }
    );

    try {
      // Notify renderer with combined final summary content so preview shows it
      event.sender.send('processing-progress', {
        fileName: `Combined: ${extracted[0].fileName}`,
        fileIndex: 1,
        totalFiles,
        status: 'Combined summary generated',
        stage: 'generated',
        summary: combinedSummary
      });
    } catch (_) {}
  } catch (error) {
    let displayMessage = error.message || 'AI summarization failed';
    event.sender.send('processing-progress', {
      fileName: `${totalFiles} files`,
      fileIndex: 1,
      totalFiles: 1,
      status: displayMessage,
      stage: 'error'
    });
    return { success: false, error: displayMessage };
  }

  const { documentsStoragePath } = getPaths();
  const folderId = generateShortUUID();
  const folderPath = path.join(documentsStoragePath, folderId);
  await fs.mkdir(folderPath, { recursive: true });

  const displayName = totalFiles === 1
    ? extracted[0].fileName
    : `Combined: ${extracted[0].fileName} + ${totalFiles - 1} more`;

  const hashes = [];
  for (const f of inputFiles) {
    try { hashes.push(await calculateFileHash(f)); } catch (e) { /* ignore */ }
  }
  const syntheticHash = require('crypto').createHash('sha256').update(hashes.join('|')).digest('hex');

  let previewText = extracted[0].text.slice(0, 500);
  if (extracted[0].ext === '.pptx' || extracted[0].ext === '.ppt') {
    const m = extracted[0].text.match(/--- Slide \d+ ---\n([\s\S]*?)(?=\n--- Slide \d+ ---|$)/);
    if (m && m[1]) previewText = m[1].slice(0, 500);
  }

  const originalLength = cleanedParts.length;
  const summaryData = {
    fileName: displayName,
    fileType: '.aggregate',
    fileHash: syntheticHash,
    summary: combinedSummary,
    originalLength,
    summaryLength: combinedSummary.length,
    summaryType,
    responseTone,
    summaryStyle,
    timestamp: new Date().toISOString(),
    model,
    preview: previewText.trim() + (originalLength > 500 ? '...' : ''),
    sources: extracted.map(e => ({ fileName: e.fileName, fileType: e.ext }))
  };

  await saveSummaryToFolder(folderId, summaryData);

  event.sender.send('processing-progress', {
    fileName: displayName,
    fileIndex: 1,
    totalFiles: 1,
    status: 'Complete! ✓',
    stage: 'complete'
  });

  return {
    success: true,
    folderId,
    fileName: displayName,
    fileType: '.aggregate',
    originalLength,
    summary: combinedSummary
  };
}

module.exports = {
  processDocuments,
  processDocumentsCombined,
};
