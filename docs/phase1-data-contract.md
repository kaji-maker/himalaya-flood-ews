# Phase 1 data contract

## Activation

Start the project database and apply migrations, including `006`, `007`, and `008`:

```bash
docker compose up -d postgis
make db-migrate
```

The migration runner loads the root `.env`, applies SQL files in filename order in one transaction, stops on failure, and closes its database connection. It can rerun the current idempotent migrations. Set the canonical registry explicitly when needed:

```bash
EWS_CANONICAL_DATA=true
```

The API uses canonical PostGIS station/observation data when `EWS_CANONICAL_DATA=true` or `DATABASE_URL` is present. Local demo mode remains available when neither is configured.

After PostgreSQL is available, synchronize DHM-published warning/danger levels:

```bash
make dhm-thresholds-sync
# or POST /api/v1/hydrology/thresholds/sync
make hydrology-smoke
```

Set `HYDROLOGY_SYNC_TOKEN` to require the `x-sync-token` header on the HTTP sync endpoint. Threshold history is retained; changed DHM values retire the prior active record. Repeated unchanged values refresh `retrieved_at` without inserting a new version, including warning-only records. Withdrawn, conflicting, or absent thresholds in a successful nonempty snapshot retire the prior DHM version; failed/empty snapshots do not alter it. Station locks serialize concurrent syncs.

The live smoke command fetches the DHM snapshot, refreshes thresholds, ingests available actual water-level readings through the backend, and verifies replay handling and readback. Threshold-change, withdrawal, and simulated-reading experiments run inside a transaction that is rolled back; actual DHM readings remain stored. It makes no Nebius requests.

Only currently effective `VERIFIED` thresholds are used. Thresholds unrefreshed for 30 days or observations older than 6 hours yield `UNKNOWN`; these are research freshness policies, not DHM alert rules. Missing measurements, provisional thresholds, simulated/modelled data, and rejected or suspect observations also yield `UNKNOWN`. Warning-only thresholds remain explicitly `PARTIAL`; their published warning can be evaluated but no danger level is invented.

The canonical dispatch endpoint returns HTTP 503 on database failure rather than replacing registered stations with demo fixtures. Canonical readings resolve UUIDs or decimal DHM station numbers directly, preserve supplied observation timestamps, and never fill missing measurements from demo data.

## Provenance rules

Every observation must include:

- `source_key`
- `observation_state`
- `quality_status`
- `quality_score`
- `quality_flags`
- `observed_at`
- `received_at`

Allowed observation states are `OBSERVED`, `FORECAST`, `MODELLED`, `SIMULATED`, `STALE`, and `UNAVAILABLE`.

Demo fixtures use `source_key=legacy-demo`, `observation_state=SIMULATED`, and `quality_status=SUSPECT`. They must never be used as operational evidence or public warnings.

## Canonical endpoints

- `GET /api/v1/hydrology/stations`
- `POST /api/v1/hydrology/observations`
- `GET /api/v1/hydrology/stations/:stationNumber/observations`
- `GET /api/v1/dispatch/dhm-stations`
- `POST /api/v1/hydrology/thresholds/sync`

The dispatch endpoint is retained for dashboard compatibility but now exposes provenance fields and reads from the canonical registry when enabled.

## Catalogue status

Migration `007` loads a verified nine-station DHM subset covering Koshi, Karnali, and Bagmati. Coordinates, river names, elevations, drainage areas, and real-time listing membership come from DHM publications. Thresholds are separately versioned in `hydrometric_station_thresholds`, sourced from the [DHM River Watch feed](https://dhm.gov.np/site/riverWatchTableViewData).

Local validation on 2026-10-12 stored eight threshold records and six timestamped DHM water-level readings. Sundarijal (505) and Jalbire (620) had thresholds but no water-level readings in the fetched snapshot; Bheri at Samaijighat (269.5) was absent. Arun at Turkeghat (604.5) and Barun at Syaksila (600.5) had warning-only thresholds. All gaps remain explicit.

The existing 14 lakes and 3,374 lake observations were preserved. A pre-migration dump is saved under the ignored `database/backups/` directory.

## Scheduled river and rainfall ingestion

Migration `009` adds separate rainfall stations, accumulated-rainfall observations, and persistent feed health. After applying it, run a combined cycle or start the dedicated worker:

```bash
make db-migrate
make dhm-sync
docker compose --profile hydrology up -d --build --no-deps dhm-ingestion
# Stop the worker:
docker compose --profile hydrology stop dhm-ingestion
# Or run it in a local terminal:
make dhm-daemon
```

The default interval is 900 seconds after each completed cycle. `DHM_POLL_INTERVAL_SECONDS` supports 300–86400 seconds. Failed cycles back off up to eight times the base interval. Cycles never overlap locally, and a PostgreSQL advisory lock prevents concurrent worker processes from ingesting together. SIGINT/SIGTERM stops scheduling and drains the current cycle. Database transactions isolate individual failed feeds/stations; failures preserve prior success timestamps and data. No synthetic fallback, Nebius calls, or alert/SCADA dispatch runs in this worker.

The default rainfall pilot uses exact DHM portal IDs `55,57,107,408,663,923`: Kusum Rainfall, Sundarijal, Arun at Turkeghat, Khokana, Jungar/Rolpa, and Shyano Shree Chepang. Set `DHM_RAINFALL_STATION_IDS` to a comma-separated list of up to 100 IDs to change coverage. Portal IDs are separate from station codes: the published code `0526` retains its leading zero. The pilot is not nationwide rainfall coverage, and no automatic spatial association to a river basin or landslide model is inferred.

Rainfall totals come from [DHM station pages](https://dhm.gov.np/hydrology/rainfallSingle/663), which publish timezone-qualified latest observation timestamps and accumulation intervals. Each 1-, 3-, 6-, 12-, or 24-hour total is stored separately in mm, uniquely keyed by station, timestamp, duration, and source. They are overlapping windows, not additive increments. Do not sum them. `timestamp_basis=LATEST_STATION_OBSERVATION` identifies the page's station timestamp; DHM does not provide an independently qualified timestamp for every accumulation window.

The national Rainfall Watch response contains an unzoned display time, so it is not used to invent measurement timestamps. Missing/invalid station timestamps withhold observations and mark the station unavailable. Zero is retained as a real published value; missing/negative/conflicting rainfall becomes null with quality flags. Re-fetching the same source timestamp updates the existing record rather than creating duplicates. Totals older than six hours are marked stale at read time.

Read the research dataset and health via:

- `GET /api/v1/hydrology/rainfall/stations?hours=24`
- `GET /api/v1/hydrology/rainfall/stations/:dhmId/observations?limit=120`
- `GET /api/v1/hydrology/ingestion/status`

Health exposes per-feed success/partial/failure, last attempt/success/source timestamps, failure count, latency, and record counts. Scheduler freshness and measurement freshness are separate. River coverage is currently partial because three configured gauges lack readings; that does not imply a healthy or safe hazard state.

Run backend tests with `cd server && npm test`. To verify the live combined cycle, replay idempotence, advisory locking, rolled-back failure experiments, and API readback, use `cd server && npm run build && npm run dhm:smoke`. Tests for parsing and scheduling use fixtures and fake timers; only explicit sync/smoke commands fetch DHM feeds.

Local verification on 2026-10-12: migration `009` applied, six rainfall stations and 30 duration-specific rainfall records stored, replay and singleton-lock tests passed, failure experiments discarded, and all 109 backend tests passed. The `himalaya-dhm-ingestion` container is running with a 900-second interval. Its first cycle reported rainfall `SUCCESS` and river `PARTIAL` with three missing readings; original lake counts remained 14 and 3,374. The worker environment contains no Nebius credential.

Remaining limitations include six-station rainfall coverage and reliance on DHM page/JSON formats and their published timestamp semantics. No operational flood, flash-flood, or landslide decision model is provided by this ingestion layer.

## Backend dependency remediation

The four prior production-dependency findings were addressed with Express `4.22.3`, body-parser `1.20.8`, proxy-addr `2.0.8`, and qs `6.16.0`, recorded in the backend lockfile. The Express manifest now requires at least `4.22.3` within major version 4. The runtime image uses `npm ci --omit=dev`. Patch references: [Express 4.22.3](https://github.com/expressjs/express/releases/tag/v4.22.3), [proxy-addr security release](https://expressjs.com/en/blog/2026-09-30-security-releases/), and [qs advisory](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g).

Verification of the production update: `make audit-server` reports zero production vulnerabilities; the original 113 backend tests pass, including regression cases for proxy-address spoofing, hostile query serialization, and JSON body size limits. Live DHM smoke validation passed after the production update. A clean production audit is scoped to npm advisories, not proof of full-system security.

Development remediation verified on 2026-10-13: upgraded Jest to `30.5.2`, Jest types to `30.0.0`, ts-jest to `29.4.14`, and Handlebars to `4.7.10`; replaced `ts-node-dev` with `tsx` `4.23.15`. No forced audit fixes or cross-major transitive overrides were applied. The backend now passes 114 tests across 17 suites, including a synthetic TypeScript watcher reload regression. Both the local TypeScript build and clean Docker installation/build pass. The existing ingestion container need not be restarted for development-only changes.

The full backend audit fell from 38 findings (5 moderate, 32 high, 1 critical) to 20 moderate findings, with zero high/critical findings and zero production findings. `make audit-server-all` exposes the full audit and intentionally fails while findings remain. All remaining entries trace to `sprintf-js` through `argparse`, `js-yaml`, and `@istanbuljs/load-nyc-config` in the test stack; the [upstream advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) lists no patched version. Do not ingest untrusted test-tool YAML/NYC configuration. These packages remain excluded from the production image. Resolving the remaining chain requires an upstream patch or a separately validated loader replacement, not the audit's suggested downgrade. Migration reference: [Jest 30 upgrade guide](https://jestjs.io/docs/upgrading-to-jest30).

## Canonical dashboard readback

The default `Rainfall & Rivers` tab reads `GET /api/v1/hydrology/stations/latest`, rainfall stations for the selected accumulation window, and ingestion status. The latest-river endpoint always uses the canonical store and returns 503 without demo fallback when unavailable. It preserves decimal station IDs, null readings, source keys, observation/receipt timestamps, stage in metres, discharge in m³/s, published thresholds, and backend quality/threshold comparisons. The station catalog/history contracts remain unchanged.

Dashboard requests are GET-only, time out after 10 seconds without immediate retries, and refresh 60 seconds after each completed cycle. Requests and timers are cancelled on unmount/window changes; obsolete responses are not applied. Each resource fails independently, and a failed read clears that resource instead of displaying simulated fallback data. Local age checks also prevent a previously fresh browser snapshot from continuing to display a current river comparison after six hours; these checks do not compute flood thresholds or make new alert decisions.

The view separates API check time, source observation time, receipt time, threshold retrieval, and ingestion attempt/success/source timestamps. Times are displayed in Nepal Time (UTC+05:45), with original timestamp strings in time attributes. Rainfall is an accumulated total for the selected window, not a rate; source timestamp basis remains `LATEST_STATION_OBSERVATION`, not a verified per-window end time. Leading-zero station codes are preserved, and absent codes/locations are explicit. “Below warning level” is not an assurance of safety. Partial threshold coverage is marked, and missing/stale assessments are unknown.

Verification on 2026-10-13: 120 backend tests, 12 mocked client tests, both builds, and read-only live API checks for all five rainfall windows passed. Browser checks confirmed nine river rows and six rainfall rows, window switching, mobile layout, isolated rainfall HTTP 503 handling, recovery, and GET-only requests with no page errors. Lake counts remain 14 and 3,374 observations. Run `make test-client` and `cd client && npm run hydrology:smoke`; these reuse the installed backend `tsx` dependency without adding a second test framework. Live smoke reads only the local API and never calls Nebius or writes observations.

Limitations: nine-gauge/six-rainfall-station pilot coverage; no new operational flash-flood/landslide model, forecast skill validation, or public warning automation. Legacy demo modules remain available outside the default research view and have not been comprehensively remediated. The remaining DHM stations should be added through the same reviewed migration process; do not copy the current in-memory fixtures into production without source verification, station identifiers, coordinates, warning levels, danger levels, and ownership metadata.

## Receipt-time river-rule replay

Migration `010` records append-only observation and threshold snapshots in `hydrometric_replay_audit`. A shared sequence orders both streams, including changes inside the same clock millisecond. Inserts and updates are captured atomically with their originating transaction; unchanged observation snapshots are not duplicated. Original received/source times and units are preserved. Threshold freshness refreshes are retained instead of overwriting replay provenance. Provider raw payloads and threshold notes are excluded. Update/delete/truncate guards protect normal SQL paths, not against a privileged administrator disabling triggers or changing the schema. Deletion/retention needs a separately reviewed archival policy.

Existing rows are captured once as `BASELINE`; replay never pretends those values were recorded at their old receipt times. Baseline observation points always abstain. Newly captured corrections remain separate versions, so the final value cannot be projected backward. The database capture clock approximates processing availability, not transaction commit, delivery, or hydrological event onset. Current catalog names/numbers are descriptive metadata; the catalog itself is not fully historically versioned.

`POST /api/v1/research/hydrology/replay` accepts bounded, supplied historical/synthetic datasets. `GET /api/v1/research/hydrology/backtest?start=...&end=...&station_number=...` reads a consistent, read-only database transaction and returns the canonical rule replay. Dates must include timezone offsets, the maximum interval is 31 days, and the observation cap is 5,000. Threshold retrieval includes the prior state per gauge and interval changes, avoiding unbounded full-history loading. Oversized studies return 413, invalid input 400, unregistered selected stations 404, and database failures 503 without fallback or private details.

Each point is evaluated at `available_at`, with shared capture ordering and time checks. Only an already-recorded, effective, verified, non-stale threshold can be used. No label participates in threshold selection or decisions. The rule is the existing `assessHydrometricStatus` function; this service does not call the legacy alert-writing evaluator, dispatch, sync, or Nebius. It does not fill gaps, optimize parameters, or generate forecasts. Capture and source times remain separate, and records with suspect/future/stale/missing data abstain. Source-gap statistics describe observed sample gaps (>6 hours), not a complete sampling-coverage estimate.

Outcome labels are optional, source/reviewer-bearing, and must refer to an observation capture ID. They are supplied assertions requiring external review, not automatically verified scientific ground truth. Synthetic labels are explicitly distinct from independent historical event records. No labels means null performance. With labels, confusion counts are per observation capture, metrics are conditional on classified labels, and unknowns are reported as abstentions with separate hazard-positive/negative counts and a lower recall bound. Event-level detection and lead-time metrics remain null; sample autocorrelation, class imbalance, threshold tuning, station/season holdouts, and uncertain event timing are not solved by these counters. All outputs remain experimental and operationally unvalidated.

Verification on 2026-10-13: a restricted, ignored pre-migration dump was made and its archive listing verified; migration `010` was applied twice without duplicate baseline snapshots. It recorded 123 baseline observations and eight baseline thresholds. A public DHM cycle subsequently added six observation inserts and eight threshold refresh snapshots with rainfall success/river partial coverage. Rolled-back SQL experiments verified correction history, inclusive warning/danger boundaries, as-of comparisons, and blocked audit updates/deletes; no synthetic records remain committed. The suite passes 142 backend tests and 12 client tests. API replay and database replay readback passed, with null real-world performance because independent flood labels are absent. Lake counts remain 14 and 3,374 observations. Reports carry the rule ID and a normalized-dataset SHA-256 fingerprint; rule logic changes require a new version ID rather than treating the dataset hash as a code hash.

Commands: `make hydrology-backtest`, `make hydrology-replay-smoke`, or `cd server && npm run hydrology:backtest -- --input tests/fixtures/hydrology_replay.synthetic.json`. The canonical CLI defaults to the last 24 hours and prints summary metadata only. Replay smoke runs synthetic database changes inside a rolled-back transaction; only explicit DHM sync commands fetch public feeds. No backtest or smoke command makes paid model calls or dispatches warnings.
