/**
 * Subcontractor Management API
 * Manages subcontractors, their specializations, and project assignments
 *
 * Enterprise Universe - West Money Bau GmbH
 * @version 1.0.0
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Data file path
const SUBCONTRACTOR_FILE = path.join(__dirname, '../data/subcontractors.json');

// Ensure data directory exists
function ensureDataDir() {
    const dir = path.dirname(SUBCONTRACTOR_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load subcontractors
function loadSubcontractors() {
    ensureDataDir();
    if (!fs.existsSync(SUBCONTRACTOR_FILE)) {
        // Initialize with default subcontractors
        const defaultSubcontractors = getDefaultSubcontractors();
        saveSubcontractors(defaultSubcontractors);
        return defaultSubcontractors;
    }
    try {
        return JSON.parse(fs.readFileSync(SUBCONTRACTOR_FILE, 'utf8'));
    } catch (e) {
        return { subcontractors: [], assignments: {} };
    }
}

// Save subcontractors
function saveSubcontractors(data) {
    ensureDataDir();
    fs.writeFileSync(SUBCONTRACTOR_FILE, JSON.stringify(data, null, 2));
}

// Default subcontractor database
function getDefaultSubcontractors() {
    return {
        subcontractors: [
            {
                id: 'elec-001',
                name: 'Elektro Schmidt GmbH',
                type: 'Elektroinstallation',
                specializations: ['KNX', 'Loxone', 'Verkabelung', 'Schaltschrankbau'],
                contact: {
                    name: 'Thomas Schmidt',
                    phone: '+49 171 1234567',
                    email: 'schmidt@elektro-schmidt.de'
                },
                address: 'Industriestr. 45, 80939 Muenchen',
                rating: 4.8,
                hourlyRate: 65,
                availability: 'verfuegbar',
                certifications: ['KNX Partner', 'Loxone Gold Partner'],
                completedProjects: 127,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hvac-001',
                name: 'Klima & Heizung Mueller',
                type: 'HVAC',
                specializations: ['Fussbodenheizung', 'Klimaanlage', 'Lueftung', 'Waermepumpe'],
                contact: {
                    name: 'Hans Mueller',
                    phone: '+49 172 2345678',
                    email: 'info@klimamueller.de'
                },
                address: 'Handwerkerweg 12, 80331 Muenchen',
                rating: 4.6,
                hourlyRate: 58,
                availability: 'verfuegbar',
                certifications: ['Daikin Partner', 'Viessmann Partner'],
                completedProjects: 89,
                createdAt: new Date().toISOString()
            },
            {
                id: 'sec-001',
                name: 'SecureTech Bayern',
                type: 'Sicherheitstechnik',
                specializations: ['Alarmanlagen', 'Videoueberwachung', 'Zutrittskontrolle', 'Brandschutz'],
                contact: {
                    name: 'Michael Weber',
                    phone: '+49 173 3456789',
                    email: 'weber@securetech-bayern.de'
                },
                address: 'Sicherheitsallee 8, 80687 Muenchen',
                rating: 4.9,
                hourlyRate: 72,
                availability: 'verfuegbar',
                certifications: ['VdS zertifiziert', 'Telenot Partner'],
                completedProjects: 156,
                createdAt: new Date().toISOString()
            },
            {
                id: 'net-001',
                name: 'NetWorks IT Solutions',
                type: 'Netzwerktechnik',
                specializations: ['Netzwerkverkabelung', 'WLAN', 'Server', 'IoT-Integration'],
                contact: {
                    name: 'Stefan Bauer',
                    phone: '+49 174 4567890',
                    email: 'bauer@networks-it.de'
                },
                address: 'Technikring 23, 85748 Garching',
                rating: 4.7,
                hourlyRate: 85,
                availability: 'eingeschraenkt',
                certifications: ['Cisco Partner', 'Ubiquiti Partner'],
                completedProjects: 78,
                createdAt: new Date().toISOString()
            },
            {
                id: 'auto-001',
                name: 'Industrie Automation Bayern',
                type: 'Industrieautomation',
                specializations: ['SPS-Programmierung', 'SCADA', 'MES', 'Robotik', 'OPC UA'],
                contact: {
                    name: 'Dr. Klaus Fischer',
                    phone: '+49 175 5678901',
                    email: 'fischer@iab-automation.de'
                },
                address: 'Automatisierungspark 1, 85622 Feldkirchen',
                rating: 4.9,
                hourlyRate: 120,
                availability: 'verfuegbar',
                certifications: ['Siemens Solution Partner', 'Beckhoff Partner'],
                completedProjects: 45,
                createdAt: new Date().toISOString()
            },
            {
                id: 'solar-001',
                name: 'SunPower Energie GmbH',
                type: 'Photovoltaik',
                specializations: ['PV-Anlagen', 'Batteriespeicher', 'Energiemanagement', 'Wallbox'],
                contact: {
                    name: 'Anna Sonnenberg',
                    phone: '+49 176 6789012',
                    email: 'sonnenberg@sunpower-energie.de'
                },
                address: 'Sonnenweg 5, 82031 Gruenwald',
                rating: 4.8,
                hourlyRate: 68,
                availability: 'verfuegbar',
                certifications: ['SMA Partner', 'SolarEdge Partner', 'Fronius Partner'],
                completedProjects: 234,
                createdAt: new Date().toISOString()
            },
            {
                id: 'jalousie-001',
                name: 'Sonnenschutz Meier',
                type: 'Sonnenschutz',
                specializations: ['Jalousien', 'Rolllaeden', 'Markisen', 'Motorisierung'],
                contact: {
                    name: 'Robert Meier',
                    phone: '+49 177 7890123',
                    email: 'meier@sonnenschutz-meier.de'
                },
                address: 'Fensterstr. 17, 81677 Muenchen',
                rating: 4.5,
                hourlyRate: 52,
                availability: 'verfuegbar',
                certifications: ['Somfy Partner', 'Warema Partner'],
                completedProjects: 312,
                createdAt: new Date().toISOString()
            },
            {
                id: 'audio-001',
                name: 'AudioVision Pro',
                type: 'Multimedia',
                specializations: ['Multiroom Audio', 'Heimkino', 'Beschallung', 'Konferenztechnik'],
                contact: {
                    name: 'Markus Ton',
                    phone: '+49 178 8901234',
                    email: 'ton@audiovision-pro.de'
                },
                address: 'Klangweg 9, 80992 Muenchen',
                rating: 4.7,
                hourlyRate: 78,
                availability: 'verfuegbar',
                certifications: ['Sonos Partner', 'Control4 Dealer'],
                completedProjects: 98,
                createdAt: new Date().toISOString()
            }
        ],
        assignments: {}
    };
}

// Get all subcontractors
async function getAllSubcontractors(req, res) {
    try {
        const data = loadSubcontractors();
        res.json({
            success: true,
            count: data.subcontractors.length,
            subcontractors: data.subcontractors
        });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Get all error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Get subcontractors by specialization
async function getSubcontractorsBySpecialization(req, res) {
    try {
        const { specialization } = req.params;
        const data = loadSubcontractors();

        const filtered = data.subcontractors.filter(s =>
            s.specializations.some(spec =>
                spec.toLowerCase().includes(specialization.toLowerCase())
            ) ||
            s.type.toLowerCase().includes(specialization.toLowerCase())
        );

        res.json({
            success: true,
            count: filtered.length,
            subcontractors: filtered
        });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Filter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Get single subcontractor
async function getSubcontractor(req, res) {
    try {
        const { id } = req.params;
        const data = loadSubcontractors();
        const subcontractor = data.subcontractors.find(s => s.id === id);

        if (!subcontractor) {
            return res.status(404).json({ success: false, error: 'Subunternehmer nicht gefunden' });
        }

        res.json({ success: true, subcontractor });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Get error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Add new subcontractor
async function addSubcontractor(req, res) {
    try {
        const subcontractorData = req.body;
        const data = loadSubcontractors();

        const newSubcontractor = {
            id: `sub-${crypto.randomBytes(4).toString('hex')}`,
            ...subcontractorData,
            rating: subcontractorData.rating || 0,
            completedProjects: 0,
            createdAt: new Date().toISOString()
        };

        data.subcontractors.push(newSubcontractor);
        saveSubcontractors(data);

        res.json({
            success: true,
            message: 'Subunternehmer hinzugefuegt',
            subcontractor: newSubcontractor
        });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Add error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Assign subcontractor to project
async function assignToProject(req, res) {
    try {
        const { subcontractorId, customerId } = req.params;
        const { tasks, startDate, endDate, notes } = req.body;

        const data = loadSubcontractors();

        const subcontractor = data.subcontractors.find(s => s.id === subcontractorId);
        if (!subcontractor) {
            return res.status(404).json({ success: false, error: 'Subunternehmer nicht gefunden' });
        }

        if (!data.assignments[customerId]) {
            data.assignments[customerId] = [];
        }

        const assignment = {
            id: `assign-${crypto.randomBytes(4).toString('hex')}`,
            subcontractorId,
            subcontractorName: subcontractor.name,
            subcontractorContact: subcontractor.contact,
            tasks: tasks || [],
            startDate,
            endDate,
            notes,
            status: 'geplant',
            createdAt: new Date().toISOString()
        };

        data.assignments[customerId].push(assignment);
        saveSubcontractors(data);

        res.json({
            success: true,
            message: 'Subunternehmer zugewiesen',
            assignment
        });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Assign error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Get project assignments
async function getProjectAssignments(req, res) {
    try {
        const { customerId } = req.params;
        const data = loadSubcontractors();

        const assignments = data.assignments[customerId] || [];

        res.json({
            success: true,
            customerId,
            count: assignments.length,
            assignments
        });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Get assignments error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Find best subcontractors for project requirements
async function findBestMatch(req, res) {
    try {
        const { requirements } = req.body; // Array of required specializations
        const data = loadSubcontractors();

        const matches = [];

        for (const requirement of requirements) {
            const matching = data.subcontractors
                .filter(s =>
                    s.availability !== 'nicht_verfuegbar' &&
                    (s.specializations.some(spec =>
                        spec.toLowerCase().includes(requirement.toLowerCase())
                    ) ||
                    s.type.toLowerCase().includes(requirement.toLowerCase()))
                )
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 3);

            if (matching.length > 0) {
                matches.push({
                    requirement,
                    recommended: matching[0],
                    alternatives: matching.slice(1)
                });
            }
        }

        res.json({
            success: true,
            matches
        });
    } catch (error) {
        console.error('[SUBCONTRACTOR] Find match error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Setup routes
function setupSubcontractorRoutes(app) {
    // Get all subcontractors
    app.get('/api/subcontractors', getAllSubcontractors);

    // Get subcontractors by specialization
    app.get('/api/subcontractors/specialization/:specialization', getSubcontractorsBySpecialization);

    // Get single subcontractor
    app.get('/api/subcontractors/:id', getSubcontractor);

    // Add new subcontractor
    app.post('/api/subcontractors', express.json(), addSubcontractor);

    // Find best match for requirements
    app.post('/api/subcontractors/find-match', express.json(), findBestMatch);

    // Assign subcontractor to project
    app.post('/api/subcontractors/:subcontractorId/assign/:customerId', express.json(), assignToProject);

    // Get project assignments
    app.get('/api/customer/:customerId/subcontractors', getProjectAssignments);

    console.log('[SUBCONTRACTOR] API routes registered');
}

module.exports = {
    setupSubcontractorRoutes,
    loadSubcontractors,
    saveSubcontractors,
    getDefaultSubcontractors
};
