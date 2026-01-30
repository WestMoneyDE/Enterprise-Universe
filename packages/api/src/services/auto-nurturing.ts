// =============================================================================
// Auto-Nurturing Email Service
// =============================================================================
// Automated email sequences for lead nurturing with GDPR compliance
// Supports: Welcome, ScoreUpgrade, ReEngage, PostPresentation, DealStalled

import { db, contacts, contactActivities, deals, eq, and, gte, lte, lt, isNull, desc, sql } from "@nexus/db";
import nodemailer from "nodemailer";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SMTP_CONFIG = {
  host: process.env.ONECOM_SMTP_HOST || "send.one.com",
  port: parseInt(process.env.ONECOM_SMTP_PORT || "587"),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.ONECOM_SMTP_USER || "",
    pass: process.env.ONECOM_SMTP_PASS || "",
  },
};

const FROM_EMAIL = process.env.NURTURING_FROM_EMAIL || "kontakt@westmoneybau.de";
const FROM_NAME = process.env.NURTURING_FROM_NAME || "West Money Bau";

// =============================================================================
// TYPES
// =============================================================================

export type SequenceType =
  | "welcome"
  | "score_upgrade"
  | "re_engage"
  | "post_presentation"
  | "deal_stalled";

export type Language = "de" | "en";

export interface SequenceStep {
  stepNumber: number;
  delayDays: number; // Days after trigger or previous step
  subject: { de: string; en: string };
  templateKey: string;
}

export interface SequenceDefinition {
  type: SequenceType;
  name: string;
  description: string;
  steps: SequenceStep[];
  triggerCondition: string;
}

export interface ContactSequenceProgress {
  contactId: string;
  sequenceType: SequenceType;
  currentStep: number;
  startedAt: Date;
  lastEmailSentAt: Date | null;
  nextEmailDue: Date | null;
  completedAt: Date | null;
  status: "active" | "paused" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

export interface NurturingEvent {
  type: "email_sent" | "email_opened" | "email_clicked" | "sequence_started" | "sequence_completed" | "sequence_cancelled";
  contactId: string;
  sequenceType: SequenceType;
  stepNumber?: number;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

// =============================================================================
// SEQUENCE DEFINITIONS
// =============================================================================

export const SEQUENCES: Record<SequenceType, SequenceDefinition> = {
  welcome: {
    type: "welcome",
    name: "Welcome Sequence",
    description: "Begrüßungssequenz für neue Kontakte",
    triggerCondition: "New contact created with consent",
    steps: [
      {
        stepNumber: 1,
        delayDays: 0, // Immediately
        subject: {
          de: "Willkommen bei West Money Bau - Ihr Partner für Bauvorhaben",
          en: "Welcome to West Money Bau - Your Construction Partner",
        },
        templateKey: "welcome_1",
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: {
          de: "Kennen Sie schon unseren Bauherren-Pass?",
          en: "Have you heard about our Bauherren-Pass?",
        },
        templateKey: "welcome_2",
      },
      {
        stepNumber: 3,
        delayDays: 7,
        subject: {
          de: "Ihre nächsten Schritte zum Traumhaus",
          en: "Your next steps to your dream home",
        },
        templateKey: "welcome_3",
      },
    ],
  },

  score_upgrade: {
    type: "score_upgrade",
    name: "Score Upgrade",
    description: "Benachrichtigung bei Lead Score Upgrade von B nach A",
    triggerCondition: "Lead score upgraded from B to A",
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: {
          de: "Exklusives Angebot für Sie - Jetzt Termin sichern",
          en: "Exclusive offer for you - Book your appointment now",
        },
        templateKey: "score_upgrade_1",
      },
    ],
  },

  re_engage: {
    type: "re_engage",
    name: "Re-Engagement",
    description: "Reaktivierung nach 30 Tagen Inaktivität",
    triggerCondition: "No engagement for 30+ days",
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: {
          de: "Wir vermissen Sie - Was können wir für Sie tun?",
          en: "We miss you - How can we help?",
        },
        templateKey: "re_engage_1",
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: {
          de: "Letzte Chance: Exklusive Einblicke für Sie",
          en: "Last chance: Exclusive insights for you",
        },
        templateKey: "re_engage_2",
      },
      {
        stepNumber: 3,
        delayDays: 14,
        subject: {
          de: "Wir sind immer für Sie da",
          en: "We are always here for you",
        },
        templateKey: "re_engage_3",
      },
    ],
  },

  post_presentation: {
    type: "post_presentation",
    name: "Post Presentation",
    description: "Follow-up nach Präsentationsansicht",
    triggerCondition: "Presentation viewed",
    steps: [
      {
        stepNumber: 1,
        delayDays: 1,
        subject: {
          de: "Vielen Dank für Ihr Interesse - Ihre persönliche Zusammenfassung",
          en: "Thank you for your interest - Your personal summary",
        },
        templateKey: "post_presentation_1",
      },
      {
        stepNumber: 2,
        delayDays: 4,
        subject: {
          de: "Haben Sie Fragen? Wir beraten Sie gerne",
          en: "Any questions? We're happy to help",
        },
        templateKey: "post_presentation_2",
      },
    ],
  },

  deal_stalled: {
    type: "deal_stalled",
    name: "Deal Stalled",
    description: "Reaktivierung bei stagnierendem Deal (14+ Tage keine Aktivität)",
    triggerCondition: "Deal without progress for 14+ days",
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: {
          de: "Ihr Projekt wartet auf Sie - Wie können wir helfen?",
          en: "Your project awaits - How can we help?",
        },
        templateKey: "deal_stalled_1",
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: {
          de: "Neue Möglichkeiten für Ihr Bauvorhaben",
          en: "New possibilities for your construction project",
        },
        templateKey: "deal_stalled_2",
      },
    ],
  },
};

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

interface EmailTemplateData {
  firstName?: string;
  lastName?: string;
  company?: string;
  dealName?: string;
  presentationUrl?: string;
  unsubscribeUrl?: string;
  [key: string]: unknown;
}

const EMAIL_TEMPLATES: Record<string, { de: (data: EmailTemplateData) => string; en: (data: EmailTemplateData) => string }> = {
  // Welcome Sequence
  welcome_1: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Willkommen bei West Money Bau</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Sehr geehrte(r) ${data.firstName || "Interessent"} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">vielen Dank für Ihr Interesse an West Money Bau! Wir freuen uns, Sie auf Ihrem Weg zum Eigenheim begleiten zu dürfen.</p>
          <p style="font-size: 16px; color: #333;">Als Ihr zuverlässiger Partner für Bauvorhaben bieten wir Ihnen:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Professionelle Bauplanung und -begleitung</li>
            <li>Transparente Kostenkontrolle</li>
            <li>Modernste Smart Home Integration</li>
            <li>Persönliche Beratung von Anfang bis Ende</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/beratung" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Jetzt Beratungstermin vereinbaren</a>
          </div>
          <p style="font-size: 14px; color: #666;">Mit freundlichen Grüßen,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>West Money Bau GmbH | Musterstraße 123 | 12345 Musterstadt</p>
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Welcome to West Money Bau</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear ${data.firstName || "Valued Customer"} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">Thank you for your interest in West Money Bau! We look forward to accompanying you on your journey to homeownership.</p>
          <p style="font-size: 16px; color: #333;">As your reliable construction partner, we offer:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Professional construction planning and supervision</li>
            <li>Transparent cost control</li>
            <li>State-of-the-art Smart Home integration</li>
            <li>Personal consultation from start to finish</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/consultation" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book Consultation Now</a>
          </div>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>West Money Bau GmbH | Musterstraße 123 | 12345 Musterstadt</p>
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  welcome_2: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #FFD700; margin: 0; text-align: center;">Ihr Bauherren-Pass</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hallo ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">kennen Sie schon unseren exklusiven <strong>Bauherren-Pass</strong>?</p>
          <p style="font-size: 16px; color: #333;">Mit dem Bauherren-Pass erhalten Sie:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Exklusive Rabatte bei unseren Partnern</li>
            <li>Prioritäre Terminvergabe</li>
            <li>Kostenlose Beratungsstunden</li>
            <li>Zugang zu Premium-Materialien</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/bauherren-pass" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Mehr erfahren</a>
          </div>
          <p style="font-size: 14px; color: #666;">Herzliche Grüße,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #FFD700; margin: 0; text-align: center;">Your Bauherren-Pass</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hello ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">Have you heard about our exclusive <strong>Bauherren-Pass</strong>?</p>
          <p style="font-size: 16px; color: #333;">With the Bauherren-Pass you receive:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Exclusive discounts with our partners</li>
            <li>Priority appointment scheduling</li>
            <li>Free consultation hours</li>
            <li>Access to premium materials</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/bauherren-pass" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Learn More</a>
          </div>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  welcome_3: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Ihre nächsten Schritte</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Liebe(r) ${data.firstName || "Bauinteressent"} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">Sie sind nur wenige Schritte von Ihrem Traumhaus entfernt:</p>
          <ol style="font-size: 16px; color: #333;">
            <li><strong>Beratungsgespräch:</strong> Wir lernen Ihre Wünsche kennen</li>
            <li><strong>Grundstücksanalyse:</strong> Wir prüfen die Möglichkeiten</li>
            <li><strong>Angebot:</strong> Sie erhalten ein transparentes Angebot</li>
            <li><strong>Baustart:</strong> Ihr Projekt beginnt</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/kontakt" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Kontakt aufnehmen</a>
          </div>
          <p style="font-size: 14px; color: #666;">Wir freuen uns auf Sie!<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Your Next Steps</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear ${data.firstName || "Future Homeowner"} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">You're just a few steps away from your dream home:</p>
          <ol style="font-size: 16px; color: #333;">
            <li><strong>Consultation:</strong> We learn about your wishes</li>
            <li><strong>Site Analysis:</strong> We evaluate the possibilities</li>
            <li><strong>Proposal:</strong> You receive a transparent offer</li>
            <li><strong>Construction Start:</strong> Your project begins</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/contact" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get in Touch</a>
          </div>
          <p style="font-size: 14px; color: #666;">We look forward to hearing from you!<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  // Score Upgrade
  score_upgrade_1: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #1a1a2e; margin: 0; text-align: center;">Exklusives Angebot</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Liebe(r) ${data.firstName || ""} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">Wir haben bemerkt, dass Sie sich intensiv mit unseren Angeboten beschäftigt haben. Das freut uns sehr!</p>
          <p style="font-size: 16px; color: #333;">Als Dankeschön für Ihr Interesse möchten wir Ihnen ein <strong>exklusives Beratungsangebot</strong> machen:</p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 18px; color: #333; margin: 0; text-align: center;"><strong>Kostenlose Erstberatung + 10% Rabatt auf den Bauherren-Pass</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/exklusiv" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Angebot sichern</a>
          </div>
          <p style="font-size: 14px; color: #666;">Dieses Angebot gilt nur für kurze Zeit!<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #1a1a2e; margin: 0; text-align: center;">Exclusive Offer</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear ${data.firstName || ""} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">We've noticed you've been actively exploring our offerings. We're delighted!</p>
          <p style="font-size: 16px; color: #333;">As a thank you for your interest, we'd like to make you an <strong>exclusive consultation offer</strong>:</p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 18px; color: #333; margin: 0; text-align: center;"><strong>Free Initial Consultation + 10% Off Bauherren-Pass</strong></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/exclusive" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Claim Offer</a>
          </div>
          <p style="font-size: 14px; color: #666;">This offer is only valid for a limited time!<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  // Re-Engage Sequence
  re_engage_1: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Wir vermissen Sie!</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hallo ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">Es ist schon eine Weile her, seit wir von Ihnen gehört haben. Wir hoffen, es geht Ihnen gut!</p>
          <p style="font-size: 16px; color: #333;">Falls Sie noch Fragen zu Ihrem Bauvorhaben haben oder sich die Situation geändert hat - wir sind jederzeit für Sie da.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/kontakt" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Jetzt Kontakt aufnehmen</a>
          </div>
          <p style="font-size: 14px; color: #666;">Herzliche Grüße,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">We Miss You!</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hello ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">It's been a while since we've heard from you. We hope you're doing well!</p>
          <p style="font-size: 16px; color: #333;">If you still have questions about your construction project or if your situation has changed - we're always here for you.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/contact" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get in Touch</a>
          </div>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  re_engage_2: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #FFD700; margin: 0; text-align: center;">Exklusive Einblicke</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Liebe(r) ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">Wir haben spannende Neuigkeiten für Sie: Unsere neuesten Projekte und Innovationen warten darauf, entdeckt zu werden.</p>
          <p style="font-size: 16px; color: #333;">Schauen Sie sich an, was wir in letzter Zeit realisiert haben!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/projekte" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Projekte entdecken</a>
          </div>
          <p style="font-size: 14px; color: #666;">Mit besten Grüßen,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #FFD700; margin: 0; text-align: center;">Exclusive Insights</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">We have exciting news for you: Our latest projects and innovations are waiting to be discovered.</p>
          <p style="font-size: 16px; color: #333;">Take a look at what we've accomplished recently!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/projects" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Discover Projects</a>
          </div>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  re_engage_3: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Wir sind für Sie da</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hallo ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">Ob heute, morgen oder in einem Jahr - wenn Sie bereit sind, Ihr Bauvorhaben anzugehen, sind wir für Sie da.</p>
          <p style="font-size: 16px; color: #333;">Speichern Sie sich unsere Kontaktdaten und melden Sie sich, wann immer es für Sie passt.</p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333; margin: 0;">Telefon: 0800 123 4567<br>E-Mail: kontakt@westmoneybau.de<br>Web: westmoneybau.de</p>
          </div>
          <p style="font-size: 14px; color: #666;">Alles Gute,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">We're Here For You</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hello ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">Whether today, tomorrow, or in a year - when you're ready to pursue your construction project, we'll be here for you.</p>
          <p style="font-size: 16px; color: #333;">Save our contact information and reach out whenever it suits you.</p>
          <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333; margin: 0;">Phone: 0800 123 4567<br>Email: kontakt@westmoneybau.de<br>Web: westmoneybau.de</p>
          </div>
          <p style="font-size: 14px; color: #666;">All the best,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  // Post Presentation
  post_presentation_1: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Vielen Dank!</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Liebe(r) ${data.firstName || ""} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">vielen Dank, dass Sie sich unsere Präsentation angesehen haben!</p>
          <p style="font-size: 16px; color: #333;">Wir hoffen, dass Ihnen die Informationen zu Ihrem Projekt gefallen haben. Falls Sie die Präsentation erneut ansehen möchten:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.presentationUrl || '#'}" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Präsentation erneut öffnen</a>
          </div>
          <p style="font-size: 16px; color: #333;">Haben Sie Fragen? Wir sind gerne für Sie da!</p>
          <p style="font-size: 14px; color: #666;">Mit freundlichen Grüßen,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Thank You!</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear ${data.firstName || ""} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">Thank you for viewing our presentation!</p>
          <p style="font-size: 16px; color: #333;">We hope you enjoyed the information about your project. If you'd like to view the presentation again:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.presentationUrl || '#'}" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Open Presentation Again</a>
          </div>
          <p style="font-size: 16px; color: #333;">Have questions? We're happy to help!</p>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  post_presentation_2: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Haben Sie Fragen?</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hallo ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">nach unserer Präsentation möchten wir sicherstellen, dass alle Ihre Fragen beantwortet sind.</p>
          <p style="font-size: 16px; color: #333;">Typische Fragen unserer Kunden:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Wie läuft der Bauprozess genau ab?</li>
            <li>Welche Kosten kommen auf mich zu?</li>
            <li>Wie lange dauert mein Projekt?</li>
            <li>Was beinhaltet der Bauherren-Pass?</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/beratung" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Beratungstermin buchen</a>
          </div>
          <p style="font-size: 14px; color: #666;">Wir freuen uns auf Ihre Fragen!<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Any Questions?</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hello ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">After our presentation, we want to make sure all your questions are answered.</p>
          <p style="font-size: 16px; color: #333;">Common questions from our customers:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>How does the construction process work?</li>
            <li>What costs should I expect?</li>
            <li>How long will my project take?</li>
            <li>What's included in the Bauherren-Pass?</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/consultation" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book Consultation</a>
          </div>
          <p style="font-size: 14px; color: #666;">We look forward to your questions!<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  // Deal Stalled
  deal_stalled_1: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Ihr Projekt wartet</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Liebe(r) ${data.firstName || ""} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">wir haben festgestellt, dass bei Ihrem Projekt "${data.dealName || 'Bauvorhaben'}" etwas ins Stocken geraten ist.</p>
          <p style="font-size: 16px; color: #333;">Gibt es etwas, das Sie aufhält? Wir helfen Ihnen gerne weiter:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Finanzierungsfragen?</li>
            <li>Grundstückssuche?</li>
            <li>Planungsunsicherheiten?</li>
            <li>Zeitliche Bedenken?</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/beratung" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Lassen Sie uns sprechen</a>
          </div>
          <p style="font-size: 14px; color: #666;">Mit besten Grüßen,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00ff88; margin: 0; text-align: center;">Your Project Awaits</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear ${data.firstName || ""} ${data.lastName || ""},</p>
          <p style="font-size: 16px; color: #333;">We've noticed that your project "${data.dealName || 'Construction Project'}" seems to have stalled.</p>
          <p style="font-size: 16px; color: #333;">Is there something holding you back? We're happy to help:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Financing questions?</li>
            <li>Land search?</li>
            <li>Planning uncertainties?</li>
            <li>Timeline concerns?</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/consultation" style="background: #00ff88; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Let's Talk</a>
          </div>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },

  deal_stalled_2: {
    de: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #FFD700; margin: 0; text-align: center;">Neue Möglichkeiten</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hallo ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">vielleicht haben sich Ihre Anforderungen geändert? Wir haben neue Optionen für Sie:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Flexible Finanzierungsmodelle</li>
            <li>Modulare Bauweise für schnellere Fertigstellung</li>
            <li>Neue Partnerschaften für günstigere Materialien</li>
            <li>Erweiterte Smart Home Optionen</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/neuigkeiten" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Neuigkeiten entdecken</a>
          </div>
          <p style="font-size: 14px; color: #666;">Herzliche Grüße,<br>Ihr West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Abmelden</a></p>
        </div>
      </div>
    `,
    en: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #FFD700; margin: 0; text-align: center;">New Possibilities</h1>
        </div>
        <div style="background: #fff; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hello ${data.firstName || ""},</p>
          <p style="font-size: 16px; color: #333;">Perhaps your requirements have changed? We have new options for you:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Flexible financing models</li>
            <li>Modular construction for faster completion</li>
            <li>New partnerships for more affordable materials</li>
            <li>Extended Smart Home options</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://westmoneybau.de/news" style="background: #FFD700; color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Discover What's New</a>
          </div>
          <p style="font-size: 14px; color: #666;">Best regards,<br>Your West Money Bau Team</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p><a href="${data.unsubscribeUrl || '#'}" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  },
};

// =============================================================================
// SMTP TRANSPORTER
// =============================================================================

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth,
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a contact has valid GDPR consent for email communication
 */
export async function hasGDPRConsent(contactId: string): Promise<boolean> {
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    columns: {
      consentStatus: true,
      emailStatus: true,
      unsubscribedAt: true,
    },
  });

  if (!contact) return false;

  // Must have granted consent
  if (contact.consentStatus !== "granted") return false;

  // Must not be unsubscribed
  if (contact.unsubscribedAt) return false;

  // Email must be active (not bounced, complained, or unsubscribed)
  if (contact.emailStatus !== "active") return false;

  return true;
}

/**
 * Detect language preference for a contact (default: German)
 */
export function detectLanguage(contact: { country?: string | null }): Language {
  const country = (contact.country || "DE").toUpperCase();

  // English-speaking countries
  const englishCountries = ["US", "GB", "UK", "AU", "CA", "NZ", "IE"];

  if (englishCountries.includes(country)) {
    return "en";
  }

  return "de";
}

/**
 * Generate unsubscribe URL for a contact
 */
function generateUnsubscribeUrl(contactId: string): string {
  const baseUrl = process.env.APP_URL || "https://app.westmoneybau.de";
  return `${baseUrl}/unsubscribe?cid=${contactId}`;
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send a nurturing email via one.com SMTP
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  contactId: string;
  sequenceType: SequenceType;
  stepNumber: number;
}): Promise<SendEmailResult> {
  const start = Date.now();

  try {
    const transport = getTransporter();

    // Generate plain text version if not provided
    const text = params.text || params.html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text,
      headers: {
        "X-Nurturing-Sequence": params.sequenceType,
        "X-Nurturing-Step": String(params.stepNumber),
        "X-Contact-ID": params.contactId,
        "List-Unsubscribe": `<${generateUnsubscribeUrl(params.contactId)}>`,
      },
    };

    const info = await transport.sendMail(mailOptions);

    console.log(`[Auto-Nurturing] Email sent: ${info.messageId} to ${params.to} (${params.sequenceType} step ${params.stepNumber})`);

    // Log activity
    await logNurturingActivity(params.contactId, {
      type: "email_sent",
      sequenceType: params.sequenceType,
      stepNumber: params.stepNumber,
      metadata: {
        messageId: info.messageId,
        subject: params.subject,
        latencyMs: Date.now() - start,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("[Auto-Nurturing] Email send failed:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Log nurturing activity to contact activities
 */
async function logNurturingActivity(
  contactId: string,
  event: Omit<NurturingEvent, "contactId" | "occurredAt">
): Promise<void> {
  try {
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
      columns: { organizationId: true },
    });

    if (!contact) return;

    await db.insert(contactActivities).values({
      contactId,
      organizationId: contact.organizationId,
      type: `nurturing_${event.type}`,
      title: `${event.sequenceType} - Step ${event.stepNumber || 0}`,
      description: `Auto-nurturing ${event.type}: ${event.sequenceType}`,
      metadata: event.metadata,
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error("[Auto-Nurturing] Failed to log activity:", error);
  }
}

// =============================================================================
// SEQUENCE PROGRESS TRACKING (In-Memory + DB)
// =============================================================================

// In-memory cache of sequence progress
const sequenceProgressCache = new Map<string, ContactSequenceProgress>();

function getProgressKey(contactId: string, sequenceType: SequenceType): string {
  return `${contactId}:${sequenceType}`;
}

/**
 * Get sequence progress for a contact
 */
export async function getSequenceProgress(
  contactId: string,
  sequenceType: SequenceType
): Promise<ContactSequenceProgress | null> {
  const key = getProgressKey(contactId, sequenceType);

  // Check cache first
  if (sequenceProgressCache.has(key)) {
    return sequenceProgressCache.get(key)!;
  }

  // Check database (stored in contact customFields)
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    columns: { customFields: true },
  });

  if (contact?.customFields) {
    const fields = contact.customFields as Record<string, unknown>;
    const progressData = fields[`nurturing_${sequenceType}`] as ContactSequenceProgress | undefined;

    if (progressData) {
      // Restore dates
      progressData.startedAt = new Date(progressData.startedAt);
      progressData.lastEmailSentAt = progressData.lastEmailSentAt ? new Date(progressData.lastEmailSentAt) : null;
      progressData.nextEmailDue = progressData.nextEmailDue ? new Date(progressData.nextEmailDue) : null;
      progressData.completedAt = progressData.completedAt ? new Date(progressData.completedAt) : null;

      sequenceProgressCache.set(key, progressData);
      return progressData;
    }
  }

  return null;
}

/**
 * Save sequence progress
 */
export async function saveSequenceProgress(progress: ContactSequenceProgress): Promise<void> {
  const key = getProgressKey(progress.contactId, progress.sequenceType);
  sequenceProgressCache.set(key, progress);

  // Persist to database
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, progress.contactId),
    columns: { customFields: true },
  });

  const customFields = (contact?.customFields as Record<string, unknown>) || {};
  customFields[`nurturing_${progress.sequenceType}`] = progress;

  await db
    .update(contacts)
    .set({
      customFields,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, progress.contactId));
}

// =============================================================================
// SEQUENCE MANAGEMENT
// =============================================================================

/**
 * Start a nurturing sequence for a contact
 */
export async function startSequence(
  contactId: string,
  sequenceType: SequenceType,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Check GDPR consent
  const hasConsent = await hasGDPRConsent(contactId);
  if (!hasConsent) {
    return { success: false, error: "Contact does not have GDPR consent" };
  }

  // Check if sequence already active
  const existingProgress = await getSequenceProgress(contactId, sequenceType);
  if (existingProgress && existingProgress.status === "active") {
    return { success: false, error: "Sequence already active for this contact" };
  }

  const sequence = SEQUENCES[sequenceType];
  const now = new Date();

  // Calculate when first email is due
  const firstStep = sequence.steps[0];
  const firstEmailDue = new Date(now.getTime() + firstStep.delayDays * 24 * 60 * 60 * 1000);

  const progress: ContactSequenceProgress = {
    contactId,
    sequenceType,
    currentStep: 0,
    startedAt: now,
    lastEmailSentAt: null,
    nextEmailDue: firstEmailDue,
    completedAt: null,
    status: "active",
    metadata,
  };

  await saveSequenceProgress(progress);

  // Log sequence start
  await logNurturingActivity(contactId, {
    type: "sequence_started",
    sequenceType,
    metadata,
  });

  console.log(`[Auto-Nurturing] Started ${sequenceType} sequence for contact ${contactId}`);

  // If delay is 0, send immediately
  if (firstStep.delayDays === 0) {
    await processSequenceStep(contactId, sequenceType);
  }

  return { success: true };
}

/**
 * Cancel a nurturing sequence
 */
export async function cancelSequence(
  contactId: string,
  sequenceType: SequenceType,
  reason?: string
): Promise<void> {
  const progress = await getSequenceProgress(contactId, sequenceType);
  if (!progress) return;

  progress.status = "cancelled";
  progress.metadata = { ...progress.metadata, cancelReason: reason };
  await saveSequenceProgress(progress);

  await logNurturingActivity(contactId, {
    type: "sequence_cancelled",
    sequenceType,
    metadata: { reason },
  });

  console.log(`[Auto-Nurturing] Cancelled ${sequenceType} sequence for contact ${contactId}`);
}

/**
 * Process the next step in a sequence
 */
export async function processSequenceStep(
  contactId: string,
  sequenceType: SequenceType
): Promise<{ success: boolean; error?: string }> {
  const progress = await getSequenceProgress(contactId, sequenceType);
  if (!progress || progress.status !== "active") {
    return { success: false, error: "Sequence not active" };
  }

  // Re-check GDPR consent
  const hasConsent = await hasGDPRConsent(contactId);
  if (!hasConsent) {
    await cancelSequence(contactId, sequenceType, "GDPR consent revoked");
    return { success: false, error: "GDPR consent revoked" };
  }

  const sequence = SEQUENCES[sequenceType];
  const nextStepIndex = progress.currentStep;

  if (nextStepIndex >= sequence.steps.length) {
    // Sequence complete
    progress.status = "completed";
    progress.completedAt = new Date();
    await saveSequenceProgress(progress);

    await logNurturingActivity(contactId, {
      type: "sequence_completed",
      sequenceType,
    });

    return { success: true };
  }

  const step = sequence.steps[nextStepIndex];

  // Get contact data
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  // Determine language
  const language = detectLanguage(contact);

  // Get template
  const template = EMAIL_TEMPLATES[step.templateKey];
  if (!template) {
    return { success: false, error: `Template not found: ${step.templateKey}` };
  }

  // Prepare template data
  const templateData: EmailTemplateData = {
    firstName: contact.firstName || undefined,
    lastName: contact.lastName || undefined,
    company: contact.company || undefined,
    unsubscribeUrl: generateUnsubscribeUrl(contactId),
    ...progress.metadata,
  };

  // Generate email content
  const html = template[language](templateData);
  const subject = step.subject[language];

  // Send email
  const result = await sendEmail({
    to: contact.email,
    subject,
    html,
    contactId,
    sequenceType,
    stepNumber: step.stepNumber,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Update progress
  progress.currentStep = nextStepIndex + 1;
  progress.lastEmailSentAt = new Date();

  // Calculate next email due date
  if (progress.currentStep < sequence.steps.length) {
    const nextStep = sequence.steps[progress.currentStep];
    progress.nextEmailDue = new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000);
  } else {
    progress.nextEmailDue = null;
    progress.status = "completed";
    progress.completedAt = new Date();
  }

  await saveSequenceProgress(progress);

  // Update contact email metrics
  await db
    .update(contacts)
    .set({
      emailsSent: sql`COALESCE(emails_sent, 0) + 1`,
      lastEmailSent: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  return { success: true };
}

// =============================================================================
// TRIGGER FUNCTIONS
// =============================================================================

/**
 * Trigger welcome sequence for new contact
 */
export async function triggerWelcomeSequence(contactId: string): Promise<void> {
  await startSequence(contactId, "welcome");
}

/**
 * Trigger score upgrade sequence (B -> A)
 */
export async function triggerScoreUpgradeSequence(
  contactId: string,
  previousGrade: string,
  newGrade: string
): Promise<void> {
  if (previousGrade === "B" && newGrade === "A") {
    await startSequence(contactId, "score_upgrade", { previousGrade, newGrade });
  }
}

/**
 * Trigger post-presentation sequence
 */
export async function triggerPostPresentationSequence(
  contactId: string,
  presentationId: string,
  presentationUrl: string
): Promise<void> {
  await startSequence(contactId, "post_presentation", { presentationId, presentationUrl });
}

// =============================================================================
// SCHEDULED JOBS (Called by cron)
// =============================================================================

/**
 * Process all due sequence emails
 */
export async function processDueEmails(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  let processed = 0;
  let sent = 0;
  let errors = 0;

  const now = new Date();

  // Get all contacts with active sequences
  const contactsWithSequences = await db.query.contacts.findMany({
    where: sql`custom_fields IS NOT NULL`,
    columns: { id: true, customFields: true },
  });

  for (const contact of contactsWithSequences) {
    const customFields = contact.customFields as Record<string, unknown>;

    for (const sequenceType of Object.keys(SEQUENCES) as SequenceType[]) {
      const progressData = customFields[`nurturing_${sequenceType}`] as ContactSequenceProgress | undefined;

      if (progressData && progressData.status === "active" && progressData.nextEmailDue) {
        const dueDate = new Date(progressData.nextEmailDue);

        if (dueDate <= now) {
          processed++;
          const result = await processSequenceStep(contact.id, sequenceType);

          if (result.success) {
            sent++;
          } else {
            errors++;
            console.error(`[Auto-Nurturing] Error processing ${sequenceType} for ${contact.id}: ${result.error}`);
          }
        }
      }
    }
  }

  console.log(`[Auto-Nurturing] Processed ${processed} emails: ${sent} sent, ${errors} errors`);
  return { processed, sent, errors };
}

/**
 * Find contacts for re-engagement (30+ days inactive)
 */
export async function findInactiveContacts(): Promise<string[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const inactiveContacts = await db.query.contacts.findMany({
    where: and(
      eq(contacts.consentStatus, "granted"),
      eq(contacts.emailStatus, "active"),
      isNull(contacts.unsubscribedAt),
      lt(contacts.lastEngagementAt, thirtyDaysAgo)
    ),
    columns: { id: true },
  });

  return inactiveContacts.map(c => c.id);
}

/**
 * Trigger re-engagement for inactive contacts
 */
export async function triggerReEngagementSequences(): Promise<{
  triggered: number;
  skipped: number;
}> {
  const inactiveContactIds = await findInactiveContacts();
  let triggered = 0;
  let skipped = 0;

  for (const contactId of inactiveContactIds) {
    // Check if already in re-engage sequence
    const existingProgress = await getSequenceProgress(contactId, "re_engage");

    if (existingProgress && (existingProgress.status === "active" || existingProgress.status === "completed")) {
      skipped++;
      continue;
    }

    const result = await startSequence(contactId, "re_engage");
    if (result.success) {
      triggered++;
    } else {
      skipped++;
    }
  }

  console.log(`[Auto-Nurturing] Re-engagement: ${triggered} triggered, ${skipped} skipped`);
  return { triggered, skipped };
}

/**
 * Find stalled deals (14+ days without activity)
 */
export async function findStalledDeals(): Promise<Array<{ dealId: string; contactId: string; dealName: string }>> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const stalledDeals = await db.query.deals.findMany({
    where: and(
      sql`stage NOT IN ('won', 'lost')`,
      lt(deals.lastActivityDate, fourteenDaysAgo)
    ),
    columns: { id: true, contactId: true, name: true },
  });

  return stalledDeals
    .filter(d => d.contactId)
    .map(d => ({
      dealId: d.id,
      contactId: d.contactId!,
      dealName: d.name,
    }));
}

/**
 * Trigger deal stalled sequences
 */
export async function triggerDealStalledSequences(): Promise<{
  triggered: number;
  skipped: number;
}> {
  const stalledDeals = await findStalledDeals();
  let triggered = 0;
  let skipped = 0;

  for (const deal of stalledDeals) {
    // Check if already in deal_stalled sequence
    const existingProgress = await getSequenceProgress(deal.contactId, "deal_stalled");

    if (existingProgress && (existingProgress.status === "active" || existingProgress.status === "completed")) {
      skipped++;
      continue;
    }

    const result = await startSequence(deal.contactId, "deal_stalled", {
      dealId: deal.dealId,
      dealName: deal.dealName,
    });

    if (result.success) {
      triggered++;
    } else {
      skipped++;
    }
  }

  console.log(`[Auto-Nurturing] Deal stalled: ${triggered} triggered, ${skipped} skipped`);
  return { triggered, skipped };
}

// =============================================================================
// STATUS & REPORTING
// =============================================================================

/**
 * Get nurturing status for a contact
 */
export async function getContactNurturingStatus(contactId: string): Promise<{
  activeSequences: ContactSequenceProgress[];
  completedSequences: ContactSequenceProgress[];
  hasConsent: boolean;
}> {
  const activeSequences: ContactSequenceProgress[] = [];
  const completedSequences: ContactSequenceProgress[] = [];

  for (const sequenceType of Object.keys(SEQUENCES) as SequenceType[]) {
    const progress = await getSequenceProgress(contactId, sequenceType);
    if (progress) {
      if (progress.status === "active") {
        activeSequences.push(progress);
      } else if (progress.status === "completed") {
        completedSequences.push(progress);
      }
    }
  }

  const hasConsent = await hasGDPRConsent(contactId);

  return { activeSequences, completedSequences, hasConsent };
}

/**
 * Get overall nurturing statistics
 */
export async function getNurturingStats(organizationId?: string): Promise<{
  activeSequences: number;
  completedSequences: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
}> {
  // This would require aggregating data from contact customFields
  // For now, return placeholder stats
  // TODO: Implement proper aggregation

  return {
    activeSequences: 0,
    completedSequences: 0,
    emailsSentToday: 0,
    emailsSentThisWeek: 0,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

// SEQUENCES and EMAIL_TEMPLATES are already exported at their definition points
