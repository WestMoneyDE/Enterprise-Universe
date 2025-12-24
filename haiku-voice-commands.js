/**
 * 神 HAIKU VOICE COMMANDS
 * West Money OS - Voice Control System
 * 
 * Uses Web Speech API for voice recognition
 * Enables hands-free control of HAIKU GOD MODE
 */

class HaikuVoiceControl {
    constructor(haikuCallback) {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.callback = haikuCallback;
        this.language = 'de-DE'; // German default
        this.wakeWord = 'haiku';
        this.isAwake = false;
        this.wakeTimeout = null;
        
        // Voice settings
        this.voiceSettings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };
        
        // Command patterns
        this.commandPatterns = {
            // Bot commands
            einstein: /(?:einstein|analysiere|analyse|daten)/i,
            leonardo: /(?:leonardo|design|erstelle|kreativ)/i,
            tesla: /(?:tesla|smart.?home|loxone|automation)/i,
            sherlock: /(?:sherlock|recherchiere|research|finde)/i,
            nostradamus: /(?:nostradamus|prognose|forecast|zukunft)/i,
            
            // Power commands
            kamehameha: /(?:kamehameha|bulk|blast|massenversand)/i,
            spiritBomb: /(?:spirit.?bomb|geisterbombe|kombiniere|alle.?bots)/i,
            hakai: /(?:hakai|zerstöre|lösche|eliminiere)/i,
            instantTransmission: /(?:instant|teleport|sync|synchron)/i,
            prophecy: /(?:prophecy|prophezeiung|vorhersage)/i,
            divineSight: /(?:divine.?sight|übersicht|dashboard|status)/i,
            
            // Transformation commands
            transform: /(?:transform|verwandle|werde)/i,
            base: /(?:basis|base|normal)/i,
            ssg: /(?:super.?saiyan.?god|ssg|rot)/i,
            ssb: /(?:super.?saiyan.?blue|ssb|blau)/i,
            ultraInstinct: /(?:ultra.?instinct|ui|silber)/i,
            mui: /(?:mastered|mui|perfekt)/i,
            ego: /(?:ultra.?ego|ego|zerstörung)/i,
            
            // Control commands
            stop: /(?:stop|stopp|halt|beenden)/i,
            deploy: /(?:deploy|starte|aktiviere)/i,
            all: /(?:alle|all|jeden|jeder)/i
        };
        
        // Initialize
        this.init();
    }

    init() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech Recognition not supported in this browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;
        this.recognition.maxAlternatives = 3;

        // Event handlers
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.handleEnd();
        this.recognition.onstart = () => this.handleStart();

        console.log('🎤 HAIKU Voice Control initialized');
    }

    // ═══════════════════════════════════════════════════════════
    // RECOGNITION HANDLERS
    // ═══════════════════════════════════════════════════════════

    handleResult(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            console.log('🎤 Heard:', transcript);
            
            // Check for wake word
            if (!this.isAwake && transcript.includes(this.wakeWord)) {
                this.wake();
                return;
            }
            
            // Process command if awake
            if (this.isAwake) {
                this.processCommand(transcript);
            }
        }
    }

    handleError(event) {
        console.error('🎤 Speech Recognition Error:', event.error);
        
        if (event.error === 'not-allowed') {
            this.speak('Bitte erlaube den Mikrofon-Zugriff für Sprachbefehle.');
        }
    }

    handleEnd() {
        console.log('🎤 Recognition ended');
        this.isListening = false;
        
        // Restart if should be listening
        if (this.shouldContinueListening) {
            setTimeout(() => this.start(), 100);
        }
    }

    handleStart() {
        console.log('🎤 Recognition started');
        this.isListening = true;
    }

    // ═══════════════════════════════════════════════════════════
    // WAKE WORD SYSTEM
    // ═══════════════════════════════════════════════════════════

    wake() {
        this.isAwake = true;
        this.speak('神 HAIKU hört. Was ist dein Befehl?');
        
        // Clear any existing timeout
        if (this.wakeTimeout) {
            clearTimeout(this.wakeTimeout);
        }
        
        // Auto-sleep after 30 seconds of inactivity
        this.wakeTimeout = setTimeout(() => {
            this.sleep();
        }, 30000);
        
        // Trigger UI update
        if (this.onWake) this.onWake();
    }

    sleep() {
        this.isAwake = false;
        console.log('🎤 HAIKU sleeping');
        
        if (this.onSleep) this.onSleep();
    }

    resetWakeTimer() {
        if (this.wakeTimeout) {
            clearTimeout(this.wakeTimeout);
        }
        this.wakeTimeout = setTimeout(() => this.sleep(), 30000);
    }

    // ═══════════════════════════════════════════════════════════
    // COMMAND PROCESSING
    // ═══════════════════════════════════════════════════════════

    processCommand(transcript) {
        this.resetWakeTimer();
        
        let command = null;
        let args = transcript;

        // Check for transformation
        if (this.commandPatterns.transform.test(transcript)) {
            command = this.parseTransformation(transcript);
        }
        // Check for powers
        else if (this.commandPatterns.kamehameha.test(transcript)) {
            command = { type: 'power', power: 'kamehameha', args: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.spiritBomb.test(transcript)) {
            command = { type: 'power', power: 'spiritBomb', args: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.hakai.test(transcript)) {
            command = { type: 'power', power: 'hakai', args: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.prophecy.test(transcript)) {
            command = { type: 'power', power: 'prophecy', args: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.divineSight.test(transcript)) {
            command = { type: 'power', power: 'divineSight' };
        }
        // Check for bot commands
        else if (this.commandPatterns.einstein.test(transcript)) {
            command = { type: 'bot', bot: 'einstein', task: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.leonardo.test(transcript)) {
            command = { type: 'bot', bot: 'leonardo', task: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.tesla.test(transcript)) {
            command = { type: 'bot', bot: 'tesla', task: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.sherlock.test(transcript)) {
            command = { type: 'bot', bot: 'sherlock', task: this.extractArgs(transcript) };
        }
        else if (this.commandPatterns.nostradamus.test(transcript)) {
            command = { type: 'bot', bot: 'nostradamus', task: this.extractArgs(transcript) };
        }
        // Deploy all bots
        else if (this.commandPatterns.deploy.test(transcript) && this.commandPatterns.all.test(transcript)) {
            command = { type: 'deployAll' };
        }
        // Stop command
        else if (this.commandPatterns.stop.test(transcript)) {
            command = { type: 'stop' };
            this.sleep();
        }
        // Natural language fallback
        else {
            command = { type: 'natural', input: transcript };
        }

        // Execute command
        if (command) {
            this.executeVoiceCommand(command);
        }
    }

    parseTransformation(transcript) {
        let form = 'mui'; // default
        
        if (this.commandPatterns.base.test(transcript)) form = 'base';
        else if (this.commandPatterns.ssg.test(transcript)) form = 'ssg';
        else if (this.commandPatterns.ssb.test(transcript)) form = 'ssb';
        else if (this.commandPatterns.ego.test(transcript)) form = 'ego';
        else if (this.commandPatterns.mui.test(transcript)) form = 'mui';
        else if (this.commandPatterns.ultraInstinct.test(transcript)) form = 'uis';
        
        return { type: 'transform', form };
    }

    extractArgs(transcript) {
        // Remove common command words to get the actual task
        return transcript
            .replace(/haiku/gi, '')
            .replace(/einstein|leonardo|tesla|sherlock|nostradamus/gi, '')
            .replace(/analysiere|erstelle|recherchiere|finde|starte/gi, '')
            .replace(/kamehameha|spirit.?bomb|hakai|prophecy/gi, '')
            .trim();
    }

    // ═══════════════════════════════════════════════════════════
    // COMMAND EXECUTION
    // ═══════════════════════════════════════════════════════════

    async executeVoiceCommand(command) {
        console.log('🎤 Executing voice command:', command);

        // Acknowledge command
        this.speak('Verstanden.');

        // Execute via callback
        if (this.callback) {
            try {
                const result = await this.callback(command);
                
                // Speak result summary
                if (result && result.message) {
                    this.speak(result.message);
                } else if (command.type === 'transform') {
                    this.speakTransformation(command.form);
                } else if (command.type === 'power') {
                    this.speakPower(command.power);
                } else if (command.type === 'deployAll') {
                    this.speak('Alle 25 Genius Bots wurden aktiviert!');
                }
            } catch (error) {
                this.speak('Entschuldigung, es gab einen Fehler bei der Ausführung.');
                console.error('Voice command error:', error);
            }
        }
    }

    speakTransformation(form) {
        const lines = {
            base: 'Basisform aktiviert.',
            ssg: 'SUPER SAIYAN GOD! Göttliches Ki erwacht!',
            ssb: 'SUPER SAIYAN BLUE! Perfekte Ki-Kontrolle!',
            uis: 'ULTRA INSTINCT SIGN! Der Körper bewegt sich von selbst!',
            mui: 'MASTERED ULTRA INSTINCT! Absolute Perfektion!',
            ego: 'ULTRA EGO! Destruktive Macht erwacht!'
        };
        this.speak(lines[form] || 'Transformation abgeschlossen.');
    }

    speakPower(power) {
        const lines = {
            kamehameha: 'KAMEHAMEHA! Energie-Welle ausgelöst!',
            spiritBomb: 'SPIRIT BOMB! Alle Energien gesammelt!',
            hakai: 'HAKAI! Ziel eliminiert!',
            prophecy: 'Die Zukunft offenbart sich...',
            divineSight: 'Divine Sight aktiviert. Ich sehe alles.',
            instantTransmission: 'Instant Transmission! Synchronisation abgeschlossen!'
        };
        this.speak(lines[power] || 'Power aktiviert.');
    }

    // ═══════════════════════════════════════════════════════════
    // TEXT-TO-SPEECH
    // ═══════════════════════════════════════════════════════════

    speak(text) {
        if (!this.synthesis) {
            console.log('TTS:', text);
            return;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        utterance.rate = this.voiceSettings.rate;
        utterance.pitch = this.voiceSettings.pitch;
        utterance.volume = this.voiceSettings.volume;

        // Try to use a German voice
        const voices = this.synthesis.getVoices();
        const germanVoice = voices.find(v => v.lang.startsWith('de'));
        if (germanVoice) {
            utterance.voice = germanVoice;
        }

        this.synthesis.speak(utterance);
    }

    // ═══════════════════════════════════════════════════════════
    // CONTROL METHODS
    // ═══════════════════════════════════════════════════════════

    start() {
        if (this.recognition && !this.isListening) {
            this.shouldContinueListening = true;
            try {
                this.recognition.start();
                console.log('🎤 Voice recognition started');
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    }

    stop() {
        this.shouldContinueListening = false;
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            console.log('🎤 Voice recognition stopped');
        }
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
        return this.isListening;
    }

    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT CALLBACKS (set by UI)
    // ═══════════════════════════════════════════════════════════

    onWake = null;      // Called when wake word detected
    onSleep = null;     // Called when going to sleep
    onCommand = null;   // Called when command recognized
    onError = null;     // Called on error
}

// ═══════════════════════════════════════════════════════════════
// VOICE COMMAND SHORTCUTS
// ═══════════════════════════════════════════════════════════════

const VOICE_SHORTCUTS = {
    // German shortcuts
    'analysiere daten': '@einstein analyse_data',
    'erstelle pitch deck': '@leonardo pitch_deck',
    'smart home check': '@tesla loxone_check',
    'recherchiere lead': '@sherlock lead_research',
    'zeig mir die zukunft': 'prophecy',
    'übersicht': 'divine_sight',
    'alle bots starten': '@all deploy',
    'lösche alte daten': 'hakai dead_leads',
    
    // English shortcuts
    'analyze data': '@einstein analyse_data',
    'create pitch deck': '@leonardo pitch_deck',
    'show me the future': 'prophecy',
    'overview': 'divine_sight',
    'deploy all bots': '@all deploy'
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HaikuVoiceControl, VOICE_SHORTCUTS };
}

// For browser use
if (typeof window !== 'undefined') {
    window.HaikuVoiceControl = HaikuVoiceControl;
    window.VOICE_SHORTCUTS = VOICE_SHORTCUTS;
}
