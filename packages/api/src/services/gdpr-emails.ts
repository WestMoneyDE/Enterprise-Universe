// =============================================================================
// GDPR Email Templates Service
// =============================================================================
// SciFi-themed double opt-in and GDPR email templates (German + English)

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface DoubleOptInEmailParams {
  language: "de" | "en";
  contactName: string;
  channel: string;
  confirmUrl: string;
  expiresAt: Date;
  organizationName: string;
}

export interface DeletionVerificationEmailParams {
  language: "de" | "en";
  contactName: string;
  verifyUrl: string;
  organizationName: string;
}

// =============================================================================
// SCIFI STYLES
// =============================================================================

const sciFiStyles = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;500;600&display=swap');

    .scifi-container {
      font-family: 'Rajdhani', 'Arial', sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%);
      color: #e0e0ff;
      padding: 0;
      border: 1px solid #00ffff;
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.3), inset 0 0 60px rgba(0, 255, 255, 0.05);
    }

    .header {
      background: linear-gradient(90deg, #000428 0%, #004e92 100%);
      padding: 30px 20px;
      text-align: center;
      border-bottom: 2px solid #00ffff;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00ffff, transparent);
    }

    .logo-text {
      font-family: 'Orbitron', 'Arial', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #00ffff;
      text-transform: uppercase;
      letter-spacing: 4px;
      text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
    }

    .content {
      padding: 40px 30px;
    }

    .greeting {
      font-size: 22px;
      color: #00ff88;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .message {
      font-size: 16px;
      line-height: 1.8;
      color: #c0c0e0;
      margin-bottom: 25px;
    }

    .highlight-box {
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(0, 255, 136, 0.1) 100%);
      border: 1px solid #00ffff;
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
      text-align: center;
    }

    .channel-badge {
      display: inline-block;
      background: linear-gradient(90deg, #00ffff, #00ff88);
      color: #000;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 14px;
      margin-bottom: 15px;
    }

    .cta-button {
      display: inline-block;
      background: linear-gradient(90deg, #00ff88 0%, #00ffff 100%);
      color: #000 !important;
      text-decoration: none;
      padding: 18px 50px;
      border-radius: 30px;
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 20px 0;
      box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
      transition: all 0.3s ease;
    }

    .cta-button:hover {
      box-shadow: 0 0 50px rgba(0, 255, 136, 0.8);
      transform: translateY(-2px);
    }

    .warning-box {
      background: rgba(255, 100, 0, 0.1);
      border: 1px solid #ff6400;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }

    .warning-title {
      color: #ff6400;
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .warning-text {
      color: #ffaa80;
      font-size: 14px;
      line-height: 1.6;
    }

    .danger-box {
      background: rgba(255, 50, 50, 0.1);
      border: 1px solid #ff3232;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }

    .danger-title {
      color: #ff3232;
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .danger-text {
      color: #ff8080;
      font-size: 14px;
      line-height: 1.6;
    }

    .expires {
      color: #ff6400;
      font-size: 14px;
      margin-top: 15px;
    }

    .footer {
      background: linear-gradient(90deg, #000428 0%, #001030 100%);
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #00ffff;
    }

    .footer-text {
      color: #606090;
      font-size: 12px;
      line-height: 1.8;
    }

    .footer-brand {
      font-family: 'Orbitron', 'Arial', sans-serif;
      color: #00ffff;
      font-size: 14px;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }

    .gdpr-notice {
      color: #808090;
      font-size: 11px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #303050;
    }

    .stars {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      pointer-events: none;
      background-image: radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                        radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.5), transparent),
                        radial-gradient(1px 1px at 90px 40px, #fff, transparent),
                        radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.3), transparent),
                        radial-gradient(1px 1px at 160px 120px, #fff, transparent);
      background-repeat: repeat;
      background-size: 200px 150px;
      opacity: 0.5;
    }
  </style>
`;

// =============================================================================
// DOUBLE OPT-IN EMAIL
// =============================================================================

export function generateDoubleOptInEmail(params: DoubleOptInEmailParams): EmailContent {
  const { language, contactName, channel, confirmUrl, expiresAt, organizationName } = params;

  const channelNames: Record<string, Record<string, string>> = {
    de: {
      email: "E-Mail",
      whatsapp: "WhatsApp",
      phone: "Telefon",
      post: "Post",
      sms: "SMS",
      push: "Push-Benachrichtigungen",
    },
    en: {
      email: "Email",
      whatsapp: "WhatsApp",
      phone: "Phone",
      post: "Mail",
      sms: "SMS",
      push: "Push Notifications",
    },
  };

  const channelName = channelNames[language][channel] || channel;
  const expiresFormatted = expiresAt.toLocaleString(language === "de" ? "de-DE" : "en-US");

  if (language === "de") {
    return {
      subject: `Transmission bestaetigen: ${channelName}-Kommunikation aktivieren`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sciFiStyles}
</head>
<body style="margin: 0; padding: 20px; background: #050510;">
  <div class="scifi-container">
    <div class="header">
      <div class="stars"></div>
      <div class="logo-text">${organizationName}</div>
      <div style="color: #808090; font-size: 12px; margin-top: 10px; letter-spacing: 2px;">KOMMUNIKATIONS-KONTROLLZENTRUM</div>
    </div>

    <div class="content">
      <div class="greeting">Willkommen an Bord, ${contactName}!</div>

      <div class="message">
        Ihre Anfrage zur Aktivierung der <strong>${channelName}</strong>-Kommunikation wurde erfolgreich registriert.
        Um die Verbindung herzustellen und unsere Transmissionen zu empfangen, bestaetigen Sie bitte Ihre Identitaet.
      </div>

      <div class="highlight-box">
        <div class="channel-badge">${channelName}</div>
        <div style="margin-bottom: 20px; color: #a0a0c0;">Kommunikationskanal bereit zur Aktivierung</div>
        <a href="${confirmUrl}" class="cta-button">TRANSMISSION BESTAETIGEN</a>
        <div class="expires">Link gueltig bis: ${expiresFormatted}</div>
      </div>

      <div class="warning-box">
        <div class="warning-title">SICHERHEITSPROTOKOLL</div>
        <div class="warning-text">
          Falls Sie diese Anfrage nicht initiiert haben, ignorieren Sie diese Nachricht.
          Ihre Daten bleiben geschuetzt und es werden keine weiteren Aktionen durchgefuehrt.
        </div>
      </div>

      <div class="message" style="font-size: 14px; color: #808090;">
        <strong>Warum benoetigen wir Ihre Bestaetigung?</strong><br>
        Gemaess DSGVO und deutschem Recht (Double-Opt-In-Verfahren) benoetigen wir Ihre ausdrueckliche
        Zustimmung, bevor wir Ihnen Informationen ueber diesen Kanal senden duerfen.
      </div>
    </div>

    <div class="footer">
      <div class="footer-brand">ENTERPRISE UNIVERSE</div>
      <div class="footer-text">
        ${organizationName}<br>
        Datenschutz ist unsere Prioritaet.
      </div>
      <div class="gdpr-notice">
        Diese E-Mail wurde an Sie gesendet, da Sie sich fuer ${channelName}-Kommunikation angemeldet haben.
        Gemaess Art. 7 DSGVO benoetigen wir Ihre Bestaetigung.
        Bei Fragen kontaktieren Sie uns unter datenschutz@enterprise-universe.de
      </div>
    </div>
  </div>
</body>
</html>
      `,
      text: `
ENTERPRISE UNIVERSE - KOMMUNIKATIONS-KONTROLLZENTRUM

Willkommen an Bord, ${contactName}!

Ihre Anfrage zur Aktivierung der ${channelName}-Kommunikation wurde erfolgreich registriert.

Um die Verbindung herzustellen, bestaetigen Sie bitte ueber folgenden Link:
${confirmUrl}

Link gueltig bis: ${expiresFormatted}

SICHERHEITSPROTOKOLL:
Falls Sie diese Anfrage nicht initiiert haben, ignorieren Sie diese Nachricht.

Warum benoetigen wir Ihre Bestaetigung?
Gemaess DSGVO und deutschem Recht (Double-Opt-In-Verfahren) benoetigen wir Ihre ausdrueckliche Zustimmung.

---
${organizationName}
datenschutz@enterprise-universe.de
      `,
    };
  }

  // English version
  return {
    subject: `Confirm Transmission: Activate ${channelName} Communication`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sciFiStyles}
</head>
<body style="margin: 0; padding: 20px; background: #050510;">
  <div class="scifi-container">
    <div class="header">
      <div class="stars"></div>
      <div class="logo-text">${organizationName}</div>
      <div style="color: #808090; font-size: 12px; margin-top: 10px; letter-spacing: 2px;">COMMUNICATION CONTROL CENTER</div>
    </div>

    <div class="content">
      <div class="greeting">Welcome Aboard, ${contactName}!</div>

      <div class="message">
        Your request to activate <strong>${channelName}</strong> communication has been successfully registered.
        To establish the connection and receive our transmissions, please confirm your identity.
      </div>

      <div class="highlight-box">
        <div class="channel-badge">${channelName}</div>
        <div style="margin-bottom: 20px; color: #a0a0c0;">Communication channel ready for activation</div>
        <a href="${confirmUrl}" class="cta-button">CONFIRM TRANSMISSION</a>
        <div class="expires">Link valid until: ${expiresFormatted}</div>
      </div>

      <div class="warning-box">
        <div class="warning-title">SECURITY PROTOCOL</div>
        <div class="warning-text">
          If you did not initiate this request, please ignore this message.
          Your data remains protected and no further action will be taken.
        </div>
      </div>

      <div class="message" style="font-size: 14px; color: #808090;">
        <strong>Why do we need your confirmation?</strong><br>
        In accordance with GDPR and data protection regulations (Double Opt-In procedure),
        we require your explicit consent before sending information through this channel.
      </div>
    </div>

    <div class="footer">
      <div class="footer-brand">ENTERPRISE UNIVERSE</div>
      <div class="footer-text">
        ${organizationName}<br>
        Privacy is our priority.
      </div>
      <div class="gdpr-notice">
        This email was sent because you signed up for ${channelName} communication.
        Per GDPR Article 7, we require your confirmation.
        For questions, contact us at privacy@enterprise-universe.de
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
ENTERPRISE UNIVERSE - COMMUNICATION CONTROL CENTER

Welcome Aboard, ${contactName}!

Your request to activate ${channelName} communication has been successfully registered.

To establish the connection, please confirm via the following link:
${confirmUrl}

Link valid until: ${expiresFormatted}

SECURITY PROTOCOL:
If you did not initiate this request, please ignore this message.

Why do we need your confirmation?
In accordance with GDPR (Double Opt-In procedure), we require your explicit consent.

---
${organizationName}
privacy@enterprise-universe.de
    `,
  };
}

// =============================================================================
// DELETION VERIFICATION EMAIL
// =============================================================================

export function generateDeletionVerificationEmail(
  params: DeletionVerificationEmailParams
): EmailContent {
  const { language, contactName, verifyUrl, organizationName } = params;

  if (language === "de") {
    return {
      subject: `DSGVO-Anfrage: Bestaetigen Sie Ihre Datenlöschung`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sciFiStyles}
</head>
<body style="margin: 0; padding: 20px; background: #050510;">
  <div class="scifi-container">
    <div class="header" style="background: linear-gradient(90deg, #280000 0%, #500000 100%); border-bottom-color: #ff3232;">
      <div class="stars"></div>
      <div class="logo-text" style="color: #ff3232;">${organizationName}</div>
      <div style="color: #ff8080; font-size: 12px; margin-top: 10px; letter-spacing: 2px;">DATENLOESCHUNGS-ANFRAGE</div>
    </div>

    <div class="content">
      <div class="greeting" style="color: #ff6432;">${contactName}, wir haben Ihre Anfrage erhalten.</div>

      <div class="message">
        Sie haben eine vollstaendige Loeschung Ihrer Daten aus unseren Systemen angefordert.
        Dies ist eine <strong>unwiderrufliche Aktion</strong>. Nach der Bestaetigung werden alle Ihre
        gespeicherten Daten permanent geloescht.
      </div>

      <div class="danger-box">
        <div class="danger-title">KRITISCHE WARNUNG</div>
        <div class="danger-text">
          Diese Aktion kann NICHT rueckgaengig gemacht werden. Alle Ihre Daten, einschliesslich:
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Kontaktinformationen</li>
            <li>Kommunikationshistorie</li>
            <li>Einwilligungsprotokolle</li>
            <li>Alle verknuepften Aufzeichnungen</li>
          </ul>
          werden dauerhaft aus unseren Systemen entfernt.
        </div>
      </div>

      <div class="highlight-box" style="border-color: #ff3232; background: rgba(255, 50, 50, 0.1);">
        <div style="margin-bottom: 20px; color: #ff8080;">Bestaetigen Sie nur, wenn Sie absolut sicher sind</div>
        <a href="${verifyUrl}" class="cta-button" style="background: linear-gradient(90deg, #ff3232 0%, #ff6432 100%);">LOESCHUNG BESTAETIGEN</a>
      </div>

      <div class="warning-box">
        <div class="warning-title">NICHT IHRE ANFRAGE?</div>
        <div class="warning-text">
          Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
          Ihre Daten werden NICHT geloescht, solange Sie nicht auf den Link klicken.
          Kontaktieren Sie uns sofort, wenn Sie einen unbefugten Zugriff vermuten.
        </div>
      </div>

      <div class="message" style="font-size: 14px; color: #808090;">
        <strong>Ihre Rechte gemaess DSGVO:</strong><br>
        Artikel 17 der DSGVO garantiert Ihnen das "Recht auf Vergessenwerden".
        Nach der Bestaetigung wird Ihr Antrag von unserem Datenschutzteam bearbeitet.
      </div>
    </div>

    <div class="footer" style="background: linear-gradient(90deg, #200000 0%, #100000 100%); border-top-color: #ff3232;">
      <div class="footer-brand" style="color: #ff3232;">ENTERPRISE UNIVERSE</div>
      <div class="footer-text">
        ${organizationName}<br>
        DSGVO-Konformitaet | Datenschutz-Team
      </div>
      <div class="gdpr-notice">
        Diese E-Mail wurde gemaess Art. 17 DSGVO (Recht auf Loeschung) gesendet.
        Bei Fragen: datenschutz@enterprise-universe.de
      </div>
    </div>
  </div>
</body>
</html>
      `,
      text: `
ENTERPRISE UNIVERSE - DATENLOESCHUNGS-ANFRAGE

${contactName}, wir haben Ihre Anfrage erhalten.

Sie haben eine vollstaendige Loeschung Ihrer Daten aus unseren Systemen angefordert.

KRITISCHE WARNUNG:
Diese Aktion kann NICHT rueckgaengig gemacht werden. Alle Ihre Daten werden dauerhaft geloescht:
- Kontaktinformationen
- Kommunikationshistorie
- Einwilligungsprotokolle
- Alle verknuepften Aufzeichnungen

Bestaetigen Sie die Loeschung ueber folgenden Link:
${verifyUrl}

NICHT IHRE ANFRAGE?
Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
Kontaktieren Sie uns sofort bei Verdacht auf unbefugten Zugriff.

---
${organizationName}
datenschutz@enterprise-universe.de
Art. 17 DSGVO - Recht auf Loeschung
      `,
    };
  }

  // English version
  return {
    subject: `GDPR Request: Confirm Your Data Deletion`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sciFiStyles}
</head>
<body style="margin: 0; padding: 20px; background: #050510;">
  <div class="scifi-container">
    <div class="header" style="background: linear-gradient(90deg, #280000 0%, #500000 100%); border-bottom-color: #ff3232;">
      <div class="stars"></div>
      <div class="logo-text" style="color: #ff3232;">${organizationName}</div>
      <div style="color: #ff8080; font-size: 12px; margin-top: 10px; letter-spacing: 2px;">DATA DELETION REQUEST</div>
    </div>

    <div class="content">
      <div class="greeting" style="color: #ff6432;">${contactName}, we have received your request.</div>

      <div class="message">
        You have requested complete deletion of your data from our systems.
        This is an <strong>irreversible action</strong>. After confirmation, all your
        stored data will be permanently deleted.
      </div>

      <div class="danger-box">
        <div class="danger-title">CRITICAL WARNING</div>
        <div class="danger-text">
          This action CANNOT be undone. All your data, including:
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Contact information</li>
            <li>Communication history</li>
            <li>Consent records</li>
            <li>All linked records</li>
          </ul>
          will be permanently removed from our systems.
        </div>
      </div>

      <div class="highlight-box" style="border-color: #ff3232; background: rgba(255, 50, 50, 0.1);">
        <div style="margin-bottom: 20px; color: #ff8080;">Confirm only if you are absolutely certain</div>
        <a href="${verifyUrl}" class="cta-button" style="background: linear-gradient(90deg, #ff3232 0%, #ff6432 100%);">CONFIRM DELETION</a>
      </div>

      <div class="warning-box">
        <div class="warning-title">NOT YOUR REQUEST?</div>
        <div class="warning-text">
          If you did not make this request, please ignore this email.
          Your data will NOT be deleted unless you click the link.
          Contact us immediately if you suspect unauthorized access.
        </div>
      </div>

      <div class="message" style="font-size: 14px; color: #808090;">
        <strong>Your Rights Under GDPR:</strong><br>
        Article 17 of GDPR guarantees your "Right to be Forgotten".
        After confirmation, your request will be processed by our Data Protection team.
      </div>
    </div>

    <div class="footer" style="background: linear-gradient(90deg, #200000 0%, #100000 100%); border-top-color: #ff3232;">
      <div class="footer-brand" style="color: #ff3232;">ENTERPRISE UNIVERSE</div>
      <div class="footer-text">
        ${organizationName}<br>
        GDPR Compliance | Data Protection Team
      </div>
      <div class="gdpr-notice">
        This email was sent per GDPR Article 17 (Right to Erasure).
        Questions? privacy@enterprise-universe.de
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
ENTERPRISE UNIVERSE - DATA DELETION REQUEST

${contactName}, we have received your request.

You have requested complete deletion of your data from our systems.

CRITICAL WARNING:
This action CANNOT be undone. All your data will be permanently deleted:
- Contact information
- Communication history
- Consent records
- All linked records

Confirm deletion via the following link:
${verifyUrl}

NOT YOUR REQUEST?
If you did not make this request, please ignore this email.
Contact us immediately if you suspect unauthorized access.

---
${organizationName}
privacy@enterprise-universe.de
GDPR Article 17 - Right to Erasure
    `,
  };
}

// =============================================================================
// CONSENT CONFIRMED EMAIL
// =============================================================================

export function generateConsentConfirmedEmail(params: {
  language: "de" | "en";
  contactName: string;
  channel: string;
  organizationName: string;
}): EmailContent {
  const { language, contactName, channel, organizationName } = params;

  const channelNames: Record<string, Record<string, string>> = {
    de: {
      email: "E-Mail",
      whatsapp: "WhatsApp",
      phone: "Telefon",
      post: "Post",
      sms: "SMS",
      push: "Push-Benachrichtigungen",
    },
    en: {
      email: "Email",
      whatsapp: "WhatsApp",
      phone: "Phone",
      post: "Mail",
      sms: "SMS",
      push: "Push Notifications",
    },
  };

  const channelName = channelNames[language][channel] || channel;

  if (language === "de") {
    return {
      subject: `Verbindung hergestellt: ${channelName}-Kommunikation aktiviert`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sciFiStyles}
</head>
<body style="margin: 0; padding: 20px; background: #050510;">
  <div class="scifi-container">
    <div class="header" style="background: linear-gradient(90deg, #002800 0%, #004000 100%); border-bottom-color: #00ff88;">
      <div class="stars"></div>
      <div class="logo-text" style="color: #00ff88;">${organizationName}</div>
      <div style="color: #80ff80; font-size: 12px; margin-top: 10px; letter-spacing: 2px;">TRANSMISSION BESTAETIGT</div>
    </div>

    <div class="content">
      <div class="greeting">${contactName}, Verbindung hergestellt!</div>

      <div class="highlight-box" style="border-color: #00ff88;">
        <div style="font-size: 60px; margin-bottom: 10px;">&#10003;</div>
        <div class="channel-badge">${channelName}</div>
        <div style="margin-top: 15px; color: #00ff88; font-size: 18px;">Kommunikationskanal erfolgreich aktiviert</div>
      </div>

      <div class="message">
        Ihre ${channelName}-Kommunikation wurde erfolgreich aktiviert. Sie sind jetzt berechtigt,
        unsere Transmissionen zu empfangen.
      </div>

      <div class="message" style="font-size: 14px; color: #808090;">
        <strong>Ihre Kontrolle:</strong><br>
        Sie koennen Ihre Kommunikationseinstellungen jederzeit aendern oder widerrufen.
        Kontaktieren Sie uns einfach unter datenschutz@enterprise-universe.de.
      </div>
    </div>

    <div class="footer" style="background: linear-gradient(90deg, #001400 0%, #002000 100%); border-top-color: #00ff88;">
      <div class="footer-brand" style="color: #00ff88;">ENTERPRISE UNIVERSE</div>
      <div class="footer-text">
        ${organizationName}<br>
        Willkommen im Netzwerk.
      </div>
    </div>
  </div>
</body>
</html>
      `,
      text: `
ENTERPRISE UNIVERSE - TRANSMISSION BESTAETIGT

${contactName}, Verbindung hergestellt!

Ihre ${channelName}-Kommunikation wurde erfolgreich aktiviert.

Sie koennen Ihre Kommunikationseinstellungen jederzeit aendern oder widerrufen.
Kontaktieren Sie uns unter: datenschutz@enterprise-universe.de

---
${organizationName}
      `,
    };
  }

  // English version
  return {
    subject: `Connection Established: ${channelName} Communication Activated`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${sciFiStyles}
</head>
<body style="margin: 0; padding: 20px; background: #050510;">
  <div class="scifi-container">
    <div class="header" style="background: linear-gradient(90deg, #002800 0%, #004000 100%); border-bottom-color: #00ff88;">
      <div class="stars"></div>
      <div class="logo-text" style="color: #00ff88;">${organizationName}</div>
      <div style="color: #80ff80; font-size: 12px; margin-top: 10px; letter-spacing: 2px;">TRANSMISSION CONFIRMED</div>
    </div>

    <div class="content">
      <div class="greeting">${contactName}, Connection Established!</div>

      <div class="highlight-box" style="border-color: #00ff88;">
        <div style="font-size: 60px; margin-bottom: 10px;">&#10003;</div>
        <div class="channel-badge">${channelName}</div>
        <div style="margin-top: 15px; color: #00ff88; font-size: 18px;">Communication channel successfully activated</div>
      </div>

      <div class="message">
        Your ${channelName} communication has been successfully activated. You are now authorized
        to receive our transmissions.
      </div>

      <div class="message" style="font-size: 14px; color: #808090;">
        <strong>Your Control:</strong><br>
        You can change or revoke your communication preferences at any time.
        Simply contact us at privacy@enterprise-universe.de.
      </div>
    </div>

    <div class="footer" style="background: linear-gradient(90deg, #001400 0%, #002000 100%); border-top-color: #00ff88;">
      <div class="footer-brand" style="color: #00ff88;">ENTERPRISE UNIVERSE</div>
      <div class="footer-text">
        ${organizationName}<br>
        Welcome to the network.
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
ENTERPRISE UNIVERSE - TRANSMISSION CONFIRMED

${contactName}, Connection Established!

Your ${channelName} communication has been successfully activated.

You can change or revoke your communication preferences at any time.
Contact us at: privacy@enterprise-universe.de

---
${organizationName}
    `,
  };
}
