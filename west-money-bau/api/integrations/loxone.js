/**
 * LOXONE Smart Home Integration for West Money Bau
 * Handles smart home configuration, quotes, and monitoring
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// LOXONE Component Catalog with pricing
const COMPONENT_CATALOG = {
    // Core Components
    miniserver: {
        name: 'Miniserver Gen. 2',
        sku: 'LOXONE-MS-G2',
        price: 990,
        category: 'core',
        description: 'Zentrales Steuerungselement des Smart Homes'
    },
    miniserver_go: {
        name: 'Miniserver Go',
        sku: 'LOXONE-MS-GO',
        price: 690,
        category: 'core',
        description: 'Kompakter Miniserver fuer kleinere Projekte'
    },
    extension: {
        name: 'Extension',
        sku: 'LOXONE-EXT',
        price: 350,
        category: 'core',
        description: 'Erweiterungsmodul fuer zusaetzliche IOs'
    },

    // Lighting
    dimmer: {
        name: 'Dimmer Extension',
        sku: 'LOXONE-DIM-EXT',
        price: 420,
        category: 'lighting',
        description: '4-Kanal LED Dimmer'
    },
    touch_pure: {
        name: 'Touch Pure',
        sku: 'LOXONE-TP',
        price: 180,
        category: 'lighting',
        description: 'Kapazitiver Lichtschalter'
    },
    led_spot: {
        name: 'LED Spot RGBW',
        sku: 'LOXONE-LED-SPOT',
        price: 85,
        category: 'lighting',
        description: 'Deckeneinbaustrahler mit Farbsteuerung'
    },
    led_strip: {
        name: 'LED Strip RGBW (pro Meter)',
        sku: 'LOXONE-LED-STRIP',
        price: 45,
        category: 'lighting',
        description: 'Flexibles LED Band'
    },

    // Climate
    room_comfort_sensor: {
        name: 'Room Comfort Sensor',
        sku: 'LOXONE-RCS',
        price: 220,
        category: 'climate',
        description: 'Temperatur, Feuchte, CO2 Sensor'
    },
    climate_controller: {
        name: 'Climate Controller',
        sku: 'LOXONE-CC',
        price: 380,
        category: 'climate',
        description: 'Steuerung fuer Heizung/Kuehlung'
    },
    valve_actuator: {
        name: 'Valve Actuator',
        sku: 'LOXONE-VA',
        price: 65,
        category: 'climate',
        description: 'Stellantrieb fuer Heizkoerper'
    },

    // Shading
    shading_controller: {
        name: 'Shading Controller',
        sku: 'LOXONE-SC',
        price: 250,
        category: 'shading',
        description: 'Steuerung fuer Jalousien/Rolllaeden'
    },
    weather_station: {
        name: 'Weather Station',
        sku: 'LOXONE-WS',
        price: 350,
        category: 'shading',
        description: 'Wind, Regen, Temperatur Sensor'
    },

    // Audio
    audioserver: {
        name: 'Audioserver',
        sku: 'LOXONE-AS',
        price: 890,
        category: 'audio',
        description: 'Multi-Room Audio Server'
    },
    wall_speaker: {
        name: 'Wall Speaker',
        sku: 'LOXONE-WS',
        price: 380,
        category: 'audio',
        description: 'Einbau-Deckenlautsprecher'
    },

    // Security
    intercom: {
        name: 'Intercom',
        sku: 'LOXONE-IC',
        price: 750,
        category: 'security',
        description: 'Video Tuersprechanlage'
    },
    motion_sensor: {
        name: 'Motion Sensor Air',
        sku: 'LOXONE-MS-AIR',
        price: 120,
        category: 'security',
        description: 'Funk-Bewegungsmelder'
    },
    door_window_contact: {
        name: 'Door/Window Contact Air',
        sku: 'LOXONE-DWC',
        price: 55,
        category: 'security',
        description: 'Funk Tuer-/Fensterkontakt'
    },
    smoke_detector: {
        name: 'Smoke Detector Air',
        sku: 'LOXONE-SD',
        price: 95,
        category: 'security',
        description: 'Funk-Rauchmelder'
    }
};

// Room type presets with recommended components
const ROOM_PRESETS = {
    wohnzimmer: {
        name: 'Wohnzimmer',
        components: [
            { component: 'touch_pure', quantity: 2 },
            { component: 'led_spot', quantity: 8 },
            { component: 'dimmer', quantity: 1 },
            { component: 'room_comfort_sensor', quantity: 1 },
            { component: 'wall_speaker', quantity: 2 },
            { component: 'shading_controller', quantity: 1 }
        ]
    },
    schlafzimmer: {
        name: 'Schlafzimmer',
        components: [
            { component: 'touch_pure', quantity: 2 },
            { component: 'led_spot', quantity: 4 },
            { component: 'dimmer', quantity: 1 },
            { component: 'room_comfort_sensor', quantity: 1 },
            { component: 'shading_controller', quantity: 1 }
        ]
    },
    kueche: {
        name: 'Kueche',
        components: [
            { component: 'touch_pure', quantity: 1 },
            { component: 'led_spot', quantity: 6 },
            { component: 'led_strip', quantity: 3 },
            { component: 'room_comfort_sensor', quantity: 1 },
            { component: 'smoke_detector', quantity: 1 }
        ]
    },
    bad: {
        name: 'Badezimmer',
        components: [
            { component: 'touch_pure', quantity: 1 },
            { component: 'led_spot', quantity: 4 },
            { component: 'room_comfort_sensor', quantity: 1 },
            { component: 'valve_actuator', quantity: 1 }
        ]
    },
    flur: {
        name: 'Flur/Eingang',
        components: [
            { component: 'touch_pure', quantity: 1 },
            { component: 'led_spot', quantity: 4 },
            { component: 'motion_sensor', quantity: 1 },
            { component: 'intercom', quantity: 1 }
        ]
    },
    buero: {
        name: 'Buero/Arbeitszimmer',
        components: [
            { component: 'touch_pure', quantity: 1 },
            { component: 'led_spot', quantity: 6 },
            { component: 'room_comfort_sensor', quantity: 1 },
            { component: 'shading_controller', quantity: 1 }
        ]
    },
    terrasse: {
        name: 'Terrasse/Garten',
        components: [
            { component: 'led_strip', quantity: 5 },
            { component: 'motion_sensor', quantity: 2 },
            { component: 'weather_station', quantity: 1 }
        ]
    }
};

// Installation multipliers
const INSTALLATION_MULTIPLIERS = {
    new_build: 1.0,      // Neubau
    renovation: 1.3,      // Renovierung
    retrofit: 1.5         // Nachruestung
};

/**
 * Generate quote for LOXONE installation
 */
function generateQuote(config) {
    const { rooms, features, projectType, includeInstallation = true, includeTraining = true } = config;

    const breakdown = [];
    let hardwareTotal = 0;

    // Always include Miniserver
    const miniserver = COMPONENT_CATALOG.miniserver;
    breakdown.push({
        sku: miniserver.sku,
        item: miniserver.name,
        category: miniserver.category,
        quantity: 1,
        unitPrice: miniserver.price,
        total: miniserver.price
    });
    hardwareTotal += miniserver.price;

    // Add room components
    if (rooms && Array.isArray(rooms)) {
        for (const room of rooms) {
            const preset = ROOM_PRESETS[room.type];
            if (preset) {
                for (const comp of preset.components) {
                    const component = COMPONENT_CATALOG[comp.component];
                    if (component) {
                        const quantity = room.quantity ? comp.quantity * room.quantity : comp.quantity;
                        const total = component.price * quantity;

                        // Check if already in breakdown
                        const existing = breakdown.find(b => b.sku === component.sku);
                        if (existing) {
                            existing.quantity += quantity;
                            existing.total += total;
                        } else {
                            breakdown.push({
                                sku: component.sku,
                                item: component.name,
                                category: component.category,
                                quantity: quantity,
                                unitPrice: component.price,
                                total: total
                            });
                        }
                        hardwareTotal += total;
                    }
                }
            }
        }
    }

    // Add individual features/components
    if (features && typeof features === 'object') {
        for (const [componentKey, quantity] of Object.entries(features)) {
            if (quantity > 0 && COMPONENT_CATALOG[componentKey]) {
                const component = COMPONENT_CATALOG[componentKey];
                const total = component.price * quantity;

                const existing = breakdown.find(b => b.sku === component.sku);
                if (existing) {
                    existing.quantity += quantity;
                    existing.total += total;
                } else {
                    breakdown.push({
                        sku: component.sku,
                        item: component.name,
                        category: component.category,
                        quantity: quantity,
                        unitPrice: component.price,
                        total: total
                    });
                }
                hardwareTotal += total;
            }
        }
    }

    // Calculate installation
    let installationCost = 0;
    if (includeInstallation) {
        const multiplier = INSTALLATION_MULTIPLIERS[projectType] || 1.0;
        installationCost = Math.round(hardwareTotal * 0.35 * multiplier);
        breakdown.push({
            sku: 'INSTALL-001',
            item: 'Installation & Inbetriebnahme',
            category: 'service',
            quantity: 1,
            unitPrice: installationCost,
            total: installationCost
        });
    }

    // Programming/Configuration
    const programmingCost = Math.round(hardwareTotal * 0.15);
    breakdown.push({
        sku: 'PROG-001',
        item: 'Programmierung & Konfiguration',
        category: 'service',
        quantity: 1,
        unitPrice: programmingCost,
        total: programmingCost
    });

    // Training
    let trainingCost = 0;
    if (includeTraining) {
        trainingCost = 250;
        breakdown.push({
            sku: 'TRAIN-001',
            item: 'Einweisung & Schulung (2 Stunden)',
            category: 'service',
            quantity: 1,
            unitPrice: trainingCost,
            total: trainingCost
        });
    }

    const subtotal = hardwareTotal + installationCost + programmingCost + trainingCost;
    const vat = Math.round(subtotal * 0.19);
    const total = subtotal + vat;

    return {
        breakdown: breakdown,
        summary: {
            hardwareTotal: hardwareTotal,
            installationTotal: installationCost + programmingCost,
            trainingTotal: trainingCost,
            subtotal: subtotal,
            vatRate: 19,
            vat: vat,
            total: total
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        projectType: projectType,
        notes: [
            'Preise verstehen sich zzgl. eventueller Zusatzarbeiten',
            'Angebot gueltig fuer 30 Tage',
            'Anzahlung 30% bei Auftragserteilung',
            '2 Jahre Garantie auf alle LOXONE Komponenten'
        ]
    };
}

/**
 * Get component details
 */
function getComponent(componentKey) {
    return COMPONENT_CATALOG[componentKey] || null;
}

/**
 * Get all components by category
 */
function getComponentsByCategory(category) {
    return Object.entries(COMPONENT_CATALOG)
        .filter(([key, comp]) => comp.category === category)
        .map(([key, comp]) => ({ key, ...comp }));
}

/**
 * Get room preset
 */
function getRoomPreset(roomType) {
    return ROOM_PRESETS[roomType] || null;
}

/**
 * Get all room presets
 */
function getAllRoomPresets() {
    return Object.entries(ROOM_PRESETS).map(([key, preset]) => ({
        key,
        ...preset,
        estimatedCost: calculateRoomCost(key)
    }));
}

/**
 * Calculate estimated cost for a room type
 */
function calculateRoomCost(roomType) {
    const preset = ROOM_PRESETS[roomType];
    if (!preset) return 0;

    let total = 0;
    for (const comp of preset.components) {
        const component = COMPONENT_CATALOG[comp.component];
        if (component) {
            total += component.price * comp.quantity;
        }
    }
    return total;
}

/**
 * Create LOXONE project configuration
 */
function createProjectConfig(projectData) {
    const { projectId, customerName, address, rooms, features, notes } = projectData;

    return {
        projectId: projectId,
        customerName: customerName,
        address: address,
        createdAt: new Date().toISOString(),
        status: 'planning',
        configuration: {
            rooms: rooms,
            features: features
        },
        notes: notes,
        quote: generateQuote({
            rooms: rooms,
            features: features,
            projectType: 'new_build',
            includeInstallation: true,
            includeTraining: true
        })
    };
}

/**
 * Estimate maintenance contract cost
 */
function estimateMaintenanceCost(totalSystemValue) {
    // Annual maintenance typically 5-8% of system value
    const baseCost = totalSystemValue * 0.06;
    return {
        annual: Math.round(baseCost),
        monthly: Math.round(baseCost / 12),
        includes: [
            'Jaehrliche Systeminspektion',
            'Software-Updates',
            'Fernwartung & Support',
            'Reaktionszeit 24h',
            '10% Rabatt auf Ersatzteile'
        ]
    };
}

module.exports = {
    COMPONENT_CATALOG,
    ROOM_PRESETS,
    INSTALLATION_MULTIPLIERS,
    generateQuote,
    getComponent,
    getComponentsByCategory,
    getRoomPreset,
    getAllRoomPresets,
    calculateRoomCost,
    createProjectConfig,
    estimateMaintenanceCost
};
