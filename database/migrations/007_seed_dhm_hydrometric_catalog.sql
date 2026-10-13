-- Verified DHM station catalogue subset.
-- Source: DHM Updated Location and Catchment Area of Hydrological Stations
-- (updated 16 May 2024) and DHM Real Time Stream listing.
-- Warning/danger levels are intentionally NULL because they are not published
-- by the catalogue source; operational thresholds must be onboarded separately.

INSERT INTO hydrometric_stations
    (station_number, name, river, basin, district, elevation_m, location, source_key, active, metadata)
VALUES
    (604.5, 'Arun at Turkeghat', 'Arun River', 'Koshi', 'Sankhuwasabha', 352,
        ST_SetSRID(ST_Point(87.189302, 27.311940), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":27124.20,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (291, 'Babai at Bhada Bridge', 'Babai River', 'Karnali', 'Bardiya', 142,
        ST_SetSRID(ST_Point(81.365430, 28.189180), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":3430.55,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (289.95, 'Babai at Chepang', 'Babai River', 'Karnali', 'Bardiya', 325,
        ST_SetSRID(ST_Point(81.713740, 28.356740), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":2603.08,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (550.05, 'Bagmati River at Khokana', 'Bagmati River', 'Bagmati', 'Lalitpur', 1255,
        ST_SetSRID(ST_Point(85.293030, 27.632030), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":606.06,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (505, 'Bagmati River at Sundarijal', 'Bagmati River', 'Bagmati', 'Kathmandu', 1600,
        ST_SetSRID(ST_Point(85.423000, 27.780000), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":14.44,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (620, 'Balefi at Jalbire', 'Balefi Khola', 'Koshi', 'Sindhupalchok', 1289,
        ST_SetSRID(ST_Point(85.766255, 27.804756), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":618.44,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (537.5, 'Balkhu Khola at Balambu', 'Balkhu Khola', 'Bagmati', 'Kathmandu', 1340,
        ST_SetSRID(ST_Point(85.250730, 27.692285), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":38.68,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (600.5, 'Barun River at Syaksila', 'Barun River', 'Koshi', 'Sankhuwasabha', NULL,
        ST_SetSRID(ST_Point(87.363245, 27.693564), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":472.87,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb),
    (269.5, 'Bheri at Samaijighat', 'Bheri River', 'Karnali', 'Surkhet', 500,
        ST_SetSRID(ST_Point(81.666490, 28.516930), 4326), 'dhm-hydrology', TRUE,
        '{"drainage_area_km2":12656.68,"catalog_updated":"2024-05-16","realtime_index":true}'::jsonb)
ON CONFLICT (station_number) DO UPDATE SET
    name = EXCLUDED.name,
    river = EXCLUDED.river,
    basin = EXCLUDED.basin,
    district = EXCLUDED.district,
    elevation_m = EXCLUDED.elevation_m,
    location = EXCLUDED.location,
    source_key = EXCLUDED.source_key,
    active = EXCLUDED.active,
    metadata = EXCLUDED.metadata,
    updated_at = CURRENT_TIMESTAMP;
