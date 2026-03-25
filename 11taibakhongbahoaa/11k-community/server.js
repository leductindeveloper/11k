const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Use API routes
app.use('/api', apiRoutes);

// Ensure required directories exist for local development
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure JSON DB files exist
const dbFiles = ['users.json', 'posts.json', 'members.json', 'announcements.json', 'activities.json', 'comments.json', 'recaps.json', 'memories.json', 'documents.json', 'honors.json'];
dbFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
});

// Start the server
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`11K Community Server is running on http://localhost:${PORT}`);
    });
}
module.exports = app;
