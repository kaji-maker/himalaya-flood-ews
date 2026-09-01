-- 001_enable_postgis.sql
-- Initialize PostGIS spatial extension and UUID generation

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log PostGIS version
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Extension Initialized: %', (SELECT PostGIS_Version());
END $$;
