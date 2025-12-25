# 🚀 ENTERPRISE UNIVERSE v99.999 - DEPLOYMENT BEFEHLE

## Server Details
- **IP**: 81.88.26.204
- **User**: administrator
- **Domain**: enterprise-universe.one

---

## Option 1: SCP + SSH (Empfohlen)

### Schritt 1: Dateien hochladen
```bash
scp index.html administrator@81.88.26.204:/tmp/
```

### Schritt 2: Auf Server deployen
```bash
ssh administrator@81.88.26.204
```

Dann auf dem Server:
```bash
# Backup alte Seite
sudo cp /var/www/html/index.html /var/www/html/index.html.backup

# Neue Seite deployen
sudo cp /tmp/index.html /var/www/html/index.html
sudo chmod 644 /var/www/html/index.html
sudo chown www-data:www-data /var/www/html/index.html

# Nginx neustarten
sudo systemctl restart nginx

echo "✅ Enterprise Universe v99.999 deployed!"
```

---

## Option 2: One-Liner (Alles in einem Befehl)

```bash
ssh administrator@81.88.26.204 "sudo cp /var/www/html/index.html /var/www/html/index.html.backup && sudo systemctl restart nginx && echo '✅ Nginx restarted'"
```

---

## Option 3: Via SFTP/FileZilla

1. Verbinden zu: sftp://administrator@81.88.26.204
2. Navigieren zu: /var/www/html/
3. index.html hochladen und ersetzen
4. SSH: `sudo systemctl restart nginx`

---

## Nach dem Deployment prüfen:

```bash
curl -I https://enterprise-universe.one
```

Erwartetes Ergebnis:
- HTTP/2 200
- Content-Type: text/html

---

## 🔥 QUICK DEPLOY (Copy & Paste)

Dieser Befehl macht alles in einem Schritt (ersetze [PASTE_HTML] mit dem HTML-Inhalt):

```bash
ssh administrator@81.88.26.204 << 'EOF'
sudo cp /var/www/html/index.html /var/www/html/index.html.backup.$(date +%Y%m%d)
cat << 'HTML' | sudo tee /var/www/html/index.html > /dev/null
[HIER_KOMMT_DER_HTML_INHALT]
HTML
sudo systemctl restart nginx
echo "✅ Enterprise Universe v99.999 神 Mode Active!"
EOF
```

