const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function test() {
  try {
    // Test reading Summary.docx
    console.log('1. Testing Summary.docx read...');
    const docxPath = path.join(__dirname, 'Summary.docx');
    const docResult = await mammoth.extractRawText({ path: docxPath });
    console.log('Successfully read Summary.docx');
    
    // Test writing to a file
    console.log('\n2. Testing file write...');
    const testFile = path.join(__dirname, 'test.txt');
    fs.writeFileSync(testFile, 'Test content', 'utf8');
    console.log('Successfully wrote to test.txt');
    
    // Clean up
    fs.unlinkSync(testFile);
    console.log('Successfully cleaned up test file');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
