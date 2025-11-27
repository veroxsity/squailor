const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { parsePresentation } = require('../../src/utils/pptxParser');

describe('pptxParser.parsePresentation', () => {
  test('extracts text from a minimal PPTX with one slide', async () => {
    const zip = new JSZip();
    const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:p>
                <a:r>
                  <a:t>Hello Slide</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`;
    zip.file('ppt/slides/slide1.xml', slideXml);
    // Minimal [Content_Types].xml to satisfy some unzip tools (parser doesn't require it, but good practice)
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="xml" ContentType="application/xml"/>
      </Types>`);

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const tmp = path.join(os.tmpdir(), `test-${Date.now()}.pptx`);
    await fs.writeFile(tmp, buf);

    const text = await parsePresentation(tmp);
    expect(typeof text).toBe('string');
    expect(text).toContain('Hello Slide');
  });
});
