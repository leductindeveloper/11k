const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch'); // May need native fetch depending on Node version
const path = require('path');

async function testUpload() {
    const fd = new FormData();
    
    // Create two dummy files
    fs.writeFileSync('test1.jpg', 'dummy image 1');
    fs.writeFileSync('test2.jpg', 'dummy image 2');
    
    fd.append('media', fs.createReadStream('test1.jpg'));
    fd.append('media', fs.createReadStream('test2.jpg'));
    
    try {
        const fetchFunc = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        
        const res = await fetch('http://localhost:3000/api/upload-multiple', {
            method: 'POST',
            body: fd
        });
        
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch(e) {
        console.error(e);
    } finally {
        fs.unlinkSync('test1.jpg');
        fs.unlinkSync('test2.jpg');
    }
}

testUpload();
