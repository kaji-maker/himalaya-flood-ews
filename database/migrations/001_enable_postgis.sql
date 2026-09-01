-- 001_enable_postgis.sql
-- Enable PostGIS spatial extensions and UUID generation

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS Version
SELECT PostGIS_Full_Version();
