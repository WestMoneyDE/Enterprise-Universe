/**
 * 💰 E-COMMERCE & PAYMENTS ENGINE
 * 🔗 BLOCKCHAIN & WEB3 INTEGRATION
 * 
 * Enterprise Universe GmbH
 */

// ═══════════════════════════════════════════════════════════════
// PAYMENT PROVIDERS
// ═══════════════════════════════════════════════════════════════

const PaymentProviders = {
    
    stripe: {
        name: 'Stripe',
        baseUrl: 'https://api.stripe.com/v1',
        currencies: ['EUR', 'USD', 'GBP', 'CHF'],
        methods: ['card', 'sepa_debit', 'giropay', 'sofort', 'klarna'],
        features: ['subscriptions', 'invoicing', 'connect', 'radar'],
        
        async createPaymentIntent(amount, currency = 'EUR', metadata = {}) {
            const response = await fetch(`${this.baseUrl}/payment_intents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    amount: Math.round(amount * 100),
                    currency,
                    'automatic_payment_methods[enabled]': 'true',
                    ...Object.entries(metadata).reduce((acc, [k, v]) => {
                        acc[`metadata[${k}]`] = v;
                        return acc;
                    }, {})
                })
            });
            return response.json();
        },

        async createCustomer(email, name, metadata = {}) {
            const response = await fetch(`${this.baseUrl}/customers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ email, name, ...metadata })
            });
            return response.json();
        },

        async createSubscription(customerId, priceId) {
            const response = await fetch(`${this.baseUrl}/subscriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    customer: customerId,
                    'items[0][price]': priceId,
                    payment_behavior: 'default_incomplete',
                    'expand[]': 'latest_invoice.payment_intent'
                })
            });
            return response.json();
        },

        async createInvoice(customerId, items) {
            // First create invoice items
            for (const item of items) {
                await fetch(`${this.baseUrl}/invoiceitems`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        customer: customerId,
                        amount: Math.round(item.amount * 100),
                        currency: 'eur',
                        description: item.description
                    })
                });
            }

            // Then create invoice
            const response = await fetch(`${this.baseUrl}/invoices`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    customer: customerId,
                    auto_advance: 'true'
                })
            });
            return response.json();
        }
    },

    paypal: {
        name: 'PayPal',
        baseUrl: 'https://api-m.paypal.com',
        sandbox: 'https://api-m.sandbox.paypal.com',
        
        async getAccessToken() {
            const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
            const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });
            const data = await response.json();
            return data.access_token;
        },

        async createOrder(amount, currency = 'EUR') {
            const token = await this.getAccessToken();
            const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: currency,
                            value: amount.toFixed(2)
                        }
                    }]
                })
            });
            return response.json();
        },

        async captureOrder(orderId) {
            const token = await this.getAccessToken();
            const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.json();
        }
    },

    klarna: {
        name: 'Klarna',
        baseUrl: 'https://api.klarna.com',
        
        async createSession(orderData) {
            const auth = Buffer.from(`${process.env.KLARNA_USERNAME}:${process.env.KLARNA_PASSWORD}`).toString('base64');
            const response = await fetch(`${this.baseUrl}/payments/v1/sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            return response.json();
        }
    },

    revolut: {
        name: 'Revolut Business',
        baseUrl: 'https://b2b.revolut.com/api/1.0',
        
        async createPayment(amount, currency, recipient) {
            const response = await fetch(`${this.baseUrl}/pay`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.REVOLUT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    request_id: `pay_${Date.now()}`,
                    account_id: process.env.REVOLUT_ACCOUNT_ID,
                    receiver: recipient,
                    amount,
                    currency,
                    reference: 'West Money Bau Payment'
                })
            });
            return response.json();
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// CRYPTO PAYMENT GATEWAY
// ═══════════════════════════════════════════════════════════════

const CryptoPaymentGateway = {
    
    supportedCoins: ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'MATIC'],
    
    coinbase: {
        baseUrl: 'https://api.commerce.coinbase.com',
        
        async createCharge(amount, currency, metadata = {}) {
            const response = await fetch(`${this.baseUrl}/charges`, {
                method: 'POST',
                headers: {
                    'X-CC-Api-Key': process.env.COINBASE_COMMERCE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'West Money Bau Payment',
                    description: metadata.description || 'Smart Home Services',
                    pricing_type: 'fixed_price',
                    local_price: {
                        amount: amount.toString(),
                        currency
                    },
                    metadata
                })
            });
            return response.json();
        },

        async getCharge(chargeId) {
            const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
                headers: {
                    'X-CC-Api-Key': process.env.COINBASE_COMMERCE_KEY
                }
            });
            return response.json();
        }
    },

    nowPayments: {
        baseUrl: 'https://api.nowpayments.io/v1',
        
        async createPayment(amount, currency, payCurrency) {
            const response = await fetch(`${this.baseUrl}/payment`, {
                method: 'POST',
                headers: {
                    'x-api-key': process.env.NOWPAYMENTS_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    price_amount: amount,
                    price_currency: currency,
                    pay_currency: payCurrency,
                    order_id: `order_${Date.now()}`,
                    order_description: 'West Money Bau Payment'
                })
            });
            return response.json();
        }
    },

    async getPrices() {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,solana,matic-network&vs_currencies=eur');
        return response.json();
    }
};

// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN & WEB3 INTEGRATION
// ═══════════════════════════════════════════════════════════════

const Web3Integration = {

    // Token Contracts (Example addresses - would be real on mainnet)
    tokens: {
        GOD: {
            name: 'GOD Token',
            symbol: 'GOD',
            decimals: 18,
            address: '0x...', // ERC-20 contract address
            chainId: 1 // Ethereum Mainnet
        },
        DEDSEC: {
            name: 'DedSec Token',
            symbol: 'DEDSEC',
            decimals: 18,
            address: '0x...',
            chainId: 137 // Polygon
        },
        OG: {
            name: 'OG Token',
            symbol: 'OG',
            decimals: 18,
            address: '0x...',
            chainId: 1
        },
        TOWER: {
            name: 'Tower Token',
            symbol: 'TOWER',
            decimals: 18,
            address: '0x...',
            chainId: 137
        }
    },

    // ERC-20 Token ABI (minimal)
    ERC20_ABI: [
        'function balanceOf(address owner) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'event Transfer(address indexed from, address indexed to, uint256 value)'
    ],

    /**
     * Get token balance
     */
    async getTokenBalance(tokenSymbol, walletAddress) {
        const token = this.tokens[tokenSymbol];
        if (!token) throw new Error(`Unknown token: ${tokenSymbol}`);

        // Using ethers.js (would be imported in real implementation)
        const provider = this.getProvider(token.chainId);
        const contract = new ethers.Contract(token.address, this.ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        
        return ethers.utils.formatUnits(balance, token.decimals);
    },

    /**
     * Transfer tokens
     */
    async transferTokens(tokenSymbol, toAddress, amount, signer) {
        const token = this.tokens[tokenSymbol];
        if (!token) throw new Error(`Unknown token: ${tokenSymbol}`);

        const contract = new ethers.Contract(token.address, this.ERC20_ABI, signer);
        const amountWei = ethers.utils.parseUnits(amount.toString(), token.decimals);
        
        const tx = await contract.transfer(toAddress, amountWei);
        await tx.wait();
        
        return tx.hash;
    },

    /**
     * Get provider for chain
     */
    getProvider(chainId) {
        const rpcUrls = {
            1: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
            137: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
            42161: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_KEY}`
        };
        
        return new ethers.providers.JsonRpcProvider(rpcUrls[chainId]);
    },

    /**
     * Verify wallet signature
     */
    verifySignature(message, signature, expectedAddress) {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    },

    /**
     * Generate payment request with crypto
     */
    async createCryptoInvoice(amount, currency, tokenSymbol) {
        const prices = await CryptoPaymentGateway.getPrices();
        
        // Calculate token amount based on current price
        const tokenPriceEur = this.getTokenPrice(tokenSymbol, prices);
        const tokenAmount = amount / tokenPriceEur;

        return {
            fiatAmount: amount,
            fiatCurrency: currency,
            tokenSymbol,
            tokenAmount: tokenAmount.toFixed(6),
            tokenPrice: tokenPriceEur,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
            paymentAddress: this.generatePaymentAddress(),
            invoiceId: `INV-${Date.now()}`
        };
    },

    getTokenPrice(symbol, prices) {
        // Mock prices for custom tokens
        const customPrices = {
            GOD: 10.00,
            DEDSEC: 2.50,
            OG: 50.00,
            TOWER: 0.50
        };
        return customPrices[symbol] || 1.00;
    },

    generatePaymentAddress() {
        // In production, generate unique address per invoice
        return '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
};

// ═══════════════════════════════════════════════════════════════
// NFT MINTING FOR PROJECTS
// ═══════════════════════════════════════════════════════════════

const NFTEngine = {

    /**
     * Mint project completion NFT
     */
    async mintProjectNFT(projectData, recipientAddress) {
        const metadata = {
            name: `West Money Bau Project #${projectData.id}`,
            description: `Certificate of completion for ${projectData.name}`,
            image: projectData.imageUrl,
            attributes: [
                { trait_type: 'Project Type', value: projectData.type },
                { trait_type: 'Completion Date', value: projectData.completedAt },
                { trait_type: 'LOXONE Devices', value: projectData.deviceCount },
                { trait_type: 'Location', value: projectData.city }
            ],
            external_url: `https://west-money-bau.de/projects/${projectData.id}`
        };

        // Upload metadata to IPFS
        const metadataUri = await this.uploadToIPFS(metadata);

        // Mint NFT
        const contract = new ethers.Contract(
            process.env.NFT_CONTRACT_ADDRESS,
            ['function mint(address to, string memory tokenURI) returns (uint256)'],
            this.getSigner()
        );

        const tx = await contract.mint(recipientAddress, metadataUri);
        const receipt = await tx.wait();
        
        // Get token ID from event
        const tokenId = receipt.events.find(e => e.event === 'Transfer').args.tokenId;

        return {
            tokenId: tokenId.toString(),
            txHash: tx.hash,
            metadataUri,
            contractAddress: process.env.NFT_CONTRACT_ADDRESS
        };
    },

    async uploadToIPFS(metadata) {
        // Using Pinata or similar IPFS service
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PINATA_JWT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        const result = await response.json();
        return `ipfs://${result.IpfsHash}`;
    },

    getSigner() {
        const provider = new ethers.providers.JsonRpcProvider(
            `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY}`
        );
        return new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);
    }
};

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const SubscriptionManager = {
    
    plans: {
        basic: {
            id: 'basic',
            name: 'Basic',
            price: 29,
            currency: 'EUR',
            interval: 'month',
            features: ['5 Projects', 'Basic Support', 'API Access']
        },
        professional: {
            id: 'professional',
            name: 'Professional',
            price: 99,
            currency: 'EUR',
            interval: 'month',
            features: ['Unlimited Projects', 'Priority Support', 'Full API', 'Custom Integrations']
        },
        enterprise: {
            id: 'enterprise',
            name: 'Enterprise',
            price: 499,
            currency: 'EUR',
            interval: 'month',
            features: ['Everything in Pro', 'Dedicated Account Manager', 'SLA', 'White Label']
        }
    },

    async createSubscription(customerId, planId, paymentMethodId) {
        const plan = this.plans[planId];
        if (!plan) throw new Error(`Unknown plan: ${planId}`);

        // Create Stripe subscription
        return PaymentProviders.stripe.createSubscription(
            customerId,
            process.env[`STRIPE_PRICE_${planId.toUpperCase()}`]
        );
    },

    async cancelSubscription(subscriptionId) {
        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
            }
        });
        return response.json();
    },

    async updateSubscription(subscriptionId, newPlanId) {
        const plan = this.plans[newPlanId];
        if (!plan) throw new Error(`Unknown plan: ${newPlanId}`);

        const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'items[0][price]': process.env[`STRIPE_PRICE_${newPlanId.toUpperCase()}`],
                proration_behavior: 'create_prorations'
            })
        });
        return response.json();
    }
};

// ═══════════════════════════════════════════════════════════════
// RECURRING BILLING
// ═══════════════════════════════════════════════════════════════

const RecurringBilling = {

    async processMonthlyInvoices() {
        // Get all active subscriptions
        const subscriptions = await this.getActiveSubscriptions();
        
        const results = [];
        for (const sub of subscriptions) {
            try {
                const invoice = await this.generateInvoice(sub);
                const payment = await this.processPayment(sub, invoice);
                results.push({ subscriptionId: sub.id, status: 'success', invoice, payment });
            } catch (error) {
                results.push({ subscriptionId: sub.id, status: 'failed', error: error.message });
            }
        }
        
        return results;
    },

    async generateInvoice(subscription) {
        // Create invoice in database and Stripe
        return PaymentProviders.stripe.createInvoice(subscription.customerId, [
            {
                description: `${subscription.planName} - Monthly Subscription`,
                amount: subscription.price
            }
        ]);
    },

    async processPayment(subscription, invoice) {
        // Attempt to charge the default payment method
        const response = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/pay`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
            }
        });
        return response.json();
    },

    async getActiveSubscriptions() {
        // Would fetch from database
        return [];
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = {
    PaymentProviders,
    CryptoPaymentGateway,
    Web3Integration,
    NFTEngine,
    SubscriptionManager,
    RecurringBilling
};
