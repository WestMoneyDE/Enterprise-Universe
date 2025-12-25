# 🌐 ONE.COM DNS SETUP - ENTERPRISE-UNIVERSE.COM

## Komplette Anleitung für GitHub Pages + Server Verbindung

---

## 📋 OPTION A: GITHUB PAGES (Empfohlen für Dashboards)

### Schritt 1: Bei one.com einloggen

1. Öffne: https://www.one.com/admin/
2. Logge dich mit deinen one.com Zugangsdaten ein
3. Wähle die Domain: **enterprise-universe.one**

### Schritt 2: DNS-Einstellungen öffnen

1. Klicke auf **"DNS-Einstellungen"** im Menü
2. Oder gehe direkt zu: Domains → enterprise-universe.one → DNS

### Schritt 3: Bestehende Records löschen (falls vorhanden)

⚠️ **WICHTIG**: Lösche folgende Records falls vorhanden:
- Alle A-Records die auf andere IPs zeigen
- CNAME Records für @ oder www (außer Mail)

### Schritt 4: Neue DNS Records erstellen

Klicke auf **"Record hinzufügen"** und erstelle folgende Einträge:

```
┌──────────────────────────────────────────────────────────────┐
│  📝 DNS RECORDS FÜR GITHUB PAGES                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  RECORD 1:                                                   │
│  ─────────                                                   │
│  Type:  A                                                    │
│  Name:  @ (oder leer lassen)                                 │
│  Value: 185.199.108.153                                      │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 2:                                                   │
│  ─────────                                                   │
│  Type:  A                                                    │
│  Name:  @ (oder leer lassen)                                 │
│  Value: 185.199.109.153                                      │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 3:                                                   │
│  ─────────                                                   │
│  Type:  A                                                    │
│  Name:  @ (oder leer lassen)                                 │
│  Value: 185.199.110.153                                      │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 4:                                                   │
│  ─────────                                                   │
│  Type:  A                                                    │
│  Name:  @ (oder leer lassen)                                 │
│  Value: 185.199.111.153                                      │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 5 (WWW Subdomain):                                   │
│  ─────────────────────────                                   │
│  Type:  CNAME                                                │
│  Name:  www                                                  │
│  Value: westmoneyde.github.io                                │
│  TTL:   3600                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Schritt 5: Speichern und warten

1. Klicke **"Speichern"** oder **"Save"**
2. DNS Propagation dauert: **5-30 Minuten** (manchmal bis zu 48h)

### Schritt 6: GitHub Pages konfigurieren

1. Gehe zu: https://github.com/WestMoneyDE/Enterprise-Universe/settings/pages
2. Source: **GitHub Actions**
3. Custom domain: `enterprise-universe.one`
4. Klicke **Save**
5. Warte bis "DNS check successful" erscheint
6. Aktiviere **"Enforce HTTPS"**

---

## 📋 OPTION B: ONE.COM SERVER (Für Backend/API)

Falls du die Domain auf deinen one.com Server zeigen lassen willst:

### DNS Records für Server (81.88.26.204)

```
┌──────────────────────────────────────────────────────────────┐
│  📝 DNS RECORDS FÜR ONE.COM SERVER                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  RECORD 1 (Hauptdomain):                                     │
│  ─────────────────────────                                   │
│  Type:  A                                                    │
│  Name:  @ (oder leer lassen)                                 │
│  Value: 81.88.26.204                                         │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 2 (WWW):                                             │
│  ─────────────                                               │
│  Type:  A                                                    │
│  Name:  www                                                  │
│  Value: 81.88.26.204                                         │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 3 (API Subdomain):                                   │
│  ─────────────────────────                                   │
│  Type:  A                                                    │
│  Name:  api                                                  │
│  Value: 81.88.26.204                                         │
│  TTL:   3600                                                 │
│                                                              │
│  RECORD 4 (App Subdomain):                                   │
│  ─────────────────────────                                   │
│  Type:  A                                                    │
│  Name:  app                                                  │
│  Value: 81.88.26.204                                         │
│  TTL:   3600                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 OPTION C: HYBRID SETUP (Empfohlen)

**GitHub Pages** für Frontend + **one.com Server** für API:

```
┌──────────────────────────────────────────────────────────────┐
│  📝 HYBRID DNS SETUP                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  HAUPTDOMAIN → GitHub Pages:                                 │
│  ───────────────────────────                                 │
│  A     @      185.199.108.153                                │
│  A     @      185.199.109.153                                │
│  A     @      185.199.110.153                                │
│  A     @      185.199.111.153                                │
│  CNAME www    westmoneyde.github.io                          │
│                                                              │
│  SUBDOMAINS → one.com Server:                                │
│  ─────────────────────────────                               │
│  A     api    81.88.26.204    (api.enterprise-universe.one)  │
│  A     app    81.88.26.204    (app.enterprise-universe.one)  │
│  A     server 81.88.26.204    (server.enterprise-universe.one)│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Ergebnis:**
- https://enterprise-universe.one → GitHub Pages (Dashboards)
- https://api.enterprise-universe.one → one.com Server (Backend)
- https://app.enterprise-universe.one → one.com Server (WebApp)

---

## 🔐 SSH VERBINDUNG ZUM SERVER

### Quick Connect:
```bash
ssh administrator@81.88.26.204
```

### SSH Config erstellen (~/.ssh/config):
```
# Enterprise Universe Server
Host enterprise-universe
    HostName 81.88.26.204
    User administrator
    Port 22
    IdentityFile ~/.ssh/id_rsa

Host eu
    HostName 81.88.26.204
    User administrator
```

### Dann verbinden mit:
```bash
ssh enterprise-universe
# oder
ssh eu
```

---

## ✅ DNS VERIFIZIERUNG

### Terminal Commands:
```bash
# A Records prüfen
dig enterprise-universe.one A

# CNAME prüfen
dig www.enterprise-universe.one CNAME

# Alle Records anzeigen
dig enterprise-universe.one ANY

# DNS Propagation prüfen
nslookup enterprise-universe.one
```

### Online Tools:
- https://dnschecker.org/
- https://www.whatsmydns.net/

---

## 🚨 TROUBLESHOOTING

### Problem: Domain zeigt nicht auf GitHub Pages
1. Warte länger (bis zu 48h)
2. Lösche Cache: `ipconfig /flushdns` (Windows) oder `sudo dscacheutil -flushcache` (Mac)
3. Prüfe CNAME Datei im Repository

### Problem: SSL Zertifikat fehlt
1. Warte bis zu 24h
2. In GitHub Pages: Deaktiviere "Enforce HTTPS", warte 5 Min, aktiviere wieder
3. Prüfe ob alle 4 A-Records korrekt sind

### Problem: www funktioniert nicht
1. Prüfe CNAME Record: www → westmoneyde.github.io
2. Stelle sicher dass kein A-Record für www existiert

---

## 📞 ONE.COM SUPPORT

Falls Probleme:
- Support: https://www.one.com/de/support
- Chat: Verfügbar auf der Website
- Tel: +49 (0)800 000 1821

---

神 ENTERPRISE UNIVERSE | © 2025 West Money Bau GmbH
