const path = require('path');
const fs = require('fs').promises;
const { getPaths } = require('./storage');

// Generate 8-character alphanumeric UUID
function generateShortUUID() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function getDocumentsPath() {
  const { documentsStoragePath } = getPaths();
  return documentsStoragePath;
}

async function migrateOldStorage(log = console) {
  const { dataPath } = getPaths();
  const documentsStoragePath = getDocumentsPath();
  try {
    const oldSummariesPath = path.join(dataPath, 'summaries.json');
    try {
      await fs.access(oldSummariesPath);
    } catch {
      return { success: true, migrated: 0 };
    }

    const data = await fs.readFile(oldSummariesPath, 'utf8');
    const oldSummaries = JSON.parse(data);
    if (!Array.isArray(oldSummaries) || oldSummaries.length === 0) {
      await fs.unlink(oldSummariesPath).catch(() => {});
      return { success: true, migrated: 0 };
    }

    log.log?.(`Migrating ${oldSummaries.length} summaries to new format...`);
    let migrated = 0;

    for (const summary of oldSummaries) {
      try {
        const folderId = generateShortUUID();
        const folderPath = path.join(documentsStoragePath, folderId);
        await fs.mkdir(folderPath, { recursive: true });

        if (summary.storedFileName) {
          const oldFilePath = path.join(documentsStoragePath, summary.storedFileName);
          const newFilePath = path.join(folderPath, summary.fileName);
          try {
            await fs.access(oldFilePath);
            await fs.copyFile(oldFilePath, newFilePath);
            await fs.unlink(oldFilePath).catch(() => {});
          } catch (_) {
            // continue without file
          }
        }

        const newSummary = {
          fileName: summary.fileName,
          fileType: summary.fileType,
          summary: summary.summary,
          originalLength: summary.originalLength,
          summaryLength: summary.summaryLength || (summary.summary ? summary.summary.length : 0),
          summaryType: summary.summaryType,
          timestamp: summary.timestamp,
          model: summary.model || 'gpt-4o-mini',
          preview: summary.preview || 'Preview not available'
        };

        await saveSummaryToFolder(folderId, newSummary);
        migrated++;
      } catch (err) {
        log.error?.(`Failed to migrate summary ${summary.fileName}: ${err.message}`);
      }
    }

    await fs.unlink(oldSummariesPath).catch(() => {});
    log.log?.(`Migration complete: ${migrated} summaries migrated`);
    return { success: true, migrated };
  } catch (error) {
    log.error?.('Migration failed:', error);
    return { success: false, error: error.message, migrated: 0 };
  }
}

async function findDuplicateDocument(fileHash, legacyMd5) {
  const documentsStoragePath = getDocumentsPath();
  try {
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());

    for (const folder of folders) {
      try {
        const summaryPath = path.join(documentsStoragePath, folder.name, 'summary.json');
        const data = await fs.readFile(summaryPath, 'utf8');
        const summaryData = JSON.parse(data);
        if (summaryData.fileHash === fileHash || (legacyMd5 && summaryData.fileHash === legacyMd5)) {
          return {
            exists: true,
            folderId: folder.name,
            fileName: summaryData.fileName,
            folderPath: path.join(documentsStoragePath, folder.name)
          };
        }
      } catch (_) {
        continue;
      }
    }
    return { exists: false };
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return { exists: false };
  }
}

async function loadSummaryHistory() {
  const documentsStoragePath = getDocumentsPath();
  try {
    const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
    const folders = entries.filter(entry => entry.isDirectory());
    const history = [];

    for (const folder of folders) {
      try {
        const summaryPath = path.join(documentsStoragePath, folder.name, 'summary.json');
        const data = await fs.readFile(summaryPath, 'utf8');
        const summaryData = JSON.parse(data);
        summaryData.folderId = folder.name;
        history.push(summaryData);
      } catch (error) {
        console.log(`Skipping folder ${folder.name}: ${error.message}`);
      }
    }

    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return history;
  } catch (error) {
    console.error('Failed to load summary history:', error);
    return [];
  }
}

async function saveSummaryToFolder(folderId, summaryData) {
  const documentsStoragePath = getDocumentsPath();
  try {
    const folderPath = path.join(documentsStoragePath, folderId);
    await fs.mkdir(folderPath, { recursive: true });
    const summaryPath = path.join(folderPath, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2), 'utf8');
    return { success: true, folderId };
  } catch (error) {
    console.error('Failed to save summary:', error);
    return { success: false, error: error.message };
  }
}

async function deleteSummaryFolder(folderId) {
  const documentsStoragePath = getDocumentsPath();
  const folderPath = path.join(documentsStoragePath, folderId);
  await fs.rm(folderPath, { recursive: true, force: true });
}

async function clearAllSummaries() {
  const documentsStoragePath = getDocumentsPath();
  const entries = await fs.readdir(documentsStoragePath, { withFileTypes: true });
  const folders = entries.filter(entry => entry.isDirectory());
  for (const folder of folders) {
    const folderPath = path.join(documentsStoragePath, folder.name);
    await fs.rm(folderPath, { recursive: true, force: true }).catch(err => {
      console.error(`Failed to delete folder ${folder.name}:`, err);
    });
  }
}

async function resolveSummarySummary(folderId) {
  const documentsStoragePath = getDocumentsPath();
  const folderPath = path.join(documentsStoragePath, folderId);
  const summaryPath = path.join(folderPath, 'summary.json');
  const data = await fs.readFile(summaryPath, 'utf8');
  return JSON.parse(data);
}

module.exports = {
  generateShortUUID,
  getDocumentsPath,
  migrateOldStorage,
  findDuplicateDocument,
  loadSummaryHistory,
  saveSummaryToFolder,
  deleteSummaryFolder,
  clearAllSummaries,
  resolveSummarySummary,
};
