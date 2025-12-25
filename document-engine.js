/**
 * 📄 DOCUMENT AUTOMATION ENGINE
 * 
 * Automatische Dokumentenerstellung für:
 * - Angebote & Rechnungen
 * - Verträge
 * - DSGVO Dokumente
 * - Bauanträge
 * - Protokolle
 */

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TEMPLATES
// ═══════════════════════════════════════════════════════════════

const DocumentTemplates = {
    
    angebot: {
        name: 'Angebot',
        format: 'pdf',
        sections: ['header', 'customer', 'items', 'terms', 'footer'],
        variables: [
            'angebotNummer', 'datum', 'gueltigBis',
            'kundenName', 'kundenAdresse',
            'positionen', 'zwischensumme', 'mwst', 'gesamtsumme',
            'zahlungsbedingungen', 'lieferbedingungen'
        ]
    },

    rechnung: {
        name: 'Rechnung',
        format: 'pdf',
        sections: ['header', 'customer', 'items', 'payment', 'footer'],
        variables: [
            'rechnungNummer', 'datum', 'faelligAm',
            'kundenName', 'kundenAdresse', 'kundenUstId',
            'positionen', 'netto', 'mwst', 'brutto',
            'bankverbindung', 'verwendungszweck'
        ]
    },

    vertrag: {
        name: 'Werkvertrag',
        format: 'docx',
        sections: ['parteien', 'leistung', 'verguetung', 'termine', 'gewaehrleistung', 'unterschriften'],
        variables: [
            'auftraggeberName', 'auftraggeberAdresse',
            'auftragnehmerName', 'auftragnehmerAdresse',
            'projektbeschreibung', 'leistungsumfang',
            'verguetung', 'zahlungsplan',
            'ausfuehrungsbeginn', 'ausfuehrungsende',
            'gewaehrleistungsfrist'
        ]
    },

    dsgvo_einwilligung: {
        name: 'DSGVO Einwilligungserklärung',
        format: 'pdf',
        sections: ['header', 'zweck', 'rechte', 'widerruf', 'unterschrift'],
        variables: [
            'personName', 'personAdresse',
            'verarbeitungszweck', 'datenarten',
            'speicherdauer', 'empfaenger',
            'datenschutzbeauftragter'
        ]
    },

    abnahmeprotokoll: {
        name: 'Abnahmeprotokoll',
        format: 'pdf',
        sections: ['projekt', 'pruefpunkte', 'maengel', 'ergebnis', 'unterschriften'],
        variables: [
            'projektName', 'projektNummer', 'datum',
            'auftraggeber', 'auftragnehmer',
            'gepruefteLeistungen', 'festgestellteMaengel',
            'abnahmeErgebnis', 'nachbesserungsfrist'
        ]
    },

    bauantrag: {
        name: 'Bauantrag',
        format: 'pdf',
        sections: ['antragsteller', 'grundstueck', 'vorhaben', 'anlagen'],
        variables: [
            'antragstellerName', 'antragstellerAdresse',
            'grundstueckAdresse', 'flurstuckNr', 'gemarkung',
            'vorhabenBeschreibung', 'baukosten',
            'architekt', 'statiker'
        ]
    },

    loxone_uebergabe: {
        name: 'LOXONE Übergabeprotokoll',
        format: 'pdf',
        sections: ['system', 'komponenten', 'einweisung', 'zugangsdaten', 'unterschriften'],
        variables: [
            'projektName', 'datum', 'kunde',
            'miniserverSerial', 'extensions',
            'eingewiesenePersonen', 'einweisungsthemen',
            'appZugang', 'cloudZugang', 'adminPasswort'
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// PDF GENERATOR
// ═══════════════════════════════════════════════════════════════

class PDFGenerator {
    constructor() {
        this.companyInfo = {
            name: 'West Money Bau GmbH',
            address: 'Musterstraße 123, 50667 Köln',
            phone: '+49 221 12345678',
            email: 'info@west-money-bau.de',
            website: 'www.west-money-bau.de',
            ust_id: 'DE123456789',
            handelsregister: 'HRB 12345, Amtsgericht Köln',
            geschaeftsfuehrer: 'Ömer Hüseyin Coşkun',
            bank: 'Deutsche Bank',
            iban: 'DE42 1001 0178 9758 7887 93',
            bic: 'PBNKDEFF'
        };
    }

    /**
     * Generate Angebot (Quote)
     */
    async generateAngebot(data) {
        const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
        
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { width, height } = page.getSize();
        let y = height - 50;

        // Header
        page.drawText(this.companyInfo.name, { x: 50, y, size: 20, font: fontBold, color: rgb(0.2, 0.4, 0.8) });
        y -= 20;
        page.drawText(this.companyInfo.address, { x: 50, y, size: 10, font });
        y -= 40;

        // Angebot Title
        page.drawText('ANGEBOT', { x: 50, y, size: 24, font: fontBold });
        y -= 30;
        page.drawText(`Nr. ${data.angebotNummer}`, { x: 50, y, size: 12, font });
        page.drawText(`Datum: ${data.datum}`, { x: 400, y, size: 12, font });
        y -= 20;
        page.drawText(`Gültig bis: ${data.gueltigBis}`, { x: 400, y, size: 12, font });
        y -= 40;

        // Customer
        page.drawText('Kunde:', { x: 50, y, size: 10, font: fontBold });
        y -= 15;
        page.drawText(data.kundenName, { x: 50, y, size: 12, font });
        y -= 15;
        data.kundenAdresse.split('\n').forEach(line => {
            page.drawText(line, { x: 50, y, size: 10, font });
            y -= 12;
        });
        y -= 30;

        // Items Table Header
        page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 25, color: rgb(0.9, 0.9, 0.95) });
        page.drawText('Pos', { x: 55, y, size: 10, font: fontBold });
        page.drawText('Beschreibung', { x: 85, y, size: 10, font: fontBold });
        page.drawText('Menge', { x: 350, y, size: 10, font: fontBold });
        page.drawText('Einzelpreis', { x: 400, y, size: 10, font: fontBold });
        page.drawText('Gesamt', { x: 480, y, size: 10, font: fontBold });
        y -= 30;

        // Items
        let zwischensumme = 0;
        data.positionen.forEach((pos, index) => {
            page.drawText(`${index + 1}`, { x: 55, y, size: 10, font });
            page.drawText(pos.beschreibung.substring(0, 45), { x: 85, y, size: 10, font });
            page.drawText(pos.menge.toString(), { x: 355, y, size: 10, font });
            page.drawText(`€${pos.einzelpreis.toFixed(2)}`, { x: 400, y, size: 10, font });
            const gesamt = pos.menge * pos.einzelpreis;
            page.drawText(`€${gesamt.toFixed(2)}`, { x: 480, y, size: 10, font });
            zwischensumme += gesamt;
            y -= 20;
        });

        // Totals
        y -= 20;
        page.drawLine({ start: { x: 350, y: y + 15 }, end: { x: 545, y: y + 15 }, thickness: 1 });
        page.drawText('Zwischensumme:', { x: 350, y, size: 10, font });
        page.drawText(`€${zwischensumme.toFixed(2)}`, { x: 480, y, size: 10, font });
        y -= 15;
        const mwst = zwischensumme * 0.19;
        page.drawText('MwSt. 19%:', { x: 350, y, size: 10, font });
        page.drawText(`€${mwst.toFixed(2)}`, { x: 480, y, size: 10, font });
        y -= 20;
        page.drawText('Gesamtsumme:', { x: 350, y, size: 12, font: fontBold });
        page.drawText(`€${(zwischensumme + mwst).toFixed(2)}`, { x: 480, y, size: 12, font: fontBold });

        // Terms
        y -= 50;
        page.drawText('Zahlungsbedingungen:', { x: 50, y, size: 10, font: fontBold });
        y -= 15;
        page.drawText(data.zahlungsbedingungen || '50% bei Auftragserteilung, 50% nach Fertigstellung', { x: 50, y, size: 10, font });
        y -= 25;
        page.drawText('Lieferbedingungen:', { x: 50, y, size: 10, font: fontBold });
        y -= 15;
        page.drawText(data.lieferbedingungen || 'Lieferung und Montage innerhalb von 4-6 Wochen nach Auftragseingang', { x: 50, y, size: 10, font });

        // Footer
        page.drawText(`${this.companyInfo.name} | ${this.companyInfo.address} | ${this.companyInfo.email}`, 
            { x: 50, y: 50, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
        page.drawText(`USt-IdNr.: ${this.companyInfo.ust_id} | ${this.companyInfo.handelsregister}`, 
            { x: 50, y: 38, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

        return pdfDoc.save();
    }

    /**
     * Generate Rechnung (Invoice)
     */
    async generateRechnung(data) {
        const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
        
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { height } = page.getSize();
        let y = height - 50;

        // Header
        page.drawText(this.companyInfo.name, { x: 50, y, size: 20, font: fontBold, color: rgb(0.2, 0.4, 0.8) });
        y -= 20;
        page.drawText(this.companyInfo.address, { x: 50, y, size: 10, font });
        y -= 40;

        // Invoice Title
        page.drawText('RECHNUNG', { x: 50, y, size: 24, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
        y -= 30;
        page.drawText(`Nr. ${data.rechnungNummer}`, { x: 50, y, size: 12, font });
        page.drawText(`Rechnungsdatum: ${data.datum}`, { x: 350, y, size: 10, font });
        y -= 15;
        page.drawText(`Fällig am: ${data.faelligAm}`, { x: 350, y, size: 10, font, color: rgb(0.8, 0.2, 0.2) });
        y -= 40;

        // Customer
        page.drawText('Rechnungsempfänger:', { x: 50, y, size: 10, font: fontBold });
        y -= 15;
        page.drawText(data.kundenName, { x: 50, y, size: 12, font });
        y -= 15;
        data.kundenAdresse.split('\n').forEach(line => {
            page.drawText(line, { x: 50, y, size: 10, font });
            y -= 12;
        });
        if (data.kundenUstId) {
            y -= 5;
            page.drawText(`USt-IdNr.: ${data.kundenUstId}`, { x: 50, y, size: 10, font });
        }
        y -= 35;

        // Items Table Header
        page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 25, color: rgb(0.95, 0.95, 0.95) });
        page.drawText('Pos', { x: 55, y, size: 10, font: fontBold });
        page.drawText('Beschreibung', { x: 85, y, size: 10, font: fontBold });
        page.drawText('Menge', { x: 350, y, size: 10, font: fontBold });
        page.drawText('Einzelpreis', { x: 400, y, size: 10, font: fontBold });
        page.drawText('Gesamt', { x: 480, y, size: 10, font: fontBold });
        y -= 30;

        // Items
        let netto = 0;
        data.positionen.forEach((pos, index) => {
            page.drawText(`${index + 1}`, { x: 55, y, size: 10, font });
            page.drawText(pos.beschreibung.substring(0, 45), { x: 85, y, size: 10, font });
            page.drawText(pos.menge.toString(), { x: 355, y, size: 10, font });
            page.drawText(`€${pos.einzelpreis.toFixed(2)}`, { x: 400, y, size: 10, font });
            const gesamt = pos.menge * pos.einzelpreis;
            page.drawText(`€${gesamt.toFixed(2)}`, { x: 480, y, size: 10, font });
            netto += gesamt;
            y -= 20;
        });

        // Totals
        y -= 20;
        page.drawLine({ start: { x: 350, y: y + 15 }, end: { x: 545, y: y + 15 }, thickness: 1 });
        page.drawText('Nettobetrag:', { x: 350, y, size: 10, font });
        page.drawText(`€${netto.toFixed(2)}`, { x: 480, y, size: 10, font });
        y -= 15;
        const mwst = netto * 0.19;
        page.drawText('MwSt. 19%:', { x: 350, y, size: 10, font });
        page.drawText(`€${mwst.toFixed(2)}`, { x: 480, y, size: 10, font });
        y -= 5;
        page.drawLine({ start: { x: 350, y: y + 5 }, end: { x: 545, y: y + 5 }, thickness: 2 });
        y -= 15;
        page.drawText('Rechnungsbetrag:', { x: 350, y, size: 12, font: fontBold });
        page.drawText(`€${(netto + mwst).toFixed(2)}`, { x: 480, y, size: 12, font: fontBold });

        // Bank Details
        y -= 50;
        page.drawRectangle({ x: 50, y: y - 60, width: 250, height: 80, color: rgb(0.95, 0.98, 1) });
        y -= 10;
        page.drawText('Bankverbindung:', { x: 60, y, size: 10, font: fontBold });
        y -= 15;
        page.drawText(`Bank: ${this.companyInfo.bank}`, { x: 60, y, size: 10, font });
        y -= 12;
        page.drawText(`IBAN: ${this.companyInfo.iban}`, { x: 60, y, size: 10, font });
        y -= 12;
        page.drawText(`BIC: ${this.companyInfo.bic}`, { x: 60, y, size: 10, font });
        y -= 12;
        page.drawText(`Verwendungszweck: ${data.rechnungNummer}`, { x: 60, y, size: 10, font: fontBold });

        // Footer
        page.drawText(`${this.companyInfo.name} | Geschäftsführer: ${this.companyInfo.geschaeftsfuehrer}`, 
            { x: 50, y: 50, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
        page.drawText(`USt-IdNr.: ${this.companyInfo.ust_id} | ${this.companyInfo.handelsregister}`, 
            { x: 50, y: 38, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

        return pdfDoc.save();
    }
}

// ═══════════════════════════════════════════════════════════════
// E-SIGNATURE INTEGRATION
// ═══════════════════════════════════════════════════════════════

const ESignatureService = {

    docusign: {
        baseUrl: 'https://demo.docusign.net/restapi',
        
        async createEnvelope(documentData, signerEmail, signerName) {
            const accessToken = await this.getAccessToken();
            
            const envelope = {
                emailSubject: `Bitte unterschreiben: ${documentData.name}`,
                documents: [{
                    documentBase64: documentData.base64,
                    name: documentData.fileName,
                    fileExtension: 'pdf',
                    documentId: '1'
                }],
                recipients: {
                    signers: [{
                        email: signerEmail,
                        name: signerName,
                        recipientId: '1',
                        tabs: {
                            signHereTabs: [{
                                documentId: '1',
                                pageNumber: '1',
                                xPosition: '100',
                                yPosition: '700'
                            }],
                            dateSignedTabs: [{
                                documentId: '1',
                                pageNumber: '1',
                                xPosition: '300',
                                yPosition: '700'
                            }]
                        }
                    }]
                },
                status: 'sent'
            };

            const response = await fetch(`${this.baseUrl}/v2.1/accounts/${process.env.DOCUSIGN_ACCOUNT_ID}/envelopes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(envelope)
            });

            return response.json();
        },

        async getAccessToken() {
            // OAuth flow for DocuSign
            return process.env.DOCUSIGN_ACCESS_TOKEN;
        }
    },

    // Simple internal signature (for less formal documents)
    internal: {
        async createSignatureRequest(documentId, signerEmail, signerName) {
            // Generate unique signature token
            const signatureToken = Buffer.from(`${documentId}:${signerEmail}:${Date.now()}`).toString('base64');
            
            // Store in database
            const request = {
                id: `sig_${Date.now()}`,
                documentId,
                signerEmail,
                signerName,
                token: signatureToken,
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            };

            // Send email
            await this.sendSignatureEmail(request);

            return request;
        },

        async sendSignatureEmail(request) {
            const signUrl = `https://west-money-bau.de/sign/${request.token}`;
            
            // Integration with email service
            // await EmailService.send(...)
        },

        async verifyAndSign(token, signatureData) {
            // Verify token
            // Add signature to document
            // Update status
            // Return signed document
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// DOCUMENT STORAGE & MANAGEMENT
// ═══════════════════════════════════════════════════════════════

class DocumentManager {
    constructor() {
        this.storageProvider = 'local'; // or 's3', 'gcs', 'azure'
    }

    async saveDocument(documentBuffer, metadata) {
        const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileName = `${metadata.type}_${documentId}.${metadata.format}`;
        
        // Save file
        if (this.storageProvider === 's3') {
            await this.saveToS3(fileName, documentBuffer);
        } else {
            await this.saveToLocal(fileName, documentBuffer);
        }

        // Store metadata in database
        const document = {
            id: documentId,
            fileName,
            type: metadata.type,
            format: metadata.format,
            relatedTo: metadata.relatedTo, // customer, project, etc.
            relatedId: metadata.relatedId,
            createdAt: new Date(),
            createdBy: metadata.createdBy,
            size: documentBuffer.length,
            status: 'active'
        };

        // Save to database
        // await db.documents.insert(document);

        return document;
    }

    async getDocument(documentId) {
        // Fetch from database and storage
    }

    async listDocuments(filter) {
        // List documents with filtering
    }

    async deleteDocument(documentId) {
        // Soft delete
    }

    async saveToS3(fileName, buffer) {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();
        
        await s3.putObject({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `documents/${fileName}`,
            Body: buffer,
            ContentType: 'application/pdf'
        }).promise();
    }

    async saveToLocal(fileName, buffer) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const dir = path.join(__dirname, '../storage/documents');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, fileName), buffer);
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = {
    DocumentTemplates,
    PDFGenerator,
    ESignatureService,
    DocumentManager
};
