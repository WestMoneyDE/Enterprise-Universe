-- =============================================================================
-- Deal Contacts Migration
-- Speichert korrekte E-Mail-Adressen für HubSpot-Deals
-- =============================================================================

-- Tabelle für Deal-Kontakt-Verknüpfungen
CREATE TABLE IF NOT EXISTS deal_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- HubSpot Deal Reference
    hubspot_deal_id VARCHAR(50) NOT NULL,
    deal_name VARCHAR(255),
    deal_value NUMERIC(15,2),

    -- Kontakt-Informationen
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_company VARCHAR(255),

    -- Status & Tracking
    email_verified BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_sent_count INTEGER DEFAULT 0,
    last_send_status VARCHAR(50), -- 'sent', 'failed', 'bounced'
    last_send_error TEXT,

    -- Quelle der E-Mail
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'import', 'hubspot_override'
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_deal_email UNIQUE (hubspot_deal_id, contact_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_contacts_hubspot_id ON deal_contacts(hubspot_deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_email ON deal_contacts(contact_email);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_status ON deal_contacts(last_send_status);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_created ON deal_contacts(created_at DESC);

-- Update Trigger
CREATE OR REPLACE FUNCTION update_deal_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deal_contacts_updated_at
    BEFORE UPDATE ON deal_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_contacts_updated_at();

-- Kommentar für Dokumentation
COMMENT ON TABLE deal_contacts IS 'Speichert verifizierte E-Mail-Adressen für HubSpot Deals, um Spam-Kontakte zu umgehen';
COMMENT ON COLUMN deal_contacts.hubspot_deal_id IS 'HubSpot Deal ID';
COMMENT ON COLUMN deal_contacts.source IS 'Quelle: manual=manuell eingegeben, import=CSV Import, hubspot_override=HubSpot überschrieben';
