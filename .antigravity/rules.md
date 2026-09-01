# HimalayaFlood-EWS: Agent Engineering Guidelines

## Core Principles
1. **Coordinate Systems & Projections:** 
   - All GeoJSON and API payloads MUST use **WGS 84 (EPSG:4326)**.
   - All geometric area ($m^2$, $km^2$) and distance calculations in Python or PostGIS MUST be reprojected to **UTM Zone 45N (EPSG:32645)** for accurate Himalayan planar measurements.
2. **Data Integrity:** 
   - Never mutate raw satellite scenes directly in memory; use streaming windows via Rasterio / GDAL or Cloud-Optimized GeoTIFFs (COGs).
3. **Database Rules:** 
   - All spatial tables MUST maintain GIST indexes on geometry columns (`ST_SetSRID(geom, 4326)`).
   - Geometry validity must be enforced (`ST_IsValid` / `ST_MakeValid`).

## Subsystem Responsibilities
- `database/`: Pure SQL and migration files. Do not mix application logic here.
- `workers/`: Python 3.11+. Use typed hints (`pydantic`, `numpy`, `rasterio`, `geopandas`, `shapely`). Must contain unit tests with mock raster chips.
- `server/`: Express / Fastify TypeScript API (`strict: true`). Expose OpenAPI specs (`/api/v1/openapi.json`).
- `client/`: Next.js 14+ (App Router), MapLibre GL, Deck.gl, TailwindCSS.

## Remote Sensing & Indices
- **MNDWI (Modified Normalized Difference Water Index)**:
  $$\text{MNDWI} = \frac{\text{Green (B03)} - \text{SWIR1 (B11)}}{\text{Green (B03)} + \text{SWIR1 (B11)}}$$
- **Cloud & Shadow Masking**: SCL classes (3=Shadows, 8=Cloud Medium, 9=Cloud High, 10=Cirrus) must be excluded.
- **GLOF Risk Composite Formula**:
  $$R = 0.35 \cdot S_{\text{expansion}} + 0.30 \cdot S_{\text{rain72h}} + 0.20 \cdot S_{\text{freeboard\_moraine}} + 0.15 \cdot S_{\text{vulnerability}}$$
