#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEST MONEY BAU - EMAIL SENDER CLI
 * Sofort einsetzbare E-Mail-Versand-Scripts
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Verwendung:
 *   node send-emails.js partner-comfortclick
 *   node send-emails.js loxone-anfrage
 *   node send-emails.js immobilien
 *   node send-emails.js all-partners
 */

const https = require('https');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  sender: {
    email: 'info@west-money-bau.de',
    name: 'West Money Bau',
    signature: `
Mit freundlichen Grüßen

Ömer Hüseyin Coşkun
Geschäftsführer / CEO

WEST MONEY BAU
Smart Home Systems | LOXONE Partner | Barrierefreies Bauen
Ein Unternehmen der Enterprise Universe Gruppe

📧 info@west-money-bau.de
🌐 www.west-money-bau.de
    `.trim()
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES - READY TO SEND
// ═══════════════════════════════════════════════════════════════════════════

const EMAILS = {
  // ─────────────────────────────────────────────────────────────────────────
  // COMFORTCLICK PARTNER ANFRAGE
  // ─────────────────────────────────────────────────────────────────────────
  'partner-comfortclick': {
    to: 'partners@comfortclick.com',
    cc: 'info@west-money-bau.de',
    subject: 'Partnerantrag - West Money Bau GmbH, Deutschland',
    body: `Sehr geehrte Damen und Herren,

die West Money Bau GmbH aus Köln möchte offizieller ComfortClick Partner für die DACH-Region werden.

UNSER PROFIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Spezialisierung: Smart Home Installation, LOXONE, Barrierefreies Bauen
• Bestehende Partner: LOXONE, Verisure, HubSpot
• Standort: Köln / NRW / Deutschland
• Geplant: Flagship Store in Köln mit Building Automation Showroom
• Ziel: Integration ComfortClick Jigsaw in unser Portfolio

INTERESSE AN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Jigsaw Server & Jigsaw Pro
• Bobcat Panels
• Lizenzmodelle für Integratoren
• Schulungen & Zertifizierung

Wir bitten um Zusendung der Partnerschaftsunterlagen und Konditionen für Deutschland.

${CONFIG.sender.signature}`
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LOXONE ANGEBOTSANFRAGE
  // ─────────────────────────────────────────────────────────────────────────
  'loxone-anfrage': {
    to: 'info@loxone.com',
    cc: 'info@west-money-bau.de',
    subject: 'Angebotsanfrage - LOXONE Flagship Store Köln Ehrenstraße',
    body: `Sehr geehrtes LOXONE Team,

wir planen einen Flagship Store in der Kölner Ehrenstraße mit vollständiger LOXONE Integration als Live-Showroom.

PROJEKTECKDATEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Standort:       Ehrenstraße, 50672 Köln (Belgisches Viertel)
Fläche:         ca. 200 qm
Konzept:        Experience Store mit VR/AR, Smart Home Demo, Gaming Lounge
Eröffnung:      Q2 2026
Budget:         €35.000 - €42.000

LOXONE SYSTEMUMFANG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 1x Miniserver Gen. 2
• 2x Extension (Dimmer, Relay)
• 60x LED Spots RGBW
• 40m LED Strips
• 15x Touch Pure Schalter (Anthrazit)
• 12x Präsenzmelder Air
• 1x Audioserver Multiroom
• 12x Decken-Lautsprecher
• 2x Intercom (Eingang + Lager)
• 6x Rauchmelder Air

PROGRAMMIERUNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lichtszenen: Welcome, Demo, Beratung, Event, Nacht, Aus
• Präsenz-basierte Steuerung
• Audio-Zonen (3 Bereiche)
• Integration Türklingel
• App-Steuerung (iOS/Android)
• Visualisierung Touch Pure

MEHRWERT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Der Store wird als LOXONE Referenzprojekt dienen und potenzielle 
Kunden von den Smart Home Möglichkeiten überzeugen. Wir planen 
regelmäßige Kundenveranstaltungen und Workshops.

Bitte senden Sie uns ein detailliertes Angebot.

${CONFIG.sender.signature}`
  },

  // ─────────────────────────────────────────────────────────────────────────
  // IMMOBILIENMAKLER KÖLN
  // ─────────────────────────────────────────────────────────────────────────
  'immobilien': {
    to: 'gewerbe@koeln.de', // Placeholder - durch echte Adresse ersetzen
    cc: 'info@west-money-bau.de',
    subject: 'Mietgesuch Gewerbefläche - Ehrenstraße Köln - Tech Flagship Store',
    body: `Sehr geehrte Damen und Herren,

wir suchen eine Gewerbefläche für unseren Tech & Smart Home Flagship Store im Bereich Ehrenstraße / Belgisches Viertel.

SUCHKRITERIEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lage:           Ehrenstraße / Belgisches Viertel, Nähe Friesenplatz
                Max. 5 Min. Fußweg
Fläche:         180-250 qm (EG, ggf. mit UG)
Schaufenster:   Mindestens 4m Frontbreite
Deckenhöhe:     Mindestens 3,00m
Zustand:        Shell & Core oder bezugsfertig
Budget:         bis EUR 11.000/Monat Kaltmiete
Mietdauer:      5-10 Jahre
Bezug:          ab Q1 2026

MIETER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
West Money Bau / Enterprise Universe

Tech & Smart Home Flagship Store mit:
• VR/AR Experience Zone
• LOXONE Smart Home Live-Showroom
• Gaming Lounge
• Vollständig barrierefrei nach DIN 18040

INVESTITIONSVOLUMEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EUR 485.000 - 650.000 für den Innenausbau

Wir sind ein solider Mieter mit langfristiger Perspektive. 
Bitte kontaktieren Sie uns bei passenden Objekten.

${CONFIG.sender.signature}`
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VERISURE PARTNERSCHAFT ERWEITERN
  // ─────────────────────────────────────────────────────────────────────────
  'verisure-erweiterung': {
    to: 'partner@verisure.de',
    cc: 'info@west-money-bau.de',
    subject: 'Partnerschaft erweitern - Flagship Store Köln',
    body: `Sehr geehrtes Verisure Partner-Team,

als bestehender Verisure Partner möchten wir unsere Zusammenarbeit im Rahmen unseres neuen Flagship Stores in Köln erweitern.

AKTUELLER STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Aktiver Verisure Partner seit 2024
• Integration in West Money OS abgeschlossen
• API-Verbindung aktiv

FLAGSHIP STORE PROJEKT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Standort: Ehrenstraße, 50672 Köln
• Fläche: ca. 200 qm
• Eröffnung: Q2 2026

ANFRAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Verisure Demo-Installation im Showroom
• Co-Branding Möglichkeiten
• Gemeinsame Marketing-Aktivitäten
• Schulung für Live-Demos

Der Flagship Store wird ein hervorragender Showcase für die 
Integration von Smart Home und Security-Systemen sein.

Können wir einen Termin für ein Gespräch vereinbaren?

${CONFIG.sender.signature}`
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayEmail(key) {
  const email = EMAILS[key];
  if (!email) {
    console.log(`\n❌ E-Mail "${key}" nicht gefunden.`);
    console.log('\nVerfügbare E-Mails:');
    Object.keys(EMAILS).forEach(k => console.log(`  - ${k}`));
    return false;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📧 E-MAIL: ${key}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nAN:      ${email.to}`);
  console.log(`CC:      ${email.cc || '-'}`);
  console.log(`BETREFF: ${email.subject}`);
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(email.body);
  console.log('───────────────────────────────────────────────────────────────\n');

  return true;
}

function copyToClipboard(key) {
  const email = EMAILS[key];
  if (!email) return;

  // Create mailto link
  const mailto = `mailto:${email.to}?cc=${email.cc || ''}&subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;

  console.log('\n📋 KOPIEREN FÜR GMAIL:');
  console.log('────────────────────────────────────────');
  console.log(`AN: ${email.to}`);
  console.log(`CC: ${email.cc || ''}`);
  console.log(`Betreff: ${email.subject}`);
  console.log('\n📎 Mailto Link (für direktes Öffnen):');
  console.log(mailto.substring(0, 100) + '...');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     WEST MONEY BAU - E-MAIL VERSAND TOOL                      ║
╚═══════════════════════════════════════════════════════════════╝

Verwendung: node send-emails.js <email-key>

Verfügbare E-Mails:
─────────────────────────────────────────────────────────────────
  partner-comfortclick    Partner-Anfrage an ComfortClick
  loxone-anfrage          LOXONE Angebotsanfrage (€35-42k)
  immobilien              Immobilienmakler Mietgesuch
  verisure-erweiterung    Verisure Partnerschaft erweitern
─────────────────────────────────────────────────────────────────

Beispiele:
  node send-emails.js partner-comfortclick
  node send-emails.js loxone-anfrage
  node send-emails.js list

    `);
    process.exit(0);
  }

  const command = args[0];

  if (command === 'list') {
    console.log('\n📋 Verfügbare E-Mails:\n');
    Object.entries(EMAILS).forEach(([key, email]) => {
      console.log(`  ${key.padEnd(25)} → ${email.to}`);
    });
    console.log('');
    process.exit(0);
  }

  if (command === 'all') {
    console.log('\n📧 ALLE E-MAILS:\n');
    Object.keys(EMAILS).forEach(key => {
      displayEmail(key);
      console.log('\n\n');
    });
    process.exit(0);
  }

  if (displayEmail(command)) {
    rl.question('📤 E-Mail Details anzeigen? (j/n): ', (answer) => {
      if (answer.toLowerCase() === 'j') {
        copyToClipboard(command);
      }
      console.log('\n✅ Fertig! Öffne Gmail (mail.google.com) und erstelle eine neue E-Mail.\n');
      rl.close();
    });
  } else {
    rl.close();
  }
}

main();
