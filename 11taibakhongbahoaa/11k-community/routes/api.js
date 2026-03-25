const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const { readData, writeData } = require('../models/db');

// Check if running on Vercel
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

// Use memory storage to process uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Upload buffer to Catbox.moe for permanent, zero-setup public image hosting
 */
async function uploadToCatbox(buffer, originalname) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: originalname });
        
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
        });
        return response.data; // URL string
    } catch (err) {
        console.error('Catbox upload error:', err.message);
        throw err;
    }
}

/**
 * Fallback to local files for offline development
 */
function saveLocally(buffer, originalname) {
    const dest = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(originalname);
    fs.writeFileSync(path.join(dest, filename), buffer);
    return `/uploads/${filename}`;
}

// Single File Upload Route
router.post('/upload', upload.single('media'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
        if (isVercel) {
            const url = await uploadToCatbox(req.file.buffer, req.file.originalname);
            return res.json({ url: url });
        } else {
            const url = saveLocally(req.file.buffer, req.file.originalname);
            return res.json({ url: url });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Multiple Files Upload Route
router.post('/upload-multiple', upload.array('media', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    try {
        if (isVercel) {
            const uploadPromises = req.files.map(file => 
                uploadToCatbox(file.buffer, file.originalname)
            );
            const urls = await Promise.all(uploadPromises);
            return res.json({ urls });
        } else {
            const urls = req.files.map(file => saveLocally(file.buffer, file.originalname));
            return res.json({ urls });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Failed to upload images' });
    }
});

// Auth Route (Simple Mock)
router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await readData('users');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

router.post('/auth/updateProfile', async (req, res) => {
    const { username, avatar, name } = req.body;
    const users = await readData('users');
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
        const oldName = users[userIndex].name;
        
        if (avatar) users[userIndex].avatar = avatar;
        if (name && name.trim() !== '') users[userIndex].name = name.trim();
        
        await writeData('users', users);

        // Cascade updates
        if (name || avatar) {
            const posts = await readData('posts');
            let pUpdated = false;
            posts.forEach(p => { 
                if (p.author === oldName) { 
                    if(name) p.author = name.trim(); 
                    if(avatar) p.avatar = avatar; 
                    pUpdated = true; 
                } 
            });
            if (pUpdated) await writeData('posts', posts);

            if (name) {
                const anns = await readData('announcements');
                let aUpdated = false;
                anns.forEach(a => { 
                    if (a.author === oldName) { 
                        a.author = name.trim(); 
                        aUpdated = true; 
                    } 
                });
                if (aUpdated) await writeData('announcements', anns);
            }
        }

        const { password, ...safeUser } = users[userIndex];
        res.json({ success: true, user: safeUser });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// Generic collection handler factory
const createCrudRoutes = (collection) => {
    router.get(`/${collection}`, async (req, res) => {
        const data = await readData(collection);
        res.json(data);
    });

    router.post(`/${collection}`, async (req, res) => {
        const data = await readData(collection);
        const newItem = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
        data.unshift(newItem); // Add to beginning
        await writeData(collection, data);
        res.json(newItem);
    });

    router.delete(`/${collection}/:id`, async (req, res) => {
        const data = await readData(collection);
        const filtered = data.filter(item => item.id !== req.params.id);
        await writeData(collection, filtered);
        res.json({ success: true });
    });
};

['posts', 'recaps', 'memories', 'members', 'announcements', 'activities', 'documents', 'honors'].forEach(createCrudRoutes);

// Post interactions: Like
router.post('/posts/:id/like', async (req, res) => {
    const posts = await readData('posts');
    const post = posts.find(p => p.id === req.params.id);
    if (post) {
        post.likes = (post.likes || 0) + 1;
        await writeData('posts', posts);
        res.json({ success: true, likes: post.likes });
    } else {
        res.status(404).json({ error: 'Post not found' });
    }
});

// Post interactions: Comment
router.post('/posts/:id/comment', async (req, res) => {
    const posts = await readData('posts');
    const post = posts.find(p => p.id === req.params.id);
    if (post) {
        const newComment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            author: req.body.author || 'Guest',
            avatar: req.body.avatar || 'https://ui-avatars.com/api/?name=Guest&background=ed8720&color=fff',
            text: req.body.text,
            createdAt: new Date().toISOString()
        };
        post.comments = post.comments || [];
        post.comments.push(newComment);
        await writeData('posts', posts);
        res.json({ success: true, comment: newComment });
    } else {
        res.status(404).json({ error: 'Post not found' });
    }
});

module.exports = router;
