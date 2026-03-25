const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BLOB_ID = '019d2463-a16c-75f2-b0fb-f5fcdce38381';
const BLOB_URL = `https://jsonblob.com/api/jsonBlob/${BLOB_ID}`;
// We check if we are running on Vercel
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

const dataDir = path.join(__dirname, '..', 'data');

// In-memory cache for the serverless instance to reduce API calls on bursts
let cachedData = null;
let lastFetch = 0;

async function fetchAllData() {
    try {
        // Cache for 2 seconds to avoid slamming jsonblob if 10 requests come in quickly
        if (cachedData && (Date.now() - lastFetch < 2000)) return cachedData;
        const response = await axios.get(BLOB_URL, {
            headers: { 'Accept': 'application/json' }
        });
        cachedData = response.data || {};
        lastFetch = Date.now();
        return cachedData;
    } catch (err) {
        console.error('Error fetching from JSONBlob:', err.message);
        return cachedData || {}; // return stale cache if fetch fails
    }
}

async function updateAllData(dataObj) {
    try {
        await axios.put(BLOB_URL, dataObj, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        cachedData = dataObj;
        lastFetch = Date.now();
        return true;
    } catch (err) {
        console.error('Error writing to JSONBlob:', err.message);
        return false;
    }
}

async function readData(collection) {
    if (isVercel) {
        const allData = await fetchAllData();
        return allData[collection] || [];
    } else {
        const filePath = path.join(dataDir, `${collection}.json`);
        try {
            if (!fs.existsSync(filePath)) return [];
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            return [];
        }
    }
}

async function writeData(collection, data) {
    if (isVercel) {
        const allData = await fetchAllData();
        allData[collection] = data;
        return await updateAllData(allData);
    } else {
        const filePath = path.join(dataDir, `${collection}.json`);
        try {
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (err) {
            return false;
        }
    }
}

module.exports = { readData, writeData };
