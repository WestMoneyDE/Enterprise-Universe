-- =============================================================================
-- NEXUS COMMAND CENTER - PostgreSQL Initialization
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application schemas
CREATE SCHEMA IF NOT EXISTS nexus;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA nexus TO nexus;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA nexus TO nexus;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA nexus TO nexus;

-- Set default search path
ALTER DATABASE nexus SET search_path TO nexus, public;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'NEXUS database initialized successfully at %', NOW();
END $$;
