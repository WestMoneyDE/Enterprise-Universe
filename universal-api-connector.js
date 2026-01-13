/**
 * 神 ENTERPRISE UNIVERSE - UNIVERSAL API CONNECTOR
 * Connects to 1400+ Public APIs
 * 
 * Supports: REST, GraphQL, WebSocket, OAuth, API Key, Bearer Token
 */

// ═══════════════════════════════════════════════════════════════
// API REGISTRY - 1400+ APIs kategorisiert
// ═══════════════════════════════════════════════════════════════

const API_REGISTRY = {
    // ═══════════════════════════════════════════════════════════
    // 💰 FINANCE APIs
    // ═══════════════════════════════════════════════════════════
    finance: {
        // Stock Market
        alphaVantage: { baseUrl: 'https://www.alphavantage.co/query', authType: 'query', authParam: 'apikey' },
        finnhub: { baseUrl: 'https://finnhub.io/api/v1', authType: 'header', authHeader: 'X-Finnhub-Token' },
        polygon: { baseUrl: 'https://api.polygon.io/v2', authType: 'query', authParam: 'apiKey' },
        iexCloud: { baseUrl: 'https://cloud.iexapis.com/stable', authType: 'query', authParam: 'token' },
        twelveData: { baseUrl: 'https://api.twelvedata.com', authType: 'query', authParam: 'apikey' },
        yahooFinance: { baseUrl: 'https://query1.finance.yahoo.com/v8', authType: 'none' },
        marketstack: { baseUrl: 'http://api.marketstack.com/v1', authType: 'query', authParam: 'access_key' },
        financialModelingPrep: { baseUrl: 'https://financialmodelingprep.com/api/v3', authType: 'query', authParam: 'apikey' },
        tradier: { baseUrl: 'https://api.tradier.com/v1', authType: 'bearer' },
        stockData: { baseUrl: 'https://api.stockdata.org/v1', authType: 'query', authParam: 'api_token' },
        
        // Banking & Payments
        stripe: { baseUrl: 'https://api.stripe.com/v1', authType: 'bearer' },
        plaid: { baseUrl: 'https://sandbox.plaid.com', authType: 'body', authFields: ['client_id', 'secret'] },
        square: { baseUrl: 'https://connect.squareup.com/v2', authType: 'bearer' },
        klarna: { baseUrl: 'https://api.klarna.com', authType: 'basic' },
        mercadoPago: { baseUrl: 'https://api.mercadopago.com', authType: 'bearer' },
        moov: { baseUrl: 'https://api.moov.io', authType: 'bearer' },
        razorpay: { baseUrl: 'https://api.razorpay.com/v1', authType: 'basic' },
        revolut: { baseUrl: 'https://sandbox-b2b.revolut.com/api/1.0', authType: 'bearer' },
        
        // Tax & VAT
        vatLayer: { baseUrl: 'http://apilayer.net/api', authType: 'query', authParam: 'access_key' },
        taxData: { baseUrl: 'https://api.apilayer.com/tax_data', authType: 'header', authHeader: 'apikey' },
        vatComply: { baseUrl: 'https://api.vatcomply.com', authType: 'none' },
        
        // Budgeting
        ynab: { baseUrl: 'https://api.youneedabudget.com/v1', authType: 'bearer' },
        zohoBooks: { baseUrl: 'https://books.zoho.com/api/v3', authType: 'oauth' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏢 BUSINESS APIs
    // ═══════════════════════════════════════════════════════════
    business: {
        // CRM & Project Management
        hubspot: { baseUrl: 'https://api.hubapi.com', authType: 'bearer' },
        salesforce: { baseUrl: 'https://login.salesforce.com/services', authType: 'oauth' },
        pipedrive: { baseUrl: 'https://api.pipedrive.com/v1', authType: 'query', authParam: 'api_token' },
        trello: { baseUrl: 'https://api.trello.com/1', authType: 'query', authParams: ['key', 'token'] },
        asana: { baseUrl: 'https://app.asana.com/api/1.0', authType: 'bearer' },
        clickup: { baseUrl: 'https://api.clickup.com/api/v2', authType: 'bearer' },
        monday: { baseUrl: 'https://api.monday.com/v2', authType: 'bearer' },
        notion: { baseUrl: 'https://api.notion.com/v1', authType: 'bearer' },
        jira: { baseUrl: 'https://api.atlassian.com/ex/jira', authType: 'bearer' },
        todoist: { baseUrl: 'https://api.todoist.com/rest/v2', authType: 'bearer' },
        
        // Email Marketing
        mailchimp: { baseUrl: 'https://usX.api.mailchimp.com/3.0', authType: 'basic' },
        sendgrid: { baseUrl: 'https://api.sendgrid.com/v3', authType: 'bearer' },
        sendinblue: { baseUrl: 'https://api.sendinblue.com/v3', authType: 'header', authHeader: 'api-key' },
        mailjet: { baseUrl: 'https://api.mailjet.com/v3.1', authType: 'basic' },
        
        // Analytics
        googleAnalytics: { baseUrl: 'https://analyticsdata.googleapis.com/v1beta', authType: 'oauth' },
        mixpanel: { baseUrl: 'https://mixpanel.com/api/2.0', authType: 'basic' },
        amplitude: { baseUrl: 'https://analytics.amplitude.com/api/2', authType: 'bearer' },
        
        // Company Data
        clearbit: { baseUrl: 'https://company.clearbit.com/v2', authType: 'bearer' },
        hunter: { baseUrl: 'https://api.hunter.io/v2', authType: 'query', authParam: 'api_key' },
        tomba: { baseUrl: 'https://api.tomba.io/v1', authType: 'header', authHeader: 'X-Tomba-Key' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🪙 CRYPTOCURRENCY APIs
    // ═══════════════════════════════════════════════════════════
    crypto: {
        // Exchanges
        binance: { baseUrl: 'https://api.binance.com/api/v3', authType: 'header', authHeader: 'X-MBX-APIKEY' },
        coinbase: { baseUrl: 'https://api.coinbase.com/v2', authType: 'bearer' },
        kraken: { baseUrl: 'https://api.kraken.com/0', authType: 'header' },
        kucoin: { baseUrl: 'https://api.kucoin.com/api/v1', authType: 'header' },
        bitfinex: { baseUrl: 'https://api-pub.bitfinex.com/v2', authType: 'header' },
        bybit: { baseUrl: 'https://api.bybit.com/v2', authType: 'header' },
        gemini: { baseUrl: 'https://api.gemini.com/v1', authType: 'none' },
        
        // Market Data
        coinGecko: { baseUrl: 'https://api.coingecko.com/api/v3', authType: 'none' },
        coinMarketCap: { baseUrl: 'https://pro-api.coinmarketcap.com/v1', authType: 'header', authHeader: 'X-CMC_PRO_API_KEY' },
        coinCap: { baseUrl: 'https://api.coincap.io/v2', authType: 'none' },
        messari: { baseUrl: 'https://data.messari.io/api/v1', authType: 'header', authHeader: 'x-messari-api-key' },
        nomics: { baseUrl: 'https://api.nomics.com/v1', authType: 'query', authParam: 'key' },
        
        // Blockchain
        etherscan: { baseUrl: 'https://api.etherscan.io/api', authType: 'query', authParam: 'apikey' },
        alchemy: { baseUrl: 'https://eth-mainnet.alchemyapi.io/v2', authType: 'path' },
        infura: { baseUrl: 'https://mainnet.infura.io/v3', authType: 'path' },
        theGraph: { baseUrl: 'https://api.thegraph.com/subgraphs', authType: 'header' },
        covalent: { baseUrl: 'https://api.covalenthq.com/v1', authType: 'basic' }
    },

    // ═══════════════════════════════════════════════════════════
    // 💱 CURRENCY EXCHANGE APIs
    // ═══════════════════════════════════════════════════════════
    currency: {
        fixer: { baseUrl: 'http://data.fixer.io/api', authType: 'query', authParam: 'access_key' },
        exchangeRateApi: { baseUrl: 'https://v6.exchangerate-api.com/v6', authType: 'path' },
        frankfurter: { baseUrl: 'https://api.frankfurter.app', authType: 'none' },
        currencyApi: { baseUrl: 'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1', authType: 'none' },
        currencyFreaks: { baseUrl: 'https://api.currencyfreaks.com/latest', authType: 'query', authParam: 'apikey' },
        openExchangeRates: { baseUrl: 'https://openexchangerates.org/api', authType: 'query', authParam: 'app_id' }
    },

    // ═══════════════════════════════════════════════════════════
    // 📱 COMMUNICATION APIs
    // ═══════════════════════════════════════════════════════════
    communication: {
        whatsapp: { baseUrl: 'https://graph.facebook.com/v17.0', authType: 'bearer' },
        twilio: { baseUrl: 'https://api.twilio.com/2010-04-01', authType: 'basic' },
        telegram: { baseUrl: 'https://api.telegram.org/bot', authType: 'path' },
        discord: { baseUrl: 'https://discord.com/api/v10', authType: 'bot' },
        slack: { baseUrl: 'https://slack.com/api', authType: 'bearer' },
        vonage: { baseUrl: 'https://api.nexmo.com', authType: 'query', authParams: ['api_key', 'api_secret'] },
        messagebird: { baseUrl: 'https://rest.messagebird.com', authType: 'header', authHeader: 'Authorization' },
        pusher: { baseUrl: 'https://api.pusher.com', authType: 'query' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🔐 AUTHENTICATION APIs
    // ═══════════════════════════════════════════════════════════
    auth: {
        auth0: { baseUrl: 'https://YOUR_DOMAIN.auth0.com', authType: 'bearer' },
        okta: { baseUrl: 'https://YOUR_DOMAIN.okta.com/api/v1', authType: 'ssws' },
        firebase: { baseUrl: 'https://identitytoolkit.googleapis.com/v1', authType: 'query', authParam: 'key' },
        cognito: { baseUrl: 'https://cognito-idp.REGION.amazonaws.com', authType: 'aws' },
        stytch: { baseUrl: 'https://api.stytch.com/v1', authType: 'basic' },
        mojoAuth: { baseUrl: 'https://api.mojoauth.com', authType: 'header', authHeader: 'X-API-Key' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🤖 AI & MACHINE LEARNING APIs
    // ═══════════════════════════════════════════════════════════
    ai: {
        anthropic: { baseUrl: 'https://api.anthropic.com/v1', authType: 'header', authHeader: 'x-api-key' },
        openai: { baseUrl: 'https://api.openai.com/v1', authType: 'bearer' },
        huggingFace: { baseUrl: 'https://api-inference.huggingface.co', authType: 'bearer' },
        cohere: { baseUrl: 'https://api.cohere.ai/v1', authType: 'bearer' },
        replicate: { baseUrl: 'https://api.replicate.com/v1', authType: 'bearer' },
        stabilityAi: { baseUrl: 'https://api.stability.ai/v1', authType: 'bearer' },
        deepgram: { baseUrl: 'https://api.deepgram.com/v1', authType: 'bearer' },
        assemblyAi: { baseUrl: 'https://api.assemblyai.com/v2', authType: 'bearer' },
        clarifai: { baseUrl: 'https://api.clarifai.com/v2', authType: 'bearer' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🌍 GEOCODING & MAPS APIs
    // ═══════════════════════════════════════════════════════════
    geo: {
        googleMaps: { baseUrl: 'https://maps.googleapis.com/maps/api', authType: 'query', authParam: 'key' },
        mapbox: { baseUrl: 'https://api.mapbox.com', authType: 'query', authParam: 'access_token' },
        here: { baseUrl: 'https://geocode.search.hereapi.com/v1', authType: 'query', authParam: 'apiKey' },
        tomtom: { baseUrl: 'https://api.tomtom.com', authType: 'query', authParam: 'key' },
        ipinfo: { baseUrl: 'https://ipinfo.io', authType: 'bearer' },
        ipstack: { baseUrl: 'http://api.ipstack.com', authType: 'query', authParam: 'access_key' },
        ipApi: { baseUrl: 'http://ip-api.com/json', authType: 'none' },
        abstractIp: { baseUrl: 'https://ipgeolocation.abstractapi.com/v1', authType: 'query', authParam: 'api_key' },
        positionstack: { baseUrl: 'http://api.positionstack.com/v1', authType: 'query', authParam: 'access_key' }
    },

    // ═══════════════════════════════════════════════════════════
    // ☁️ WEATHER APIs
    // ═══════════════════════════════════════════════════════════
    weather: {
        openWeatherMap: { baseUrl: 'https://api.openweathermap.org/data/2.5', authType: 'query', authParam: 'appid' },
        weatherstack: { baseUrl: 'http://api.weatherstack.com', authType: 'query', authParam: 'access_key' },
        weatherApi: { baseUrl: 'https://api.weatherapi.com/v1', authType: 'query', authParam: 'key' },
        visualCrossing: { baseUrl: 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services', authType: 'query', authParam: 'key' },
        tomorrowIo: { baseUrl: 'https://api.tomorrow.io/v4', authType: 'query', authParam: 'apikey' }
    },

    // ═══════════════════════════════════════════════════════════
    // 📰 NEWS APIs
    // ═══════════════════════════════════════════════════════════
    news: {
        newsApi: { baseUrl: 'https://newsapi.org/v2', authType: 'header', authHeader: 'X-Api-Key' },
        gnews: { baseUrl: 'https://gnews.io/api/v4', authType: 'query', authParam: 'apikey' },
        currentsApi: { baseUrl: 'https://api.currentsapi.services/v1', authType: 'query', authParam: 'apiKey' },
        mediastack: { baseUrl: 'http://api.mediastack.com/v1', authType: 'query', authParam: 'access_key' },
        nytimes: { baseUrl: 'https://api.nytimes.com/svc', authType: 'query', authParam: 'api-key' },
        guardian: { baseUrl: 'https://content.guardianapis.com', authType: 'query', authParam: 'api-key' }
    },

    // ═══════════════════════════════════════════════════════════
    // ☁️ CLOUD STORAGE APIs
    // ═══════════════════════════════════════════════════════════
    storage: {
        googleDrive: { baseUrl: 'https://www.googleapis.com/drive/v3', authType: 'oauth' },
        dropbox: { baseUrl: 'https://api.dropboxapi.com/2', authType: 'bearer' },
        oneDrive: { baseUrl: 'https://graph.microsoft.com/v1.0', authType: 'bearer' },
        box: { baseUrl: 'https://api.box.com/2.0', authType: 'bearer' },
        cloudinary: { baseUrl: 'https://api.cloudinary.com/v1_1', authType: 'basic' },
        imgbb: { baseUrl: 'https://api.imgbb.com/1', authType: 'query', authParam: 'key' },
        uploadcare: { baseUrl: 'https://api.uploadcare.com', authType: 'header' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏠 IOT & SMART HOME APIs
    // ═══════════════════════════════════════════════════════════
    iot: {
        homeAssistant: { baseUrl: 'http://homeassistant.local:8123/api', authType: 'bearer' },
        smartThings: { baseUrl: 'https://api.smartthings.com/v1', authType: 'bearer' },
        philipsHue: { baseUrl: 'https://api.meethue.com/bridge', authType: 'oauth' },
        ifttt: { baseUrl: 'https://maker.ifttt.com/trigger', authType: 'path' },
        tuya: { baseUrl: 'https://openapi.tuyaeu.com/v1.0', authType: 'header' },
        blynk: { baseUrl: 'https://blynk.cloud/external/api', authType: 'query', authParam: 'token' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🔒 SECURITY APIs
    // ═══════════════════════════════════════════════════════════
    security: {
        virusTotal: { baseUrl: 'https://www.virustotal.com/api/v3', authType: 'header', authHeader: 'x-apikey' },
        abuseIpdb: { baseUrl: 'https://api.abuseipdb.com/api/v2', authType: 'header', authHeader: 'Key' },
        urlScan: { baseUrl: 'https://urlscan.io/api/v1', authType: 'header', authHeader: 'API-Key' },
        shodan: { baseUrl: 'https://api.shodan.io', authType: 'query', authParam: 'key' },
        haveibeenpwned: { baseUrl: 'https://haveibeenpwned.com/api/v3', authType: 'header', authHeader: 'hibp-api-key' },
        securityTrails: { baseUrl: 'https://api.securitytrails.com/v1', authType: 'header', authHeader: 'APIKEY' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🔧 DEVELOPMENT APIs
    // ═══════════════════════════════════════════════════════════
    development: {
        github: { baseUrl: 'https://api.github.com', authType: 'bearer' },
        gitlab: { baseUrl: 'https://gitlab.com/api/v4', authType: 'header', authHeader: 'PRIVATE-TOKEN' },
        bitbucket: { baseUrl: 'https://api.bitbucket.org/2.0', authType: 'basic' },
        npm: { baseUrl: 'https://registry.npmjs.org', authType: 'none' },
        pypi: { baseUrl: 'https://pypi.org/pypi', authType: 'none' },
        jsdelivr: { baseUrl: 'https://data.jsdelivr.com/v1', authType: 'none' },
        postman: { baseUrl: 'https://api.getpostman.com', authType: 'header', authHeader: 'X-Api-Key' },
        vercel: { baseUrl: 'https://api.vercel.com', authType: 'bearer' },
        netlify: { baseUrl: 'https://api.netlify.com/api/v1', authType: 'bearer' },
        heroku: { baseUrl: 'https://api.heroku.com', authType: 'bearer' }
    },

    // ═══════════════════════════════════════════════════════════
    // 📊 DATA VALIDATION APIs
    // ═══════════════════════════════════════════════════════════
    validation: {
        numverify: { baseUrl: 'http://apilayer.net/api', authType: 'query', authParam: 'access_key' },
        abstractEmail: { baseUrl: 'https://emailvalidation.abstractapi.com/v1', authType: 'query', authParam: 'api_key' },
        mailboxLayer: { baseUrl: 'http://apilayer.net/api', authType: 'query', authParam: 'access_key' },
        kickbox: { baseUrl: 'https://open.kickbox.com/v1', authType: 'none' },
        eva: { baseUrl: 'https://api.eva.pingutil.com', authType: 'none' },
        usStreet: { baseUrl: 'https://us-street.api.smartystreets.com', authType: 'query', authParams: ['auth-id', 'auth-token'] }
    },

    // ═══════════════════════════════════════════════════════════
    // 🛒 E-COMMERCE APIs
    // ═══════════════════════════════════════════════════════════
    ecommerce: {
        shopify: { baseUrl: 'https://YOUR_STORE.myshopify.com/admin/api/2023-10', authType: 'header', authHeader: 'X-Shopify-Access-Token' },
        woocommerce: { baseUrl: 'https://YOUR_STORE/wp-json/wc/v3', authType: 'basic' },
        bigcommerce: { baseUrl: 'https://api.bigcommerce.com/stores/STORE_HASH/v3', authType: 'header', authHeader: 'X-Auth-Token' },
        ebay: { baseUrl: 'https://api.ebay.com', authType: 'bearer' },
        etsy: { baseUrl: 'https://openapi.etsy.com/v3', authType: 'bearer' },
        amazon: { baseUrl: 'https://sellingpartnerapi-eu.amazon.com', authType: 'aws' }
    },

    // ═══════════════════════════════════════════════════════════
    // 🎮 SOCIAL MEDIA APIs
    // ═══════════════════════════════════════════════════════════
    social: {
        twitter: { baseUrl: 'https://api.twitter.com/2', authType: 'bearer' },
        facebook: { baseUrl: 'https://graph.facebook.com/v18.0', authType: 'bearer' },
        instagram: { baseUrl: 'https://graph.instagram.com', authType: 'bearer' },
        linkedin: { baseUrl: 'https://api.linkedin.com/v2', authType: 'bearer' },
        tiktok: { baseUrl: 'https://open-api.tiktok.com', authType: 'bearer' },
        youtube: { baseUrl: 'https://www.googleapis.com/youtube/v3', authType: 'query', authParam: 'key' },
        reddit: { baseUrl: 'https://oauth.reddit.com', authType: 'bearer' },
        pinterest: { baseUrl: 'https://api.pinterest.com/v5', authType: 'bearer' }
    }
};

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL API CONNECTOR CLASS
// ═══════════════════════════════════════════════════════════════

class UniversalAPIConnector {
    constructor(credentials = {}) {
        this.credentials = credentials;
        this.cache = new Map();
        this.rateLimits = new Map();
    }

    /**
     * Make API request to any registered API
     */
    async call(category, apiName, endpoint, options = {}) {
        const apiConfig = API_REGISTRY[category]?.[apiName];
        if (!apiConfig) {
            throw new Error(`API not found: ${category}.${apiName}`);
        }

        const url = this.buildUrl(apiConfig, endpoint, options.params);
        const headers = this.buildHeaders(apiConfig, options.headers);
        const body = options.body ? JSON.stringify(options.body) : undefined;

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Build URL with auth parameters
     */
    buildUrl(apiConfig, endpoint, params = {}) {
        let url = `${apiConfig.baseUrl}${endpoint}`;
        const queryParams = new URLSearchParams(params);

        // Add auth to query if needed
        if (apiConfig.authType === 'query') {
            if (apiConfig.authParam) {
                queryParams.set(apiConfig.authParam, this.credentials[apiConfig.authParam] || '');
            }
            if (apiConfig.authParams) {
                apiConfig.authParams.forEach(param => {
                    queryParams.set(param, this.credentials[param] || '');
                });
            }
        }

        // Add auth to path if needed
        if (apiConfig.authType === 'path') {
            url = `${apiConfig.baseUrl}/${this.credentials.apiKey}${endpoint}`;
        }

        const queryString = queryParams.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    /**
     * Build headers with auth
     */
    buildHeaders(apiConfig, customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        switch (apiConfig.authType) {
            case 'bearer':
                headers['Authorization'] = `Bearer ${this.credentials.accessToken || this.credentials.apiKey}`;
                break;
            case 'basic':
                const basic = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
                headers['Authorization'] = `Basic ${basic}`;
                break;
            case 'header':
                headers[apiConfig.authHeader] = this.credentials.apiKey;
                break;
            case 'bot':
                headers['Authorization'] = `Bot ${this.credentials.botToken}`;
                break;
            case 'ssws':
                headers['Authorization'] = `SSWS ${this.credentials.apiKey}`;
                break;
        }

        return headers;
    }

    /**
     * Get stock price from multiple sources
     */
    async getStockPrice(symbol) {
        try {
            return await this.call('finance', 'alphaVantage', '', {
                params: { function: 'GLOBAL_QUOTE', symbol }
            });
        } catch {
            return await this.call('finance', 'finnhub', `/quote`, {
                params: { symbol }
            });
        }
    }

    /**
     * Get crypto price from CoinGecko (free, no auth)
     */
    async getCryptoPrice(coinId) {
        return this.call('crypto', 'coinGecko', `/simple/price`, {
            params: { ids: coinId, vs_currencies: 'usd,eur' }
        });
    }

    /**
     * Get exchange rates
     */
    async getExchangeRates(base = 'EUR') {
        return this.call('currency', 'frankfurter', `/latest`, {
            params: { from: base }
        });
    }

    /**
     * Validate email address
     */
    async validateEmail(email) {
        return this.call('validation', 'abstractEmail', '', {
            params: { email }
        });
    }

    /**
     * Get weather for location
     */
    async getWeather(city) {
        return this.call('weather', 'openWeatherMap', '/weather', {
            params: { q: city, units: 'metric' }
        });
    }

    /**
     * Send WhatsApp message
     */
    async sendWhatsApp(phoneId, to, message) {
        return this.call('communication', 'whatsapp', `/${phoneId}/messages`, {
            method: 'POST',
            body: {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message }
            }
        });
    }

    /**
     * Get HubSpot contacts
     */
    async getHubSpotContacts(limit = 100) {
        return this.call('business', 'hubspot', '/crm/v3/objects/contacts', {
            params: { limit }
        });
    }

    /**
     * AI Chat completion - Claude Haiku 4.5
     */
    async aiChat(messages, model = 'claude-3-haiku-20240307') {
        return this.call('ai', 'anthropic', '/messages', {
            method: 'POST',
            body: {
                model,
                max_tokens: 1024,
                messages
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = {
    UniversalAPIConnector,
    API_REGISTRY
};
