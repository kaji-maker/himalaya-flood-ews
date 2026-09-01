# Himalaya Flood & GLOF Early Warning System - Agent Rules

## 1. Geospatial & Coordinate Systems (CRS)
- **Standard Exchange CRS**: Always use **WGS 84 (EPSG:4326)** for GeoJSON payloads, API responses, and database ingestion.
- **Planar / Measurement CRS**: For precise surface area (m², km²), expansion rate, distance, and slope calculations in the Nepal/HKH region, reproject to **UTM Zone 45N (EPSG:32645)** or **UTM Zone 44N (EPSG:32644)**.
- **Geometry Validity**: All lake and basin polygons must pass `ST_IsValid` in PostGIS and `geom.is_valid` in Shapely. Apply `ST_MakeValid` / `make_valid` on all vectorization outputs.

## 2. Remote Sensing & Extraction Standards
- **Optical Indices**:
  - **MNDWI (Modified Normalized Difference Water Index)**:
    $$\text{MNDWI} = \frac{\text{Green (B03)} - \text{SWIR1 (B11)}}{\text{Green (B03)} + \text{SWIR1 (B11)}}$$
  - Default water threshold: $\text{MNDWI} > 0.0$ (fine-tuned via Otsu / adaptive histogram clipping).
- **Cloud & Shadow Masking**:
  - Use Sentinel-2 SCL (Scene Classification Layer) or cloud probability bands.
  - Exclude high probability clouds (SCL 9), cirrus (SCL 10), and cloud shadows (SCL 3).
  - Explicitly differentiate clean glacial ice/snow (high NIR) from supraglacial/proglacial water bodies (low NIR/SWIR).

## 3. GLOF Risk Formulation
- Multi-factor risk composite $R \in [0.0, 1.0]$:
  - $w_1 \cdot \text{ExpansionRateScore} + w_2 \cdot \text{RainfallAnomalyScore} + w_3 \cdot \text{MoraineFreeboardScore} + w_4 \cdot \text{VulnerabilityScore}$
  - Default weights: $[0.35, 0.30, 0.20, 0.15]$.
- Alert levels:
  - **CRITICAL** ($R \ge 0.85$ or Sudden Moraine Collapse/Overtopping)
  - **WARNING** ($0.70 \le R < 0.85$)
  - **WATCH** ($0.50 \le R < 0.70$)
  - **ADVISORY** ($0.30 \le R < 0.50$)
  - **NORMAL** ($R < 0.30$)

## 4. Code & Architecture Best Practices
- **Strict Typing**: TypeScript `strict: true` for server/client, Python type hints (`mypy` compliant) with Pydantic v2 schemas.
- **Fail-Safe Processing**: Ingestion and vectorizer pipelines must be idempotent and log telemetry on cloudy/missing satellite passes.
