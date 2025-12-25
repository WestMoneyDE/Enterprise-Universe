/**
 * 🎙️ VOICE AGENT & AI BOTS ENGINE
 * Enterprise Universe GmbH
 * 
 * Zadarma VoIP + Claude AI + Telegram + WhatsApp
 */

// ═══════════════════════════════════════════════════════════════
// VOICE AGENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const VoiceAgentConfig = {
    provider: 'zadarma',
    
    zadarma: {
        baseUrl: 'https://api.zadarma.com/v1',
        sipDomain: 'sip.zadarma.com',
        webrtc: true,
        features: [
            'inbound_calls',
            'outbound_calls',
            'call_recording',
            'voicemail',
            'ivr',
            'call_forwarding',
            'sms'
        ]
    },
    
    ai: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        voice: {
            tts: 'elevenlabs', // or 'google', 'amazon', 'azure'
            stt: 'deepgram',  // or 'google', 'whisper', 'assemblyai'
            language: 'de-DE'
        }
    },
    
    personalities: {
        professional: {
            name: 'West Money Kundenservice',
            greeting: 'Guten Tag, Sie sprechen mit West Money Bau. Wie kann ich Ihnen helfen?',
            tone: 'formal',
            language: 'de'
        },
        friendly: {
            name: 'Smart Home Berater',
            greeting: 'Hi! Hier ist Ihr Smart Home Berater. Was kann ich für Sie tun?',
            tone: 'casual',
            language: 'de'
        },
        godMode: {
            name: 'HAIKU 神',
            greeting: 'Willkommen im GOD MODE. Ich bin HAIKU, Ihr göttlicher Assistent.',
            tone: 'epic',
            language: 'de'
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// VOICE AGENT CLASS
// ═══════════════════════════════════════════════════════════════

class VoiceAgent {
    constructor(config = VoiceAgentConfig) {
        this.config = config;
        this.activeCalls = new Map();
        this.callHistory = [];
    }

    /**
     * Initialize Zadarma connection
     */
    async initialize(credentials) {
        this.credentials = credentials;
        this.zadarmaAuth = this.generateZadarmaAuth(credentials);
        console.log('🎙️ Voice Agent initialized');
        return true;
    }

    /**
     * Generate Zadarma API signature
     */
    generateZadarmaAuth(credentials) {
        const crypto = require('crypto');
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
            .createHmac('sha256', credentials.secret)
            .update(`${credentials.key}${timestamp}`)
            .digest('hex');
        return { key: credentials.key, timestamp, signature };
    }

    /**
     * Handle incoming call
     */
    async handleIncomingCall(callData) {
        const callId = callData.call_id;
        const callerNumber = callData.caller_id;
        
        console.log(`📞 Incoming call from: ${callerNumber}`);
        
        // Store active call
        this.activeCalls.set(callId, {
            id: callId,
            number: callerNumber,
            startTime: new Date(),
            status: 'ringing',
            transcript: [],
            aiContext: []
        });

        // Answer with AI greeting
        const greeting = await this.generateGreeting(callerNumber);
        await this.speak(callId, greeting);
        
        return { callId, status: 'answered' };
    }

    /**
     * Generate personalized greeting
     */
    async generateGreeting(phoneNumber) {
        // Check if known contact
        const contact = await this.lookupContact(phoneNumber);
        
        if (contact) {
            return `Guten Tag ${contact.firstName}, schön dass Sie anrufen. Wie kann ich Ihnen heute helfen?`;
        }
        
        return this.config.personalities.professional.greeting;
    }

    /**
     * Lookup contact by phone number
     */
    async lookupContact(phoneNumber) {
        // Integration mit CRM (HubSpot, etc.)
        try {
            const response = await fetch(`/api/contacts/search?phone=${phoneNumber}`);
            return response.json();
        } catch {
            return null;
        }
    }

    /**
     * Speech-to-Text conversion
     */
    async transcribe(audioBuffer) {
        const config = this.config.ai.voice;
        
        if (config.stt === 'deepgram') {
            return this.transcribeWithDeepgram(audioBuffer);
        } else if (config.stt === 'whisper') {
            return this.transcribeWithWhisper(audioBuffer);
        }
        
        throw new Error(`Unknown STT provider: ${config.stt}`);
    }

    async transcribeWithDeepgram(audioBuffer) {
        const response = await fetch('https://api.deepgram.com/v1/listen', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${this.credentials.deepgramKey}`,
                'Content-Type': 'audio/wav'
            },
            body: audioBuffer
        });
        
        const result = await response.json();
        return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    }

    /**
     * Text-to-Speech conversion
     */
    async speak(callId, text) {
        const config = this.config.ai.voice;
        
        let audioBuffer;
        if (config.tts === 'elevenlabs') {
            audioBuffer = await this.ttsElevenLabs(text);
        } else if (config.tts === 'google') {
            audioBuffer = await this.ttsGoogle(text);
        }
        
        // Send audio to call
        await this.sendAudioToCall(callId, audioBuffer);
        
        return audioBuffer;
    }

    async ttsElevenLabs(text) {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/voice_id', {
            method: 'POST',
            headers: {
                'xi-api-key': this.credentials.elevenLabsKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });
        
        return response.arrayBuffer();
    }

    /**
     * Process user speech with AI
     */
    async processWithAI(callId, userText) {
        const call = this.activeCalls.get(callId);
        
        // Add to transcript
        call.transcript.push({ role: 'user', content: userText });
        
        // Build context
        const messages = [
            {
                role: 'system',
                content: `Du bist ein freundlicher Kundenservice-Assistent für West Money Bau GmbH.
                Unternehmen: Smart Home Bau, LOXONE Partner, Barrierefreies Bauen.
                Antworte immer auf Deutsch, kurz und hilfsbereit.
                Bei technischen Fragen zu LOXONE, leite an einen Spezialisten weiter.
                Bei Terminanfragen, frage nach gewünschtem Datum und Uhrzeit.`
            },
            ...call.aiContext,
            ...call.transcript
        ];

        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.credentials.anthropicKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 300,
                messages
            })
        });

        const result = await response.json();
        const aiResponse = result.content?.[0]?.text || 'Entschuldigung, ich habe Sie nicht verstanden.';
        
        // Add to transcript
        call.transcript.push({ role: 'assistant', content: aiResponse });
        
        return aiResponse;
    }

    /**
     * End call and save
     */
    async endCall(callId) {
        const call = this.activeCalls.get(callId);
        if (!call) return;

        call.endTime = new Date();
        call.status = 'completed';
        call.duration = (call.endTime - call.startTime) / 1000;

        // Save to history
        this.callHistory.push(call);
        
        // Create CRM activity
        await this.createCRMActivity(call);
        
        // Remove from active
        this.activeCalls.delete(callId);
        
        console.log(`📞 Call ended: ${callId} (${call.duration}s)`);
        
        return call;
    }

    /**
     * Create CRM activity from call
     */
    async createCRMActivity(call) {
        const activity = {
            type: 'call',
            direction: 'inbound',
            phone: call.number,
            duration: call.duration,
            transcript: call.transcript,
            timestamp: call.startTime
        };

        // Create in HubSpot or other CRM
        try {
            await fetch('/api/crm/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activity)
            });
        } catch (error) {
            console.error('Failed to create CRM activity:', error);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM BOT
// ═══════════════════════════════════════════════════════════════

class TelegramBot {
    constructor(token) {
        this.token = token;
        this.baseUrl = `https://api.telegram.org/bot${token}`;
        this.commands = new Map();
    }

    /**
     * Set webhook
     */
    async setWebhook(url) {
        const response = await fetch(`${this.baseUrl}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        return response.json();
    }

    /**
     * Send message
     */
    async sendMessage(chatId, text, options = {}) {
        const response = await fetch(`${this.baseUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                ...options
            })
        });
        return response.json();
    }

    /**
     * Handle incoming message
     */
    async handleMessage(update) {
        const message = update.message;
        if (!message) return;

        const chatId = message.chat.id;
        const text = message.text || '';

        // Check for command
        if (text.startsWith('/')) {
            const command = text.split(' ')[0].substring(1);
            const args = text.split(' ').slice(1);
            return this.handleCommand(chatId, command, args);
        }

        // AI response
        return this.handleAIChat(chatId, text);
    }

    /**
     * Handle command
     */
    async handleCommand(chatId, command, args) {
        const commands = {
            start: async () => {
                return this.sendMessage(chatId, 
                    `🏠 <b>Willkommen bei West Money Bau!</b>\n\n` +
                    `Ich bin Ihr Smart Home Assistent.\n\n` +
                    `<b>Befehle:</b>\n` +
                    `/status - Projekt-Status\n` +
                    `/termin - Termin anfragen\n` +
                    `/kontakt - Kontaktdaten\n` +
                    `/loxone - LOXONE Infos\n` +
                    `/help - Hilfe`
                );
            },
            status: async () => {
                // Fetch project status
                return this.sendMessage(chatId,
                    `📊 <b>Ihre Projekte:</b>\n\n` +
                    `🏗️ Smart Home Villa - 75% fertig\n` +
                    `📅 Nächster Termin: 28.12.2025\n\n` +
                    `Für Details antworten Sie mit der Projektnummer.`
                );
            },
            termin: async () => {
                return this.sendMessage(chatId,
                    `📅 <b>Termin anfragen</b>\n\n` +
                    `Wann hätten Sie Zeit?\n\n` +
                    `Antworten Sie mit Datum und Uhrzeit.`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: 'Diese Woche', callback_data: 'termin_this_week' },
                                    { text: 'Nächste Woche', callback_data: 'termin_next_week' }
                                ],
                                [
                                    { text: 'Morgens', callback_data: 'termin_morning' },
                                    { text: 'Nachmittags', callback_data: 'termin_afternoon' }
                                ]
                            ]
                        }
                    }
                );
            },
            kontakt: async () => {
                return this.sendMessage(chatId,
                    `📞 <b>West Money Bau GmbH</b>\n\n` +
                    `📍 Köln, Deutschland\n` +
                    `📧 info@west-money-bau.de\n` +
                    `📱 WhatsApp: +49 xxx xxx\n` +
                    `🌐 www.west-money-bau.de`
                );
            },
            loxone: async () => {
                return this.sendMessage(chatId,
                    `🏠 <b>LOXONE Smart Home</b>\n\n` +
                    `Als LOXONE Gold Partner bieten wir:\n\n` +
                    `⚡ Lichtsteuerung\n` +
                    `🌡️ Klimaregelung\n` +
                    `🔐 Sicherheit\n` +
                    `🎵 Multiroom Audio\n` +
                    `📱 App-Steuerung\n\n` +
                    `Interesse? Antworten Sie mit "Beratung".`
                );
            },
            help: async () => {
                return this.sendMessage(chatId,
                    `❓ <b>Hilfe</b>\n\n` +
                    `Schreiben Sie mir einfach Ihre Frage!\n\n` +
                    `Ich kann Ihnen helfen bei:\n` +
                    `• Smart Home Beratung\n` +
                    `• Projekt-Updates\n` +
                    `• Terminvereinbarung\n` +
                    `• Technische Fragen`
                );
            }
        };

        const handler = commands[command];
        if (handler) {
            return handler();
        }

        return this.sendMessage(chatId, `❌ Unbekannter Befehl: /${command}\n\nSchreiben Sie /help für Hilfe.`);
    }

    /**
     * Handle AI chat
     */
    async handleAIChat(chatId, text) {
        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 500,
                system: `Du bist der Telegram-Bot von West Money Bau GmbH.
                Antworte freundlich, hilfsbereit und auf Deutsch.
                Du berätst zu Smart Home, LOXONE und Bauprojekten.
                Halte Antworten kurz und prägnant für Telegram.`,
                messages: [{ role: 'user', content: text }]
            })
        });

        const result = await response.json();
        const aiText = result.content?.[0]?.text || 'Entschuldigung, ich konnte das nicht verarbeiten.';
        
        return this.sendMessage(chatId, aiText);
    }
}

// ═══════════════════════════════════════════════════════════════
// WHATSAPP AI BOT
// ═══════════════════════════════════════════════════════════════

class WhatsAppAIBot {
    constructor(config) {
        this.phoneId = config.phoneId;
        this.token = config.token;
        this.baseUrl = `https://graph.facebook.com/v17.0/${config.phoneId}`;
    }

    /**
     * Send WhatsApp message
     */
    async sendMessage(to, text) {
        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: text }
            })
        });
        return response.json();
    }

    /**
     * Send template message
     */
    async sendTemplate(to, templateName, params = []) {
        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'de' },
                    components: params.length > 0 ? [{
                        type: 'body',
                        parameters: params.map(p => ({ type: 'text', text: p }))
                    }] : []
                }
            })
        });
        return response.json();
    }

    /**
     * Handle incoming WhatsApp message
     */
    async handleIncoming(webhookData) {
        const message = webhookData.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return;

        const from = message.from;
        const text = message.text?.body || '';

        // Process with AI
        const aiResponse = await this.processWithAI(from, text);
        
        // Send response
        await this.sendMessage(from, aiResponse);
        
        return { from, text, response: aiResponse };
    }

    /**
     * Process message with AI
     */
    async processWithAI(from, text) {
        // Check for keywords
        const keywords = {
            termin: 'Gerne vereinbare ich einen Termin! Wann passt es Ihnen? Schreiben Sie mir Datum und Uhrzeit.',
            preis: 'Für ein genaues Angebot benötige ich mehr Details. Rufen Sie uns an oder schreiben Sie mir, was Sie planen.',
            loxone: 'LOXONE ist unser Spezialgebiet! Wir sind Gold Partner. Möchten Sie eine Beratung?',
            smart: 'Smart Home ist die Zukunft! Von Licht bis Heizung - alles steuerbar. Interesse?'
        };

        const lowerText = text.toLowerCase();
        for (const [keyword, response] of Object.entries(keywords)) {
            if (lowerText.includes(keyword)) {
                return response;
            }
        }

        // Full AI response
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 300,
                system: `Du bist der WhatsApp-Assistent von West Money Bau GmbH.
                Antworte kurz, freundlich und professionell auf Deutsch.
                Maximal 2-3 Sätze pro Nachricht.
                Fokus: Smart Home, LOXONE, Bauprojekte.`,
                messages: [{ role: 'user', content: text }]
            })
        });

        const result = await response.json();
        return result.content?.[0]?.text || 'Danke für Ihre Nachricht! Wir melden uns bald.';
    }
}

// ═══════════════════════════════════════════════════════════════
// EMAIL AUTO-RESPONDER
// ═══════════════════════════════════════════════════════════════

class EmailAutoResponder {
    constructor(config) {
        this.config = config;
    }

    /**
     * Process incoming email
     */
    async processEmail(email) {
        const { from, subject, body } = email;

        // Categorize email
        const category = await this.categorizeEmail(subject, body);
        
        // Generate response
        const response = await this.generateResponse(category, body);
        
        // Send auto-reply
        await this.sendEmail(from, `Re: ${subject}`, response);
        
        // Create CRM ticket if needed
        if (category === 'support' || category === 'complaint') {
            await this.createTicket(email, category);
        }

        return { category, response };
    }

    /**
     * Categorize email with AI
     */
    async categorizeEmail(subject, body) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 50,
                system: 'Kategorisiere diese E-Mail. Antworte NUR mit einer Kategorie: inquiry, support, complaint, sales, spam, other',
                messages: [{ role: 'user', content: `Betreff: ${subject}\n\n${body}` }]
            })
        });

        const result = await response.json();
        return result.content?.[0]?.text?.toLowerCase().trim() || 'other';
    }

    /**
     * Generate email response
     */
    async generateResponse(category, originalBody) {
        const templates = {
            inquiry: `Vielen Dank für Ihre Anfrage!

Wir haben Ihre Nachricht erhalten und werden uns innerhalb von 24 Stunden bei Ihnen melden.

Falls Sie dringende Fragen haben, erreichen Sie uns auch per WhatsApp.

Mit freundlichen Grüßen
West Money Bau GmbH`,
            
            support: `Danke für Ihre Nachricht an unseren Support!

Wir haben ein Ticket für Ihre Anfrage erstellt. Ein Mitarbeiter wird sich schnellstmöglich bei Ihnen melden.

Ticket-Nummer: #${Date.now().toString(36).toUpperCase()}

Mit freundlichen Grüßen
West Money Bau Support`,
            
            sales: `Vielen Dank für Ihr Interesse an unseren Leistungen!

Unser Vertriebsteam wird sich in Kürze mit Ihnen in Verbindung setzen, um Ihre Anforderungen zu besprechen.

Mit freundlichen Grüßen
West Money Bau GmbH`
        };

        return templates[category] || templates.inquiry;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = {
    VoiceAgent,
    VoiceAgentConfig,
    TelegramBot,
    WhatsAppAIBot,
    EmailAutoResponder
};
