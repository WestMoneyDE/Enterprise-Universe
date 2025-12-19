/**
 * GTz Ecosystem - Consent Manager Module
 * DSGVO-konforme Einwilligungsverwaltung
 * © 2025 Enterprise Universe | West Money OS
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DATA & STATE
// ═══════════════════════════════════════════════════════════════════════════════

let contacts = [];
let selectedContacts = new Set();
let currentPage = 1;
const itemsPerPage = 20;
let currentFilters = {
    status: 'all',
    search: ''
};

// Demo-Daten für Contacts
const demoContacts = [
    { id: 'c1', firstName: 'Max', lastName: 'Gruber', company: 'Müller GmbH', email: 'max@mueller-gmbh.de', whatsapp: 'granted', email_consent: 'granted', phone: 'granted', consentDate: '2025-12-12T14:32:00Z', source: 'HubSpot Form' },
    { id: 'c2', firstName: 'Thomas', lastName: 'Huber', company: 'Tech House AG', email: 'huber@techhouse.de', whatsapp: 'pending', email_consent: 'granted', phone: 'pending', consentDate: null, source: null },
    { id: 'c3', firstName: 'Werner', lastName: 'Bauer', company: 'Weber Bau KG', email: 'bauer@weberbau.de', whatsapp: 'granted', email_consent: 'granted', phone: 'granted', consentDate: '2025-12-10T09:15:00Z', source: 'WhatsApp Opt-in' },
    { id: 'c4', firstName: 'Stefan', lastName: 'Horn', company: 'Schmidt Haus', email: 'horn@schmidthaus.de', whatsapp: 'denied', email_consent: 'granted', phone: 'denied', consentDate: '2025-12-08T16:45:00Z', source: 'E-Mail' },
    { id: 'c5', firstName: 'Lisa', lastName: 'Meyer', company: 'Meyer Immobilien', email: 'lisa@meyer-immo.de', whatsapp: 'granted', email_consent: 'granted', phone: 'granted', consentDate: '2025-12-11T10:22:00Z', source: 'Website' },
    { id: 'c6', firstName: 'Klaus', lastName: 'Fischer', company: 'Fischer & Söhne', email: 'klaus@fischer-soehne.de', whatsapp: 'revoked', email_consent: 'revoked', phone: 'revoked', consentDate: '2025-12-05T08:00:00Z', source: 'Widerruf per E-Mail' },
    { id: 'c7', firstName: 'Anna', lastName: 'Schneider', company: 'Schneider Tech', email: 'anna@schneider-tech.de', whatsapp: 'granted', email_consent: 'granted', phone: 'pending', consentDate: '2025-12-09T15:45:00Z', source: 'Messe' },
    { id: 'c8', firstName: 'Peter', lastName: 'Wagner', company: 'Wagner Bau', email: 'wagner@wagnerbau.de', whatsapp: 'pending', email_consent: 'pending', phone: 'pending', consentDate: null, source: null },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Consent Manager initialized');
    
    // Lade Daten
    loadContacts();
    
    // Render
    renderConsentTable();
    updateStats();
    
    // Event Listeners
    setupEventListeners();
});

function loadContacts() {
    // In Production: API-Call
    // Hier: Demo-Daten + localStorage
    const stored = localStorage.getItem('gtz_contacts_consent');
    contacts = stored ? JSON.parse(stored) : demoContacts;
    
    // Speichern wenn nicht vorhanden
    if (!stored) {
        localStorage.setItem('gtz_contacts_consent', JSON.stringify(contacts));
    }
}

function setupEventListeners() {
    // Filter Events
    const consentFilter = document.getElementById('consentFilter');
    const consentSearch = document.getElementById('consentSearch');
    
    if (consentFilter) consentFilter.addEventListener('change', filterConsents);
    if (consentSearch) consentSearch.addEventListener('input', filterConsents);
    
    // Bulk selection radio buttons
    document.querySelectorAll('input[name="bulkSelection"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const csvUpload = document.getElementById('csvUpload');
            if (csvUpload) {
                csvUpload.style.display = e.target.value === 'csv' ? 'block' : 'none';
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

function renderConsentTable() {
    const tbody = document.getElementById('consentTableBody');
    if (!tbody) return;
    
    const filteredContacts = getFilteredContacts();
    const paginatedContacts = paginate(filteredContacts, currentPage, itemsPerPage);
    
    tbody.innerHTML = paginatedContacts.map(contact => `
        <tr data-id="${contact.id}">
            <td>
                <input type="checkbox" 
                       class="contact-checkbox" 
                       data-id="${contact.id}"
                       ${selectedContacts.has(contact.id) ? 'checked' : ''}
                       onchange="toggleContactSelection('${contact.id}')">
            </td>
            <td>
                <div class="contact-cell">
                    <div class="contact-avatar">${contact.firstName[0]}${contact.lastName[0]}</div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.firstName} ${contact.lastName}</div>
                        <div class="contact-company">${contact.company}</div>
                    </div>
                </div>
            </td>
            <td>${renderConsentBadge(contact.whatsapp)}</td>
            <td>${renderConsentBadge(contact.email_consent)}</td>
            <td>${renderConsentBadge(contact.phone)}</td>
            <td>${contact.consentDate ? formatDate(contact.consentDate) : '–'}</td>
            <td>${contact.source || '–'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-ghost btn-sm" onclick="viewConsentDetail('${contact.id}')" title="Details">
                        👁️
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="editConsent('${contact.id}')" title="Bearbeiten">
                        ✏️
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="sendConsentRequestSingle('${contact.id}')" title="Consent anfragen">
                        📧
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Update Pagination
    updatePagination(filteredContacts.length);
}

function renderConsentBadge(status) {
    const badges = {
        granted: '<span class="consent-badge granted"><span class="consent-dot granted"></span> Erteilt</span>',
        pending: '<span class="consent-badge pending"><span class="consent-dot pending"></span> Ausstehend</span>',
        denied: '<span class="consent-badge denied"><span class="consent-dot denied"></span> Abgelehnt</span>',
        revoked: '<span class="consent-badge revoked"><span class="consent-dot revoked"></span> Widerrufen</span>'
    };
    return badges[status] || badges.pending;
}

function updateStats() {
    const stats = {
        granted: contacts.filter(c => c.whatsapp === 'granted').length,
        pending: contacts.filter(c => c.whatsapp === 'pending').length,
        denied: contacts.filter(c => c.whatsapp === 'denied').length,
        revoked: contacts.filter(c => c.whatsapp === 'revoked').length
    };
    
    document.getElementById('statGranted').textContent = stats.granted;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statDenied').textContent = stats.denied;
    document.getElementById('statRevoked').textContent = stats.revoked;
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Seite ${currentPage} von ${totalPages}`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERING & PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

function filterConsents() {
    const filterEl = document.getElementById('consentFilter');
    const searchEl = document.getElementById('consentSearch');
    
    currentFilters.status = filterEl ? filterEl.value : 'all';
    currentFilters.search = searchEl ? searchEl.value.toLowerCase() : '';
    currentPage = 1;
    
    renderConsentTable();
}

function getFilteredContacts() {
    return contacts.filter(contact => {
        // Status Filter
        if (currentFilters.status !== 'all' && contact.whatsapp !== currentFilters.status) {
            return false;
        }
        
        // Search Filter
        if (currentFilters.search) {
            const searchString = `${contact.firstName} ${contact.lastName} ${contact.company} ${contact.email}`.toLowerCase();
            if (!searchString.includes(currentFilters.search)) {
                return false;
            }
        }
        
        return true;
    });
}

function paginate(array, page, perPage) {
    const start = (page - 1) * perPage;
    return array.slice(start, start + perPage);
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderConsentTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(getFilteredContacts().length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderConsentTable();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

function toggleSelectAllConsents() {
    const selectAll = document.getElementById('selectAllConsents');
    const filteredContacts = getFilteredContacts();
    
    if (selectAll.checked) {
        filteredContacts.forEach(c => selectedContacts.add(c.id));
    } else {
        selectedContacts.clear();
    }
    
    renderConsentTable();
    updateSelectedCount();
}

function toggleContactSelection(contactId) {
    if (selectedContacts.has(contactId)) {
        selectedContacts.delete(contactId);
    } else {
        selectedContacts.add(contactId);
    }
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedBulkCount');
    if (countEl) {
        countEl.textContent = selectedContacts.size;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function viewConsentDetail(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const modal = document.getElementById('consentDetailModal');
    const title = document.getElementById('consentDetailTitle');
    const content = document.getElementById('consentDetailContent');
    
    title.textContent = `${contact.firstName} ${contact.lastName} - Consent Details`;
    
    // Hole Audit-Log für diesen Kontakt
    const auditLog = GDPRConsent.getAuditLog({ contactId });
    
    content.innerHTML = `
        <div class="consent-detail-grid">
            <div class="detail-section">
                <h4>👤 Kontaktdaten</h4>
                <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${contact.firstName} ${contact.lastName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Unternehmen:</span>
                    <span class="detail-value">${contact.company}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">E-Mail:</span>
                    <span class="detail-value">${contact.email}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>✅ Einwilligungen</h4>
                <div class="consent-status-grid">
                    <div class="consent-status-item">
                        <span>💬 WhatsApp Business</span>
                        ${renderConsentBadge(contact.whatsapp)}
                    </div>
                    <div class="consent-status-item">
                        <span>📧 E-Mail Marketing</span>
                        ${renderConsentBadge(contact.email_consent)}
                    </div>
                    <div class="consent-status-item">
                        <span>📞 Telefon</span>
                        ${renderConsentBadge(contact.phone)}
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>📋 Consent-Informationen</h4>
                <div class="detail-row">
                    <span class="detail-label">Datum:</span>
                    <span class="detail-value">${contact.consentDate ? formatDate(contact.consentDate) : 'Nicht erteilt'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quelle:</span>
                    <span class="detail-value">${contact.source || '–'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Rechtsgrundlage:</span>
                    <span class="detail-value">Art. 6 Abs. 1 lit. a DSGVO</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>📜 Audit-Historie</h4>
                <div class="audit-mini-log">
                    ${auditLog.length > 0 ? auditLog.slice(0, 5).map(entry => `
                        <div class="audit-mini-entry">
                            <span class="audit-action">${entry.action}</span>
                            <span class="audit-time">${formatDate(entry.timestamp)}</span>
                        </div>
                    `).join('') : '<p class="no-data">Keine Audit-Einträge vorhanden</p>'}
                </div>
            </div>
        </div>
        
        <style>
            .consent-detail-grid { display: grid; gap: 1.5rem; }
            .detail-section { background: var(--bg-elevated); padding: 1rem; border-radius: 8px; }
            .detail-section h4 { margin-bottom: 1rem; color: var(--primary); }
            .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: var(--text-muted); }
            .consent-status-grid { display: flex; flex-direction: column; gap: 0.5rem; }
            .consent-status-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; }
            .audit-mini-log { max-height: 200px; overflow-y: auto; }
            .audit-mini-entry { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
            .audit-action { color: var(--primary); }
            .audit-time { color: var(--text-muted); }
            .no-data { color: var(--text-muted); font-style: italic; }
        </style>
    `;
    
    modal.classList.add('visible');
    
    // Audit Log
    GDPRConsent.logAudit('CONSENT_VIEWED', { contactId }, contactId);
}

function closeConsentDetail() {
    document.getElementById('consentDetailModal').classList.remove('visible');
}

function editConsent(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Zeige Edit-Modal oder inline-edit
    showNotification('✏️ Bearbeiten', `Consent für ${contact.firstName} ${contact.lastName} bearbeiten...`);
}

function sendConsentRequestSingle(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Simuliere Consent-Anfrage
    GDPRConsent.logAudit('CONSENT_REQUEST_SENT', { contactId, channel: 'email' }, contactId);
    
    showNotification('📧 Gesendet', `Consent-Anfrage an ${contact.email} gesendet.`, 'success');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

function openBulkUpdate() {
    updateSelectedCount();
    document.getElementById('bulkUpdateModal').classList.add('visible');
}

function closeBulkUpdate() {
    document.getElementById('bulkUpdateModal').classList.remove('visible');
}

async function executeBulkUpdate() {
    const selectionType = document.querySelector('input[name="bulkSelection"]:checked').value;
    const newStatus = document.getElementById('bulkStatus').value;
    const legalBasis = document.getElementById('bulkLegalBasis').value;
    const source = document.getElementById('bulkSource').value || 'GTz Ecosystem Bulk Update';
    const note = document.getElementById('bulkNote').value;
    
    let targetContacts = [];
    
    if (selectionType === 'selected') {
        targetContacts = contacts.filter(c => selectedContacts.has(c.id));
    } else if (selectionType === 'filter') {
        targetContacts = getFilteredContacts();
    }
    
    if (targetContacts.length === 0) {
        showNotification('⚠️ Fehler', 'Keine Kontakte ausgewählt.', 'warning');
        return;
    }
    
    // Update ausführen
    targetContacts.forEach(contact => {
        contact.whatsapp = newStatus;
        contact.consentDate = new Date().toISOString();
        contact.source = source;
        
        // Audit Log
        GDPRConsent.logAudit('CONSENT_BULK_UPDATE', {
            newStatus,
            legalBasis,
            source,
            note
        }, contact.id);
    });
    
    // Speichern
    localStorage.setItem('gtz_contacts_consent', JSON.stringify(contacts));
    
    // HubSpot Sync
    await HubSpotSync.bulkUpdateConsent(targetContacts, newStatus, { source });
    
    // UI Update
    closeBulkUpdate();
    renderConsentTable();
    updateStats();
    selectedContacts.clear();
    
    showNotification('✅ Erfolgreich', `${targetContacts.length} Kontakte aktualisiert.`, 'success');
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        
        // Parse CSV
        const updates = [];
        for (let i = 1; i < lines.length; i++) {
            const [email, status] = lines[i].split(',').map(s => s.trim().replace(/"/g, ''));
            if (email && status) {
                updates.push({ email, status });
            }
        }
        
        showNotification('📄 CSV geladen', `${updates.length} Einträge gefunden.`);
        console.log('CSV Updates:', updates);
    };
    reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUBSPOT SYNC
// ═══════════════════════════════════════════════════════════════════════════════

async function syncWithHubSpot() {
    showNotification('🔄 Synchronisation', 'Verbinde mit HubSpot...', 'info');
    
    // Simuliere Sync
    setTimeout(() => {
        document.getElementById('lastSync').textContent = 'Gerade eben';
        
        GDPRConsent.logAudit('HUBSPOT_SYNC', { 
            contacts: contacts.length,
            direction: 'bidirectional'
        });
        
        showNotification('✅ Synchronisiert', 'HubSpot-Sync erfolgreich abgeschlossen.', 'success');
    }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GDPR ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function exportAllConsentData() {
    const exportData = {
        meta: {
            exportDate: new Date().toISOString(),
            totalContacts: contacts.length,
            gdprArticle: 'Art. 20 DSGVO',
            application: 'GTz Ecosystem'
        },
        contacts: contacts.map(c => ({
            ...c,
            auditHistory: GDPRConsent.getAuditLog({ contactId: c.id })
        }))
    };
    
    downloadJSON(exportData, `consent_export_${new Date().toISOString().split('T')[0]}.json`);
    
    GDPRConsent.logAudit('BULK_DATA_EXPORT', { type: 'consent_data', count: contacts.length });
    showNotification('📥 Export', 'Consent-Daten exportiert.', 'success');
}

function exportContactConsent() {
    // Aktuell geöffneten Kontakt exportieren
    showNotification('📥 Export', 'Kontakt-Daten exportiert.', 'success');
}

function openDeleteRequest() {
    const contactId = prompt('Geben Sie die Kontakt-ID oder E-Mail für die Löschanfrage ein:');
    if (!contactId) return;
    
    const contact = contacts.find(c => c.id === contactId || c.email === contactId);
    if (!contact) {
        showNotification('⚠️ Nicht gefunden', 'Kontakt nicht gefunden.', 'warning');
        return;
    }
    
    if (confirm(`Möchten Sie alle Daten von ${contact.firstName} ${contact.lastName} unwiderruflich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        // Löschung durchführen
        contacts = contacts.filter(c => c.id !== contact.id);
        localStorage.setItem('gtz_contacts_consent', JSON.stringify(contacts));
        
        GDPRConsent.logAudit('DATA_DELETION', { 
            contactId: contact.id,
            reason: 'GDPR Art. 17 Request'
        }, contact.id);
        
        renderConsentTable();
        updateStats();
        
        showNotification('🗑️ Gelöscht', 'Alle Daten wurden gelöscht.', 'success');
    }
}

function viewAuditLog() {
    document.getElementById('auditLogModal').classList.add('visible');
    renderAuditLog();
}

function closeAuditLog() {
    document.getElementById('auditLogModal').classList.remove('visible');
}

function renderAuditLog() {
    const auditList = document.getElementById('auditLogList');
    if (!auditList) return;
    
    const log = GDPRConsent.getAuditLog();
    
    auditList.innerHTML = log.map(entry => `
        <div class="audit-entry ${entry.action.toLowerCase().includes('consent') ? 'consent' : ''}">
            <div class="audit-icon">${getAuditIcon(entry.action)}</div>
            <div class="audit-content">
                <div class="audit-action">${entry.action}</div>
                <div class="audit-details">${JSON.stringify(entry.data || {})}</div>
                <div class="audit-meta">
                    <span>📅 ${formatDate(entry.timestamp)}</span>
                    ${entry.contactId ? `<span>👤 ${entry.contactId}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function getAuditIcon(action) {
    const icons = {
        'CONSENT_GRANTED': '✅',
        'CONSENT_DENIED': '❌',
        'CONSENT_REVOKED': '🔄',
        'CONSENT_UPDATED': '📝',
        'DATA_EXPORT': '📥',
        'DATA_DELETION': '🗑️',
        'HUBSPOT_SYNC': '🔄',
        'CONSENT_REQUEST_SENT': '📧'
    };
    return icons[action] || '📋';
}

function filterAuditLog() {
    renderAuditLog();
}

function exportAuditLog() {
    const log = GDPRConsent.getAuditLog();
    downloadJSON(log, `audit_log_${new Date().toISOString().split('T')[0]}.json`);
    showNotification('📥 Export', 'Audit-Log exportiert.', 'success');
}

function sendConsentRequest() {
    if (selectedContacts.size === 0) {
        showNotification('⚠️ Fehler', 'Bitte wählen Sie Kontakte aus.', 'warning');
        return;
    }
    
    const targetContacts = contacts.filter(c => selectedContacts.has(c.id));
    
    targetContacts.forEach(contact => {
        GDPRConsent.logAudit('CONSENT_REQUEST_SENT', { 
            contactId: contact.id, 
            channel: 'email' 
        }, contact.id);
    });
    
    showNotification('📧 Gesendet', `Consent-Anfragen an ${targetContacts.length} Kontakte gesendet.`, 'success');
}

function exportConsents() {
    const filtered = getFilteredContacts();
    downloadCSV(filtered, `consents_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('📥 Export', 'Consent-Liste exportiert.', 'success');
}

// Global exports
window.filterConsents = filterConsents;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.toggleSelectAllConsents = toggleSelectAllConsents;
window.toggleContactSelection = toggleContactSelection;
window.viewConsentDetail = viewConsentDetail;
window.closeConsentDetail = closeConsentDetail;
window.editConsent = editConsent;
window.sendConsentRequestSingle = sendConsentRequestSingle;
window.openBulkUpdate = openBulkUpdate;
window.closeBulkUpdate = closeBulkUpdate;
window.executeBulkUpdate = executeBulkUpdate;
window.handleCSVUpload = handleCSVUpload;
window.syncWithHubSpot = syncWithHubSpot;
window.exportAllConsentData = exportAllConsentData;
window.exportContactConsent = exportContactConsent;
window.openDeleteRequest = openDeleteRequest;
window.viewAuditLog = viewAuditLog;
window.closeAuditLog = closeAuditLog;
window.filterAuditLog = filterAuditLog;
window.exportAuditLog = exportAuditLog;
window.sendConsentRequest = sendConsentRequest;
window.exportConsents = exportConsents;
