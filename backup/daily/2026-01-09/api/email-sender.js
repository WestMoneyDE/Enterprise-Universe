/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEST MONEY BAU - EMAIL AUTOMATION SYSTEM
 * SMTP Version mit App-Passwort
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * E-Mail: info@west-money-bau.de
 * Status: ✅ KONFIGURIERT UND EINSATZBEREIT
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
      pass: 'irbavpexelkwbiae' // App-Passwort (ohne Leerzeichen)
    }
  },
  sender: {
    email: 'info@west-money-bau.de',
    name: 'West Money Bau'
  },
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
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORTER ERSTELLEN
// ═══════════════════════════════════════════════════════════════════════════

const transporter = nodemailer.createTransport(CONFIG.smtp);

// ═══════════════════════════════════════════════════════════════════════════
// E-MAIL SENDEN FUNKTION
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmail({ to, cc, subject, body, html }) {
  try {
    const mailOptions = {
      from: `"${CONFIG.sender.name}" <${CONFIG.sender.email}>`,
      to: to,
      cc: cc || undefined,
      subject: subject,
      text: body + '\n\n' + CONFIG.signature,
      html: html || undefined
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ E-Mail gesendet:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VORDEFINIERTE E-MAILS
// ═══════════════════════════════════════════════════════════════════════════

const EMAILS = {
  
  // ComfortClick Partner-Anfrage
  comfortclick: {
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

  // LOXONE Angebotsanfrage
  loxone: {
    to: 'info@smarthome-koeln.de',
    cc: 'info@west-money-bau.de',
    subject: 'Angebotsanfrage - LOXONE Flagship Store Köln Ehrenstraße',
    body: `Sehr geehrtes LOXONE Team,

wir planen einen Flagship Store in der Kölner Ehrenstraße mit vollständiger LOXONE Integration als Live-Showroom.

PROJEKTECKDATEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Standort:       Ehrenstraße, 50672 Köln (Belgisches Viertel)
Fläche:         ca. 200 qm
Konzept:        Experience Store mit VR/AR, Smart Home Demo, Gaming Lounge
Eröffnung:      Q2 2026
Budget:         €35.000 - €42.000

LOXONE SYSTEMUMFANG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 1x Miniserver Gen. 2 + Extensions (Dimmer, Relay)
• 60x LED Spots RGBW
• 40m LED Strips
• 15x Touch Pure Schalter (Anthrazit)
• 12x Präsenzmelder Air
• 1x Audioserver Multiroom + 12x Decken-Speaker
• 2x Intercom Türkommunikation
• 6x Rauchmelder Air

PROGRAMMIERUNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lichtszenen: Welcome, Demo, Beratung, Event, Nacht, Aus
• Präsenz-basierte Steuerung
• Audio-Zonen (3 Bereiche)
• App-Steuerung (iOS/Android)

Der Store wird als LOXONE Referenzprojekt dienen.
Bitte senden Sie uns ein detailliertes Angebot.`
  },

  // Immobilienmakler
  immobilien: {
    to: 'info@engel-voelkers.com',
    cc: 'info@west-money-bau.de',
    subject: 'Mietgesuch Gewerbefläche - Ehrenstraße Köln - Tech Flagship Store',
    body: `Sehr geehrte Damen und Herren,

wir suchen eine Gewerbefläche für unseren Tech & Smart Home Flagship Store im Bereich Ehrenstraße / Belgisches Viertel.

SUCHKRITERIEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lage:           Ehrenstraße / Belgisches Viertel
                Max. 5 Min. Fußweg zum Friesenplatz
Fläche:         180-250 qm (EG, ggf. mit UG)
Schaufenster:   Mindestens 4m Frontbreite
Deckenhöhe:     Mindestens 3,00m
Zustand:        Shell & Core oder bezugsfertig
Budget:         bis EUR 11.000/Monat Kaltmiete
Mietdauer:      5-10 Jahre
Bezug:          ab Q1 2026

MIETER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
West Money Bau / Enterprise Universe

Tech & Smart Home Flagship Store mit:
• VR/AR Experience Zone
• LOXONE Smart Home Live-Showroom
• Gaming Lounge
• Vollständig barrierefrei nach DIN 18040

INVESTITIONSVOLUMEN:
EUR 485.000 - 650.000 für den Innenausbau

Bitte kontaktieren Sie uns bei passenden Objekten.`
  },

  // Verisure Erweiterung
  verisure: {
    to: 'partner@verisure.de',
    cc: 'info@west-money-bau.de',
    subject: 'Partnerschaft erweitern - Flagship Store Köln',
    body: `Sehr geehrtes Verisure Partner-Team,

als bestehender Verisure Partner möchten wir unsere Zusammenarbeit im Rahmen unseres neuen Flagship Stores in Köln erweitern.

AKTUELLER STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Aktiver Verisure Partner seit 2024
• Integration in West Money OS abgeschlossen
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
• Schulung für Live-Demos

Können wir einen Termin für ein Gespräch vereinbaren?`
  },

  // Test E-Mail
  test: {
    to: 'info@west-money-bau.de',
    subject: 'Test E-Mail - West Money Automation',
    body: `Dies ist eine Test-E-Mail.

Das E-Mail-System ist erfolgreich eingerichtet und funktioniert!

Gesendet von: West Money Email Automation
Zeitpunkt: ${new Date().toLocaleString('de-DE')}`
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI BEFEHLE
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   WEST MONEY BAU - EMAIL AUTOMATION');
  console.log('   Absender: info@west-money-bau.de');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!command) {
    console.log('Verfügbare Befehle:\n');
    console.log('  node email-sender.js test          - Test-E-Mail senden');
    console.log('  node email-sender.js comfortclick  - ComfortClick Partner-Anfrage');
    console.log('  node email-sender.js loxone        - LOXONE Angebotsanfrage');
    console.log('  node email-sender.js immobilien    - Immobilienmakler Anfrage');
    console.log('  node email-sender.js verisure      - Verisure Erweiterung');
    console.log('  node email-sender.js all           - Alle E-Mails senden');
    console.log('');
    return;
  }

  // Verbindung testen
  console.log('🔌 Verbinde mit Gmail...');
  try {
    await transporter.verify();
    console.log('✅ Verbindung erfolgreich!\n');
  } catch (error) {
    console.error('❌ Verbindungsfehler:', error.message);
    return;
  }

  // E-Mails senden
  if (command === 'all') {
    console.log('📧 Sende alle E-Mails...\n');
    
    for (const [name, email] of Object.entries(EMAILS)) {
      if (name === 'test') continue;
      console.log(`➡️  ${name}...`);
      await sendEmail(email);
      await new Promise(r => setTimeout(r, 2000)); // 2 Sekunden Pause
    }
    
    console.log('\n✅ Alle E-Mails gesendet!');
  } else if (EMAILS[command]) {
    console.log(`📧 Sende ${command}...\n`);
    await sendEmail(EMAILS[command]);
  } else {
    console.log(`❌ Unbekannter Befehl: ${command}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FÜR ANDERE SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { sendEmail, transporter, EMAILS, CONFIG };

// Start
main().catch(console.error);
