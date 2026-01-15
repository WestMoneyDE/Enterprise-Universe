/**
 * Customer Files API
 * Handles file uploads for sketches, documents, and customer requirements
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../uploads/customers');

// Ensure upload directories exist
function ensureUploadDirs() {
    const dirs = [
        UPLOAD_DIR,
        path.join(UPLOAD_DIR, 'sketches'),
        path.join(UPLOAD_DIR, 'documents'),
        path.join(UPLOAD_DIR, 'photos')
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

ensureUploadDirs();

// Customer data storage
const CUSTOMER_DATA_FILE = path.join(__dirname, '../data/customer-requirements.json');

function ensureDataDir() {
    const dir = path.dirname(CUSTOMER_DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load customer data
function loadCustomerData() {
    ensureDataDir();
    if (!fs.existsSync(CUSTOMER_DATA_FILE)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(CUSTOMER_DATA_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

// Save customer data
function saveCustomerData(data) {
    ensureDataDir();
    fs.writeFileSync(CUSTOMER_DATA_FILE, JSON.stringify(data, null, 2));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.params.type || 'documents';
        const customerId = req.params.customerId || 'unknown';
        const dir = path.join(UPLOAD_DIR, type, customerId);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${uniqueId}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
        files: 10 // Max 10 files at once
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            // Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // CAD
            'application/dwg', 'application/dxf', 'application/acad',
            // Archives
            'application/zip'
        ];

        // Also allow by extension for CAD files
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.dwg', '.dxf', '.loxcc', '.loxone'];

        if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype}`), false);
        }
    }
});

// Upload files endpoint
async function handleFileUpload(req, res) {
    try {
        const { customerId, type } = req.params;
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({ success: false, error: 'Keine Dateien hochgeladen' });
        }

        // Load customer data
        const allData = loadCustomerData();
        if (!allData[customerId]) {
            allData[customerId] = {
                files: { sketches: [], documents: [], photos: [] },
                wishes: [],
                systemConfig: {},
                createdAt: new Date().toISOString()
            };
        }

        // Add files to customer record
        const fileRecords = files.map(file => ({
            id: crypto.randomBytes(8).toString('hex'),
            filename: file.filename,
            originalName: file.originalname,
            type: type,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.body.uploadedBy || 'customer',
            visibleToCustomer: req.body.visibleToCustomer !== 'false'
        }));

        if (!allData[customerId].files[type]) {
            allData[customerId].files[type] = [];
        }
        allData[customerId].files[type].push(...fileRecords);
        allData[customerId].updatedAt = new Date().toISOString();

        saveCustomerData(allData);

        res.json({
            success: true,
            message: `${files.length} Datei(en) hochgeladen`,
            files: fileRecords
        });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Get customer files
async function getCustomerFiles(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.json({ files: { sketches: [], documents: [], photos: [] } });
        }

        res.json({ files: customerData.files });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Get error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Delete file
async function deleteFile(req, res) {
    try {
        const { customerId, fileId } = req.params;
        const allData = loadCustomerData();

        if (!allData[customerId]) {
            return res.status(404).json({ error: 'Kunde nicht gefunden' });
        }

        // Find and remove file from all categories
        let deleted = false;
        for (const type of ['sketches', 'documents', 'photos']) {
            const files = allData[customerId].files[type] || [];
            const index = files.findIndex(f => f.id === fileId);
            if (index !== -1) {
                const file = files[index];
                // Delete physical file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                files.splice(index, 1);
                deleted = true;
                break;
            }
        }

        if (!deleted) {
            return res.status(404).json({ error: 'Datei nicht gefunden' });
        }

        saveCustomerData(allData);
        res.json({ success: true, message: 'Datei geloscht' });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Save customer wishes/requirements
async function saveCustomerWishes(req, res) {
    try {
        const { customerId } = req.params;
        const { wishes } = req.body;

        const allData = loadCustomerData();
        if (!allData[customerId]) {
            allData[customerId] = {
                files: { sketches: [], documents: [], photos: [] },
                wishes: [],
                systemConfig: {},
                createdAt: new Date().toISOString()
            };
        }

        allData[customerId].wishes = wishes;
        allData[customerId].updatedAt = new Date().toISOString();

        saveCustomerData(allData);

        res.json({ success: true, message: 'Wunsche gespeichert' });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Save wishes error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Get customer wishes
async function getCustomerWishes(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();

        if (!allData[customerId]) {
            return res.json({ wishes: [] });
        }

        res.json({ wishes: allData[customerId].wishes || [] });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Get wishes error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Save system configuration
async function saveSystemConfig(req, res) {
    try {
        const { customerId } = req.params;
        const { config } = req.body;

        const allData = loadCustomerData();
        if (!allData[customerId]) {
            allData[customerId] = {
                files: { sketches: [], documents: [], photos: [] },
                wishes: [],
                systemConfig: {},
                createdAt: new Date().toISOString()
            };
        }

        allData[customerId].systemConfig = config;
        allData[customerId].updatedAt = new Date().toISOString();

        saveCustomerData(allData);

        res.json({ success: true, message: 'Konfiguration gespeichert' });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Save config error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Get all customer data
async function getCustomerData(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();

        if (!allData[customerId]) {
            return res.json({
                files: { sketches: [], documents: [], photos: [] },
                wishes: [],
                systemConfig: {},
                exists: false
            });
        }

        res.json({ ...allData[customerId], exists: true });

    } catch (error) {
        console.error('[CUSTOMER-FILES] Get data error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Generate unique access token for customer
function generateAccessToken(customerId, dealId) {
    const secret = process.env.CUSTOMER_TOKEN_SECRET || 'west-money-bau-2026';
    return crypto
        .createHash('sha256')
        .update(`${customerId}-${dealId}-${secret}`)
        .digest('hex')
        .substring(0, 24);
}

// Verify access token
function verifyAccessToken(customerId, dealId, token) {
    const expected = generateAccessToken(customerId, dealId);
    return token === expected;
}

// Setup routes
function setupCustomerFilesRoutes(app) {
    // File uploads
    app.post('/api/customer/:customerId/files/:type',
        upload.array('files', 10),
        handleFileUpload
    );

    // Get files
    app.get('/api/customer/:customerId/files', getCustomerFiles);

    // Delete file
    app.delete('/api/customer/:customerId/files/:fileId', deleteFile);

    // Customer wishes
    app.post('/api/customer/:customerId/wishes', express.json(), saveCustomerWishes);
    app.get('/api/customer/:customerId/wishes', getCustomerWishes);

    // System config
    app.post('/api/customer/:customerId/config', express.json(), saveSystemConfig);

    // Get all customer data
    app.get('/api/customer/:customerId/data', getCustomerData);

    console.log('[CUSTOMER-FILES] API routes registered');
}

module.exports = {
    setupCustomerFilesRoutes,
    generateAccessToken,
    verifyAccessToken,
    loadCustomerData,
    saveCustomerData
};
