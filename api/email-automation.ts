/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEST MONEY BAU - EMAIL AUTOMATION SYSTEM
 * Google Workspace Integration für info@west-money-bau.de
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface EmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  senderEmail: string;
  senderName: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
}

interface ScheduledEmail {
  id: string;
  templateId: string;
  recipient: string;
  variables: Record<string, string>;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'failed';
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL AUTOMATION CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class WestMoneyEmailAutomation extends EventEmitter {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();
  private scheduledEmails: Map<string, ScheduledEmail> = new Map();

  constructor(config: EmailConfig) {
    super();
    this.config = config;

    // Initialize OAuth2 Client
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken,
    });

    // Initialize Gmail API
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    // Load default templates
    this.loadDefaultTemplates();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(): Promise<{ success: boolean; email: string }> {
    try {
      // Verify connection
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      
      console.log('✅ Gmail API connected:', profile.data.emailAddress);
      this.emit('connected', { email: profile.data.emailAddress });

      // Start scheduler
      this.startScheduler();

      return {
        success: true,
        email: profile.data.emailAddress,
      };
    } catch (error: any) {
      console.error('❌ Gmail connection failed:', error.message);
      return {
        success: false,
        email: '',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  private loadDefaultTemplates(): void {
    // Partner Anfrage Template
    this.templates.set('partner_anfrage', {
      id: 'partner_anfrage',
      name: 'Partner Anfrage',
      subject: 'Partnerantrag - West Money Bau GmbH, Deutschland',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">West Money Bau</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Smart Home Systems | LOXONE Partner</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Sehr geehrte Damen und Herren,</p>
            
            <p>die West Money Bau GmbH aus Köln möchte offizieller <strong>{{partner_name}}</strong> Partner für die DACH-Region werden.</p>
            
            <h3 style="color: #8b5cf6;">Unser Profil:</h3>
            <ul>
              <li>Spezialisierung: Smart Home Installation, LOXONE, Barrierefreies Bauen</li>
              <li>Bestehende Partner: LOXONE, Verisure, HubSpot</li>
              <li>Geplant: Flagship Store in Köln mit Showroom</li>
              <li>Ziel: Integration {{partner_name}} in unser Portfolio</li>
            </ul>
            
            <p>Wir bitten um Zusendung der Partnerschaftsunterlagen und Konditionen für Deutschland.</p>
            
            <p>Mit freundlichen Grüßen</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Ömer Hüseyin Coşkun</strong><br>
              Geschäftsführer / CEO<br><br>
              <strong>WEST MONEY BAU</strong><br>
              Smart Home Systems | LOXONE Partner | Barrierefreies Bauen<br>
              Ein Unternehmen der Enterprise Universe Gruppe<br><br>
              📧 info@west-money-bau.de<br>
              🌐 www.west-money-bau.de
            </div>
          </div>
        </div>
      `,
      bodyText: `Sehr geehrte Damen und Herren,

die West Money Bau GmbH aus Köln möchte offizieller {{partner_name}} Partner für die DACH-Region werden.

Unser Profil:
- Spezialisierung: Smart Home Installation, LOXONE, Barrierefreies Bauen
- Bestehende Partner: LOXONE, Verisure, HubSpot
- Geplant: Flagship Store in Köln mit Showroom
- Ziel: Integration {{partner_name}} in unser Portfolio

Wir bitten um Zusendung der Partnerschaftsunterlagen und Konditionen für Deutschland.

Mit freundlichen Grüßen

Ömer Hüseyin Coşkun
Geschäftsführer / CEO
WEST MONEY BAU
info@west-money-bau.de`,
      variables: ['partner_name'],
    });

    // LOXONE Angebot Template
    this.templates.set('loxone_angebot', {
      id: 'loxone_angebot',
      name: 'LOXONE Angebotsanfrage',
      subject: 'Angebotsanfrage - Flagship Store Köln Ehrenstraße',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #69BE28; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🏠 LOXONE Projekt</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">West Money Bau Flagship Store</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Sehr geehrtes LOXONE Team,</p>
            
            <p>wir planen einen <strong>Flagship Store</strong> in der Kölner Ehrenstraße mit vollständiger LOXONE Integration als Live-Showroom.</p>
            
            <h3 style="color: #69BE28;">Projekteckdaten:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Standort</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Ehrenstraße, 50672 Köln</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Fläche</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">ca. 200 qm</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Konzept</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Experience Store mit VR/AR, Smart Home Demo</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Eröffnung</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Q2 2026</td></tr>
              <tr><td style="padding: 8px;"><strong>Budget</strong></td><td style="padding: 8px;">€35.000 - €42.000</td></tr>
            </table>
            
            <h3 style="color: #69BE28;">LOXONE Systemumfang:</h3>
            <ul>
              <li>Miniserver Gen. 2 + Extensions (Dimmer, Relay)</li>
              <li>60x LED Spots RGBW</li>
              <li>40m LED Strips</li>
              <li>15x Touch Pure Schalter</li>
              <li>12x Präsenzmelder</li>
              <li>Audioserver + 12 Decken-Speaker</li>
              <li>2x Intercom Türkommunikation</li>
              <li>6x Rauchmelder Air</li>
              <li>Programmierung inkl. Lichtszenen</li>
            </ul>
            
            <p>Der Store wird als <strong>LOXONE Referenzprojekt</strong> dienen. Bitte senden Sie uns ein detailliertes Angebot.</p>
            
            <p>Mit freundlichen Grüßen</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Ömer Hüseyin Coşkun</strong><br>
              Geschäftsführer / CEO<br>
              📧 info@west-money-bau.de
            </div>
          </div>
        </div>
      `,
      bodyText: `Sehr geehrtes LOXONE Team,

wir planen einen Flagship Store in der Kölner Ehrenstraße mit vollständiger LOXONE Integration.

Projekteckdaten:
- Standort: Ehrenstraße, 50672 Köln
- Fläche: ca. 200 qm
- Eröffnung: Q2 2026
- Budget: €35.000 - €42.000

Systemumfang:
- Miniserver Gen. 2 + Extensions
- 60x LED Spots RGBW + 40m LED Strips
- 15x Touch Pure + 12x Präsenzmelder
- Audioserver + 12 Speaker
- 2x Intercom + 6x Rauchmelder
- Programmierung

Bitte senden Sie uns ein Angebot.

Mit freundlichen Grüßen
Ömer Hüseyin Coşkun
info@west-money-bau.de`,
      variables: [],
    });

    // Immobilien Anfrage Template
    this.templates.set('immobilien_anfrage', {
      id: 'immobilien_anfrage',
      name: 'Immobilien Mietgesuch',
      subject: 'Mietgesuch Gewerbefläche - Ehrenstraße Köln - Tech Flagship Store',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; text-align: center;">
            <h1 style="color: #8b5cf6; margin: 0;">West Money Bau</h1>
            <p style="color: #06b6d4; margin: 5px 0 0 0;">Tech & Smart Home Flagship Store</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Sehr geehrte Damen und Herren,</p>
            
            <p>wir suchen eine Gewerbefläche für unseren <strong>Tech & Smart Home Flagship Store</strong> im Bereich Ehrenstraße / Belgisches Viertel.</p>
            
            <h3 style="color: #8b5cf6;">Suchkriterien:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr style="background: #f3f4f6;"><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Lage</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">Ehrenstraße / Belgisches Viertel, max. 5 Min. zum Friesenplatz</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Fläche</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">180-250 qm (EG, ggf. mit UG)</td></tr>
              <tr style="background: #f3f4f6;"><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Schaufenster</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">Mindestens 4m Frontbreite</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Deckenhöhe</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">Mindestens 3,00m</td></tr>
              <tr style="background: #f3f4f6;"><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Budget Kaltmiete</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">bis €11.000/Monat</td></tr>
              <tr><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Mietdauer</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">5-10 Jahre</td></tr>
              <tr style="background: #f3f4f6;"><td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Bezug</strong></td><td style="padding: 10px; border: 1px solid #e5e7eb;">ab Q1 2026</td></tr>
            </table>
            
            <h3 style="color: #8b5cf6;">Mieter:</h3>
            <p><strong>West Money Bau / Enterprise Universe</strong><br>
            Tech & Smart Home Flagship Store mit VR/AR Experience, LOXONE Showroom und Gaming Lounge</p>
            
            <h3 style="color: #8b5cf6;">Investitionsvolumen:</h3>
            <p><strong>€485.000 - €650.000</strong> für den Innenausbau</p>
            
            <p>Bitte kontaktieren Sie uns bei passenden Objekten.</p>
            
            <p>Mit freundlichen Grüßen</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Ömer Hüseyin Coşkun</strong><br>
              Geschäftsführer / CEO<br><br>
              <strong>WEST MONEY BAU</strong><br>
              Ein Unternehmen der Enterprise Universe Gruppe<br>
              📧 info@west-money-bau.de<br>
              🌐 www.west-money-bau.de
            </div>
          </div>
        </div>
      `,
      bodyText: `Sehr geehrte Damen und Herren,

wir suchen eine Gewerbefläche für unseren Tech & Smart Home Flagship Store.

Suchkriterien:
- Lage: Ehrenstraße / Belgisches Viertel, Köln
- Fläche: 180-250 qm
- Schaufenster: mind. 4m
- Kaltmiete: bis €11.000/Monat
- Mietdauer: 5-10 Jahre
- Bezug: ab Q1 2026

Mieter: West Money Bau / Enterprise Universe
Konzept: Tech Flagship mit VR/AR, LOXONE Showroom, Gaming Lounge
Investition Ausbau: €485.000 - €650.000

Bitte kontaktieren Sie uns bei passenden Objekten.

Mit freundlichen Grüßen
Ömer Hüseyin Coşkun
info@west-money-bau.de`,
      variables: [],
    });

    // Kundenanfrage Bestätigung
    this.templates.set('anfrage_bestaetigung', {
      id: 'anfrage_bestaetigung',
      name: 'Anfrage Bestätigung',
      subject: 'Ihre Anfrage bei West Money Bau - Bestätigung',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">✓ Anfrage erhalten</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Sehr geehrte/r {{kunde_name}},</p>
            
            <p>vielen Dank für Ihre Anfrage bei <strong>West Money Bau</strong>.</p>
            
            <div style="background: white; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0;">
              <strong>Ihre Anfrage:</strong><br>
              {{anfrage_details}}
            </div>
            
            <p>Wir werden Ihre Anfrage schnellstmöglich bearbeiten und uns innerhalb von <strong>24 Stunden</strong> bei Ihnen melden.</p>
            
            <p>Mit freundlichen Grüßen<br>
            <strong>Ihr West Money Bau Team</strong></p>
          </div>
        </div>
      `,
      bodyText: `Sehr geehrte/r {{kunde_name}},

vielen Dank für Ihre Anfrage bei West Money Bau.

Ihre Anfrage: {{anfrage_details}}

Wir melden uns innerhalb von 24 Stunden.

Mit freundlichen Grüßen
Ihr West Money Bau Team`,
      variables: ['kunde_name', 'anfrage_details'],
    });

    // Follow-Up Template
    this.templates.set('follow_up', {
      id: 'follow_up',
      name: 'Follow-Up',
      subject: 'Nachfrage zu unserem Gespräch - West Money Bau',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8b5cf6; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">West Money Bau</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Sehr geehrte/r {{kontakt_name}},</p>
            
            <p>ich möchte mich bezüglich <strong>{{thema}}</strong> bei Ihnen melden.</p>
            
            <p>{{nachricht}}</p>
            
            <p>Ich freue mich auf Ihre Rückmeldung.</p>
            
            <p>Mit freundlichen Grüßen</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>Ömer Hüseyin Coşkun</strong><br>
              Geschäftsführer / CEO<br>
              📧 info@west-money-bau.de<br>
              📱 Mobil auf Anfrage
            </div>
          </div>
        </div>
      `,
      bodyText: `Sehr geehrte/r {{kontakt_name}},

ich möchte mich bezüglich {{thema}} bei Ihnen melden.

{{nachricht}}

Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen
Ömer Hüseyin Coşkun
info@west-money-bau.de`,
      variables: ['kontakt_name', 'thema', 'nachricht'],
    });

    console.log(`📧 ${this.templates.size} E-Mail Templates geladen`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND EMAIL
  // ═══════════════════════════════════════════════════════════════════════════

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    cc?: string;
    bcc?: string;
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Create email content
      const boundary = 'boundary_' + Date.now();
      let email = '';

      email += `From: "${this.config.senderName}" <${this.config.senderEmail}>\r\n`;
      email += `To: ${params.to}\r\n`;
      if (params.cc) email += `Cc: ${params.cc}\r\n`;
      if (params.bcc) email += `Bcc: ${params.bcc}\r\n`;
      email += `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=\r\n`;
      email += `MIME-Version: 1.0\r\n`;
      email += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

      // Plain text version
      if (params.text) {
        email += `--${boundary}\r\n`;
        email += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
        email += `${params.text}\r\n\r\n`;
      }

      // HTML version
      email += `--${boundary}\r\n`;
      email += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      email += `${params.html}\r\n\r\n`;

      email += `--${boundary}--`;

      // Encode to base64url
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      console.log(`✅ E-Mail gesendet an ${params.to}: ${result.data.id}`);
      
      this.emit('email_sent', {
        messageId: result.data.id,
        to: params.to,
        subject: params.subject,
      });

      return {
        success: true,
        messageId: result.data.id,
      };
    } catch (error: any) {
      console.error('❌ E-Mail Fehler:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND FROM TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════

  async sendFromTemplate(
    templateId: string,
    to: string,
    variables: Record<string, string> = {},
    options: { cc?: string; bcc?: string } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.templates.get(templateId);

    if (!template) {
      return { success: false, error: `Template '${templateId}' nicht gefunden` };
    }

    // Replace variables
    let subject = template.subject;
    let html = template.bodyHtml;
    let text = template.bodyText;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      html = html.replace(new RegExp(placeholder, 'g'), value);
      text = text.replace(new RegExp(placeholder, 'g'), value);
    }

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      ...options,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULE EMAIL
  // ═══════════════════════════════════════════════════════════════════════════

  scheduleEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>,
    scheduledAt: Date
  ): string {
    const id = `SCHED-${Date.now()}`;

    const scheduled: ScheduledEmail = {
      id,
      templateId,
      recipient: to,
      variables,
      scheduledAt,
      status: 'pending',
    };

    this.scheduledEmails.set(id, scheduled);
    console.log(`📅 E-Mail geplant: ${id} für ${scheduledAt.toISOString()}`);

    return id;
  }

  private startScheduler(): void {
    setInterval(async () => {
      const now = new Date();

      for (const [id, scheduled] of this.scheduledEmails) {
        if (scheduled.status === 'pending' && scheduled.scheduledAt <= now) {
          console.log(`⏰ Sende geplante E-Mail: ${id}`);

          const result = await this.sendFromTemplate(
            scheduled.templateId,
            scheduled.recipient,
            scheduled.variables
          );

          scheduled.status = result.success ? 'sent' : 'failed';
          this.emit('scheduled_email_processed', { id, ...result });
        }
      }
    }, 60000); // Check every minute
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK SEND
  // ═══════════════════════════════════════════════════════════════════════════

  async sendBulk(
    templateId: string,
    recipients: Array<{ email: string; variables: Record<string, string> }>,
    delayMs: number = 1000
  ): Promise<{ sent: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendFromTemplate(
        templateId,
        recipient.email,
        recipient.variables
      );

      results.push({ email: recipient.email, ...result });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return { sent, failed, results };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  getTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id);
  }

  addTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INBOX MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getInbox(maxResults: number = 20): Promise<any[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds: ['INBOX'],
      });

      const messages = response.data.messages || [];
      const detailed: any[] = [];

      for (const msg of messages.slice(0, 10)) {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
        });

        const headers = detail.data.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value;
        const from = headers.find((h: any) => h.name === 'From')?.value;
        const date = headers.find((h: any) => h.name === 'Date')?.value;

        detailed.push({
          id: msg.id,
          subject,
          from,
          date,
          snippet: detail.data.snippet,
        });
      }

      return detailed;
    } catch (error: any) {
      console.error('❌ Inbox Fehler:', error.message);
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createEmailAutomation(): WestMoneyEmailAutomation {
  return new WestMoneyEmailAutomation({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
    senderEmail: 'info@west-money-bau.de',
    senderName: 'West Money Bau',
  });
}
