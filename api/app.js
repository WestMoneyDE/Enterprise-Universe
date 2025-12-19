/**
 * GTz Ecosystem - Main Application JavaScript
 * DSGVO-konforme Implementierung
 * 
 * © 2025 Enterprise Universe | West Money OS
 * Entwickelt von Ömer Hüseyin Coşkun
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DSGVO CONSENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consent Storage - Lokale Speicherung ohne externe Tracker
 * Alle Daten bleiben auf dem Gerät des Nutzers
 */
const ConsentManager = {
    STORAGE_KEY: 'gtz_consent_settings',
    AUDIT_KEY: 'gtz_consent_audit',
    
    // Standardeinstellungen - nur notwendige Cookies aktiv
    defaultSettings: {
        necessary: true,      // Immer aktiviert, nicht änderbar
        analytics: false,     // Opt-in erforderlich
        functional: false,    // Opt-in erforderlich
        whatsapp: false,      // Explizite Einwilligung erforderlich (Art. 6 Abs. 1 lit. a DSGVO)
        timestamp: null,
        version: '1.0'
    },
    
    /**
     * Lädt gespeicherte Consent-Einstellungen
     */
    getSettings() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Consent settings could not be loaded:', e);
        }
        return null;
    },
    
    /**
     * Speichert Consent-Einstellungen mit Audit-Trail
     */
    saveSettings(settings) {
        const settingsWithMeta = {
            ...settings,
            timestamp: new Date().toISOString(),
            version: '1.0',
            userAgent: navigator.userAgent.substring(0, 100) // Gekürzt für Datenschutz
        };
        
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settingsWithMeta));
            this.logAudit('CONSENT_UPDATED', settingsWithMeta);
            return true;
        } catch (e) {
            console.error('Failed to save consent settings:', e);
            return false;
        }
    },
    
    /**
     * DSGVO Audit-Log - Protokolliert alle Consent-Änderungen
     */
    logAudit(action, data) {
        try {
            const auditLog = JSON.parse(localStorage.getItem(this.AUDIT_KEY) || '[]');
            
            auditLog.push({
                action,
                timestamp: new Date().toISOString(),
                data: {
                    analytics: data.analytics,
                    functional: data.functional,
                    whatsapp: data.whatsapp
                }
            });
            
            // Behalte nur die letzten 100 Einträge
            if (auditLog.length > 100) {
                auditLog.splice(0, auditLog.length - 100);
            }
            
            localStorage.setItem(this.AUDIT_KEY, JSON.stringify(auditLog));
        } catch (e) {
            console.warn('Audit log failed:', e);
        }
    },
    
    /**
     * Prüft ob Consent bereits erteilt wurde
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
     * Löscht alle Consent-Daten (DSGVO Art. 17 - Recht auf Löschung)
     */
    deleteAllData() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.AUDIT_KEY);
        console.log('All consent data deleted per GDPR Art. 17');
    },
    
    /**
     * Exportiert alle Consent-Daten (DSGVO Art. 20 - Datenübertragbarkeit)
     */
    exportData() {
        return {
            settings: this.getSettings(),
            auditLog: JSON.parse(localStorage.getItem(this.AUDIT_KEY) || '[]'),
            exportDate: new Date().toISOString()
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COOKIE BANNER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zeigt das Cookie-Banner wenn noch kein Consent vorliegt
 */
function initCookieBanner() {
    const banner = document.getElementById('gdprBanner');
    
    if (!ConsentManager.hasConsent()) {
        setTimeout(() => {
            banner.classList.add('visible');
        }, 500);
    }
}

/**
 * Akzeptiert alle Cookies
 */
function acceptAllCookies() {
    const settings = {
        necessary: true,
        analytics: true,
        functional: true,
        whatsapp: false // WhatsApp muss explizit in den Einstellungen aktiviert werden
    };
    
    ConsentManager.saveSettings(settings);
    hideCookieBanner();
    applyConsentSettings(settings);
    
    showNotification('✅ Einstellungen gespeichert', 'Alle Cookies wurden akzeptiert.');
}

/**
 * Lehnt optionale Cookies ab
 */
function rejectOptionalCookies() {
    const settings = {
        necessary: true,
        analytics: false,
        functional: false,
        whatsapp: false
    };
    
    ConsentManager.saveSettings(settings);
    hideCookieBanner();
    applyConsentSettings(settings);
    
    showNotification('✅ Einstellungen gespeichert', 'Nur notwendige Cookies aktiv.');
}

/**
 * Versteckt das Cookie-Banner
 */
function hideCookieBanner() {
    const banner = document.getElementById('gdprBanner');
    banner.classList.remove('visible');
}

/**
 * Zeigt die Cookie-Einstellungen Modal
 */
function showCookieSettings() {
    const modal = document.getElementById('cookieModal');
    modal.classList.add('visible');
    
    // Lade aktuelle Einstellungen
    const settings = ConsentManager.getSettings() || ConsentManager.defaultSettings;
    
    document.getElementById('analyticsCookies').checked = settings.analytics;
    document.getElementById('functionalCookies').checked = settings.functional;
    document.getElementById('whatsappConsent').checked = settings.whatsapp;
}

/**
 * Schließt die Cookie-Einstellungen Modal
 */
function closeCookieSettings() {
    const modal = document.getElementById('cookieModal');
    modal.classList.remove('visible');
}

/**
 * Speichert die individuellen Consent-Einstellungen
 */
function saveConsentSettings() {
    const settings = {
        necessary: true,
        analytics: document.getElementById('analyticsCookies').checked,
        functional: document.getElementById('functionalCookies').checked,
        whatsapp: document.getElementById('whatsappConsent').checked
    };
    
    ConsentManager.saveSettings(settings);
    closeCookieSettings();
    hideCookieBanner();
    applyConsentSettings(settings);
    
    showNotification('✅ Einstellungen gespeichert', 'Ihre Datenschutzeinstellungen wurden aktualisiert.');
    
    // Wenn WhatsApp Consent geändert wurde, HubSpot synchronisieren
    if (settings.whatsapp) {
        syncWhatsAppConsentToHubSpot(true);
    }
}

/**
 * Wendet Consent-Einstellungen an
 */
function applyConsentSettings(settings) {
    // Analytics aktivieren/deaktivieren
    if (settings.analytics) {
        console.log('📊 Analytics enabled (local only, no third-party tracking)');
        enableLocalAnalytics();
    } else {
        console.log('📊 Analytics disabled');
        disableLocalAnalytics();
    }
    
    // Funktionale Features
    if (settings.functional) {
        console.log('⚙️ Functional features enabled');
        enableFunctionalFeatures();
    }
    
    // WhatsApp Business Consent
    if (settings.whatsapp) {
        console.log('💬 WhatsApp Business consent granted');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY POLICY MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function showPrivacyPolicy() {
    document.getElementById('privacyModal').classList.add('visible');
}

function closePrivacyPolicy() {
    document.getElementById('privacyModal').classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL ANALYTICS (DSGVO-KONFORM)
// ═══════════════════════════════════════════════════════════════════════════════

const LocalAnalytics = {
    STORAGE_KEY: 'gtz_local_analytics',
    
    /**
     * Protokolliert Seitenaufrufe lokal
     */
    trackPageView(pageName) {
        if (!ConsentManager.hasConsentFor('analytics')) return;
        
        const data = this.getData();
        data.pageViews = data.pageViews || {};
        data.pageViews[pageName] = (data.pageViews[pageName] || 0) + 1;
        data.lastVisit = new Date().toISOString();
        data.totalViews = (data.totalViews || 0) + 1;
        
        this.saveData(data);
    },
    
    /**
     * Protokolliert Aktionen
     */
    trackAction(action, category) {
        if (!ConsentManager.hasConsentFor('analytics')) return;
        
        const data = this.getData();
        data.actions = data.actions || [];
        data.actions.push({
            action,
            category,
            timestamp: new Date().toISOString()
        });
        
        // Behalte nur letzte 500 Aktionen
        if (data.actions.length > 500) {
            data.actions = data.actions.slice(-500);
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
            console.warn('Analytics save failed:', e);
        }
    },
    
    clearData() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};

function enableLocalAnalytics() {
    window.gtzAnalyticsEnabled = true;
}

function disableLocalAnalytics() {
    window.gtzAnalyticsEnabled = false;
    LocalAnalytics.clearData();
}

function enableFunctionalFeatures() {
    // Aktiviere erweiterte Features wie Dashboard-Layout-Speicherung
    window.gtzFunctionalEnabled = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP CONSENT SYNC (HUBSPOT INTEGRATION)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simuliert die Synchronisation mit HubSpot
 * In Produktion: API-Call zu HubSpot
 * https://knowledge.hubspot.com/de/inbox/edit-the-whatsapp-consent-status-of-your-contacts-in-bulk
 */
function syncWhatsAppConsentToHubSpot(consentGranted) {
    const consentData = {
        status: consentGranted ? 'granted' : 'denied',
        timestamp: new Date().toISOString(),
        source: 'GTz Ecosystem Web App',
        legalBasis: 'Art. 6 Abs. 1 lit. a DSGVO',
        ipHash: hashIP(), // Anonymisiert
        userAgent: navigator.userAgent.substring(0, 50)
    };
    
    console.log('📤 Syncing WhatsApp consent to HubSpot:', consentData);
    
    // Audit-Log Eintrag
    logConsentAudit('WHATSAPP_CONSENT_SYNC', consentData);
    
    // In Produktion: Tatsächlicher API-Call
    // fetch('/api/hubspot/consent', { method: 'POST', body: JSON.stringify(consentData) });
    
    return consentData;
}

/**
 * Anonymisierte IP-Hash-Funktion
 */
function hashIP() {
    // In Produktion: Server-seitig hashen
    return 'anonymized_' + Date.now().toString(36);
}

/**
 * Consent Audit Logging
 */
function logConsentAudit(action, data) {
    const auditEntry = {
        action,
        data,
        timestamp: new Date().toISOString()
    };
    
    // Speichere in lokalem Audit-Log
    const auditLog = JSON.parse(localStorage.getItem('gtz_consent_audit') || '[]');
    auditLog.push(auditEntry);
    localStorage.setItem('gtz_consent_audit', JSON.stringify(auditLog.slice(-100)));
    
    console.log('📋 Audit logged:', auditEntry);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zeigt die gewählte Seite an
 */
function showPage(pageName) {
    // Verstecke alle Seiten
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Zeige gewählte Seite
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Analytics tracken
    LocalAnalytics.trackPageView(pageName);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zeigt eine Benachrichtigung an
 */
function showNotification(title, message) {
    // Erstelle Notification Element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-surface);
        border: 1px solid var(--border-bright);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        z-index: 10002;
        max-width: 350px;
        box-shadow: var(--glow);
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="color: var(--text-secondary); font-size: 0.9rem;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA EXPORT (DSGVO Art. 20)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exportiert alle Nutzerdaten als JSON
 */
function exportAllUserData() {
    const exportData = {
        meta: {
            exportDate: new Date().toISOString(),
            application: 'GTz Ecosystem',
            version: '1.0',
            gdprArticle: 'Art. 20 DSGVO - Recht auf Datenübertragbarkeit'
        },
        consent: ConsentManager.exportData(),
        analytics: LocalAnalytics.getData(),
        preferences: JSON.parse(localStorage.getItem('gtz_preferences') || '{}')
    };
    
    // Download als JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gtz_data_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('📥 Export abgeschlossen', 'Ihre Daten wurden heruntergeladen.');
}

/**
 * Löscht alle Nutzerdaten (DSGVO Art. 17)
 */
function deleteAllUserData() {
    if (confirm('⚠️ Sind Sie sicher, dass Sie alle Ihre Daten löschen möchten?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) {
        ConsentManager.deleteAllData();
        LocalAnalytics.clearData();
        localStorage.removeItem('gtz_preferences');
        
        showNotification('🗑️ Daten gelöscht', 'Alle Ihre Daten wurden gemäß DSGVO Art. 17 gelöscht.');
        
        // Reload nach kurzer Verzögerung
        setTimeout(() => location.reload(), 2000);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 GTz Ecosystem initialized');
    console.log('🔒 DSGVO-compliant mode active');
    
    // Cookie-Banner initialisieren
    initCookieBanner();
    
    // Consent-Einstellungen anwenden wenn vorhanden
    const settings = ConsentManager.getSettings();
    if (settings) {
        applyConsentSettings(settings);
    }
    
    // Initial Analytics
    LocalAnalytics.trackPageView('dashboard');
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC schließt Modals
        if (e.key === 'Escape') {
            closeCookieSettings();
            closePrivacyPolicy();
        }
    });
    
    // Click outside modal closes it
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
            }
        });
    });
});

// CSS Animation für Notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Expose functions globally
window.acceptAllCookies = acceptAllCookies;
window.rejectOptionalCookies = rejectOptionalCookies;
window.showCookieSettings = showCookieSettings;
window.closeCookieSettings = closeCookieSettings;
window.saveConsentSettings = saveConsentSettings;
window.showPrivacyPolicy = showPrivacyPolicy;
window.closePrivacyPolicy = closePrivacyPolicy;
window.showPage = showPage;
window.exportAllUserData = exportAllUserData;
window.deleteAllUserData = deleteAllUserData;
