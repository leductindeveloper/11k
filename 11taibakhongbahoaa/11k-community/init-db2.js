const fs = require('fs');
const https = require('https');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbFiles = [
    'users.json', 'posts.json', 'members.json', 'announcements.json', 
    'activities.json', 'comments.json', 'recaps.json', 'memories.json', 
    'documents.json', 'honors.json'
];

let allData = {};

dbFiles.forEach(file => {
    const key = file.replace('.json', '');
    try {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            allData[key] = JSON.parse(content);
        } else {
            allData[key] = [];
        }
    } catch(e) {
        allData[key] = [];
    }
});

const dataString = JSON.stringify(allData);

const options = {
  hostname: 'jsonblob.com',
  path: '/api/jsonBlob',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(dataString)
  }
};

const req = https.request(options, res => {
    if (res.statusCode === 201 && res.headers.location) {
        const locationParts = res.headers.location.split('/');
        const blobId = locationParts[locationParts.length - 1];
        fs.writeFileSync('blob_id.txt', blobId, 'utf8');
        console.log('Saved blob ID:', blobId);
    }
});

req.write(dataString);
req.end();
