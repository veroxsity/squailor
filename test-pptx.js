// Test PowerPoint parsing
const { parsePresentation } = require('./utils/pptxParser');
const path = require('path');

async function test() {
  try {
    // Update this path to your test file
    const testFile = 'path/to/your/Week 1 Workshop - Module Introduction.pptx';
    
    console.log('Testing PowerPoint parsing...');
    console.log('File:', testFile);
    console.log('---');
    
    const text = await parsePresentation(testFile);
    
    console.log('Extracted text:');
    console.log(text);
    console.log('---');
    console.log('Text length:', text.length);
    console.log('Character count:', text.split('').length);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
