/**
 * 神 ENTERPRISE UNIVERSE - CHATWOOT CONNECTOR
 * Connect to Chatwoot - Open Source Customer Support Platform
 */

const UniversalConnector = require('./universal-connector');

class ChatwootConnector extends UniversalConnector {
    constructor(config) {
        super({
            ...config,
            name: config.name || 'Chatwoot',
            type: 'communication',
            provider: 'chatwoot'
        });
        
        this.apiAccessToken = config.credentials?.apiAccessToken;
        this.accountId = config.accountId;
        
        this.entityMappings = {
            contacts: {
                idField: 'id',
                fields: {
                    name: 'name',
                    email: 'email',
                    phone: 'phone_number',
                    avatar: 'avatar_url',
                    identifier: 'identifier'
                }
            },
            conversations: {
                idField: 'id',
                fields: {
                    id: 'id',
                    status: 'status',
                    assigneeId: 'assignee_id',
                    contactId: 'contact_id',
                    inboxId: 'inbox_id',
                    createdAt: 'created_at'
                }
            },
            messages: {
                idField: 'id',
                fields: {
                    id: 'id',
                    content: 'content',
                    messageType: 'message_type',
                    contentType: 'content_type',
                    createdAt: 'created_at'
                }
            },
            inboxes: {
                idField: 'id',
                fields: {
                    id: 'id',
                    name: 'name',
                    channelType: 'channel_type',
                    avatarUrl: 'avatar_url'
                }
            },
            agents: {
                idField: 'id',
                fields: {
                    id: 'id',
                    name: 'name',
                    email: 'email',
                    role: 'role',
                    availabilityStatus: 'availability_status'
                }
            }
        };
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'api_access_token': this.apiAccessToken
        };
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}${endpoint}`;
        
        const options = {
            method,
            headers: this.getHeaders()
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        return response.json();
    }

    async connect() {
        await this.request('GET', '/inboxes');
        this.status = 'connected';
        this.onConnect();
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTACT OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async createContact(contact) {
        return this.request('POST', '/contacts', { contact });
    }

    async getContact(id) {
        return this.request('GET', `/contacts/${id}`);
    }

    async updateContact(id, contact) {
        return this.request('PUT', `/contacts/${id}`, { contact });
    }

    async searchContacts(query) {
        return this.request('GET', `/contacts/search?q=${encodeURIComponent(query)}`);
    }

    async listContacts(page = 1) {
        return this.request('GET', `/contacts?page=${page}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVERSATION OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async listConversations(status = 'open', page = 1) {
        return this.request('GET', `/conversations?status=${status}&page=${page}`);
    }

    async getConversation(id) {
        return this.request('GET', `/conversations/${id}`);
    }

    async createConversation(inboxId, contactId, message = null) {
        const data = {
            inbox_id: inboxId,
            contact_id: contactId
        };
        if (message) data.message = { content: message };
        
        return this.request('POST', '/conversations', data);
    }

    async assignConversation(id, agentId) {
        return this.request('POST', `/conversations/${id}/assignments`, {
            assignee_id: agentId
        });
    }

    async updateConversationStatus(id, status) {
        return this.request('POST', `/conversations/${id}/toggle_status`, { status });
    }

    async addLabel(conversationId, labels) {
        return this.request('POST', `/conversations/${conversationId}/labels`, { labels });
    }

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async listMessages(conversationId) {
        return this.request('GET', `/conversations/${conversationId}/messages`);
    }

    async sendMessage(conversationId, content, options = {}) {
        return this.request('POST', `/conversations/${conversationId}/messages`, {
            content,
            message_type: options.messageType || 'outgoing',
            private: options.private || false,
            content_attributes: options.contentAttributes
        });
    }

    async sendTemplateMessage(conversationId, templateParams) {
        return this.request('POST', `/conversations/${conversationId}/messages`, {
            template_params: templateParams,
            message_type: 'template'
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // INBOX OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async listInboxes() {
        return this.request('GET', '/inboxes');
    }

    async getInbox(id) {
        return this.request('GET', `/inboxes/${id}`);
    }

    async createWebsiteInbox(name, websiteUrl, widgetColor = '#1f93ff') {
        return this.request('POST', '/inboxes', {
            name,
            channel: {
                type: 'web_widget',
                website_url: websiteUrl,
                widget_color: widgetColor
            }
        });
    }

    async createWhatsAppInbox(name, phoneNumber, provider = 'whatsapp_cloud') {
        return this.request('POST', '/inboxes', {
            name,
            channel: {
                type: 'whatsapp',
                phone_number: phoneNumber,
                provider
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // AGENT/TEAM OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async listAgents() {
        return this.request('GET', '/agents');
    }

    async addAgentToInbox(inboxId, agentId) {
        return this.request('POST', `/inbox_members`, {
            inbox_id: inboxId,
            user_ids: [agentId]
        });
    }

    async listTeams() {
        return this.request('GET', '/teams');
    }

    async createTeam(name, description, allowAutoAssign = true) {
        return this.request('POST', '/teams', {
            name,
            description,
            allow_auto_assign: allowAutoAssign
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // CANNED RESPONSES
    // ═══════════════════════════════════════════════════════════════

    async listCannedResponses() {
        return this.request('GET', '/canned_responses');
    }

    async createCannedResponse(shortCode, content) {
        return this.request('POST', '/canned_responses', {
            short_code: shortCode,
            content
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // REPORTS
    // ═══════════════════════════════════════════════════════════════

    async getAccountSummary(since, until) {
        return this.request('GET', `/reports/summary?since=${since}&until=${until}`);
    }

    async getAgentReports(since, until) {
        return this.request('GET', `/reports?type=agent&since=${since}&until=${until}`);
    }

    async getInboxReports(since, until) {
        return this.request('GET', `/reports?type=inbox&since=${since}&until=${until}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLING
    // ═══════════════════════════════════════════════════════════════

    async handleWebhook(payload, headers) {
        const { event, ...data } = payload;
        
        return {
            received: true,
            event,
            data
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // STANDARD CONNECTOR METHODS
    // ═══════════════════════════════════════════════════════════════

    async create(entity, data) {
        if (entity === 'contacts') return this.createContact(data);
        if (entity === 'conversations') return this.createConversation(data.inboxId, data.contactId, data.message);
        throw new Error(`Cannot create ${entity}`);
    }

    async read(entity, id) {
        if (entity === 'contacts') return this.getContact(id);
        if (entity === 'conversations') return this.getConversation(id);
        if (entity === 'inboxes') return this.getInbox(id);
        throw new Error(`Cannot read ${entity}`);
    }

    async update(entity, id, data) {
        if (entity === 'contacts') return this.updateContact(id, data);
        throw new Error(`Cannot update ${entity}`);
    }

    async list(entity, filters = {}, options = {}) {
        const page = options.page || 1;
        
        if (entity === 'contacts') {
            const result = await this.listContacts(page);
            return { records: result.payload || [], hasMore: result.payload?.length === 15 };
        }
        if (entity === 'conversations') {
            const result = await this.listConversations(filters.status || 'open', page);
            return { records: result.data?.payload || [], hasMore: true };
        }
        if (entity === 'inboxes') {
            const result = await this.listInboxes();
            return { records: result.payload || [], hasMore: false };
        }
        if (entity === 'agents') {
            const result = await this.listAgents();
            return { records: result || [], hasMore: false };
        }
        
        throw new Error(`Cannot list ${entity}`);
    }

    async search(entity, query, options = {}) {
        if (entity === 'contacts') {
            const result = await this.searchContacts(query);
            return { records: result.payload || [], hasMore: false };
        }
        throw new Error(`Cannot search ${entity}`);
    }
}

module.exports = ChatwootConnector;
