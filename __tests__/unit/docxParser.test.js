const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { parseDocx } = require('../../src/utils/docxParser');

describe('docxParser.parseDocx', () => {
  test('extracts text from a minimal DOCX document', async () => {
    const zip = new JSZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Hello Docx</w:t></w:r></w:p>
        </w:body>
      </w:document>`;
    zip.file('word/document.xml', docXml);
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="xml" ContentType="application/xml"/>
      </Types>`);

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const tmp = path.join(os.tmpdir(), `test-${Date.now()}.docx`);
    await fs.writeFile(tmp, buf);

    const text = await parseDocx(tmp);
    expect(typeof text).toBe('string');
    expect(text).toContain('Hello Docx');
  });
});
