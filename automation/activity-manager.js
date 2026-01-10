/**
 * GTz Ecosystem - Activity Manager
 * Zentrales Event-Tracking und Activity-Feed Management
 *
 * @requires uuid (optional)
 */

// ============================================================================
// ACTIVITY STORE
// ============================================================================

const activities = [];
const MAX_ACTIVITIES = 1000;

// Event Listeners for real-time updates
const eventListeners = new Set();

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

const ACTIVITY_TYPES = {
    // Webhook Events
    WHATSAPP_MESSAGE: 'whatsapp_message',
    WHATSAPP_CONSENT: 'whatsapp_consent',
    ZADARMA_CALL_START: 'zadarma_call_start',
    ZADARMA_CALL_END: 'zadarma_call_end',
    HUBSPOT_DEAL_CHANGE: 'hubspot_deal_change',
    HUBSPOT_CONTACT_CHANGE: 'hubspot_contact_change',
    HUBSPOT_CONTACT_CREATED: 'hubspot_contact_created',

    // System Events
    LEAD_CAPTURED: 'lead_captured',
    LEAD_SCORED: 'lead_scored',
    EMAIL_SENT: 'email_sent',
    PROPOSAL_SENT: 'proposal_sent',
    SYNC_COMPLETED: 'sync_completed',

    // AI Agent Events
    AI_ANALYSIS: 'ai_analysis',
    AI_TASK_COMPLETED: 'ai_task_completed',
    AI_PREDICTION: 'ai_prediction',

    // Error Events
    ERROR: 'error',
    WARNING: 'warning'
};

// Activity Icons and Colors
const ACTIVITY_CONFIG = {
    [ACTIVITY_TYPES.WHATSAPP_MESSAGE]: { icon: '💬', color: 'green', label: 'WhatsApp' },
    [ACTIVITY_TYPES.WHATSAPP_CONSENT]: { icon: '✅', color: 'green', label: 'WhatsApp Consent' },
    [ACTIVITY_TYPES.ZADARMA_CALL_START]: { icon: '📞', color: 'blue', label: 'Eingehender Anruf' },
    [ACTIVITY_TYPES.ZADARMA_CALL_END]: { icon: '📞', color: 'blue', label: 'Anruf beendet' },
    [ACTIVITY_TYPES.HUBSPOT_DEAL_CHANGE]: { icon: '💼', color: 'orange', label: 'Deal Update' },
    [ACTIVITY_TYPES.HUBSPOT_CONTACT_CHANGE]: { icon: '👤', color: 'cyan', label: 'Kontakt Update' },
    [ACTIVITY_TYPES.HUBSPOT_CONTACT_CREATED]: { icon: '👥', color: 'purple', label: 'Neuer Kontakt' },
    [ACTIVITY_TYPES.LEAD_CAPTURED]: { icon: '🎯', color: 'yellow', label: 'Lead erfasst' },
    [ACTIVITY_TYPES.LEAD_SCORED]: { icon: '📊', color: 'purple', label: 'Lead bewertet' },
    [ACTIVITY_TYPES.EMAIL_SENT]: { icon: '📧', color: 'cyan', label: 'E-Mail gesendet' },
    [ACTIVITY_TYPES.PROPOSAL_SENT]: { icon: '📄', color: 'orange', label: 'Angebot gesendet' },
    [ACTIVITY_TYPES.SYNC_COMPLETED]: { icon: '🔄', color: 'cyan', label: 'Sync abgeschlossen' },
    [ACTIVITY_TYPES.AI_ANALYSIS]: { icon: '🧠', color: 'purple', label: 'KI Analyse' },
    [ACTIVITY_TYPES.AI_TASK_COMPLETED]: { icon: '⚡', color: 'yellow', label: 'KI Task' },
    [ACTIVITY_TYPES.AI_PREDICTION]: { icon: '🔮', color: 'purple', label: 'KI Prognose' },
    [ACTIVITY_TYPES.ERROR]: { icon: '❌', color: 'red', label: 'Fehler' },
    [ACTIVITY_TYPES.WARNING]: { icon: '⚠️', color: 'yellow', label: 'Warnung' }
};

// ============================================================================
// ACTIVITY MANAGER
// ============================================================================

const activityManager = {
    /**
     * Erstellt eine neue Aktivität
     * @param {string} type - Activity type from ACTIVITY_TYPES
     * @param {object} data - Activity data
     * @returns {object} Created activity
     */
    create(type, data) {
        const config = ACTIVITY_CONFIG[type] || { icon: '📌', color: 'gray', label: 'Event' };

        const activity = {
            id: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            icon: config.icon,
            color: config.color,
            label: config.label,
            title: data.title || config.label,
            description: data.description || '',
            result: data.result || null,
            metadata: data.metadata || {},
            source: data.source || 'system',
            objectType: data.objectType || null,
            objectId: data.objectId || null,
            userId: data.userId || null,
            ip: data.ip || null,
            timestamp: new Date().toISOString(),
            relativeTime: 'jetzt'
        };

        // Add to store (prepend for newest first)
        activities.unshift(activity);

        // Trim if exceeds max
        if (activities.length > MAX_ACTIVITIES) {
            activities.pop();
        }

        // Notify listeners
        this.notifyListeners(activity);

        console.log(`[Activity] ${config.icon} ${activity.title}: ${activity.description}`);

        return activity;
    },

    /**
     * Erstellt WhatsApp-bezogene Aktivität
     */
    logWhatsAppMessage(from, messageType, contactName = null) {
        return this.create(ACTIVITY_TYPES.WHATSAPP_MESSAGE, {
            title: 'WhatsApp Nachricht',
            description: `Nachricht von ${contactName || from}`,
            result: `Typ: ${messageType}`,
            source: 'whatsapp',
            metadata: { from, messageType, contactName }
        });
    },

    logWhatsAppConsent(contactId, status, contactName = null) {
        const isOptIn = status === 'opt_in';
        return this.create(ACTIVITY_TYPES.WHATSAPP_CONSENT, {
            title: isOptIn ? 'WhatsApp Consent erteilt' : 'WhatsApp Consent abgelehnt',
            description: contactName ? `${contactName} hat ${isOptIn ? 'zugestimmt' : 'abgelehnt'}` : `Kontakt ${contactId}`,
            result: isOptIn ? 'Opt-In erfolgreich' : 'Opt-Out',
            source: 'whatsapp',
            objectType: 'contact',
            objectId: contactId,
            metadata: { status, contactName }
        });
    },

    /**
     * Erstellt Zadarma-bezogene Aktivität
     */
    logCallStart(callerId, calledDid, contactName = null) {
        return this.create(ACTIVITY_TYPES.ZADARMA_CALL_START, {
            title: 'Eingehender Anruf',
            description: contactName ? `Anruf von ${contactName}` : `Anruf von ${callerId}`,
            result: `Ziel: ${calledDid}`,
            source: 'zadarma',
            metadata: { callerId, calledDid, contactName }
        });
    },

    logCallEnd(callerId, duration, disposition) {
        const durationMin = Math.floor(duration / 60);
        const durationSec = duration % 60;
        return this.create(ACTIVITY_TYPES.ZADARMA_CALL_END, {
            title: 'Anruf beendet',
            description: `Dauer: ${durationMin}:${durationSec.toString().padStart(2, '0')}`,
            result: disposition === 'answered' ? 'Erfolgreich' : 'Nicht erreicht',
            source: 'zadarma',
            metadata: { callerId, duration, disposition }
        });
    },

    /**
     * Erstellt HubSpot-bezogene Aktivität
     */
    logDealStageChange(dealId, newStage, oldStage = null, dealName = null) {
        const stageLabels = {
            'appointmentscheduled': 'Termin vereinbart',
            'qualifiedtobuy': 'Qualifiziert',
            'presentationscheduled': 'Präsentation',
            'decisionmakerboughtin': 'Entscheidungsphase',
            'closedwon': 'Gewonnen',
            'closedlost': 'Verloren'
        };

        const newLabel = stageLabels[newStage] || newStage;
        const isWon = newStage === 'closedwon';
        const isLost = newStage === 'closedlost';

        return this.create(ACTIVITY_TYPES.HUBSPOT_DEAL_CHANGE, {
            title: isWon ? 'Deal gewonnen!' : isLost ? 'Deal verloren' : 'Deal Status geändert',
            description: dealName ? `${dealName}` : `Deal #${dealId}`,
            result: `Neue Phase: ${newLabel}`,
            source: 'hubspot',
            objectType: 'deal',
            objectId: dealId,
            metadata: { newStage, oldStage, dealName }
        });
    },

    logContactCreated(contactId, contactName, email = null) {
        return this.create(ACTIVITY_TYPES.HUBSPOT_CONTACT_CREATED, {
            title: 'Neuer Kontakt erstellt',
            description: contactName || `Kontakt #${contactId}`,
            result: email ? `E-Mail: ${email}` : null,
            source: 'hubspot',
            objectType: 'contact',
            objectId: contactId,
            metadata: { contactName, email }
        });
    },

    /**
     * Erstellt Lead-bezogene Aktivität
     */
    logLeadCaptured(leadId, source, name = null, score = null) {
        return this.create(ACTIVITY_TYPES.LEAD_CAPTURED, {
            title: 'Neuer Lead erfasst',
            description: name || `Lead #${leadId}`,
            result: score ? `Score: ${score}` : `Quelle: ${source}`,
            source: source,
            objectType: 'lead',
            objectId: leadId,
            metadata: { source, name, score }
        });
    },

    logLeadScored(contactId, score, tier, contactName = null) {
        const tierLabels = {
            'HOT': '🔥 HOT',
            'WARM': '🌡️ WARM',
            'NURTURE': '🌱 NURTURE',
            'COLD': '❄️ COLD'
        };

        return this.create(ACTIVITY_TYPES.LEAD_SCORED, {
            title: 'Lead bewertet',
            description: contactName || `Kontakt #${contactId}`,
            result: `${tierLabels[tier] || tier} (${score} Punkte)`,
            source: 'scoring',
            objectType: 'contact',
            objectId: contactId,
            metadata: { score, tier, contactName }
        });
    },

    /**
     * Erstellt E-Mail-bezogene Aktivität
     */
    logEmailSent(contactId, templateName, contactName = null) {
        return this.create(ACTIVITY_TYPES.EMAIL_SENT, {
            title: 'E-Mail gesendet',
            description: contactName || `An Kontakt #${contactId}`,
            result: `Template: ${templateName}`,
            source: 'email',
            objectType: 'contact',
            objectId: contactId,
            metadata: { templateName, contactName }
        });
    },

    logProposalSent(contactId, proposalId, contactName = null, amount = null) {
        return this.create(ACTIVITY_TYPES.PROPOSAL_SENT, {
            title: 'Angebot gesendet',
            description: contactName || `An Kontakt #${contactId}`,
            result: amount ? `Wert: €${amount.toLocaleString('de-DE')}` : `Angebot #${proposalId}`,
            source: 'proposal',
            objectType: 'proposal',
            objectId: proposalId,
            metadata: { contactId, contactName, amount }
        });
    },

    /**
     * Erstellt Sync-bezogene Aktivität
     */
    logSyncCompleted(source, count, duration = null) {
        return this.create(ACTIVITY_TYPES.SYNC_COMPLETED, {
            title: 'Synchronisation abgeschlossen',
            description: `${count.toLocaleString('de-DE')} ${source} synchronisiert`,
            result: duration ? `Dauer: ${duration}ms` : 'Erfolgreich',
            source: source,
            metadata: { count, duration }
        });
    },

    /**
     * Erstellt KI-bezogene Aktivität
     */
    logAIAnalysis(agent, description, result) {
        return this.create(ACTIVITY_TYPES.AI_ANALYSIS, {
            title: agent,
            description: description,
            result: result,
            source: 'ai',
            metadata: { agent }
        });
    },

    logAITaskCompleted(agent, taskDescription, result) {
        return this.create(ACTIVITY_TYPES.AI_TASK_COMPLETED, {
            title: agent,
            description: taskDescription,
            result: result,
            source: 'ai',
            metadata: { agent }
        });
    },

    logAIPrediction(agent, prediction, confidence) {
        return this.create(ACTIVITY_TYPES.AI_PREDICTION, {
            title: agent,
            description: prediction,
            result: `Konfidenz: ${confidence}%`,
            source: 'ai',
            metadata: { agent, confidence }
        });
    },

    /**
     * Erstellt Fehler-Aktivität
     */
    logError(source, message, details = null) {
        return this.create(ACTIVITY_TYPES.ERROR, {
            title: 'Fehler aufgetreten',
            description: message,
            result: details,
            source: source,
            metadata: { details }
        });
    },

    logWarning(source, message, details = null) {
        return this.create(ACTIVITY_TYPES.WARNING, {
            title: 'Warnung',
            description: message,
            result: details,
            source: source,
            metadata: { details }
        });
    },

    /**
     * Holt Aktivitäten mit Filterung und Paginierung
     */
    getActivities(options = {}) {
        const {
            limit = 20,
            offset = 0,
            type = null,
            source = null,
            objectType = null,
            objectId = null,
            since = null,
            until = null
        } = options;

        let filtered = [...activities];

        // Filter by type
        if (type) {
            const types = Array.isArray(type) ? type : [type];
            filtered = filtered.filter(a => types.includes(a.type));
        }

        // Filter by source
        if (source) {
            filtered = filtered.filter(a => a.source === source);
        }

        // Filter by object type
        if (objectType) {
            filtered = filtered.filter(a => a.objectType === objectType);
        }

        // Filter by object ID
        if (objectId) {
            filtered = filtered.filter(a => a.objectId === objectId);
        }

        // Filter by time range
        if (since) {
            const sinceDate = new Date(since);
            filtered = filtered.filter(a => new Date(a.timestamp) >= sinceDate);
        }

        if (until) {
            const untilDate = new Date(until);
            filtered = filtered.filter(a => new Date(a.timestamp) <= untilDate);
        }

        // Update relative times
        filtered.forEach(a => {
            a.relativeTime = this.getRelativeTime(a.timestamp);
        });

        // Apply pagination
        const paginated = filtered.slice(offset, offset + limit);

        return {
            activities: paginated,
            total: filtered.length,
            hasMore: offset + limit < filtered.length
        };
    },

    /**
     * Holt eine einzelne Aktivität nach ID
     */
    getActivity(id) {
        return activities.find(a => a.id === id) || null;
    },

    /**
     * Berechnet relative Zeit
     */
    getRelativeTime(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'jetzt';
        if (diffMin < 60) return `${diffMin}m`;
        if (diffHour < 24) return `${diffHour}h`;
        if (diffDay < 7) return `${diffDay}d`;
        return then.toLocaleDateString('de-DE');
    },

    /**
     * Statistiken über Aktivitäten
     */
    getStats() {
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        const lastHour = new Date(now - 60 * 60 * 1000);

        const recentActivities = activities.filter(a => new Date(a.timestamp) >= last24h);
        const lastHourActivities = activities.filter(a => new Date(a.timestamp) >= lastHour);

        // Count by type
        const byType = {};
        recentActivities.forEach(a => {
            byType[a.type] = (byType[a.type] || 0) + 1;
        });

        // Count by source
        const bySource = {};
        recentActivities.forEach(a => {
            bySource[a.source] = (bySource[a.source] || 0) + 1;
        });

        return {
            total: activities.length,
            last24h: recentActivities.length,
            lastHour: lastHourActivities.length,
            byType,
            bySource
        };
    },

    /**
     * Löscht alte Aktivitäten
     */
    cleanup(olderThanDays = 30) {
        const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
        const initialCount = activities.length;

        while (activities.length > 0 && new Date(activities[activities.length - 1].timestamp) < cutoff) {
            activities.pop();
        }

        const removed = initialCount - activities.length;
        if (removed > 0) {
            console.log(`[Activity] Cleaned up ${removed} old activities`);
        }

        return removed;
    },

    /**
     * Event Listener Management für Real-Time Updates
     */
    addListener(callback) {
        eventListeners.add(callback);
        return () => eventListeners.delete(callback);
    },

    removeListener(callback) {
        eventListeners.delete(callback);
    },

    notifyListeners(activity) {
        eventListeners.forEach(callback => {
            try {
                callback(activity);
            } catch (e) {
                console.error('[Activity] Listener error:', e);
            }
        });
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    activityManager,
    ACTIVITY_TYPES,
    ACTIVITY_CONFIG
};
