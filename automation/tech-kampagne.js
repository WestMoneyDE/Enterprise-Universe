/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEST MONEY BAU - TECH PARTNERSHIP & APP DEVELOPMENT KAMPAGNE
 * Alle Partner für West Money OS, VR/AR, Smart Home & App Publishing
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ausführen: node tech-kampagne.js
 * 
 * Kategorien:
 * 1. App Development Companies (Deutschland/NRW)
 * 2. VR/AR Development (Meta Quest, Unity, Unreal)
 * 3. Smart Home & IoT Platforms
 * 4. Cloud & Infrastructure
 * 5. App Store Publishing
 * 6. AI & Machine Learning
 * 7. Payment & FinTech
 */

const nodemailer = require('nodemailer');

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'info@west-money-bau.de',
      pass: 'irbavpexelkwbiae'
    }
  },
  sender: {
    email: 'info@west-money-bau.de',
    name: 'West Money Bau'
  }
};

const SIGNATURE = `
Mit freundlichen Grüßen

Ömer Hüseyin Coşkun
Geschäftsführer / CEO

WEST MONEY BAU
Smart Home Systems | LOXONE Partner | Barrierefreies Bauen
Ein Unternehmen der Enterprise Universe Gruppe

📧 info@west-money-bau.de
🌐 www.west-money-bau.de
`.trim();

const SIGNATURE_EN = `
Best regards,

Ömer Hüseyin Coşkun
CEO / Managing Director

WEST MONEY BAU
Smart Home Systems | LOXONE Partner | Barrier-Free Construction
An Enterprise Universe Company

📧 info@west-money-bau.de
🌐 www.west-money-bau.de
`.trim();

// ═══════════════════════════════════════════════════════════════════════════
// ALLE TECH-PARTNER E-MAILS
// ═══════════════════════════════════════════════════════════════════════════

const TECH_KAMPAGNEN = {

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 1: APP DEVELOPMENT COMPANIES (DEUTSCHLAND)
  // ═══════════════════════════════════════════════════════════════════════

  app_cologne_intelligence: {
    kategorie: '📱 App Development',
    prioritaet: 'HOCH',
    to: 'info@cologne-intelligence.de',
    cc: 'info@west-money-bau.de',
    subject: 'App-Entwicklung West Money OS - Partnerschaftsanfrage',
    body: `Sehr geehrtes Cologne Intelligence Team,

wir suchen einen erfahrenen App-Entwicklungspartner für unser Projekt "West Money OS".

PROJEKTÜBERSICHT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Produkt:        West Money OS - Master Control System
Module:         WhatsApp Business Plugin, CRM Integration, VoIP, Smart Home
Plattformen:    iOS, Android, Web App
Release:        01.01.2026
Budget:         €80.000 - €150.000

TECH-STACK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Frontend: React Native / Flutter
• Backend: Node.js, TypeScript, PostgreSQL
• APIs: HubSpot, Zadarma, WhatsApp Business, LOXONE
• VR/AR: Meta Quest 3, Apple Vision Pro (WebXR)

BESONDERHEITEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Barrierefreie App nach WCAG 2.1
• Mehrsprachig (DE, EN, TR, AR)
• Integration Smart Home (LOXONE)
• KI-gestützte Funktionen

Können wir einen Termin für ein Kennenlern-Gespräch vereinbaren?`
  },

  app_ambient_innovation: {
    kategorie: '📱 App Development',
    prioritaet: 'HOCH',
    to: 'info@2ncompany.de',
    cc: 'info@west-money-bau.de',
    subject: 'Mobile App Entwicklung - West Money OS Projekt',
    body: `Sehr geehrte Damen und Herren,

als Kölner Unternehmen suchen wir einen lokalen Partner für die Entwicklung unserer mobilen App "West Money OS".

PROJEKT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Native iOS & Android Apps
• Smart Home Steuerung (LOXONE Integration)
• Business Dashboard mit CRM-Anbindung
• VR/AR Module für Showroom-Erlebnis

ZEITPLAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• MVP: Q3 2025
• Full Release: 01.01.2026
• App Store Launch: Q1 2026

BUDGET: €80.000 - €150.000

Haben Sie Kapazitäten für ein Projekt dieser Größenordnung?`
  },

  app_innowise: {
    kategorie: '📱 App Development',
    prioritaet: 'MITTEL',
    to: 'info@innowise-group.com',
    cc: 'info@west-money-bau.de',
    subject: 'Custom Software Development - West Money OS Platform',
    body: `Dear Innowise Team,

West Money Bau is seeking a development partner for our "West Money OS" platform - a comprehensive smart home and business management system.

PROJECT SCOPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Mobile Apps (iOS/Android)
• Web Dashboard
• API Development & Integration
• VR/AR Components

TECH REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• React Native or Flutter
• Node.js/TypeScript Backend
• PostgreSQL, Redis
• WebXR for VR/AR
• Integration: HubSpot, Zadarma, WhatsApp Business API

TIMELINE: Release January 1, 2026
BUDGET: €80,000 - €150,000

We are based in Cologne, Germany and prefer a partner with EU presence.

Could we schedule a call to discuss this project?`
  },

  app_chudovo: {
    kategorie: '📱 App Development',
    prioritaet: 'MITTEL',
    to: 'info@chudovo.com',
    cc: 'info@west-money-bau.de',
    subject: 'Software Development Partnership - Smart Home Platform',
    body: `Dear Chudovo Team,

we are looking for an experienced development partner for our smart home management platform.

PROJECT: West Money OS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Cross-platform mobile app
• Smart Home control (LOXONE, KNX)
• Business CRM integration
• VR Showroom experience

We noticed Chudovo has offices in Cologne - we'd love to meet locally.

Budget: €80,000 - €150,000
Timeline: Release Q1 2026

Please send us your portfolio and availability.`
  },

  app_applaunch: {
    kategorie: '📱 App Development',
    prioritaet: 'MITTEL',
    to: 'hello@applaunch.io',
    cc: 'info@west-money-bau.de',
    subject: 'MVP Development - West Money OS Smart Home App',
    body: `Dear Applaunch Team,

we're building "West Money OS" - a smart home and business control platform, and are looking for an MVP development partner.

MVP SCOPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Smart Home Control (LOXONE integration)
• User Dashboard
• Basic CRM features
• iOS & Android apps

FULL PRODUCT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• VR/AR Showroom
• WhatsApp Business integration
• Multi-language support
• Enterprise features

Timeline: MVP by Q3 2025, Full Release Q1 2026
Budget: €80,000 - €150,000

Are you available for a discovery call?`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 2: VR/AR DEVELOPMENT
  // ═══════════════════════════════════════════════════════════════════════

  vr_meta_developer: {
    kategorie: '🥽 VR/AR Development',
    prioritaet: 'HOCH',
    to: 'developer@meta.com',
    cc: 'info@west-money-bau.de',
    subject: 'Meta Quest Developer Program - West Money Bau Application',
    body: `Dear Meta Developer Relations Team,

West Money Bau is developing a VR Smart Home Showroom experience for Meta Quest 3 and would like to join the Meta Quest Developer Program.

PROJECT: DEDSEC World AI / West Money VR Showroom
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• VR Smart Home Showroom
• Interactive LOXONE Demo
• Training Academy for installers
• Gaming Lounge experience

TARGET PLATFORM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Meta Quest 3
• Meta Quest Pro
• Mixed Reality features

USE CASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• B2B: Smart Home demonstrations for customers
• Training: VR training for LOXONE installers
• Retail: In-store VR experience at our Cologne Flagship Store

We plan to launch our physical Flagship Store in Cologne Q2 2026 with integrated VR experiences.

Please advise on the application process for the Developer Program.`
  },

  vr_unity: {
    kategorie: '🥽 VR/AR Development',
    prioritaet: 'HOCH',
    to: 'sales-emea@unity.com',
    cc: 'info@west-money-bau.de',
    subject: 'Unity Enterprise License - VR Smart Home Development',
    body: `Dear Unity Sales Team,

West Money Bau is developing VR/AR experiences for Smart Home demonstrations and requires Unity Enterprise licensing.

PROJECT REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• VR Smart Home Showroom (Meta Quest 3)
• AR Product Visualization
• Interactive Training Academy
• Real-time 3D product configurator

PLATFORMS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Meta Quest 3 / Quest Pro
• Apple Vision Pro (visionOS)
• WebXR (Browser-based)
• iOS ARKit / Android ARCore

INTEREST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Unity Pro or Enterprise license
• Unity Industry subscription
• XR Interaction Toolkit
• Service Partner Program information

Please send us pricing information and partnership opportunities.`
  },

  vr_treeview: {
    kategorie: '🥽 VR/AR Development',
    prioritaet: 'HOCH',
    to: 'hello@treeview.studio',
    cc: 'info@west-money-bau.de',
    subject: 'VR Development Partnership - Smart Home Showroom',
    body: `Dear Treeview Team,

we are looking for an experienced VR development studio to create our "West Money VR Showroom" experience.

PROJECT SCOPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• VR Smart Home Showroom
• Interactive LOXONE device demonstrations
• Virtual product configurator
• Training modules for installers

PLATFORMS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Meta Quest 3 (primary)
• Apple Vision Pro (secondary)
• WebXR fallback

USE CASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The VR experience will be used in our physical Flagship Store in Cologne (opening Q2 2026) to demonstrate smart home solutions to customers.

BUDGET: €40,000 - €80,000
TIMELINE: Ready by Q1 2026

Please share your portfolio and availability for a discovery call.`
  },

  vr_nomtek: {
    kategorie: '🥽 VR/AR Development',
    prioritaet: 'MITTEL',
    to: 'contact@nomtek.com',
    cc: 'info@west-money-bau.de',
    subject: 'AR/VR Development - Smart Home Experience',
    body: `Dear Nomtek Team,

we're developing immersive AR/VR experiences for our smart home business and are looking for a development partner.

PROJECT: West Money VR Showroom
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Meta Quest 3 VR Application
• AR product visualization
• Interactive smart home demos
• Training academy modules

We'll have a physical Flagship Store in Cologne with integrated VR/AR experiences.

Budget: €40,000 - €80,000
Timeline: Q1 2026

Interested in discussing this project?`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 3: SMART HOME & IoT PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════

  iot_1home: {
    kategorie: '🏠 Smart Home Platform',
    prioritaet: 'HOCH',
    to: 'partners@1home.io',
    cc: 'info@west-money-bau.de',
    subject: 'Partnership Inquiry - LOXONE Integration Partner',
    body: `Dear 1Home Team,

West Money Bau is a LOXONE partner in Germany, and we're interested in becoming a 1Home integration partner.

OUR PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• LOXONE Partner since 2024
• Smart Home installations in NRW region
• Focus: Barrier-free smart homes
• Flagship Store planned in Cologne

INTEREST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 1Home Bridge / Server integration
• Google Home & Alexa connectivity for our installations
• Partner pricing & reseller opportunities
• Training & certification

We install 10-20 LOXONE systems per year and want to offer enhanced voice control to our customers.

Please send us partner program information.`
  },

  iot_home_assistant: {
    kategorie: '🏠 Smart Home Platform',
    prioritaet: 'MITTEL',
    to: 'hello@nabucasa.com',
    cc: 'info@west-money-bau.de',
    subject: 'Home Assistant Cloud Partnership - Smart Home Integrator',
    body: `Dear Nabu Casa Team,

West Money Bau is a smart home integrator in Germany, and we're exploring Home Assistant for our West Money OS platform.

USE CASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Central hub for multi-vendor smart homes
• LOXONE + other device integration
• Custom automation platform
• API integration with our West Money OS

QUESTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Commercial licensing options?
• Partner/reseller program?
• White-label possibilities?

We're building a comprehensive smart home platform and Home Assistant could be a core component.`
  },

  iot_openhab: {
    kategorie: '🏠 Smart Home Platform',
    prioritaet: 'NIEDRIG',
    to: 'info@openhabfoundation.org',
    cc: 'info@west-money-bau.de',
    subject: 'openHAB Commercial Partnership Inquiry',
    body: `Dear openHAB Foundation,

we're exploring openHAB as a potential backend for our West Money OS smart home platform.

INTEREST:
• Commercial licensing
• Foundation membership
• Support & training options
• Integration services

Please advise on partnership opportunities for commercial integrators.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 4: CLOUD & INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════════

  cloud_aws: {
    kategorie: '☁️ Cloud Infrastructure',
    prioritaet: 'HOCH',
    to: 'aws-de-sales@amazon.com',
    cc: 'info@west-money-bau.de',
    subject: 'AWS Partnership - Smart Home SaaS Platform',
    body: `Dear AWS Team,

West Money Bau is building "West Money OS" - a cloud-based smart home and business management platform, and we're interested in AWS partnership opportunities.

INFRASTRUCTURE NEEDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Compute: EC2, ECS/EKS
• Database: RDS PostgreSQL, ElastiCache
• Storage: S3, CloudFront
• IoT: AWS IoT Core
• AI/ML: SageMaker, Rekognition

INTEREST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• AWS Activate Startup Program
• AWS Partner Network (APN)
• Architecture review
• Cost optimization

Expected workload: 1,000-10,000 users in first year
Location: Germany (Frankfurt region preferred for GDPR)

Please contact us for a discovery call.`
  },

  cloud_hetzner: {
    kategorie: '☁️ Cloud Infrastructure',
    prioritaet: 'HOCH',
    to: 'sales@hetzner.com',
    cc: 'info@west-money-bau.de',
    subject: 'Hetzner Cloud - SaaS Hosting für West Money OS',
    body: `Sehr geehrtes Hetzner Team,

wir suchen einen deutschen Cloud-Provider für unser SaaS-Produkt "West Money OS".

ANFORDERUNGEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Managed Kubernetes oder Cloud Server
• Object Storage (S3-kompatibel)
• Load Balancer
• Managed PostgreSQL
• DDoS Protection

WICHTIG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• DSGVO-konform
• Rechenzentrum in Deutschland
• 24/7 Support

Erwartete Last: 1.000-10.000 Nutzer im ersten Jahr
Start: Q1 2026

Bitte senden Sie uns ein Angebot für passende Konfigurationen.`
  },

  cloud_google: {
    kategorie: '☁️ Cloud Infrastructure',
    prioritaet: 'MITTEL',
    to: 'cloud-sales-de@google.com',
    cc: 'info@west-money-bau.de',
    subject: 'Google Cloud Partnership - Smart Home Platform',
    body: `Dear Google Cloud Team,

West Money Bau is building a smart home SaaS platform and exploring Google Cloud as our infrastructure provider.

INTEREST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Google Cloud for Startups program
• Firebase for mobile backend
• Cloud IoT Core
• Google Home integration

Our platform "West Money OS" integrates smart home control with business management.

Please contact us for partnership opportunities.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 5: APP STORE PUBLISHING
  // ═══════════════════════════════════════════════════════════════════════

  appstore_apple: {
    kategorie: '📲 App Publishing',
    prioritaet: 'HOCH',
    to: 'devprograms@apple.com',
    cc: 'info@west-money-bau.de',
    subject: 'Apple Developer Enterprise Program Inquiry',
    body: `Dear Apple Developer Relations,

West Money Bau is developing "West Money OS" - a smart home and business management app for iOS and visionOS.

APPS PLANNED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• West Money OS (iOS/iPadOS)
• West Money VR (visionOS for Apple Vision Pro)
• Smart Home Control Widget

QUESTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Apple Developer Program (standard) vs Enterprise
• App Store Small Business Program eligibility
• HomeKit certification process
• visionOS developer resources

We plan to launch Q1 2026.

Please advise on the best program for our needs.`
  },

  appstore_google: {
    kategorie: '📲 App Publishing',
    prioritaet: 'HOCH',
    to: 'googleplay-developer@google.com',
    cc: 'info@west-money-bau.de',
    subject: 'Google Play Developer Account - Smart Home App',
    body: `Dear Google Play Team,

West Money Bau will publish "West Money OS" - a smart home control and business management app on Google Play.

APP DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Category: House & Home / Business
• Target: Germany/DACH, then global
• Features: Smart Home control, CRM, VoIP
• Launch: Q1 2026

QUESTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Pre-registration setup
• Google Play Pass eligibility
• Google Home integration certification

Please send guidance on app publication requirements.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 6: AI & MACHINE LEARNING
  // ═══════════════════════════════════════════════════════════════════════

  ai_openai: {
    kategorie: '🤖 AI/ML Platform',
    prioritaet: 'HOCH',
    to: 'sales@openai.com',
    cc: 'info@west-money-bau.de',
    subject: 'OpenAI API Partnership - Smart Home AI Assistant',
    body: `Dear OpenAI Sales Team,

West Money Bau is building "GOD BOT ULTIMATE" - an AI assistant integrated into our West Money OS platform for smart home control and business management.

USE CASES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Natural language smart home control
• Customer service automation
• Document processing & analysis
• Voice command interpretation

API REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• GPT-4 API access
• Whisper for voice transcription
• Function calling for device control
• Estimated: 100K-500K tokens/month initially

QUESTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Enterprise pricing
• Data privacy (EU/GDPR)
• Rate limits for production use

Please contact us for a partnership discussion.`
  },

  ai_anthropic: {
    kategorie: '🤖 AI/ML Platform',
    prioritaet: 'HOCH',
    to: 'sales@anthropic.com',
    cc: 'info@west-money-bau.de',
    subject: 'Anthropic Claude API - Enterprise Smart Home Application',
    body: `Dear Anthropic Team,

West Money Bau is developing an AI-powered smart home assistant and interested in Claude API for our "West Money OS" platform.

USE CASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Conversational smart home control
• Business document processing
• Customer support automation
• Multi-language support (DE, EN, TR, AR)

We appreciate Claude's focus on safety and helpfulness, which aligns with our barrier-free smart home mission.

Please send enterprise pricing and integration information.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 7: PAYMENT & FINTECH
  // ═══════════════════════════════════════════════════════════════════════

  payment_stripe: {
    kategorie: '💳 Payment/FinTech',
    prioritaet: 'HOCH',
    to: 'sales-dach@stripe.com',
    cc: 'info@west-money-bau.de',
    subject: 'Stripe Integration - West Money OS SaaS Platform',
    body: `Sehr geehrtes Stripe Team,

wir integrieren Stripe in unsere SaaS-Plattform "West Money OS" für Subscription-Zahlungen.

ANFORDERUNGEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Subscription Billing (monatlich/jährlich)
• SEPA-Lastschrift für DACH
• Kreditkarten (Visa, Mastercard)
• Rechnungsstellung & Steuern

PRODUKTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• West Money OS Basic: €29/Monat
• West Money OS Pro: €79/Monat
• West Money OS Enterprise: €199/Monat

Erwartetes Volumen: 100-1.000 Subscriptions im ersten Jahr

Bitte senden Sie uns Informationen zu Stripe Billing und ggf. Startup-Konditionen.`
  },

  payment_mollie: {
    kategorie: '💳 Payment/FinTech',
    prioritaet: 'MITTEL',
    to: 'sales@mollie.com',
    cc: 'info@west-money-bau.de',
    subject: 'Mollie Payment Integration - West Money OS',
    body: `Sehr geehrtes Mollie Team,

wir evaluieren Zahlungsanbieter für unsere SaaS-Plattform und interessieren uns für Mollie.

ANFORDERUNGEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Subscription Management
• SEPA, Kreditkarten, PayPal
• Einfache API-Integration
• Deutsche Rechnungen

Bitte senden Sie uns Preise und Integrations-Dokumentation.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KATEGORIE 8: SICHERHEIT & COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════

  security_tuev: {
    kategorie: '🔒 Security/Compliance',
    prioritaet: 'MITTEL',
    to: 'info@tuev-rheinland.de',
    cc: 'info@west-money-bau.de',
    subject: 'Zertifizierung West Money OS - Smart Home Software',
    body: `Sehr geehrte Damen und Herren,

wir entwickeln die Smart Home Plattform "West Money OS" und interessieren uns für Zertifizierungsmöglichkeiten.

INTERESSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ISO 27001 Zertifizierung
• DSGVO-Audit
• Smart Home Security Zertifikat
• Barrierefreiheit nach EN 301 549

Bitte senden Sie uns Informationen zu relevanten Zertifizierungen für Software-Produkte.`
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORTER
// ═══════════════════════════════════════════════════════════════════════════

const transporter = nodemailer.createTransport(CONFIG.smtp);

// ═══════════════════════════════════════════════════════════════════════════
// E-MAIL SENDEN
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmail(name, email) {
  const isEnglish = email.body.includes('Dear') || email.body.includes('Best regards');
  const signature = isEnglish ? SIGNATURE_EN : SIGNATURE;
  
  try {
    const result = await transporter.sendMail({
      from: `"${CONFIG.sender.name}" <${CONFIG.sender.email}>`,
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      text: email.body + '\n\n' + signature
    });
    
    console.log(`   ✅ Gesendet: ${email.to}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.log(`   ❌ Fehler: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KAMPAGNE STARTEN
// ═══════════════════════════════════════════════════════════════════════════

async function starteTechKampagne() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 WEST MONEY BAU - TECH PARTNERSHIP KAMPAGNE                               ║
║                                                                               ║
║   App Development | VR/AR | Cloud | AI | Publishing                           ║
║   Absender: info@west-money-bau.de                                            ║
║   Datum: ${new Date().toLocaleDateString('de-DE')}                                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  // Verbindung testen
  console.log('🔌 Verbinde mit Gmail SMTP...');
  try {
    await transporter.verify();
    console.log('✅ Verbindung erfolgreich!\n');
  } catch (error) {
    console.error('❌ Verbindungsfehler:', error.message);
    return;
  }

  // Statistik
  const stats = { total: 0, sent: 0, failed: 0 };
  const results = [];

  // Nach Kategorie gruppieren
  const kategorien = {};
  for (const [name, email] of Object.entries(TECH_KAMPAGNEN)) {
    const kat = email.kategorie;
    if (!kategorien[kat]) kategorien[kat] = [];
    kategorien[kat].push({ name, ...email });
  }

  // E-Mails senden
  for (const [kategorie, emails] of Object.entries(kategorien)) {
    console.log(`\n${kategorie} (${emails.length} E-Mails)`);
    console.log('─'.repeat(60));

    for (const email of emails) {
      stats.total++;
      const prio = email.prioritaet === 'HOCH' ? '🔴' : email.prioritaet === 'MITTEL' ? '🟡' : '🟢';
      
      console.log(`\n${prio} ${email.name}`);
      console.log(`   📧 An: ${email.to}`);
      
      const result = await sendEmail(email.name, email);
      
      if (result.success) {
        stats.sent++;
        results.push({ name: email.name, to: email.to, status: '✅', kategorie });
      } else {
        stats.failed++;
        results.push({ name: email.name, to: email.to, status: '❌', kategorie });
      }

      // 3 Sekunden Pause zwischen E-Mails
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Zusammenfassung
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           📊 ZUSAMMENFASSUNG                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Total:      ${String(stats.total).padEnd(4)} E-Mails                                              ║
║   Gesendet:   ${String(stats.sent).padEnd(4)} ✅                                                    ║
║   Fehler:     ${String(stats.failed).padEnd(4)} ❌                                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  // Ergebnisse nach Kategorie
  console.log('\n📋 ERGEBNISSE NACH KATEGORIE:\n');
  
  for (const [kategorie, emails] of Object.entries(kategorien)) {
    console.log(`\n${kategorie}`);
    const katResults = results.filter(r => r.kategorie === kategorie);
    for (const r of katResults) {
      console.log(`   ${r.status} ${r.name.padEnd(30)} → ${r.to}`);
    }
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
   ✅ TECH PARTNERSHIP KAMPAGNE ABGESCHLOSSEN
   
   Nächste Schritte:
   • Follow-Up in 5-7 Tagen
   • Antworten in CRM tracken
   • Calls mit interessierten Partnern planen
   • Verträge vorbereiten
═══════════════════════════════════════════════════════════════════════════════
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT & START
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { TECH_KAMPAGNEN, sendEmail, starteTechKampagne };

// Start wenn direkt ausgeführt
if (require.main === module) {
  starteTechKampagne().catch(console.error);
}
