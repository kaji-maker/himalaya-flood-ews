# 🏔️ Himalaya Flood & GLOF Early Warning System (`himalaya-flood-ews`)

[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-blue.svg)](https://postgis.net/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A distributed, near-real-time geospatial intelligence and early warning platform engineered for monitoring Himalayan **Glacial Lake Outburst Floods (GLOFs)**, cryospheric destabilization, and extreme monsoon flash floods across the **Koshi, Gandaki, Karnali, Mahakali**, and transboundary Himalayan river basins.

---

## 📑 Table of Contents

- [Mission & Scope](#-mission--scope)
- [System Architecture](#-system-architecture)
- [Key Features & Capabilities](#-key-features--capabilities)
  - [1. 20-Year Retrospective Multi-Temporal Calving Analysis (2004–2026)](#1-20-year-retrospective-multi-temporal-calving-analysis-20042026)
  - [2. Landmark GLOF & Flash Flood Forensic Archive (1981–2026)](#2-landmark-glof--flash-flood-forensic-archive-19812026)
  - [3. Autonomous High-Resolution Satellite Tasking (SkySat & InSAR)](#3-autonomous-high-resolution-satellite-tasking-skysat--insar)
  - [4. Cascade Defense & Automated Hydropower Dam SCADA](#4-cascade-defense--automated-hydropower-dam-scada)
  - [5. Real-Time Telemetry, Inundation Swaths & Evacuation Havens](#5-real-time-telemetry-inundation-swaths--evacuation-havens)
  - [6. Multi-Channel Emergency Dispatch Engine](#6-multi-channel-emergency-dispatch-engine)
- [Scientific Formulations & Data Processing](#-scientific-formulations--data-processing)
- [Monitored Glacial Lakes Inventory](#-monitored-glacial-lakes-inventory)
- [Repository Structure](#-repository-structure)
- [Installation & Quickstart](#-installation--quickstart)
- [REST API Specification](#-rest-api-specification)
- [Testing & Quality Verification](#-testing--quality-verification)
- [License & Attribution](#-license--attribution)

---

## 🎯 Mission & Scope

The Hindu Kush Himalaya (HKH) region is the "Third Pole" of the Earth, containing the largest reserve of frozen water outside the polar regions. Rapid cryospheric melting driven by climate change has created thousands of moraine-dammed proglacial lakes at altitudes exceeding 4,000 meters. 

Many of these lakes are perched precariously above populated valleys, international trade corridors, and multi-gigawatt hydropower cascades. A catastrophic breach—whether triggered by an ice avalanche, rock-ice detachment, seismic tremor, or intense monsoon cloudburst—can release tens of millions of cubic meters of water, slurry, and boulders in minutes.

`himalaya-flood-ews` bridges the gap between raw Earth Observation (EO) satellite telemetry and life-saving downstream civil protection by:
1. Monitoring glacier terminus retreat, subaqueous thermo-erosion, and surface area growth.
2. Ingesting radar interferometry (InSAR) to detect moraine dam crest subsidence and internal shear creep.
3. Automatically tasking sub-meter optical constellations (SkySat / WorldView-3) upon threshold trigger.
4. Sending automated pre-surge drawdown commands to radial spillway gates of downstream hydroelectric dams.
5. Broadcasting multi-channel alerts (SMS, 120 dB acoustic sirens, Telegram, NEOC webhooks) with minute-by-minute surge arrival countdowns.

---

## 🏛️ System Architecture

```
                               ┌──────────────────────────────────────────────────────────┐
                               │               EARTH OBSERVATION SOURCES                  │
                               │  Copernicus Sentinel-2 • Landsat 7/8/9 • NASA GPM IMERG   │
                               │   Sentinel-1 InSAR SBAS • USGS ShakeMap • Planet SkySat  │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                                                            ▼
                               ┌──────────────────────────────────────────────────────────┐
                               │            PYTHON INGESTION & PROCESSING ENGINE          │
                               │                      (`workers/`)                        │
                               │  • STAC Optical Pipeline (MNDWI / SCL / NDSI Masking)     │
                               │  • GPM 30-min Antecedent Rain Accumulation Tracker       │
                               │  • InSAR Moraine Creep & Crest Subsidence Ingestion      │
                               │  • Automated Multi-Factor GLOF Hazard Scoring (H)        │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                                                            ▼
                               ┌──────────────────────────────────────────────────────────┐
                               │           POSTGIS GEODATABASE & DISPATCH ENGINE          │
                               │                    (`database/` & `server/`)             │
                               │  • PostgreSQL 16 + PostGIS 3.4 Spatial Indexing          │
                               │  • Hydrodynamic Flood Routing (1D Saint-Venant / HEC-RAS) │
                               │  • Multi-Channel Dispatch (SMS, CDMC Sirens, NEOC API)   │
                               │  • Dam SCADA Siphon & Radial Spillway Gate Webhooks      │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                                                            ▼
                               ┌──────────────────────────────────────────────────────────┐
                               │             NEXT.JS 14 GIS COMMAND CONSOLE               │
                               │                       (`client/`)                        │
                               │  • 3D Glacier & Lake Telemetry Grid (14 Critical Lakes)   │
                               │  • 20-Year Calving Retrospective (2004–2026 Chips)       │
                               │  • Interactive Swipe Curtain & 0–100% Opacity Slider     │
                               │  • Forensic Breach Archive & Hydrograph Attenuation     │
                               │  • Submeter Cue-and-Slew Tasking & InSAR Vector Console  │
                               └──────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Features & Capabilities

### 1. 20-Year Retrospective Multi-Temporal Calving Analysis (2004–2026)
- **161 Calibrated Image Chips**: Multi-temporal high-resolution satellite imagery across 23 consecutive years (2004–2026) for 7 key Himalayan glacial lakes.
- **Genuine Copernicus Sentinel-2 MSI Captures**: Direct integration of cloud-free Copernicus Sentinel-2 multispectral imagery from 2018 through 2025.
- **Sensor-Modeled Historical Landsat Telemetry**:
  - **Landsat 7 ETM+ (2004–2012)**: Downsampled 30m spatial GSD with sensor MTF response, atmospheric Rayleigh scatter modeling, and distinct radiometric curves.
  - **Landsat 8 OLI (2013–2015)**: 15m pan-sharpened resolution and high-altitude cirque contrast.
  - **Annual Snowline Climate Anomalies**: Modeled historical meteorological snowpack accumulation and melt variations.
  - **South Lhonak Disaster Modeling**: Intact proglacial lake from 2004–2022; October 4, 2023 breach canyon scarp; and 2024–2026 drained residual bed.
- **Interactive Dual-Mode GIS Viewer**:
  - **High-Res Ortho vs Raw Space Feeds**: Toggle between calibrated orthomosaics and live Copernicus Sentinel-2 WMS / Esri World Imagery feeds.
  - **Swipe Curtain (Split Screen)**: Interactive dragger to peel between the 2004 baseline and the current calving front.
  - **Vector Overlay Opacity Slider (0% - 100%)**: Dial vector graphics to 0% for an unobstructed view of raw satellite photography.
  - **Physically Aligned Geo-Anchors**: Precision crosshairs anchored directly to each lake's moraine outlet dam or breach scarp.
  - **GIS Zoom & Pan**: 1x to 4x zoom with smooth drag-to-pan across all viewports.

### 2. Landmark GLOF & Flash Flood Forensic Archive (1981–2026)
Catalog of **11 landmark Himalayan cryospheric catastrophes** validated against ICIMOD and Nepal Department of Hydrology and Meteorology (DHM) records:
- **August 26, 2026**: Bhotekoshi–Trishuli Glacial Collapse & Debris Surge (8,800 m³/s, 25.0M m³ release, Pasang Lhamu Highway severed, 1,290 casualties).
- **2024**: Birendra Lake Avalanche Displacement Surge (850 m³/s, Samagaon wooden bridge destroyed).
- **2023**: South Lhonak Lake GLOF & Chungthang Teesta III Dam Obliteration (15,000 m³/s, 14 bridges destroyed, 102 casualties).
- **2021**: Melamchi Debris Torrent (3,200 m³/s, Kathmandu water intake buried, 25 casualties).
- **2021**: Chamoli Rock-Ice Detachment & Rishiganga Surge (8,200 m³/s, Tapovan Vishnugad dam washed away, 204 casualties).
- **2013**: Chorabari Lake Kedarnath GLOF (6,000 m³/s, 5,700 casualties).
- **2012**: Seti River Catastrophic Surge (4,500 m³/s, Kharapani washed away, 72 casualties).
- **1998**: Tam Pokhari (Sabai Tsho) GLOF (10,000 m³/s, 6 suspension bridges destroyed).
- **1994**: Lugge Tsho GLOF (2,500 m³/s, Punakha Dzong flooded, 21 casualties).
- **1985**: Dig Tsho GLOF (1,600 m³/s, Namche Small Hydro destroyed).
- **1981**: Cirenmaco / Zhangzangbo Transboundary GLOF (16,000 m³/s, Friendship Bridge & Arniko Highway destroyed, 73 casualties).

*Each historical entry includes an interactive **Forensic Dossier** featuring breach hydrographs, downstream runout distances, and geotechnical failure mechanics.*

### 3. Autonomous High-Resolution Satellite Tasking (SkySat & InSAR)
- **Cue-and-Slew Protocol**: Automated Planet SkySat (0.50m pan-sharpened) and WorldView-3 tasking order generation when optical MNDWI expansion or GPM rainfall crosses critical thresholds.
- **InSAR SBAS Moraine Creep**: Ingestion of Sentinel-1 / NISAR interferometric coherence loss and line-of-sight (LOS) displacement rates (mm/yr) to track moraine dam integrity.
- **Orbital Pass Prediction**: Computes next pass window, sun elevation angle, mountain shadow percentage, and off-nadir angle (≤ 30°).

### 4. Cascade Defense & Automated Hydropower Dam SCADA
Integrates telemetry and automated drawdown commands for 6 critical Himalayan hydroelectric projects:
- **Upper Tama Koshi** (456 MW) — Rolwaling / Tama Koshi River
- **Upper Trishuli-1** (216 MW) — Trishuli River
- **Middle Bhotekoshi** (102 MW) — Bhote Koshi River
- **Arun III** (900 MW) — Arun River
- **Kali Gandaki A** (144 MW) — Gandaki River
- **Tapovan Vishnugad** (520 MW) — Dhauliganga River, Uttarakhand

*During an active warning, the platform calculates surge arrival time and transmits emergency webhook / Modbus TCP radial gate opening instructions to draw down headpond levels and prevent dam overtopping.*

### 5. Real-Time Telemetry, Inundation Swaths & Evacuation Havens
- **Hydrological Gauging**: Real-time river stage radar and geophone velocity telemetry.
- **GLOF Inundation Swath Modeling**: 2D flood propagation vectors with estimated flood wave arrival times ($T_0, T_{+30m}, T_{+60m}, T_{+120m}$).
- **Vertical Safe Havens (+35m)**: Designated high-ground muster areas, mountain scramble trails, and clearance time windows for vulnerable downstream villages.

### 6. Multi-Channel Emergency Dispatch Engine
- **Acoustic Warning Sirens**: Activates 120 dB solar-powered sirens in mountain villages (Na, Bedding, Liping, Tatopani, Barhabise, Samagaon, Chungthang).
- **SMS Gateways**: Automated emergency SMS dispatch to local Community Disaster Management Committees (CDMC).
- **NEOC Integration**: Encrypted Webhook & Telegram emergency feeds to the National Emergency Operations Center (NEOC Nepal).

---

## 🔬 Scientific Formulations & Data Processing

### 1. Modified Normalized Difference Water Index (MNDWI)
Water extraction uses Green (Band 3) and Short-Wave Infrared 1 (Band 11) to eliminate false positives from mountain shadow and snow:
$$\text{MNDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{SWIR1}}}{\rho_{\text{Green}} + \rho_{\text{SWIR1}}}$$

Pixels are classified as open water where $\text{MNDWI} > 0.15$ and validated against Sentinel-2 Scene Classification (SCL):
$$\text{Mask}_{\text{valid}} = (\text{SCL} \notin \{3, 8, 9, 10\}) \land (\text{NDSI} < 0.40 \lor \text{MNDWI} > 0.25)$$

### 2. Multi-Factor GLOF Risk Scoring Model ($H$)
The combined hazard index ($H \in [0, 1]$) is computed dynamically:
$$H = 0.35 \cdot S_{\text{expansion}} + 0.30 \cdot S_{\text{rain72h}} + 0.20 \cdot S_{\text{freeboard}} + 0.15 \cdot S_{\text{vulnerability}}$$

| Threshold | Alert Level | Action Protocol |
|---|---|---|
| $H \ge 0.75$ | **`EMERGENCY`** | Immediate 120 dB siren trigger, NEOC SMS broadcast, Dam radial gates full open |
| $0.55 \le H < 0.75$ | **`WARNING`** | Automated SkySat tasking, CDMC alert, SCADA headpond pre-release |
| $0.35 \le H < 0.55$ | **`WATCH`** | 12-hour InSAR coherence check, DHM station alert |
| $H < 0.35$ | **`ADVISORY`** | Normal optical monitoring cycle |

---

## 🗺️ Monitored Glacial Lakes Inventory

| ICIMOD Code | Glacial Lake Name | Basin / Corridor | Elevation | Area (2026) | Hazard Level |
|---|---|---|---|---|---|
| `PDGL_NEP_KOSHI_007` | **Galong Co / Cirenmaco** | Bhote Koshi / Poiqu (Tibet–Nepal) | 4,380 m | 1.640 km² | **CRITICAL ($H=0.84$)** |
| `PDGL_NEP_KOSHI_001` | **Tsho Rolpa** | Tama Koshi (Rolwaling) | 4,580 m | 1.820 km² | **CRITICAL ($H=0.72$)** |
| `PDGL_NEP_KOSHI_002` | **Imja Tsho** | Dudh Koshi (Everest) | 5,010 m | 1.480 km² | **WATCH ($H=0.48$)** |
| `PDGL_NEP_KOSHI_003` | **Lower Barun** | Barun / Arun | 4,550 m | 2.180 km² | **WARNING ($H=0.68$)** |
| `PDGL_NEP_GANDAKI_002` | **Birendra Lake** | Budhi Gandaki (Manaslu) | 3,620 m | 0.340 km² | **WARNING ($H=0.62$)** |
| `PDGL_NEP_GANDAKI_001` | **Thulagi Lake** | Marsyangdi (Manaslu) | 4,050 m | 0.940 km² | **WATCH ($H=0.51$)** |
| `PDGL_IND_SIKKIM_001` | **South Lhonak** | Teesta Basin (North Sikkim) | 5,200 m | 0.840 km² | **POST-BREACH STABILIZING** |
| `PDGL_NEP_KOSHI_004` | **Lumding Tsho** | Dudh Koshi Basin | 4,870 m | 0.510 km² | **WATCH ($H=0.44$)** |
| `PDGL_NEP_KOSHI_005` | **West Chamlang Tsho** | Hongu / Dudh Koshi | 5,240 m | 0.420 km² | **WATCH ($H=0.41$)** |
| `PDGL_NEP_KOSHI_006` | **East Chamlang Tsho** | Hongu / Dudh Koshi | 5,180 m | 0.390 km² | **ADVISORY ($H=0.32$)** |
| `PDGL_NEP_GANDAKI_003` | **North Ngojumba Tsho** | Gokyo / Dudh Koshi | 4,990 m | 0.620 km² | **ADVISORY ($H=0.29$)** |
| `PDGL_NEP_KARNALI_001` | **Kajin Sara Lake** | Marsyangdi / Manang | 5,020 m | 0.180 km² | **ADVISORY ($H=0.22$)** |
| `PDGL_NEP_KARNALI_002` | **Phoksundo Glacial Margin** | Bheri / Karnali | 3,611 m | 4.980 km² | **ADVISORY ($H=0.18$)** |
| `PDGL_NEP_MAHAKALI_001`| **Api Nampa Proglacial Lake**| Mahakali Basin | 4,250 m | 0.310 km² | **WATCH ($H=0.45$)** |

---

## 📁 Repository Structure

```
himalaya-flood-ews/
├── database/                     # PostGIS spatial schemas, migrations, and seeds
│   ├── migrations/               # PostgreSQL DDL for basins, lakes, sensors, alerts
│   └── seeds/                    # ICIMOD PDGL inventory & historical breach catalogs
├── server/                       # Node.js Express & TypeScript REST API
│   ├── src/
│   │   ├── routes/               # Express endpoints (basins, lakes, alerts, dams, tasking)
│   │   ├── services/             # GLOF dispatch, SCADA gateway, InSAR ingestion
│   │   └── models/               # TypeScript interfaces & Knex database queries
│   └── tests/                    # 41 unit & integration tests across 6 test suites
├── client/                       # Next.js 14 App Router GIS frontend
│   ├── public/
│   │   └── imagery/
│   │       └── timelapse/        # 161 multi-temporal satellite orthomosaic chips (2004-2026)
│   └── src/
│       ├── app/                  # Main dashboard page and layout
│       └── components/
│           ├── drawer/           # LakeDetailDrawer inspection sidebar
│           ├── historical/       # Historical GLOF panel & ForensicBreachModal
│           ├── satellite/        # LakeComparisonModal & CueSlewTaskingConsole
│           └── scada/            # CascadeDefensePanel & Dam radial gate controls
├── workers/                      # Python satellite ingestion & hydrological pipeline
│   ├── stac_ingest.py            # Copernicus Sentinel-2 STAC optical fetcher
│   ├── mndwi_extractor.py        # Water index extraction and cloud masking
│   └── gpm_processor.py          # NASA GPM IMERG 72h precipitation aggregator
├── docker-compose.yml            # Multi-container orchestration (DB, server, client, worker)
├── Makefile                      # Automated build, migration, test, and run targets
└── README.md                     # Comprehensive platform documentation
```

---

## 🚀 Installation & Quickstart

### Option A: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/kaji-maker/himalaya-flood-ews.git
cd himalaya-flood-ews

# Launch all microservices (PostGIS, Node.js API, Next.js Dashboard, Python Workers)
make dev
```

- **Next.js Web Command Center**: [http://localhost:3000](http://localhost:3000)
- **Node.js REST API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **PostGIS Geodatabase**: `localhost:5432` (`ews_admin` / `ews_secure_password`)

### Option B: Local Bare-Metal Setup

#### 1. Backend Server Setup
```bash
cd server
npm install
npm test            # Run all 41 test suites
npm run dev         # Starts API on port 4000
```

#### 2. Client Setup
```bash
cd client
npm install
npx tsc --noEmit    # Validate TypeScript types
npm run dev         # Starts Next.js on port 3000
```

---

## 📡 REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/basins` | Retrieve river basins with GeoJSON boundary geometries |
| `GET` | `/api/v1/lakes` | Glacial lake inventory with basin and risk level filtering |
| `GET` | `/api/v1/lakes/:id` | Detailed lake dossier, bathymetry, and moraine metrics |
| `GET` | `/api/v1/lakes/:id/observations` | Multi-temporal surface area time series records |
| `GET` | `/api/v1/lakes/:id/timelapse-comparison` | 23-year calving retreat timeline (2004–2026) |
| `GET` | `/api/v1/alerts` | Active and historical GLOF emergency warnings |
| `POST`| `/api/v1/alerts/evaluate` | Ingest Python worker multi-factor risk assessment |
| `PATCH`| `/api/v1/alerts/:id/acknowledge` | Acknowledge active warning dispatch |
| `GET` | `/api/v1/scada/dams` | Hydroelectric cascade dams and radial gate status |
| `POST`| `/api/v1/scada/dams/:id/emergency-drawdown`| Transmit SCADA command to draw down headpond |
| `GET` | `/api/v1/satellite/tasking/orders` | Cue-and-slew high-res satellite tasking orders |
| `POST`| `/api/v1/satellite/tasking/orders` | Enqueue sub-meter optical / SAR tasking order |

---

## 🧪 Testing & Quality Verification

The project includes an end-to-end automated test suite for API routing, GLOF alert dispatch, SCADA gateway webhooks, and seismic trigger correlation:

```bash
# Run backend test suite
cd server && npm test
```

```
PASS tests/dispatch.service.test.ts
PASS tests/routing.test.ts
PASS tests/seismic_gpm.test.ts
PASS tests/scada_gateway.test.ts
PASS tests/timelapse.test.ts
PASS tests/hazard_scoring.test.ts

Test Suites: 6 passed, 6 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        8.879 s
```

```bash
# Validate frontend TypeScript compilation
cd client && npx tsc --noEmit
# Result: 0 errors
```

---

## 📄 License & Attribution

This project is licensed under the **MIT License**.

### Scientific & Data Citations
- **ICIMOD**: Glacial Lakes and Glacial Lake Outburst Floods in Nepal (Inventory & Risk Assessment).
- **European Space Agency (ESA) & EOX**: Copernicus Sentinel-2 MSI L2A Global Cloudless Mosaics.
- **NASA Earth Data**: Global Precipitation Measurement (GPM) IMERG V07B precipitation feeds.
- **USGS**: Landsat 7/8/9 Earth observation archives and Earthquake Hazards Program ShakeMap.
- **Nepal Department of Hydrology and Meteorology (DHM)**: Hydrological telemetry standards and transboundary station networks.
