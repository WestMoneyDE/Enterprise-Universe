#!/usr/bin/env python3
"""
Email Alert Sender for Service Monitor
Uses SMTP to send alert emails when services fail
"""

import smtplib
import sys
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'send.one.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', 'invoice@enterprise-universe.com')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
ALERT_EMAIL = os.environ.get('ALERT_EMAIL', 'coskun.oemer@gmail.com')
FROM_EMAIL = SMTP_USER

def send_alert(subject: str, message: str):
    """Send alert email"""
    if not SMTP_PASS:
        print("ERROR: SMTP_PASS not set")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"[SERVER ALERT] {subject}"
        msg['From'] = FROM_EMAIL
        msg['To'] = ALERT_EMAIL

        # Plain text
        text_content = f"""
SERVER ALERT
============
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Server: cloud-server-10325133

{message}

---
This is an automated alert from the service monitor.
        """

        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }}
        .alert-box {{ background: #16213e; border-left: 4px solid #e94560; padding: 20px; border-radius: 8px; }}
        .header {{ color: #e94560; font-size: 24px; margin-bottom: 10px; }}
        .time {{ color: #888; font-size: 12px; }}
        .message {{ margin: 20px 0; white-space: pre-wrap; }}
        .footer {{ color: #666; font-size: 11px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="alert-box">
        <div class="header">Server Alert</div>
        <div class="time">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC</div>
        <div class="message">{message}</div>
    </div>
    <div class="footer">Automated alert from service-monitor.sh</div>
</body>
</html>
        """

        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, ALERT_EMAIL, msg.as_string())

        print(f"Alert email sent to {ALERT_EMAIL}")
        return True

    except Exception as e:
        print(f"ERROR sending email: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: send-alert-email.py <subject> <message>")
        sys.exit(1)

    subject = sys.argv[1]
    message = sys.argv[2]

    success = send_alert(subject, message)
    sys.exit(0 if success else 1)
