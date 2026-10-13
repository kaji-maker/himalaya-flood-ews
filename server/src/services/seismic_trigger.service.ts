import { SeismicEvent, AffectedLakeSeismicImpact, FloodAlert } from '../types';
import { MOCK_FLOOD_ALERTS, MOCK_CUE_SLEW_TASKINGS } from './db.service';
import { MultiChannelDispatchService } from './dispatch.service';

interface MonitoredLakeCoord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  basin: string;
  elevation_m: number;
}

export const HIMALAYAN_MONITORED_LAKES: MonitoredLakeCoord[] = [
  { id: 'l-tsho-rolpa', name: 'Tsho Rolpa Glacial Lake', lat: 27.868, lon: 86.475, basin: 'Koshi (Tama Koshi)', elevation_m: 4580 },
  { id: 'l-imja-tsho', name: 'Imja Tsho (Everest Region)', lat: 27.910, lon: 86.924, basin: 'Koshi (Dudh Koshi)', elevation_m: 5010 },
  { id: 'l-thulagi', name: 'Thulagi Lake (Manaslu)', lat: 28.517, lon: 84.532, basin: 'Gandaki (Marsyangdi)', elevation_m: 4040 },
  { id: 'l-lower-barun', name: 'Lower Barun Lake', lat: 27.794, lon: 87.094, basin: 'Koshi (Arun)', elevation_m: 4540 },
  { id: 'l-lumding', name: 'Lumding Tsho', lat: 27.785, lon: 86.612, basin: 'Koshi (Dudh Koshi)', elevation_m: 4850 },
  { id: 'l-south-lhonak', name: 'South Lhonak Lake', lat: 27.915, lon: 88.190, basin: 'Teesta / Sikkim Arc', elevation_m: 5200 },
];

export class SeismicTriggerService {
  private static lastSyncTimestamp = 0;
  private static recentSeismicEvents: SeismicEvent[] = [
    {
      id: 'us7000tbwb',
      magnitude: 5.2,
      depth_km: 10.0,
      latitude: 28.271,
      longitude: 85.515,
      place: '55 km NW of Kodāri̇̄, Nepal (Langtang Main Himalayan Thrust)',
      occurred_at: '2026-08-26T02:52:10.000Z',
      source: 'USGS',
      max_pga_g: 0.16,
      affected_lakes: [
        {
          lake_id: 'l-tsho-rolpa',
          lake_name: 'Tsho Rolpa Glacial Lake',
          distance_km: 104.2,
          computed_pga_g: 0.05,
          destabilization_risk: 'MODERATE_LIQUEFACTION',
          action_triggered: 'INCREASE_GEOPHONE_SAMPLING_RATE',
        },
        {
          lake_id: 'l-thulagi',
          lake_name: 'Thulagi Lake (Manaslu)',
          distance_km: 101.5,
          computed_pga_g: 0.05,
          destabilization_risk: 'MODERATE_LIQUEFACTION',
          action_triggered: 'INCREASE_GEOPHONE_SAMPLING_RATE',
        },
      ],
      alert_dispatched: false,
    },
    {
      id: 'us7000tdv4',
      magnitude: 5.1,
      depth_km: 10.0,
      latitude: 31.362,
      longitude: 80.330,
      place: '115 km NE of Joshīmath, India (Garhwal / Western Himalaya)',
      occurred_at: '2026-09-03T08:16:36.000Z',
      source: 'USGS',
      max_pga_g: 0.15,
      affected_lakes: [],
      alert_dispatched: false,
    },
    {
      id: 'us6000tn6q',
      magnitude: 4.8,
      depth_km: 10.0,
      latitude: 30.320,
      longitude: 84.276,
      place: '143 km NW of Saga, China (Trans-Himalayan Fault / Poiqu Headwaters)',
      occurred_at: '2026-08-18T19:59:08.000Z',
      source: 'USGS',
      max_pga_g: 0.11,
      affected_lakes: [
        {
          lake_id: 'l-thulagi',
          lake_name: 'Thulagi Lake (Manaslu)',
          distance_km: 201.2,
          computed_pga_g: 0.02,
          destabilization_risk: 'NEGLIGIBLE',
          action_triggered: 'STANDBY_BASELINE_LOG',
        },
      ],
      alert_dispatched: false,
    },
  ];

  /**
   * Computes Haversine great-circle distance between two geographic coordinates in km.
   */
  public static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371.0; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180.0) *
        Math.cos((lat2 * Math.PI) / 180.0) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  /**
   * Ground Motion Prediction Equation (GMPE) adapted for the Himalayan Thrust Belt.
   * Computes expected Peak Ground Acceleration (PGA) in units of g.
   */
  public static computePga(magnitudeMw: number, epicentralDistKm: number, depthKm: number = 10.0): number {
    const rHyp = Math.sqrt(epicentralDistKm * epicentralDistKm + depthKm * depthKm);
    // Empirical attenuation: PGA(g) = 10^(0.42*Mw - 0.45) / (rHyp + 12)^1.25
    const numerator = Math.pow(10, 0.42 * magnitudeMw - 0.45);
    const denominator = Math.pow(rHyp + 12.0, 1.25);
    const pga = numerator / denominator;
    return Number(Math.min(1.5, Math.max(0.001, pga)).toFixed(3));
  }

  /**
   * Evaluates moraine dam structural destabilization risk from seismic ground shaking.
   */
  public static evaluateMoraineDestabilization(
    magnitudeMw: number,
    distKm: number,
    pgaG: number
  ): { risk: AffectedLakeSeismicImpact['destabilization_risk']; action: string } {
    if (pgaG >= 0.22 || (magnitudeMw >= 5.5 && distKm <= 35.0)) {
      return {
        risk: 'CRITICAL_MORAINE_FAILURE',
        action: 'EMERGENCY_SCADA_AND_NEOC_DISPATCH',
      };
    }
    if (pgaG >= 0.12 || (magnitudeMw >= 5.0 && distKm <= 75.0)) {
      return {
        risk: 'HIGH_SLUMP_RISK',
        action: 'TRIGGER_URGENT_SKYSAT_CUE_SLEW',
      };
    }
    if (pgaG >= 0.05 || (magnitudeMw >= 4.8 && distKm <= 120.0)) {
      return {
        risk: 'MODERATE_LIQUEFACTION',
        action: 'INCREASE_GEOPHONE_SAMPLING_RATE',
      };
    }
    return {
      risk: 'NEGLIGIBLE',
      action: 'STANDBY_BASELINE_LOG',
    };
  }

  /**
   * Analyzes an earthquake event against all monitored Himalayan glacial lakes.
   */
  public static analyzeEventAgainstLakes(
    magnitudeMw: number,
    depthKm: number,
    lat: number,
    lon: number
  ): { affectedLakes: AffectedLakeSeismicImpact[]; maxPga: number } {
    let maxPga = 0.0;
    const affectedLakes: AffectedLakeSeismicImpact[] = [];

    for (const lake of HIMALAYAN_MONITORED_LAKES) {
      const dist = this.calculateDistanceKm(lat, lon, lake.lat, lake.lon);
      // Only evaluate if within 300 km radius
      if (dist <= 300.0) {
        const pga = this.computePga(magnitudeMw, dist, depthKm);
        if (pga > maxPga) maxPga = pga;

        const { risk, action } = this.evaluateMoraineDestabilization(magnitudeMw, dist, pga);

        affectedLakes.push({
          lake_id: lake.id,
          lake_name: lake.name,
          distance_km: dist,
          computed_pga_g: pga,
          destabilization_risk: risk,
          action_triggered: action,
        });
      }
    }

    // Sort by computed PGA descending
    affectedLakes.sort((a, b) => b.computed_pga_g - a.computed_pga_g);
    return { affectedLakes, maxPga };
  }

  /**
   * Ingests or simulates a seismic event, computes moraine impacts, and triggers emergency systems if needed.
   */
  public static async processSeismicEvent(params: {
    id?: string;
    magnitude: number;
    depth_km: number;
    latitude: number;
    longitude: number;
    place: string;
    occurred_at?: string;
    source?: 'USGS' | 'NSC_NEPAL' | 'SIMULATED';
  }): Promise<{ event: SeismicEvent; alertsCreated: FloodAlert[] }> {
    const id = params.id || `seismic-${Date.now()}`;
    const source = params.source || 'SIMULATED';
    const occurred_at = params.occurred_at || new Date().toISOString();

    const { affectedLakes, maxPga } = this.analyzeEventAgainstLakes(
      params.magnitude,
      params.depth_km,
      params.latitude,
      params.longitude
    );

    const alertsCreated: FloodAlert[] = [];
    let alertDispatched = false;

    // Check if any monitored lake experienced CRITICAL or HIGH risk
    const criticalImpacts = affectedLakes.filter(
      (l) => l.destabilization_risk === 'CRITICAL_MORAINE_FAILURE' || l.destabilization_risk === 'HIGH_SLUMP_RISK'
    );

    for (const impact of criticalImpacts) {
      const isCritical = impact.destabilization_risk === 'CRITICAL_MORAINE_FAILURE';
      const severity = isCritical ? 'EMERGENCY' : 'WARNING';

      const reason = `SEISMIC MORAINE TRIGGER: Mw ${params.magnitude.toFixed(1)} quake (${params.place}) generated ${impact.computed_pga_g}g Peak Ground Acceleration (PGA) at ${impact.lake_name} (Distance: ${impact.distance_km} km). Immediate moraine dam deformation / slump alert!`;

      const alert: FloodAlert = {
        id: `a-seismic-${Date.now()}-${impact.lake_id}`,
        lake_id: impact.lake_id,
        lake_name: impact.lake_name,
        severity,
        trigger_reason: reason,
        created_at: new Date().toISOString(),
        resolved_at: null,
      };

      MOCK_FLOOD_ALERTS.unshift(alert);
      alertsCreated.push(alert);
      alertDispatched = true;

      // Trigger automatic high-resolution Cue-and-Slew satellite order to inspect dam crest
      MOCK_CUE_SLEW_TASKINGS.unshift({
        id: `task-seismic-${Date.now()}`,
        lake_id: impact.lake_id,
        lake_name: impact.lake_name,
        target_bbox: [
          params.longitude - 0.05,
          params.latitude - 0.05,
          params.longitude + 0.05,
          params.latitude + 0.05,
        ],
        requested_sensor: 'SkySat-Submeter (0.50m GSD)',
        order_priority: 'IMMEDIATE_INTERVENTION',
        triggered_by: `SEISMIC_SHAKE_Mw_${params.magnitude}`,
        created_at: new Date().toISOString(),
        status: 'DISPATCHED_TO_CONSTELLATION',
      });

      // Dispatch alert via multi-channel service (Hydropower SCADA, CDMC SMS, NEOC)
      try {
        await MultiChannelDispatchService.dispatchEmergencyAlert(alert);
      } catch (err) {
        console.error('[Seismic Alert] Dispatch notification error:', err);
      }
    }

    const event: SeismicEvent = {
      id,
      magnitude: params.magnitude,
      depth_km: params.depth_km,
      latitude: params.latitude,
      longitude: params.longitude,
      place: params.place,
      occurred_at,
      source,
      max_pga_g: maxPga,
      affected_lakes: affectedLakes,
      alert_dispatched: alertDispatched,
    };

    // Prepend to recent events list
    this.recentSeismicEvents.unshift(event);
    if (this.recentSeismicEvents.length > 50) {
      this.recentSeismicEvents.pop();
    }

    return { event, alertsCreated };
  }

  /**
   * Retrieves list of recent Himalayan earthquakes and their moraine impacts.
   */
  public static getRecentEvents(limit: number = 10): SeismicEvent[] {
    // If cache is older than 5 minutes, refresh in background
    if (Date.now() - this.lastSyncTimestamp > 300000) {
      this.fetchUsgsHimalayanFeed().catch(() => {});
    }
    return this.recentSeismicEvents.slice(0, limit);
  }

  /**
   * Fetches real-time M4.5+ earthquake GeoJSON feed from USGS for the Himalayan Arc.
   */
  public static async fetchUsgsHimalayanFeed(): Promise<SeismicEvent[]> {
    const url =
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&minlatitude=25.0&maxlatitude=33.0&minlongitude=78.0&maxlongitude=94.0&limit=20';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        console.warn(`[USGS Ingest] HTTP response not ok (${response.status}), using cached telemetry`);
        return this.recentSeismicEvents;
      }

      const geojson = (await response.json()) as any;
      if (!geojson.features || !Array.isArray(geojson.features)) {
        return this.recentSeismicEvents;
      }

      this.lastSyncTimestamp = Date.now();

      for (const feature of geojson.features) {
        const [lon, lat, depth] = feature.geometry.coordinates;
        const mag = feature.properties.mag || 4.5;
        const place = feature.properties.place || 'Himalayan Arc';
        const time = new Date(feature.properties.time).toISOString();
        const id = `usgs-${feature.id}`;

        // Check if event is already processed
        if (!this.recentSeismicEvents.some((e) => e.id === id)) {
          await this.processSeismicEvent({
            id,
            magnitude: mag,
            depth_km: depth || 10.0,
            latitude: lat,
            longitude: lon,
            place,
            occurred_at: time,
            source: 'USGS',
          });
        }
      }

      // Sort by occurrence time descending
      this.recentSeismicEvents.sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );

      return this.recentSeismicEvents;
    } catch (err: any) {
      console.warn(`[USGS Ingest] Live fetch unavailable (${err.message}). Using local Himalayan seismic telemetry.`);
      return this.recentSeismicEvents;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
