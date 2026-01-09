/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEST MONEY BAU - KAMPAGNEN LAUNCHER
 * Alle offenen E-Mails senden & Kampagnen starten
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ausführen: node kampagnen-launcher.js
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

// ═══════════════════════════════════════════════════════════════════════════
// ALLE OFFENEN E-MAILS
// ═══════════════════════════════════════════════════════════════════════════

const KAMPAGNEN = {
  
  // ═══════════════════════════════════════════════════════════════════════
  // KAMPAGNE 1: PARTNER AKQUISE
  // ═══════════════════════════════════════════════════════════════════════
  
  partner_comfortclick: {
    kategorie: '🤝 Partner Akquise',
    prioritaet: 'HOCH',
    to: 'partners@comfortclick.com',
    cc: 'info@west-money-bau.de',
    subject: 'Partnerantrag - West Money Bau GmbH, Deutschland',
    body: `Sehr geehrte Damen und Herren,

die West Money Bau GmbH aus Köln möchte offizieller ComfortClick Partner für die DACH-Region werden.

UNSER PROFIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Spezialisierung: Smart Home Installation, LOXONE, Barrierefreies Bauen
• Bestehende Partner: LOXONE, Verisure, HubSpot
• Standort: Köln / NRW / Deutschland
• Geplant: Flagship Store in Köln mit Building Automation Showroom
• Ziel: Integration ComfortClick Jigsaw in unser Portfolio

INTERESSE AN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Jigsaw Server & Jigsaw Pro
• Bobcat Panels
• Lizenzmodelle für Integratoren
• Schulungen & Zertifizierung

Wir bitten um Zusendung der Partnerschaftsunterlagen und Konditionen für Deutschland.`
  },

  partner_knx: {
    kategorie: '🤝 Partner Akquise',
    prioritaet: 'MITTEL',
    to: 'info@knx.org',
    cc: 'info@west-money-bau.de',
    subject: 'KNX Partnerschaft - West Money Bau GmbH',
    body: `Sehr geehrte Damen und Herren,

die West Money Bau GmbH interessiert sich für eine KNX Partnerschaft und Zertifizierung.

UNTERNEHMENSPROFIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Spezialisierung: Smart Home, Gebäudeautomation, Barrierefreies Bauen
• Standort: Köln / NRW
• Bestehende Systeme: LOXONE, ComfortClick (in Planung)
• Projekt: Flagship Store mit Live-Showroom

INTERESSE AN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• KNX Partner-Programm
• Zertifizierungsmöglichkeiten
• Schulungen

Bitte senden Sie uns Informationen zu den Partnerschaftsmöglichkeiten.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KAMPAGNE 2: LOXONE PROJEKT
  // ═══════════════════════════════════════════════════════════════════════

  loxone_koeln: {
    kategorie: '🏠 LOXONE Projekt',
    prioritaet: 'HOCH',
    to: 'info@smarthome-koeln.de',
    cc: 'info@west-money-bau.de',
    subject: 'Angebotsanfrage - LOXONE Flagship Store Köln €35-42k',
    body: `Sehr geehrtes Smart Home Köln Team,

wir planen einen Flagship Store in der Kölner Ehrenstraße mit vollständiger LOXONE Integration.

PROJEKTECKDATEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Standort:       Ehrenstraße, 50672 Köln (Belgisches Viertel)
Fläche:         ca. 200 qm
Konzept:        Experience Store mit VR/AR, Smart Home Demo
Eröffnung:      Q2 2026
Budget:         €35.000 - €42.000

SYSTEMUMFANG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 1x Miniserver Gen. 2 + Extensions
• 60x LED Spots RGBW + 40m LED Strips
• 15x Touch Pure Schalter
• 12x Präsenzmelder Air
• 1x Audioserver + 12x Speaker
• 2x Intercom + 6x Rauchmelder

Bitte senden Sie uns ein detailliertes Angebot.`
  },

  loxone_direkt: {
    kategorie: '🏠 LOXONE Projekt',
    prioritaet: 'MITTEL',
    to: 'info@loxone.com',
    cc: 'info@west-money-bau.de',
    subject: 'Showroom-Projekt Köln - LOXONE Referenzprojekt',
    body: `Sehr geehrtes LOXONE Team,

die West Money Bau plant einen Flagship Store in Köln als LOXONE Referenzprojekt.

PROJEKTDETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Standort: Ehrenstraße, Köln (Premium-Lage)
• Fläche: 200 qm
• Investition: €485.000 - €650.000 (Gesamtausbau)
• LOXONE Budget: €35.000 - €42.000
• Eröffnung: Q2 2026

MEHRWERT FÜR LOXONE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Showroom in Premium-Lage Köln
• Live-Demos für Endkunden
• VR/AR Integration
• Regelmäßige Events & Workshops

Haben Sie Interesse an einer Kooperation als Referenzprojekt?`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KAMPAGNE 3: IMMOBILIEN / FLAGSHIP STORE
  // ═══════════════════════════════════════════════════════════════════════

  immobilien_engelvoelkers: {
    kategorie: '🏢 Flagship Store',
    prioritaet: 'HOCH',
    to: 'koeln@engelvoelkers.com',
    cc: 'info@west-money-bau.de',
    subject: 'Mietgesuch Gewerbefläche - Ehrenstraße Köln - €11.000/Monat',
    body: `Sehr geehrte Damen und Herren,

wir suchen eine Gewerbefläche für unseren Tech & Smart Home Flagship Store.

SUCHKRITERIEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lage:           Ehrenstraße / Belgisches Viertel, Köln
Fläche:         180-250 qm (EG, ggf. mit UG)
Schaufenster:   Mindestens 4m Frontbreite
Deckenhöhe:     Mindestens 3,00m
Budget:         bis EUR 11.000/Monat Kaltmiete
Mietdauer:      5-10 Jahre
Bezug:          ab Q1 2026

MIETER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
West Money Bau / Enterprise Universe
Tech & Smart Home Flagship mit VR/AR, LOXONE Showroom, Gaming Lounge

INVESTITION AUSBAU: €485.000 - €650.000

Bitte kontaktieren Sie uns bei passenden Objekten.`
  },

  immobilien_comfort: {
    kategorie: '🏢 Flagship Store',
    prioritaet: 'MITTEL',
    to: 'koeln@comfort.de',
    cc: 'info@west-money-bau.de',
    subject: 'Gewerbefläche gesucht - Ehrenstraße/Friesenplatz Köln',
    body: `Sehr geehrte Damen und Herren,

wir suchen eine repräsentative Gewerbefläche in Köln für einen Tech Flagship Store.

ANFORDERUNGEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lage: Ehrenstraße, Friesenplatz, Belgisches Viertel
• Größe: 180-250 qm
• Schaufensterfront: min. 4m
• Budget: bis €11.000/Monat
• Bezug: Q1 2026

UNTERNEHMEN:
West Money Bau GmbH - Smart Home & Gebäudeautomation
Investition Innenausbau: €485.000 - €650.000

Haben Sie passende Objekte im Portfolio?`
  },

  immobilien_jll: {
    kategorie: '🏢 Flagship Store',
    prioritaet: 'MITTEL',
    to: 'retail.koeln@eu.jll.com',
    cc: 'info@west-money-bau.de',
    subject: 'Retail-Fläche gesucht - Tech Flagship Store Köln Innenstadt',
    body: `Sehr geehrte Damen und Herren,

die West Money Bau sucht eine Retail-Fläche für einen innovativen Tech Flagship Store in Köln.

SUCHPROFIL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Zielgebiet: Ehrenstraße, Friesenplatz, Belgisches Viertel
• Fläche: 180-250 qm EG
• Schaufenster: min. 4m
• Deckenhöhe: min. 3m
• Budget: bis €11.000/Monat netto
• Mietdauer: 5-10 Jahre

KONZEPT:
Tech & Smart Home Experience Store mit LOXONE Showroom, VR/AR Zone, Gaming Lounge
Investitionsvolumen Ausbau: €485.000 - €650.000

Bitte nehmen Sie uns in Ihre Suchdatenbank auf.`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KAMPAGNE 4: BESTEHENDE PARTNER
  // ═══════════════════════════════════════════════════════════════════════

  verisure_erweiterung: {
    kategorie: '🔐 Bestehende Partner',
    prioritaet: 'MITTEL',
    to: 'partner@verisure.de',
    cc: 'info@west-money-bau.de',
    subject: 'Partnerschaft erweitern - Flagship Store Köln',
    body: `Sehr geehrtes Verisure Partner-Team,

als bestehender Verisure Partner möchten wir unsere Zusammenarbeit erweitern.

AKTUELLER STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Aktiver Verisure Partner seit 2024
• Integration in West Money OS
• API-Verbindung aktiv

FLAGSHIP STORE PROJEKT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Standort: Ehrenstraße, 50672 Köln
• Fläche: ca. 200 qm
• Eröffnung: Q2 2026

ANFRAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Verisure Demo-Installation im Showroom
• Co-Branding Möglichkeiten
• Gemeinsame Marketing-Aktivitäten

Können wir einen Termin vereinbaren?`
  },

  hubspot_upgrade: {
    kategorie: '🔐 Bestehende Partner',
    prioritaet: 'NIEDRIG',
    to: 'partnersupport@hubspot.com',
    cc: 'info@west-money-bau.de',
    subject: 'West Money Bau - Partner Program Inquiry',
    body: `Dear HubSpot Team,

West Money Bau GmbH is a current HubSpot customer and we would like to explore partnership opportunities.

CURRENT SETUP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• HubSpot CRM Enterprise License
• WhatsApp Business Integration
• Marketing Hub active

PARTNERSHIP INTEREST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Solutions Partner Program
• Co-marketing opportunities
• Case study collaboration

We are opening a Flagship Store in Cologne with full HubSpot integration.

Best regards`
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KAMPAGNE 5: IT DIENSTLEISTER
  // ═══════════════════════════════════════════════════════════════════════

  it_firma_anfrage: {
    kategorie: '💻 IT Dienstleister',
    prioritaet: 'MITTEL',
    to: 'info@knguru.de',
    cc: 'info@west-money-bau.de',
    subject: 'Anfrage IT-Partnerschaft - West Money OS Entwicklung',
    body: `Sehr geehrte Damen und Herren,

die West Money Bau sucht einen IT-Partner für die Weiterentwicklung unserer Plattform "West Money OS".

PROJEKTUMFANG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Plattform: West Money OS (Master Control System)
• Module: WhatsApp Plugin, CRM Integration, VoIP, Smart Home
• Tech-Stack: React, Node.js, TypeScript, PostgreSQL
• Release: 01.01.2026

ANFORDERUNGEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• API-Entwicklung & Integration
• Mobile App Development
• DevOps & Cloud Infrastructure
• Langfristige Partnerschaft

Haben Sie Kapazitäten und Interesse an einem Kennenlern-Gespräch?`
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
  try {
    const result = await transporter.sendMail({
      from: `"${CONFIG.sender.name}" <${CONFIG.sender.email}>`,
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      text: email.body + '\n\n' + SIGNATURE
    });
    
    console.log(`   ✅ Gesendet: ${email.to}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.log(`   ❌ Fehler: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KAMPAGNEN STARTEN
// ═══════════════════════════════════════════════════════════════════════════

async function starteKampagnen() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🚀 WEST MONEY BAU - KAMPAGNEN LAUNCHER                                  ║
║                                                                           ║
║   Absender: info@west-money-bau.de                                        ║
║   Datum: ${new Date().toLocaleDateString('de-DE')}                                                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  // Verbindung testen
  console.log('🔌 Verbinde mit Gmail SMTP...');
  try {
    await transporter.verify();
    console.log('✅ Verbindung erfolgreich!\n');
  } catch (error) {
    console.error('❌ Verbindungsfehler:', error.message);
    console.log('\n💡 Tipp: Prüfe App-Passwort und Internetverbindung');
    return;
  }

  // Statistik
  const stats = { total: 0, sent: 0, failed: 0 };
  const results = [];

  // Nach Kategorie gruppieren
  const kategorien = {};
  for (const [name, email] of Object.entries(KAMPAGNEN)) {
    const kat = email.kategorie;
    if (!kategorien[kat]) kategorien[kat] = [];
    kategorien[kat].push({ name, ...email });
  }

  // E-Mails senden
  for (const [kategorie, emails] of Object.entries(kategorien)) {
    console.log(`\n${kategorie}`);
    console.log('─'.repeat(50));

    for (const email of emails) {
      stats.total++;
      console.log(`\n📧 ${email.name}`);
      console.log(`   An: ${email.to}`);
      console.log(`   Betreff: ${email.subject.substring(0, 40)}...`);
      
      const result = await sendEmail(email.name, email);
      
      if (result.success) {
        stats.sent++;
        results.push({ name: email.name, to: email.to, status: '✅ Gesendet' });
      } else {
        stats.failed++;
        results.push({ name: email.name, to: email.to, status: '❌ Fehler' });
      }

      // 3 Sekunden Pause zwischen E-Mails
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Zusammenfassung
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                         📊 ZUSAMMENFASSUNG                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║   Gesamt:    ${String(stats.total).padEnd(5)} E-Mails                                          ║
║   Gesendet:  ${String(stats.sent).padEnd(5)} ✅                                               ║
║   Fehler:    ${String(stats.failed).padEnd(5)} ❌                                               ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  // Ergebnisse
  console.log('\n📋 ERGEBNISSE:\n');
  for (const r of results) {
    console.log(`   ${r.status} ${r.name.padEnd(25)} → ${r.to}`);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════
   ✅ KAMPAGNEN ABGESCHLOSSEN
   
   Nächste Schritte:
   • Follow-Up in 3-5 Tagen planen
   • Antworten in HubSpot CRM tracken
   • Bei Interesse: Termine vereinbaren
═══════════════════════════════════════════════════════════════════════════
`);
}

// Start
starteKampagnen().catch(console.error);
