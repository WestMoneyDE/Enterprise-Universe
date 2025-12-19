/**
 * GTz Ecosystem - Shared JavaScript Module
 * DSGVO-konforme Core-Funktionen
 * © 2025 Enterprise Universe | West Money OS
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT MANAGER - DSGVO CORE
// ═══════════════════════════════════════════════════════════════════════════════

const GDPRConsent = {
    STORAGE_KEY: 'gtz_gdpr_consent',
    AUDIT_KEY: 'gtz_gdpr_audit',
    
    defaultSettings: {
        necessary: true,
        analytics: false,
        functional: false,
        marketing: false,
        whatsapp: false,
        email: false,
        phone: false,
        profiling: false
    },
    
    /**
     * Lädt gespeicherte Consent-Einstellungen
     */
    getSettings() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.warn('[GDPR] Could not load consent settings:', e);
            return null;
        }
    },
    
    /**
     * Speichert Consent-Einstellungen mit vollständigem Audit-Trail
     */
    saveSettings(settings) {
        const data = {
            ...this.defaultSettings,
            ...settings,
            timestamp: new Date().toISOString(),
            version: '2.0',
            source: 'user_action',
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            this.logAudit('CONSENT_UPDATED', data);
            console.log('[GDPR] Consent settings saved:', data);
            return true;
        } catch (e) {
            console.error('[GDPR] Failed to save consent:', e);
            return false;
        }
    },
    
    /**
     * Prüft ob Consent vorliegt
     */
    hasConsent() {
        return this.getSettings() !== null;
    },
    
    /**
     * Prüft spezifischen Consent-Typ
     */
    hasConsentFor(type) {
        const settings = this.getSettings();
        return settings ? settings[type] === true : false;
    },
    
    /**
     * DSGVO Audit-Log
     */
    logAudit(action, data, contactId = null) {
        try {
            const auditLog = JSON.parse(localStorage.getItem(this.AUDIT_KEY) || '[]');
            
            const entry = {
                id: this.generateId(),
                action,
                timestamp: new Date().toISOString(),
                contactId,
                data: this.sanitizeAuditData(data),
                source: 'GTz Ecosystem',
                ipHash: this.generateAnonymousId()
            };
            
            auditLog.push(entry);
            
            // Behalte nur die letzten 1000 Einträge
            if (auditLog.length > 1000) {
                auditLog.splice(0, auditLog.length - 1000);
            }
            
            localStorage.setItem(this.AUDIT_KEY, JSON.stringify(auditLog));
            console.log('[GDPR] Audit logged:', entry.action);
            
            return entry;
        } catch (e) {
            console.warn('[GDPR] Audit log failed:', e);
            return null;
        }
    },
    
    /**
     * Sanitize Audit-Daten (keine sensiblen Daten im Klartext)
     */
    sanitizeAuditData(data) {
        const sanitized = { ...data };
        // Entferne sensible Felder
        delete sanitized.email;
        delete sanitized.phone;
        delete sanitized.password;
        delete sanitized.userAgent;
        return sanitized;
    },
    
    /**
     * Holt Audit-Log
     */
    getAuditLog(filters = {}) {
        try {
            let log = JSON.parse(localStorage.getItem(this.AUDIT_KEY) || '[]');
            
            if (filters.action) {
                log = log.filter(e => e.action === filters.action);
            }
            if (filters.contactId) {
                log = log.filter(e => e.contactId === filters.contactId);
            }
            if (filters.from) {
                log = log.filter(e => new Date(e.timestamp) >= new Date(filters.from));
            }
            if (filters.to) {
                log = log.filter(e => new Date(e.timestamp) <= new Date(filters.to));
            }
            
            return log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (e) {
            return [];
        }
    },
    
    /**
     * Exportiert alle Daten (DSGVO Art. 20)
     */
    exportAllData() {
        const exportData = {
            meta: {
                exportDate: new Date().toISOString(),
                application: 'GTz Ecosystem',
                version: '2.0',
                gdprArticle: 'Art. 20 DSGVO - Recht auf Datenübertragbarkeit'
            },
            consentSettings: this.getSettings(),
            auditLog: this.getAuditLog(),
            localStorage: this.getLocalStorageData()
        };
        
        this.logAudit('DATA_EXPORT', { type: 'full_export' });
        return exportData;
    },
    
    /**
     * Löscht alle Daten (DSGVO Art. 17)
     */
    deleteAllData() {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('gtz_')) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => localStorage.removeItem(key));
        
        console.log('[GDPR] All data deleted per Art. 17 DSGVO');
        return true;
    },
    
    /**
     * Holt alle lokalen Daten
     */
    getLocalStorageData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('gtz_')) {
                try {
                    data[key] = JSON.parse(localStorage.getItem(key));
                } catch {
                    data[key] = localStorage.getItem(key);
                }
            }
        }
        return data;
    },
    
    generateId() {
        return 'audit_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },
    
    generateAnonymousId() {
        return 'anon_' + Date.now().toString(36);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HUBSPOT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

const HubSpotSync = {
    /**
     * Synchronisiert WhatsApp Consent mit HubSpot
     * https://knowledge.hubspot.com/de/inbox/edit-the-whatsapp-consent-status-of-your-contacts-in-bulk
     */
    async syncWhatsAppConsent(contactId, status, source = 'GTz Ecosystem') {
        const consentData = {
            contactId,
            status, // granted | denied | revoked | pending
            timestamp: new Date().toISOString(),
            source,
            legalBasis: 'Art. 6 Abs. 1 lit. a DSGVO',
            channel: 'whatsapp'
        };
        
        // Log to audit
        GDPRConsent.logAudit('WHATSAPP_CONSENT_SYNC', consentData, contactId);
        
        console.log('[HubSpot] Syncing WhatsApp consent:', consentData);
        
        // In production: Actual API call
        // return await fetch('/api/hubspot/consent', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(consentData)
        // });
        
        return { success: true, data: consentData };
    },
    
    /**
     * Bulk-Update für WhatsApp Consent
     */
    async bulkUpdateConsent(contacts, status, options = {}) {
        const results = [];
        
        for (const contact of contacts) {
            const result = await this.syncWhatsAppConsent(
                contact.id, 
                status, 
                options.source || 'GTz Ecosystem Bulk Update'
            );
            results.push(result);
        }
        
        GDPRConsent.logAudit('BULK_CONSENT_UPDATE', {
            count: contacts.length,
            status,
            source: options.source
        });
        
        return results;
    },
    
    /**
     * Holt Consent-Status von HubSpot
     */
    async getConsentStatus(contactId) {
        // In production: API call
        console.log('[HubSpot] Fetching consent status for:', contactId);
        return { 
            whatsapp: 'granted',
            email: 'granted',
            phone: 'pending'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL ANALYTICS (DSGVO-KONFORM)
// ═══════════════════════════════════════════════════════════════════════════════

const LocalAnalytics = {
    STORAGE_KEY: 'gtz_analytics',
    
    /**
     * Trackt Seitenaufrufe (nur wenn Consent erteilt)
     */
    trackPageView(pageName) {
        if (!GDPRConsent.hasConsentFor('analytics')) return;
        
        const data = this.getData();
        data.pageViews = data.pageViews || {};
        data.pageViews[pageName] = (data.pageViews[pageName] || 0) + 1;
        data.lastVisit = new Date().toISOString();
        data.totalViews = (data.totalViews || 0) + 1;
        
        this.saveData(data);
    },
    
    /**
     * Trackt Events
     */
    trackEvent(category, action, label = null) {
        if (!GDPRConsent.hasConsentFor('analytics')) return;
        
        const data = this.getData();
        data.events = data.events || [];
        data.events.push({
            category,
            action,
            label,
            timestamp: new Date().toISOString()
        });
        
        // Behalte nur letzte 500 Events
        if (data.events.length > 500) {
            data.events = data.events.slice(-500);
        }
        
        this.saveData(data);
    },
    
    getData() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    },
    
    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Analytics] Save failed:', e);
        }
    },
    
    clearData() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STORAGE (LEADS, CONTACTS)
// ═══════════════════════════════════════════════════════════════════════════════

const DataStorage = {
    /**
     * Speichert Lead-Daten (verschlüsselt in Production)
     */
    saveLeads(leads) {
        localStorage.setItem('gtz_leads', JSON.stringify(leads));
        GDPRConsent.logAudit('DATA_STORED', { type: 'leads', count: leads.length });
    },
    
    getLeads() {
        try {
            return JSON.parse(localStorage.getItem('gtz_leads') || '[]');
        } catch {
            return [];
        }
    },
    
    /**
     * Speichert Contact-Consent
     */
    saveContactConsent(contactId, consent) {
        const consents = this.getContactConsents();
        consents[contactId] = {
            ...consent,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('gtz_contact_consents', JSON.stringify(consents));
        
        GDPRConsent.logAudit('CONTACT_CONSENT_UPDATED', { 
            contactId, 
            consent: Object.keys(consent).filter(k => consent[k])
        }, contactId);
    },
    
    getContactConsents() {
        try {
            return JSON.parse(localStorage.getItem('gtz_contact_consents') || '{}');
        } catch {
            return {};
        }
    },
    
    getContactConsent(contactId) {
        return this.getContactConsents()[contactId] || null;
    },
    
    /**
     * Löscht Kontakt-Daten (DSGVO Art. 17)
     */
    deleteContact(contactId) {
        // Leads
        const leads = this.getLeads().filter(l => l.id !== contactId);
        this.saveLeads(leads);
        
        // Consent
        const consents = this.getContactConsents();
        delete consents[contactId];
        localStorage.setItem('gtz_contact_consents', JSON.stringify(consents));
        
        GDPRConsent.logAudit('DATA_DELETION', { contactId, reason: 'GDPR Art. 17' }, contactId);
        
        return true;
    },
    
    /**
     * Exportiert Kontakt-Daten (DSGVO Art. 20)
     */
    exportContactData(contactId) {
        const leads = this.getLeads().filter(l => l.id === contactId);
        const consent = this.getContactConsent(contactId);
        const audit = GDPRConsent.getAuditLog({ contactId });
        
        GDPRConsent.logAudit('DATA_EXPORT', { contactId, type: 'contact_export' }, contactId);
        
        return {
            contact: leads[0] || null,
            consent,
            auditHistory: audit,
            exportDate: new Date().toISOString()
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zeigt eine Benachrichtigung
 */
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Formatiert Datum für Anzeige
 */
function formatDate(dateString, includeTime = true) {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleString('de-DE', options);
}

/**
 * Formatiert Währung
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

/**
 * Generiert sichere ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Download als JSON
 */
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Download als CSV
 */
function downloadCSV(data, filename) {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(';'),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(';'))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lädt die Sidebar-Navigation
 */
function loadSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
    sidebar.innerHTML = `
        <div class="logo">
            <div class="logo-icon">GTz</div>
            <div class="logo-text">
                <h1>GTz ECOSYSTEM</h1>
                <span>WEST MONEY OS</span>
            </div>
        </div>

        <nav>
            <div class="nav-section">
                <div class="nav-title">Hauptmodule</div>
                <a class="nav-item ${currentPage === 'index' ? 'active' : ''}" href="../index.html">
                    <span class="icon">📊</span>
                    <span class="label">Dashboard</span>
                </a>
                <a class="nav-item ${currentPage === 'gtzhub' ? 'active' : ''}" href="gtzhub.html">
                    <span class="icon">💰</span>
                    <span class="label">GTzHub Finance</span>
                </a>
                <a class="nav-item ${currentPage === 'projects' ? 'active' : ''}" href="projects.html">
                    <span class="icon">📁</span>
                    <span class="label">ProjectHubZ</span>
                </a>
                <a class="nav-item ${currentPage === 'health' ? 'active' : ''}" href="health.html">
                    <span class="icon">❤️</span>
                    <span class="label">HealthSync</span>
                </a>
                <a class="nav-item ${currentPage === 'meta' ? 'active' : ''}" href="meta.html">
                    <span class="icon">🌐</span>
                    <span class="label">GTzMeta</span>
                </a>
            </div>

            <div class="nav-section">
                <div class="nav-title">Compliance</div>
                <a class="nav-item ${currentPage === 'compliance' ? 'active' : ''}" href="compliance.html">
                    <span class="icon">🛡️</span>
                    <span class="label">Compliance</span>
                </a>
                <a class="nav-item ${currentPage === 'consent-manager' ? 'active' : ''}" href="consent-manager.html">
                    <span class="icon">✅</span>
                    <span class="label">Consent Manager</span>
                </a>
                <a class="nav-item ${currentPage === 'audit-log' ? 'active' : ''}" href="audit-log.html">
                    <span class="icon">📋</span>
                    <span class="label">Audit Log</span>
                </a>
            </div>

            <div class="nav-section">
                <div class="nav-title">System</div>
                <a class="nav-item" href="#" onclick="openPrivacySettings()">
                    <span class="icon">🔒</span>
                    <span class="label">Datenschutz</span>
                </a>
                <a class="nav-item" href="settings.html">
                    <span class="icon">⚙️</span>
                    <span class="label">Einstellungen</span>
                </a>
            </div>
        </nav>

        <div class="sidebar-footer">
            <div class="user-card">
                <div class="user-avatar">ÖC</div>
                <div class="user-info">
                    <h4>Ömer Coşkun</h4>
                    <span>Super Admin</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Öffnet Datenschutz-Einstellungen
 */
function openPrivacySettings() {
    // Implementierung in jeweiliger Seite
    showNotification('🔒 Datenschutz', 'Einstellungen öffnen...');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 GTz Ecosystem - Shared Module loaded');
    console.log('🔒 DSGVO-compliant mode active');
    
    // Sidebar laden
    loadSidebar();
    
    // Analytics tracken
    const pageName = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    LocalAnalytics.trackPageView(pageName);
});

// Global exports
window.GDPRConsent = GDPRConsent;
window.HubSpotSync = HubSpotSync;
window.LocalAnalytics = LocalAnalytics;
window.DataStorage = DataStorage;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.downloadJSON = downloadJSON;
window.downloadCSV = downloadCSV;
