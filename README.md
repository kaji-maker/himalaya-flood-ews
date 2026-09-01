# Himalaya Flood & GLOF Early Warning System (`himalaya-flood-ews`)

[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-blue.svg)](https://postgis.net/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org/)

A distributed, near-real-time geospatial monitoring and early warning system for Himalayan Glacial Lake Outburst Floods (GLOFs) and extreme monsoon flash floods across the Koshi, Gandaki, and Karnali river basins.

---

## 🏔️ Architecture Overview

```
himalaya-flood-ews/
├── .antigravity/                 # AI Agent constraints & automated workflows
├── database/                     # PostGIS spatial migrations & ICIMOD PDGL seeds
├── workers/                      # Python Sentinel-2 MNDWI & GPM IMERG processing engine
├── server/                       # Node.js/TypeScript REST API & GLOF alert dispatcher
└── client/                       # Next.js 14 Geospatial 3D Terrain Dashboard
```

1. **Ingestion & Optical Extractions (`workers/`)**:
   - Automated STAC client for **Copernicus Sentinel-2 L2A** multispectral imagery.
   - **MNDWI (Modified Normalized Difference Water Index)** extraction: $\frac{\text{Green (B03)} - \text{SWIR1 (B11)}}{\text{Green (B03)} + \text{SWIR1 (B11)}}$.
   - SCL cloud/shadow filtering and NDSI snow-water disambiguation.
   - Vectorization to metric UTM CRS for polygon surface area dynamics ($\Delta A / \Delta t$).

2. **Meteorological Correlation**:
   - **NASA GPM IMERG** 30-min precipitation feeds and 72h antecedent rainfall anomaly tracking.

3. **Multi-Factor GLOF Risk Scoring Model**:
   $$R = 0.35 \cdot S_{\text{expansion}} + 0.30 \cdot S_{\text{rain72h}} + 0.20 \cdot S_{\text{freeboard}} + 0.15 \cdot S_{\text{vulnerability}}$$

4. **Spatial Database & Dispatch API (`database/` & `server/`)**:
   - PostgreSQL 16 + PostGIS 3.4 for 2D/3D spatial indexing and GeoJSON streaming.
   - Alert lifecycle engine: `CRITICAL`, `WARNING`, `WATCH`, `ADVISORY`.

5. **3D Geospatial Dashboard (`client/`)**:
   - 3D terrain elevation relief, MNDWI water contours, GPM precipitation heatmaps, and sub-basin drill-downs (Koshi, Gandaki, Karnali).

---

## 🚀 Quickstart

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ & Python 3.10+ (for local bare-metal dev)

### 1. Launch Dev Stack via Docker Compose
```bash
make dev
```
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Server & Healthcheck**: [http://localhost:4000/health](http://localhost:4000/health)
- **PostGIS Spatial DB**: `localhost:5432` (`ews_admin` / `ews_secure_password`)

### 2. Manual Setup & Testing
```bash
# Apply spatial migrations and seed ICIMOD sample data
make db-migrate
make db-seed

# Run worker and server test suites
make test
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/basins` | List river basins with GeoJSON boundaries |
| `GET` | `/api/v1/lakes` | Glacial lake inventory with risk filtering |
| `GET` | `/api/v1/lakes/:id/observations` | Multi-temporal surface area time series |
| `GET` | `/api/v1/alerts` | Active & historical GLOF warnings |
| `POST` | `/api/v1/alerts/evaluate` | Ingest Python worker risk evaluation |
| `PATCH` | `/api/v1/alerts/:id/acknowledge`| Acknowledge active warning |
| `GET` | `/api/v1/telemetry/precipitation`| GPM IMERG 72h precipitation records |
