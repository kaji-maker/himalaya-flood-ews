# 🏔️ Himalaya Flood & GLOF Early Warning System (`himalaya-flood-ews`)

[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-blue.svg)](https://postgis.net/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An open-source research project for understanding Nepal's floods, flash floods, landslides, and glacial-lake hazards. The current implemented pilot focuses on source-traceable DHM rainfall and river measurements, a research dashboard, and historical river-rule replay.

**Research and experimentation only—not an operational public-warning service.** No validated flash-flood/landslide forecast or nationwide warning accuracy is claimed. Legacy satellite, GLOF, dispatch, evacuation, and SCADA demonstrations must not be treated as verified operational capabilities or connected to public-warning/physical-control systems.

---

## 📑 Table of Contents

- [Mission & Scope](#-mission--scope)
- [Current Project Status](#current-project-status)
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
- [Research Dashboard](#research-rainfall-and-river-dashboard)
- [Experimental Nebius Research Summaries](#-experimental-nebius-research-summaries)
- [Historical River-Rule Replay](#historical-river-rule-replay-experimental)
- [Testing & Quality Verification](#-testing--quality-verification)
- [License & Attribution](#-license--attribution)

---

## 🎯 Mission & Scope

The aim is to make Nepal's hazard-related measurements inspectable, distinguish observations from simulations, identify data gaps, and build evidence for future hazard-model validation. Current work separates generated explanations from deterministic threshold comparisons and records the sources, units, timestamps, and uncertainty needed to review each result.

Unknown or missing measurements do not mean safe conditions. Published river thresholds do not by themselves validate a forecast, an evacuation plan, or a dam-control decision. Longer historical records, independent event labels, calibration, and expert review are still required.

## Current Project Status

Verified locally on **2026-10-13**; station coverage and observation counts are a pilot snapshot, not nationwide completeness.

| Component | Implemented | Remaining limitations |
|---|---|---|
| Canonical DHM ingestion | Nine registered river gauges; six rainfall stations; separate 1/3/6/12/24-hour totals; scheduled polling and feed health | Three river gauges lack readings; rainfall coverage is limited |
| Research dashboard | Default Rainfall & Rivers view; source/receipt times, units, quality, stale/missing labels, and backend comparisons | No operational hazard forecast; legacy modules remain separate demonstrations |
| Historical replay | Append-only snapshots, as-of thresholds, correction history, reproducible dataset hashes, and optional labeled-sample metrics | Pre-audit baselines remain unknown; no independently reviewed flood outcomes in the local archive |
| Nebius integration | Backend-only explanations of supplied historical/synthetic measurements; model usage and latency metadata | Experimental prose requires review; never drives alert decisions |
| Local verification | 142 backend tests, 12 dashboard tests, and 42 Python worker tests pass | Test success is not proof of real-world warning accuracy |

Next priorities are longer source-traceable DHM histories and independently reviewed flood/non-flood labels, followed by chronological evaluation. Flash-flood and landslide model development remains future research, not a completed capability. See [Phase 1 data contract](docs/phase1-data-contract.md) for the detailed limits.

---

## 🏛️ System Architecture

```text
Public DHM river/rainfall feeds
              │
              ▼
Dedicated TypeScript ingestion worker ──► PostgreSQL + PostGIS
                                           │
                          ┌────────────────┴─────────────────┐
                          ▼                                  ▼
                Latest measurements +              Append-only audit
                quality/threshold rules            + historical replay
                          │                                  │
                          └────────────────┬─────────────────┘
                                           ▼
                                Express research API
                                           │
                                           ▼
                              Next.js Rainfall & Rivers view

Supplied historical/synthetic data ──► Backend Nebius client
                                      └─► Experimental explanations only
                                          (not threshold/alert decisions)
```

Python satellite/edge-processing modules and legacy GIS demonstrations remain in the repository. They are not a validated end-to-end public-warning or hydrodynamic forecasting deployment.

---

## ⚡ Key Features & Capabilities

The current verified research workflow is described above and in the dashboard/replay sections below. The following older modules are **legacy research demonstrations**; their fixtures, modeled imagery, hazard scores, and numerical dossiers are not independent ground truth.

### 1. 20-Year Retrospective Multi-Temporal Calving Analysis (2004–2026)

The GIS viewer includes retrospective imagery, swipe/opacity controls, and lake overlays. Some imagery and historical series are sensor-modeled or synthesized. Validate acquisition date, provider, processing, and uncertainty before using any asset as a scientific measurement; the year displayed in a demonstration is not proof of a historical satellite capture.

### 2. Landmark GLOF & Flash Flood Forensic Archive (1981–2026)
The legacy archive presents event dossiers and illustrative hydrographs. Its entries and numerical impact claims have not been comprehensively source-verified in this phase and must not be used as backtest outcome labels. The current replay archive contains no independently reviewed flood-event labels.

### 3. Autonomous High-Resolution Satellite Tasking (SkySat & InSAR)
Tasking and InSAR consoles are prototypes. Displayed tasking orders, pass estimates, and deformation values do not establish access to commercial satellites or a validated moraine-failure forecast.

### 4. Cascade Defense & Automated Hydropower Dam SCADA
The repository includes simulated plant registries, command payloads, quorum logic, and authorization demonstrations. These are not evidence of a commissioned hydropower-control integration. Do not connect them to physical gates or bypass operator safety interlocks.

### 5. Real-Time Telemetry, Inundation Swaths & Evacuation Havens
The canonical research view reads DHM observations with quality and freshness labels. Legacy inundation overlays, arrival estimates, edge-sensor examples, and safe-haven coordinates are demonstrations—not surveyed evacuation guidance or a validated HEC-RAS deployment.

### 6. Multi-Channel Emergency Dispatch Engine
Dispatch adapters and payload demonstrations remain available in legacy code. This project does not claim verified public siren/SMS/NEOC delivery. The canonical dashboard, ingestion worker, Nebius summaries, and river-rule replay do not dispatch warnings.

---

## 🔬 Scientific Formulations & Data Processing

The following formulas describe legacy experimental processing/heuristics, not locally calibrated hazard models. Their scores and action labels must not be interpreted as probabilities, physical safety assessments, or authorized operational protocols. They are separate from the canonical DHM station-threshold replay.

### 1. Modified Normalized Difference Water Index (MNDWI)
Water extraction uses Green (Band 3) and Short-Wave Infrared 1 (Band 11) to eliminate false positives from mountain shadow and snow:
$$\text{MNDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{SWIR1}}}{\rho_{\text{Green}} + \rho_{\text{SWIR1}}}$$

Pixels are classified as open water where $\text{MNDWI} > 0.15$ and validated against Sentinel-2 Scene Classification (SCL):
$$\text{Mask}_{\text{valid}} = (\text{SCL} \notin \{3, 8, 9, 10\}) \land (\text{NDSI} < 0.40 \lor \text{MNDWI} > 0.25)$$

### 2. Multi-Factor GLOF Risk Scoring Model ($H$)
The combined hazard index ($H \in [0, 1]$) is computed dynamically:
$$H = 0.35 \cdot S_{\text{expansion}} + 0.30 \cdot S_{\text{rain72h}} + 0.20 \cdot S_{\text{freeboard}} + 0.15 \cdot S_{\text{vulnerability}}$$

| Threshold (illustrative) | Legacy Alert Label | Simulated Action Label |
|---|---|---|
| $H \ge 0.75$ | **`EMERGENCY`** | Immediate 120 dB siren trigger, NEOC SMS broadcast, Dam radial gates full open |
| $0.55 \le H < 0.75$ | **`WARNING`** | Automated SkySat tasking, CDMC alert, SCADA headpond pre-release |
| $0.35 \le H < 0.55$ | **`WATCH`** | 12-hour InSAR coherence check, DHM station alert |
| $H < 0.35$ | **`ADVISORY`** | Normal optical monitoring cycle |

---

## 🗺️ Monitored Glacial Lakes Inventory

The table below retains the legacy example inventory. Areas, scores, and hazard labels are illustrative repository values, **not current verified lake conditions or validated danger assessments**. The local database contains 14 catalog lakes and 3,374 lake observations; that count alone does not validate their source history or risk labels.

| ICIMOD Code | Glacial Lake Name | Basin / Corridor | Example Elevation | Example Area | Legacy Demo Label |
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
│   │   ├── config/               # Backend-only environment loading
│   │   ├── routes/               # Canonical hydrology, research, and legacy endpoints
│   │   ├── services/             # Ingestion, quality, replay, Nebius, legacy prototypes
│   │   ├── scripts/              # Migrations, polling, smoke checks, backtest CLI
│   │   └── types/                # TypeScript contracts
│   └── tests/                    # 142 tests across 19 backend suites
├── client/                       # Next.js 14 App Router GIS frontend
│   ├── public/
│   │   └── imagery/
│   │       └── timelapse/        # Legacy imagery assets; verify provenance before research use
│   ├── src/
│       ├── app/                  # Main dashboard page and layout
│       ├── lib/                  # Typed snapshot validation and freshness helpers
│       └── components/
│           ├── hydrology/        # Canonical Rainfall & Rivers research view
│           ├── drawer/           # LakeDetailDrawer inspection sidebar
│           ├── historical/       # Historical GLOF panel & ForensicBreachModal
│           ├── satellite/        # LakeComparisonModal & CueSlewTaskingConsole
│           └── hydropower/       # Legacy plant/SCADA demonstrations
│   └── tests/                    # 12 mocked dashboard tests
├── workers/                      # Python satellite ingestion & hydrological pipeline
│   ├── src/ingestion/            # STAC, precipitation, scheduler, and seed clients
│   ├── src/processing/           # Water extraction, geometry, and edge prototypes
│   ├── src/analytics/            # Experimental scoring and breach/tasking models
│   └── tests/                    # 42 Python worker tests
├── docker-compose.yml            # Multi-container orchestration (DB, server, client, worker)
├── Makefile                      # Automated build, migration, test, and run targets
└── README.md                     # Comprehensive platform documentation
```

---

## 🚀 Installation & Quickstart

### Option A: Local Research Dashboard + Docker Database/Worker (Recommended)

Requirements: Docker with Compose, a supported Node.js 20+ release, and npm. Python is optional for the separate legacy worker tests. The commands below leave Nebius disabled unless a dedicated project key is configured locally.

```bash
# Clone the repository
git clone https://github.com/kaji-maker/himalaya-flood-ews.git
cd himalaya-flood-ews

# Preserve an existing local configuration; never commit .env
cp -n .env.example .env
chmod 600 .env

# Install both Node workspaces (client tests reuse the backend's tsx)
(cd server && npm ci)
(cd client && npm ci)

# Start the canonical database, apply migrations, then start scheduled DHM ingestion
docker compose up -d postgis
make db-migrate
docker compose --profile hydrology up -d --build --no-deps dhm-ingestion
```

Start these in separate terminals from the repository root:

```bash
cd server && npm run build && npm start
```

```bash
cd client && npm run dev
```

- **Research dashboard**: [http://localhost:3000](http://localhost:3000), opening in Rainfall & Rivers.
- **REST API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1).
- **PostGIS database**: `localhost:5435`; database credentials/URL are in the local example configuration.

The included database credentials and unauthenticated research endpoints are development defaults. Do not expose this stack to the public Internet or physical warning/control equipment. Harden configuration and access controls before any separately reviewed deployment. The broader Compose stack (`make dev`) also includes legacy modules and is not the validated operational workflow described here.

### Option B: Local Bare-Metal Setup

#### 1. Backend Server Setup
```bash
cd server
npm install
npm test            # 142 tests across 19 backend suites
npm run dev         # Starts API on port 4000
```

For optional experimental Nebius summaries, place credentials only in the ignored root `.env` file:

```bash
NEBIUS_API_KEY=
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
NEBIUS_MODEL=nvidia/nemotron-3-super-120b-a12b
NEBIUS_MAX_TOKENS=900
```

The backend loads root `.env` defaults even when started from `server/`; exported process variables and a server-local `.env` take precedence. Docker Compose passes Nebius settings only to the backend API, not the frontend or dedicated DHM worker. Keep the dedicated project key in ignored `.env` files; example files contain blank credential placeholders. Local environment files are excluded from Docker build contexts. Use the example's `DATABASE_URL` for the local PostGIS port 5435, or configure your own database and apply the migrations first.

If the model is unavailable in the account or region, use the model shown by Nebius Playground and update `NEBIUS_MODEL` (and `NEBIUS_BASE_URL` if Playground provides a regional endpoint). The endpoint must use HTTPS and contain no embedded credentials, query, or fragment. `NEBIUS_MAX_TOKENS` is limited to 1–4096 and includes the model's reasoning tokens.

#### 2. Client Setup
```bash
cd client
npm install
npx tsc --noEmit    # Validate TypeScript types
npm run test:hydrology # 12 mocked dashboard tests; backend dependencies must be installed
npm run dev         # Starts Next.js on port 3000
```

#### 3. Optional Python Worker Tests

```bash
cd workers
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/pytest tests/ -q
```

On the tested local environment, 42 worker tests pass with dependency deprecation warnings. These tests do not establish satellite product calibration, physical sensor reliability, or safe SCADA operation.

---

## 📡 REST API Specification

For the canonical DHM research dataset:

```bash
docker compose up -d postgis
make db-migrate
make dhm-thresholds-sync
make hydrology-smoke
```

The live hydrology check refreshes published thresholds, stores available DHM readings, verifies repeat ingestion and backend readback, and rolls back its experimental test changes. For combined rainfall/river refresh and scheduling:

```bash
make dhm-sync
docker compose --profile hydrology up -d --build --no-deps dhm-ingestion
```

The dedicated worker polls after each cycle at a default 15-minute interval, prevents overlap, backs off failures, and stops cleanly. Rainfall coverage starts with six configured DHM stations and stores separate 1/3/6/12/24-hour totals in mm. Change `DHM_POLL_INTERVAL_SECONDS` and `DHM_RAINFALL_STATION_IDS` in the root `.env`, then recreate the worker. It uses public DHM data and does not call Nebius or dispatch alerts. Stop it with `docker compose --profile hydrology stop dhm-ingestion`.

See [Phase 1 data contract](docs/phase1-data-contract.md) for timestamp limitations, freshness rules, station coverage, and validation commands. Fetching a feed successfully does not prove its measurements are current; the API reports both ages separately.

### Research rainfall and river dashboard

The dashboard now opens in **Rainfall & Rivers**, a canonical-data-only research view. It shows river stage/discharge, backend threshold comparisons, separate 1/3/6/12/24-hour rainfall totals, and ingestion health. Source observation, receipt, threshold retrieval, and API-check timestamps are distinct; displayed times use Nepal Time. Zero remains a measurement; missing values and source station codes are never invented. Stale readings remain labeled last known, with their river comparison suppressed to unknown.

The browser refreshes read-only API snapshots every 60 seconds, with 10-second request timeouts, independent resource errors, cancelled requests on window changes/unmount, and no overlapping refresh cycles. It never calls Nebius, syncs ingestion, or dispatches alerts. A failed resource displays unavailable rather than demo data. The legacy warning KPIs and demo modules remain accessible through other tabs, but are excluded from the default research view; they have not been fully remediated.

Start the backend and frontend in separate terminals after database migrations and ingestion are configured:

```bash
cd server && npm run build && npm start
# Separate terminal, from the repository root:
cd client && npm run dev
```

Open `http://localhost:3000`. Keep `NEXT_PUBLIC_API_URL` pointed at the backend's `/api/v1` base URL; it contains no credential. Do not run `next dev` and `next build` concurrently against the same `.next` directory.

```bash
make test-client
cd client && npm run hydrology:smoke
```

The dashboard tests and read-only smoke command reuse the backend's `tsx` installation: install both workspaces with `make setup` or their separate `npm install` commands first. Tests use synthetic fixtures; the smoke command only reads the local API and makes no paid model calls. Override its API base with `HYDROLOGY_SMOKE_BASE_URL` if needed. Verification on 2026-10-13 passed 120 backend tests and 12 dashboard tests, frontend/backend builds, live readback for all five windows, and desktop/mobile browser checks for window switching, API-failure isolation, and recovery. Coverage remains nine river gauges and six rainfall stations, not a nationwide operational warning system.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/basins` | Retrieve river basins with GeoJSON boundary geometries |
| `GET` | `/api/v1/hydrology/stations/latest` | Canonical latest river readings, units, provenance, quality, and backend comparisons |
| `GET` | `/api/v1/research/hydrology/backtest?start=...&end=...` | Read-only, receipt-time river-rule replay from the audit archive |
| `POST` | `/api/v1/research/hydrology/replay` | Replay supplied historical/synthetic captures with optional reviewed outcome labels; no model calls or alert writes |
| `GET` | `/api/v1/hydrology/rainfall/stations?hours=24` | Pilot rainfall stations and latest accumulation totals |
| `GET` | `/api/v1/hydrology/rainfall/stations/:dhmId/observations` | Rainfall history with source timestamps and duration |
| `GET` | `/api/v1/hydrology/ingestion/status` | Persistent ingestion health and freshness |
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
| `POST`| `/api/v1/research/nebius/hydrology-summary` | Experimental summary of supplied historical/synthetic hydrology data |
| `GET` | `/api/v1/research/nebius/status` | Read local configuration; no provider call or token charge |
| `POST` | `/api/v1/research/nebius/probe` | Explicit paid probe of model acceptance |

## 🧪 Experimental Nebius Research Summaries

This project and the Nebius integration are for research and experimentation, not an operational public-warning service. Summaries are separate from flood thresholds and alert decisions. The response includes `experimental: true`, a fixed research label, and an unchanged `observations` array containing the supplied source, timestamp, metric, value, unit, and optional station number. That array is the measurement record; generated prose requires review and can contain errors.

Supply `data_kind: "historical"` or `"synthetic"` (default: synthetic), an ISO timestamp with timezone, explicit units, and a source for each measurement. Null values represent missing measurements. Unknown fields are rejected before a prompt is constructed. The request is capped at 500 observations and 64 KB of serialized data. No credentials or automatic live-feed data are included in prompts.

Example request:

```bash
curl -X POST http://localhost:4000/api/v1/research/nebius/hydrology-summary \
  -H 'Content-Type: application/json' \
  -d '{"title":"Synthetic Bagmati sample","data_kind":"synthetic","observations":[{"timestamp":"2026-10-12T04:25:00Z","metric":"river_stage","value":2.4,"unit":"m","source":"synthetic-dhm"},{"timestamp":"2026-10-12T04:25:00Z","metric":"rainfall_24h","value":61,"unit":"mm","source":"synthetic-rain-gauge"}]}'
```

`GET /api/v1/research/nebius/status` reads local configuration only. To explicitly verify model acceptance, call `POST /api/v1/research/nebius/probe`; this sends a one-token completion request and can incur charges. The probe checks acceptance, not the quality of generated summaries.

For one live synthetic summary through the actual Express app, run:

```bash
cd server
npm run build
npm run research:smoke
```

The smoke check uses an ephemeral localhost port, makes one billed summary request, checks that measurements are unchanged, and prints only status/model/usage/latency metadata. It exits with an error when configuration is missing or the response is incomplete. `npm test` uses mocked Nebius responses and makes no Nebius API calls.

Local verification with `nvidia/nemotron-3-super-120b-a12b` succeeded through the backend: HTTP 200, unchanged synthetic observations, a complete experimental summary, 465 total tokens, and approximately 2 seconds latency. This verifies connectivity and the data contract, not scientific accuracy.

Missing/invalid configuration returns HTTP 503; invalid data returns 400; upstream authentication failures return 502; rate limits return 429; a 20-second timeout returns 504. Network errors, provider errors, malformed JSON, and empty responses return explicit error codes. No automatic retries are performed. Partial text is marked `truncated: true`; an exhausted reasoning budget without text returns `NEBIUS_TRUNCATED_RESPONSE` with token usage and latency when available. Those metadata fields are also included with successful summaries. Provider error bodies and internal reasoning are omitted.

Remaining limitations: the current feature does not provide forecasting, model-based hazard scoring, Nepali translation, retrieval-augmented context, or operational alert automation. Those require separate validation and human approval.

---

## Historical river-rule replay (experimental)

Migration `010` adds an append-only audit of river observation inserts/corrections and threshold refreshes/changes. It is captured by database triggers, so the running DHM worker automatically records new snapshots without a worker restart. Units, source identifiers, original source/receipt timestamps, recorded capture time, and a shared availability sequence are preserved; provider raw payloads are excluded. Existing records are captured as `BASELINE`, not fabricated historical receipts. A local pre-migration dump is stored in the ignored `database/backups/pre-replay.2xGgzG/` directory with restricted permissions.

Replay uses the existing backend river-stage rule at each capture's recorded time. Thresholds must already be captured, verified, effective, and fresh; later threshold updates and corrected observations cannot change earlier replay points. Pre-migration baseline observation captures are always unknown. Unknown/stale/suspect readings never count as normal conditions. Database capture time is not transaction commit time or public warning delivery time.

```bash
make db-migrate
make hydrology-backtest
make hydrology-replay-smoke

# Synthetic rule/metric plumbing check, not Nepal flood accuracy:
cd server
npm run hydrology:backtest -- --input tests/fixtures/hydrology_replay.synthetic.json

# Explicit canonical interval (UTC offsets must be included):
npm run hydrology:backtest -- --start 2026-10-13T00:00:00Z --end 2026-10-14T00:00:00Z --station 289.95
```

The canonical command only reads the local database, defaults to the last 24 hours, and never calls Nebius or dispatches alerts. Canonical intervals are `[start, end)` in **audit capture time**, bounded to 31 days and 5,000 observation captures; narrow the window/station if the limit is exceeded. Reports include a rule ID and SHA-256 fingerprint of the normalized supplied dataset for reproducibility. The supplied fixture contract is shown in [hydrology_replay.synthetic.json](server/tests/fixtures/hydrology_replay.synthetic.json). The API returns a full provenance-bearing timeline; the CLI deliberately prints only the summary.

Without independent event labels, `performance` is `null` and `validation_status` is `RULE_REPLAY_ONLY`. Reviewed labels must reference an observation **capture** ID, provide a credential-free HTTPS source and reviewer, and distinguish independent historical evidence from synthetic expectations. Reported confusion counts, precision/recall, and false-alarm ratio are **per labeled observation capture**, conditional on classified labels—not independent event or forecast skill. Abstentions and positive/negative abstentions are separate; a lower recall bound includes abstained positive labels. Zero denominators return null. Event detection rate and lead time remain null, and `operationally_validated` always remains false.

Local verification on 2026-10-13: migration replay was idempotent; 123 existing river observations were marked baseline/unknown; one public ingestion cycle captured six new readings and eight threshold refreshes. Synthetic SQL experiments verified corrected values and as-of comparisons plus blocked audit updates/deletes, then rolled back. All 142 backend tests, 12 client tests, build checks, and live API readback passed. Original lake counts remain 14 and 3,374. The short archive has no independently reviewed flood outcomes, so these results do **not** establish real-world warning accuracy.

Next validation work requires longer DHM histories with receipt/threshold provenance and independently reviewed flood/non-flood labels, then chronological and basin-held-out evaluation before any parameter tuning. Time-aware evaluation and preventing future-information leakage follow [scikit-learn's evaluation guidance](https://scikit-learn.org/stable/modules/cross_validation.html) and [data-leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html). River replay is only monitoring/rule research, not the complete risk knowledge, warning communication, and preparedness functions described by [WMO's Early Warnings for All](https://public.wmo.int/all-activities/build-resilience/early-warnings-all). This phase does not validate the legacy GLOF heuristics or implement flash-flood/landslide forecasts.

## 🧪 Testing & Quality Verification

Automated tests cover API contracts, mocked research explanations, quality/freshness rules, historical replay, and legacy adapters. Local verification is separate from scientific or operational validation:

```bash
# From the repository root, after both Node workspaces are installed:
make test-server
make test-client
# Optional worker environment must be installed first:
make test-workers
```

Audit backend production dependencies with `make audit-server` (or `cd server && npm audit --omit=dev`). To include development/build tools, run `make audit-server-all` (or `cd server && npm audit`); this intentionally exits nonzero while findings remain. As verified on 2026-10-13, the backend lockfile reports zero production findings and 20 moderate development findings, with no high or critical findings. Runtime Docker images omit development dependencies. These audits cover the backend npm dependency tree, not the frontend, Python packages, or full-system security.

The backend uses Jest `30.5.2`, Jest types `30.0.0`, ts-jest `29.4.14`, and patched Handlebars `4.7.10`. Development reload now uses `tsx` `4.23.15`: run `cd server && npm run dev`. Type checking remains `npm run build`; the watcher does not replace it. Use a supported Node.js 20+ release and TypeScript 5.4+. The backend suite passes 142 tests, including dependency security regressions, watcher and canonical dashboard checks, and time-aware replay/failure tests; no paid API calls are made. `make test-client` also runs 12 mocked dashboard tests after type checking.

The remaining 20 findings are dependency-chain entries rooted in the unpatched [`sprintf-js` advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), reached through Jest's Istanbul/YAML configuration loader. They are not 20 distinct underlying advisories. Do not feed untrusted YAML/NYC configuration into the test tools. `npm audit fix --force` suggests downgrading the test stack, which has not been applied; upstream fixes or a separately validated loader replacement are still needed.

```
Test Suites: 19 passed, 19 total
Tests:       142 passed, 142 total
Snapshots:   0 total
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
