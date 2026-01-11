/**
 * Email Tracker
 * Tracks email opens, clicks, and engagement
 */

class EmailTracker {
    constructor() {
        // In-memory tracking store (in production, use database)
        this.tracking = new Map();
        this.stats = {
            totalSent: 0,
            totalOpens: 0,
            totalClicks: 0,
            uniqueOpens: 0,
            uniqueClicks: 0
        };

        console.log('[EmailTracker] Initialized');
    }

    // Generate unique tracking ID
    generateTrackingId() {
        return `trk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create tracking record for an email
    createTracking(emailData) {
        const trackingId = this.generateTrackingId();

        const record = {
            id: trackingId,
            recipient: emailData.recipient,
            template: emailData.template,
            subject: emailData.subject,
            sentAt: new Date().toISOString(),
            opens: [],
            clicks: [],
            status: 'sent'
        };

        this.tracking.set(trackingId, record);
        this.stats.totalSent++;

        return {
            trackingId,
            pixelUrl: this.getPixelUrl(trackingId),
            record
        };
    }

    // Generate tracking pixel URL
    getPixelUrl(trackingId) {
        return `/api/email-tracker/pixel/${trackingId}.gif`;
    }

    // Generate tracked link
    createTrackedLink(trackingId, originalUrl, linkId = null) {
        const lid = linkId || `link_${Math.random().toString(36).substr(2, 6)}`;
        return `/api/email-tracker/click/${trackingId}/${lid}?url=${encodeURIComponent(originalUrl)}`;
    }

    // Record email open
    recordOpen(trackingId, metadata = {}) {
        const record = this.tracking.get(trackingId);
        if (!record) return null;

        const isFirstOpen = record.opens.length === 0;

        record.opens.push({
            timestamp: new Date().toISOString(),
            userAgent: metadata.userAgent,
            ip: metadata.ip
        });

        record.status = 'opened';
        this.stats.totalOpens++;

        if (isFirstOpen) {
            this.stats.uniqueOpens++;
        }

        return { success: true, isFirstOpen, record };
    }

    // Record link click
    recordClick(trackingId, linkId, metadata = {}) {
        const record = this.tracking.get(trackingId);
        if (!record) return null;

        const isFirstClick = record.clicks.length === 0;

        record.clicks.push({
            linkId,
            timestamp: new Date().toISOString(),
            userAgent: metadata.userAgent,
            ip: metadata.ip
        });

        record.status = 'clicked';
        this.stats.totalClicks++;

        if (isFirstClick) {
            this.stats.uniqueClicks++;
        }

        return { success: true, isFirstClick, record };
    }

    // Get tracking record
    getTracking(trackingId) {
        return this.tracking.get(trackingId) || null;
    }

    // Get all tracking records
    getAllTracking(options = {}) {
        const records = Array.from(this.tracking.values());

        // Filter by template
        if (options.template) {
            return records.filter(r => r.template === options.template);
        }

        // Filter by status
        if (options.status) {
            return records.filter(r => r.status === options.status);
        }

        // Limit results
        if (options.limit) {
            return records.slice(-options.limit);
        }

        return records;
    }

    // Get statistics
    getStats() {
        const records = Array.from(this.tracking.values());

        return {
            ...this.stats,
            openRate: this.stats.totalSent > 0
                ? ((this.stats.uniqueOpens / this.stats.totalSent) * 100).toFixed(1) + '%'
                : '0%',
            clickRate: this.stats.uniqueOpens > 0
                ? ((this.stats.uniqueClicks / this.stats.uniqueOpens) * 100).toFixed(1) + '%'
                : '0%',
            byTemplate: this.getStatsByTemplate(),
            recentActivity: records.slice(-10).map(r => ({
                id: r.id,
                recipient: r.recipient,
                status: r.status,
                sentAt: r.sentAt,
                opensCount: r.opens.length,
                clicksCount: r.clicks.length
            }))
        };
    }

    // Get stats grouped by template
    getStatsByTemplate() {
        const records = Array.from(this.tracking.values());
        const byTemplate = {};

        for (const record of records) {
            const template = record.template || 'unknown';
            if (!byTemplate[template]) {
                byTemplate[template] = {
                    sent: 0,
                    opened: 0,
                    clicked: 0
                };
            }
            byTemplate[template].sent++;
            if (record.opens.length > 0) byTemplate[template].opened++;
            if (record.clicks.length > 0) byTemplate[template].clicked++;
        }

        return byTemplate;
    }

    // Embed tracking in email HTML
    embedTracking(html, trackingId) {
        const pixelUrl = this.getPixelUrl(trackingId);
        const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

        // Add tracking pixel before closing body tag
        if (html.includes('</body>')) {
            return html.replace('</body>', `${trackingPixel}</body>`);
        }

        // Or append to end
        return html + trackingPixel;
    }

    // Convert links in HTML to tracked links
    trackLinks(html, trackingId) {
        let linkIndex = 0;

        return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
            const trackedUrl = this.createTrackedLink(trackingId, url, `link_${linkIndex++}`);
            return `href="${trackedUrl}"`;
        });
    }

    // Prepare email with full tracking
    prepareTrackedEmail(emailData) {
        const { trackingId, pixelUrl, record } = this.createTracking(emailData);

        let html = emailData.html || '';

        // Add tracking pixel
        html = this.embedTracking(html, trackingId);

        // Track links
        html = this.trackLinks(html, trackingId);

        return {
            ...emailData,
            html,
            trackingId,
            pixelUrl
        };
    }

    // Generate 1x1 transparent GIF
    getTrackingPixel() {
        // Base64 encoded 1x1 transparent GIF
        return Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    }
}

// Singleton instance
let trackerInstance = null;

function getEmailTracker() {
    if (!trackerInstance) {
        trackerInstance = new EmailTracker();
    }
    return trackerInstance;
}

module.exports = {
    EmailTracker,
    getEmailTracker
};
