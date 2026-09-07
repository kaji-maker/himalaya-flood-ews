# Real-World Data Pipeline Migration Guide for Himalaya EWS

This guide provides the exact command and architecture specifications for running `agy` against the `kaji-maker/himalaya-flood-ews` repository. It configures the early warning dashboard to fetch live Copernicus Sentinel-2 imagery metadata and real-time precipitation observations rather than using hardcoded simulation fixtures.

---

## 1. Zero-Friction Live Data Architecture

To avoid blocking the pipeline with paid subscriptions or complicated authorization barriers, the system is configured to use high-availability, open-access scientific endpoints:

| Data Stream | Synthetic Source (Current) | Live Replacement (Target) | Authentication |
| :--- | :--- | :--- | :--- |
| **Glacial Lake Imagery (Sentinel-2 10m)** | Hardcoded `+18.2%` surge | **Element 84 AWS STAC API** (`earth-search.aws.element84.com/v1`) or **Microsoft Planetary Computer STAC** | Public / Open Access (No API key needed) |
| **Precipitation (72h GPM Rainfall)** | Mock `140mm` fixture | **Open-Meteo Live & Historical Weather API** (`api.open-meteo.com/v1/forecast`) aggregating past 72h precipitation at lake coordinates | Public / Free (No API key needed) |
| **Lake Registry (14 High-Risk Lakes)** | Static mock entries | Verified geo-coordinates, basin categorizations (Koshi, Gandaki, Karnali), and historical base areas | Embedded GeoJSON / PostGIS seed |
| **Downstream Corridors** | Static pins | Real elevation profiles and river distance points (Na, Beding, Chhetchhet, Simigaon, Gongar Khola) | GeoJSON LineString / Point features |

---

## 2. Command to Run in `agy`

Open your terminal inside the root directory of your cloned repository (`kaji-maker/himalaya-flood-ews`) and execute the following command:

```bash
agy "Perform a full codebase audit and refactor the Himalaya EWS application to transition from synthetic/mock data to live, real-world scientific data streams:

1. CODEBASE AUDIT & CLEANUP:
   - Search the entire repository for mock data generators, simulation timers, hardcoded emergency states (such as '+18.2% expansion' and '140mm rainfall'), and test toggles (e.g., USE_MOCK, SIMULATE_ALERT).
   - Retain simulation capabilities only under a dedicated '--demo' or 'NEXT_PUBLIC_DEMO_MODE=true' flag, defaulting to live mode ('LIVE_DATA=true').

2. SATELLITE PIPELINE (Copernicus Sentinel-2):
   - Implement an ingestion client querying the Element 84 Earth Search STAC API (https://earth-search.aws.element84.com/v1) for collection 'sentinel-2-l2a'.
   - For monitored glacial lakes, query the most recent cloud-filtered scene (eo:cloud_cover < 25%) over each lake's bounding box.
   - For Tsho Rolpa, use coordinates [86.450, 27.835, 86.515, 27.880].
   - Provide fallback to Copernicus Data Space Ecosystem (CDSE) STAC if CDSE credentials are present in the environment.

3. PRECIPITATION PIPELINE (NASA GPM / Multi-source Rainfall):
   - Replace the static 140mm emergency threshold with a live 72-hour precipitation accumulator using the Open-Meteo Weather API:
     Endpoint: 'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation&past_days=3'
   - Compute the true sum of precipitation over the past 72 hours for each basin and lake site.

4. 14 MONITORED HIGH-RISK LAKES DATASET:
   - Ensure the database / lake registry contains the verified coordinates and basin mappings for Nepal's priority high-risk GLOF lakes:
     * Koshi Basin: Tsho Rolpa (Tama Koshi), Imja Tsho (Dudh Koshi), Lower Barun (Arun), Lumding Tsho (Dudh Koshi), Chamlang Tsho, Hongu 2.
     * Gandaki Basin: Thulagi (Marsyangdi), South Lhonak/bordering, Talbar.
     * Karnali Basin: High-risk glacial ponds in Humla/Mugu districts.
   - For Tsho Rolpa, map downstream vulnerable points: Na (27.854, 86.441), Beding (27.850, 86.383), Chhetchhet (27.828, 86.262), Simigaon (27.839, 86.275), and Gongar Khola (27.834, 86.241).

5. DISPATCH & ALERT LOGIC:
   - Recalibrate the Emergency State trigger: An EMERGENCY alert is raised only when live 72h accumulated rainfall exceeds 75mm OR when the latest satellite surface area shows an anomalous variance (>5% deviation from seasonal median).
   - Otherwise, display current live conditions: NORMAL, ELEVATED, or WATCH.

6. VALIDATION SCRIPT:
   - Create or update an end-to-end verification script ('npm run test:live' or 'python scripts/verify_live_feeds.py') that connects to the live endpoints, fetches real-time numbers for Tsho Rolpa, and logs the response payload."
```

---

## 3. High-Risk Lakes Spatial Reference Data

If `agy` requires a baseline dataset for the 14 high-risk glacial lakes across Nepal's basins, verify that the following coordinate registry is incorporated into your data layer:

```json
[
  {
    "id": "tsho-rolpa",
    "name": "Tsho Rolpa",
    "basin": "Koshi",
    "sub_basin": "Tama Koshi",
    "latitude": 27.8580,
    "longitude": 86.4810,
    "elevation_m": 4580,
    "historical_area_km2": 1.65,
    "downstream_settlements": [
      {"name": "Na", "lat": 27.8540, "lng": 86.4410, "distance_km": 5.2},
      {"name": "Beding", "lat": 27.8500, "lng": 86.3830, "distance_km": 11.8},
      {"name": "Chhetchhet", "lat": 27.8280, "lng": 86.2620, "distance_km": 28.5},
      {"name": "Simigaon", "lat": 27.8390, "lng": 86.2750, "distance_km": 26.1},
      {"name": "Gongar Khola", "lat": 27.8340, "lng": 86.2410, "distance_km": 33.4}
    ]
  },
  {
    "id": "imja-tsho",
    "name": "Imja Tsho",
    "basin": "Koshi",
    "sub_basin": "Dudh Koshi",
    "latitude": 27.9000,
    "longitude": 86.9250,
    "elevation_m": 5010,
    "historical_area_km2": 1.28,
    "downstream_settlements": [
      {"name": "Dingboche", "lat": 27.8920, "lng": 86.8320, "distance_km": 9.5},
      {"name": "Pangboche", "lat": 27.8570, "lng": 86.7930, "distance_km": 15.2}
    ]
  },
  {
    "id": "thulagi",
    "name": "Thulagi",
    "basin": "Gandaki",
    "sub_basin": "Marsyangdi",
    "latitude": 28.4950,
    "longitude": 84.4890,
    "elevation_m": 4040,
    "historical_area_km2": 0.92,
    "downstream_settlements": [
      {"name": "Dharapani", "lat": 28.5160, "lng": 84.3580, "distance_km": 16.0},
      {"name": "Tal", "lat": 28.4680, "lng": 84.3820, "distance_km": 21.4}
    ]
  },
  {
    "id": "lower-barun",
    "name": "Lower Barun",
    "basin": "Koshi",
    "sub_basin": "Arun",
    "latitude": 27.7980,
    "longitude": 87.0940,
    "elevation_m": 4550,
    "historical_area_km2": 1.95,
    "downstream_settlements": [
      {"name": "Yangle Kharka", "lat": 27.7560, "lng": 87.1650, "distance_km": 12.0}
    ]
  },
  {
    "id": "lumding-tsho",
    "name": "Lumding Tsho",
    "basin": "Koshi",
    "sub_basin": "Dudh Koshi",
    "latitude": 27.7780,
    "longitude": 86.6370,
    "elevation_m": 4870,
    "historical_area_km2": 0.85,
    "downstream_settlements": [
      {"name": "Ghat", "lat": 27.7120, "lng": 86.7140, "distance_km": 14.5}
    ]
  }
]
```

---

## 4. Verification After Agent Refactoring

Once `agy` finishes modifying the codebase, run the following checks:

1. **Verify Environment Configuration:**
   Ensure `.env.local` or `.env` contains:
   ```bash
   NEXT_PUBLIC_DEMO_MODE=false
   LIVE_DATA=true
   ```

2. **Inspect Network Logs:**
   Open the browser's Developer Tools (`Network` tab) on `localhost:3000`. You should see successful HTTP 200 requests to:
   - `earth-search.aws.element84.com` (or your backend proxy fetching STAC records)
   - `api.open-meteo.com` (returning non-synthetic hourly precipitation arrays)

3. **Check UI Status Banner:**
   The top red `EMERGENCY` banner should now reflect the real-world status (e.g., `NORMAL` or `MONITORING - Koshi River Basin`) unless actual monsoon/cloudburst rain above the threshold is currently recorded at Rolwaling.