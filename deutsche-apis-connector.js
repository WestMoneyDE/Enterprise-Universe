/**
 * 🇩🇪 DEUTSCHE BUSINESS APIS CONNECTOR
 * Enterprise Universe GmbH
 * 
 * Vollständige Integration aller wichtigen deutschen Business-APIs
 */

// ═══════════════════════════════════════════════════════════════
// DEUTSCHE API REGISTRY
// ═══════════════════════════════════════════════════════════════

const DEUTSCHE_APIS = {
    
    // ═══════════════════════════════════════════════════════════
    // 📊 BUCHHALTUNG & FINANZEN
    // ═══════════════════════════════════════════════════════════
    
    buchhaltung: {
        datev: {
            name: 'DATEV',
            baseUrl: 'https://api.datev.de/v1',
            authType: 'oauth2',
            scopes: ['accounting', 'taxes', 'payroll'],
            endpoints: {
                buchungen: '/accounting/bookings',
                konten: '/accounting/accounts',
                belege: '/documents',
                steuern: '/taxes',
                lohn: '/payroll'
            },
            description: 'Deutschlands führende Steuerberater-Software'
        },
        
        lexoffice: {
            name: 'lexoffice',
            baseUrl: 'https://api.lexoffice.io/v1',
            authType: 'bearer',
            endpoints: {
                contacts: '/contacts',
                invoices: '/invoices',
                creditNotes: '/credit-notes',
                quotations: '/quotations',
                orderConfirmations: '/order-confirmations',
                deliveryNotes: '/delivery-notes',
                vouchers: '/vouchers',
                payments: '/payments',
                files: '/files'
            },
            description: 'Cloud-Buchhaltung für Selbstständige & KMU'
        },
        
        sevdesk: {
            name: 'sevDesk',
            baseUrl: 'https://my.sevdesk.de/api/v1',
            authType: 'header',
            authHeader: 'Authorization',
            endpoints: {
                contact: '/Contact',
                invoice: '/Invoice',
                order: '/Order',
                voucher: '/Voucher',
                accountingContact: '/AccountingContact',
                checkAccount: '/CheckAccount',
                communicationWay: '/CommunicationWay'
            },
            description: 'Online-Buchhaltung mit Belegerfassung'
        },
        
        billomat: {
            name: 'Billomat',
            baseUrl: 'https://api.billomat.net/api',
            authType: 'header',
            authHeader: 'X-BillomatApiKey',
            endpoints: {
                clients: '/clients',
                invoices: '/invoices',
                creditNotes: '/credit-notes',
                offers: '/offers',
                confirmations: '/confirmations'
            }
        },
        
        fastbill: {
            name: 'FastBill',
            baseUrl: 'https://my.fastbill.com/api/1.0/api.php',
            authType: 'basic',
            endpoints: {
                customer: 'customer.get',
                invoice: 'invoice.get',
                estimate: 'estimate.get',
                revenue: 'revenue.get'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏦 BANKING & ZAHLUNGEN
    // ═══════════════════════════════════════════════════════════
    
    banking: {
        deutscheBank: {
            name: 'Deutsche Bank API',
            baseUrl: 'https://simulator-api.db.com/gw/dbapi/v1',
            authType: 'oauth2',
            endpoints: {
                accounts: '/cashManagement/accounts',
                transactions: '/cashManagement/transactions',
                payments: '/payments',
                balances: '/cashManagement/balances'
            }
        },
        
        n26: {
            name: 'N26 Business',
            baseUrl: 'https://api.tech26.de',
            authType: 'oauth2',
            endpoints: {
                accounts: '/api/accounts',
                transactions: '/api/smrt/transactions',
                spaces: '/api/spaces'
            }
        },
        
        sparkasse: {
            name: 'Sparkasse PSD2',
            baseUrl: 'https://api.sparkasse.de/psd2/v1',
            authType: 'oauth2',
            endpoints: {
                accounts: '/accounts',
                balances: '/accounts/{accountId}/balances',
                transactions: '/accounts/{accountId}/transactions'
            }
        },
        
        finAPI: {
            name: 'finAPI',
            baseUrl: 'https://sandbox.finapi.io/api/v1',
            authType: 'oauth2',
            description: 'Multi-Bank API für Deutschland',
            endpoints: {
                bankConnections: '/bankConnections',
                accounts: '/accounts',
                transactions: '/transactions',
                securities: '/securities',
                payments: '/payments'
            }
        },
        
        klarna: {
            name: 'Klarna',
            baseUrl: 'https://api.klarna.com',
            authType: 'basic',
            endpoints: {
                sessions: '/payments/v1/sessions',
                orders: '/ordermanagement/v1/orders',
                captures: '/ordermanagement/v1/orders/{orderId}/captures'
            }
        },
        
        giropay: {
            name: 'giropay',
            baseUrl: 'https://api.paydirekt.de',
            authType: 'oauth2',
            endpoints: {
                checkout: '/api/checkout/v1/checkouts',
                refund: '/api/checkout/v1/checkouts/{checkoutId}/refunds'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 📦 VERSAND & LOGISTIK
    // ═══════════════════════════════════════════════════════════
    
    versand: {
        dhl: {
            name: 'DHL Business',
            baseUrl: 'https://api-eu.dhl.com',
            authType: 'header',
            authHeader: 'DHL-API-Key',
            endpoints: {
                shipments: '/parcel/de/shipping/v2/orders',
                tracking: '/track/shipments',
                locations: '/location-finder/v1/find-by-address',
                labels: '/parcel/de/shipping/v2/labels'
            }
        },
        
        dpd: {
            name: 'DPD',
            baseUrl: 'https://api.dpd.com',
            authType: 'basic',
            endpoints: {
                shipments: '/shipping/v4/shipments',
                tracking: '/tracking/v2/parcels',
                pickups: '/pickup/v1/pickups'
            }
        },
        
        hermes: {
            name: 'Hermes',
            baseUrl: 'https://api.myhermes.de',
            authType: 'oauth2',
            endpoints: {
                shipments: '/v1/shipments',
                tracking: '/v1/tracking',
                labels: '/v1/labels'
            }
        },
        
        gls: {
            name: 'GLS',
            baseUrl: 'https://api.gls-group.eu',
            authType: 'basic',
            endpoints: {
                shipments: '/v1/shipments',
                tracking: '/v1/tracking',
                labels: '/v1/labels'
            }
        },
        
        ups: {
            name: 'UPS',
            baseUrl: 'https://onlinetools.ups.com/api',
            authType: 'oauth2',
            endpoints: {
                shipments: '/shipments/v1/ship',
                tracking: '/track/v1/details',
                rates: '/rating/v1/Rate'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏢 HANDELSREGISTER & UNTERNEHMENSDATEN
    // ═══════════════════════════════════════════════════════════
    
    unternehmen: {
        handelsregister: {
            name: 'Handelsregister',
            baseUrl: 'https://www.handelsregister.de/rp_web/api',
            authType: 'none',
            endpoints: {
                search: '/search',
                company: '/company/{hrNumber}'
            },
            note: 'Offizielles Handelsregister Deutschland'
        },
        
        bundesanzeiger: {
            name: 'Bundesanzeiger',
            baseUrl: 'https://www.bundesanzeiger.de/api',
            authType: 'apiKey',
            endpoints: {
                publications: '/publications',
                financials: '/financials',
                search: '/search'
            }
        },
        
        northData: {
            name: 'North Data',
            baseUrl: 'https://www.northdata.de/api/v1',
            authType: 'header',
            authHeader: 'X-Api-Key',
            endpoints: {
                company: '/company',
                person: '/person',
                search: '/search',
                graph: '/graph'
            },
            description: 'Umfassende Unternehmensdaten'
        },
        
        creditreform: {
            name: 'Creditreform',
            baseUrl: 'https://api.creditreform.de/v1',
            authType: 'oauth2',
            endpoints: {
                company: '/companies',
                rating: '/ratings',
                monitoring: '/monitoring'
            },
            description: 'Bonitätsprüfung & Wirtschaftsinformationen'
        },
        
        schufa: {
            name: 'SCHUFA B2B',
            baseUrl: 'https://api.schufa.de/b2b/v1',
            authType: 'oauth2',
            endpoints: {
                bonitaet: '/credit-check',
                identitaet: '/identity-check',
                adresse: '/address-check'
            },
            description: 'Bonitäts- und Identitätsprüfung'
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏛️ BEHÖRDEN & ÖFFENTLICHE APIS
    // ═══════════════════════════════════════════════════════════
    
    behoerden: {
        elster: {
            name: 'ELSTER',
            baseUrl: 'https://erika.elster.de',
            authType: 'certificate',
            endpoints: {
                authenticate: '/auth',
                submit: '/submit',
                retrieve: '/retrieve'
            },
            description: 'Elektronische Steuererklärung'
        },
        
        bundesagentur: {
            name: 'Bundesagentur für Arbeit',
            baseUrl: 'https://rest.arbeitsagentur.de',
            authType: 'oauth2',
            endpoints: {
                jobsuche: '/jobsuche/v1',
                berufenet: '/berufenet/v1',
                entgeltatlas: '/entgeltatlas/v1'
            }
        },
        
        destatis: {
            name: 'Destatis (Statistisches Bundesamt)',
            baseUrl: 'https://www-genesis.destatis.de/genesisWS/rest/2020',
            authType: 'basic',
            endpoints: {
                data: '/data',
                catalogue: '/catalogue',
                metadata: '/metadata'
            },
            description: 'Offizielle Statistiken Deutschland'
        },
        
        bafin: {
            name: 'BaFin',
            baseUrl: 'https://portal.mvp.bafin.de/api',
            authType: 'oauth2',
            endpoints: {
                register: '/register',
                meldungen: '/notifications'
            },
            description: 'Finanzaufsicht Deutschland'
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏭 INDUSTRIE & HANDWERK
    // ═══════════════════════════════════════════════════════════
    
    industrie: {
        ihk: {
            name: 'IHK',
            baseUrl: 'https://api.ihk.de/v1',
            authType: 'apiKey',
            endpoints: {
                companies: '/companies',
                events: '/events',
                training: '/training'
            }
        },
        
        hwk: {
            name: 'Handwerkskammer',
            baseUrl: 'https://api.hwk.de/v1',
            authType: 'apiKey',
            endpoints: {
                betriebe: '/businesses',
                meister: '/masters',
                ausbildung: '/apprenticeships'
            }
        },
        
        zvshk: {
            name: 'ZVSHK (Sanitär-Heizung-Klima)',
            baseUrl: 'https://api.zvshk.de/v1',
            authType: 'apiKey',
            endpoints: {
                betriebe: '/businesses',
                produkte: '/products',
                schulungen: '/trainings'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 🏠 IMMOBILIEN & BAU
    // ═══════════════════════════════════════════════════════════
    
    immobilien: {
        immoscout24: {
            name: 'ImmobilienScout24',
            baseUrl: 'https://rest.immobilienscout24.de/restapi/api',
            authType: 'oauth',
            endpoints: {
                search: '/search/v1.0/search/region',
                expose: '/offer/v1.0/user/{username}/realestate',
                contact: '/search/v1.0/expose/{exposeId}/contact'
            }
        },
        
        immowelt: {
            name: 'Immowelt',
            baseUrl: 'https://api.immowelt.de/v1',
            authType: 'oauth2',
            endpoints: {
                listings: '/listings',
                search: '/search',
                contact: '/contact'
            }
        },
        
        baupreise: {
            name: 'Baupreislexikon',
            baseUrl: 'https://api.baupreislexikon.de/v1',
            authType: 'apiKey',
            endpoints: {
                preise: '/prices',
                kalkulationen: '/calculations',
                regionen: '/regions'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════
    // 🔌 ENERGIE & SMART HOME
    // ═══════════════════════════════════════════════════════════
    
    energie: {
        loxone: {
            name: 'LOXONE',
            baseUrl: 'http://miniserver.local',
            authType: 'basic',
            endpoints: {
                structure: '/data/LoxAPP3.json',
                status: '/jdev/sps/status',
                control: '/jdev/sps/io/{uuid}/{value}'
            },
            description: 'Smart Home Automation'
        },
        
        enbw: {
            name: 'EnBW',
            baseUrl: 'https://api.enbw.com/v1',
            authType: 'oauth2',
            endpoints: {
                verbrauch: '/consumption',
                tarife: '/tariffs',
                ladesaeulen: '/charging-stations'
            }
        },
        
        tibber: {
            name: 'Tibber',
            baseUrl: 'https://api.tibber.com/v1-beta/gql',
            authType: 'bearer',
            graphql: true,
            description: 'Dynamische Strompreise'
        },
        
        awattar: {
            name: 'aWATTar',
            baseUrl: 'https://api.awattar.de/v1',
            authType: 'none',
            endpoints: {
                marketdata: '/marketdata'
            },
            description: 'Stündliche Strompreise'
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// DEUTSCHE API CONNECTOR CLASS
// ═══════════════════════════════════════════════════════════════

class DeutscheAPIConnector {
    constructor(credentials = {}) {
        this.credentials = credentials;
        this.apis = DEUTSCHE_APIS;
    }

    /**
     * Generische API-Anfrage
     */
    async request(category, apiName, endpoint, options = {}) {
        const api = this.apis[category]?.[apiName];
        if (!api) throw new Error(`API nicht gefunden: ${category}.${apiName}`);

        const url = this.buildUrl(api, endpoint, options.params);
        const headers = this.buildHeaders(api, options.headers);

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
            throw new Error(`API Fehler: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    buildUrl(api, endpoint, params = {}) {
        let url = `${api.baseUrl}${endpoint}`;
        const queryParams = new URLSearchParams(params);
        const queryString = queryParams.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    buildHeaders(api, customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...customHeaders
        };

        switch (api.authType) {
            case 'bearer':
                headers['Authorization'] = `Bearer ${this.credentials[api.name]?.accessToken}`;
                break;
            case 'basic':
                const creds = this.credentials[api.name];
                const basic = Buffer.from(`${creds?.username}:${creds?.password}`).toString('base64');
                headers['Authorization'] = `Basic ${basic}`;
                break;
            case 'header':
                headers[api.authHeader] = this.credentials[api.name]?.apiKey;
                break;
        }

        return headers;
    }

    // ═══════════════════════════════════════════════════════════
    // LEXOFFICE HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    async lexofficeGetContacts(page = 0, size = 100) {
        return this.request('buchhaltung', 'lexoffice', '/contacts', {
            params: { page, size }
        });
    }

    async lexofficeCreateInvoice(invoiceData) {
        return this.request('buchhaltung', 'lexoffice', '/invoices', {
            method: 'POST',
            body: invoiceData
        });
    }

    async lexofficeGetVouchers(voucherType, page = 0) {
        return this.request('buchhaltung', 'lexoffice', '/vouchers', {
            params: { voucherType, page }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // SEVDESK HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    async sevdeskGetContacts() {
        return this.request('buchhaltung', 'sevdesk', '/Contact');
    }

    async sevdeskCreateInvoice(invoiceData) {
        return this.request('buchhaltung', 'sevdesk', '/Invoice', {
            method: 'POST',
            body: invoiceData
        });
    }

    // ═══════════════════════════════════════════════════════════
    // DHL HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    async dhlCreateShipment(shipmentData) {
        return this.request('versand', 'dhl', '/parcel/de/shipping/v2/orders', {
            method: 'POST',
            body: shipmentData
        });
    }

    async dhlTrackShipment(trackingNumber) {
        return this.request('versand', 'dhl', `/track/shipments`, {
            params: { trackingNumber }
        });
    }

    async dhlFindLocations(address) {
        return this.request('versand', 'dhl', '/location-finder/v1/find-by-address', {
            params: address
        });
    }

    // ═══════════════════════════════════════════════════════════
    // HANDELSREGISTER HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    async searchCompany(query) {
        return this.request('unternehmen', 'handelsregister', '/search', {
            params: { query }
        });
    }

    async getCompanyDetails(hrNumber) {
        return this.request('unternehmen', 'handelsregister', `/company/${hrNumber}`);
    }

    // ═══════════════════════════════════════════════════════════
    // LOXONE HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    async loxoneGetStructure() {
        return this.request('energie', 'loxone', '/data/LoxAPP3.json');
    }

    async loxoneGetStatus() {
        return this.request('energie', 'loxone', '/jdev/sps/status');
    }

    async loxoneControl(uuid, value) {
        return this.request('energie', 'loxone', `/jdev/sps/io/${uuid}/${value}`);
    }

    // ═══════════════════════════════════════════════════════════
    // IMMOSCOUT24 HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    async immoscoutSearch(searchParams) {
        return this.request('immobilien', 'immoscout24', '/search/v1.0/search/region', {
            params: searchParams
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = {
    DeutscheAPIConnector,
    DEUTSCHE_APIS
};
