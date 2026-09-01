import { FloodAlert, AlertSeverityLevel } from '../types';
import { MOCK_FLOOD_ALERTS, MOCK_GLACIAL_LAKES } from './db.service';

export class AlertService {
  private alertsStore: FloodAlert[] = [...MOCK_FLOOD_ALERTS];

  public getAllAlerts(filters?: { severity?: AlertSeverityLevel; active_only?: boolean }): FloodAlert[] {
    return this.alertsStore.filter((alert) => {
      if (filters?.severity && alert.severity !== filters.severity) return false;
      if (filters?.active_only && alert.resolved_at) return false;
      return true;
    });
  }

  public getAlertById(id: string): FloodAlert | undefined {
    return this.alertsStore.find((a) => a.id === id);
  }

  public resolveAlert(id: string): FloodAlert | null {
    const alert = this.getAlertById(id);
    if (!alert) return null;
    alert.resolved_at = new Date().toISOString();
    return alert;
  }

  public createAlert(payload: {
    lake_id: string;
    severity: AlertSeverityLevel;
    trigger_reason: string;
  }): FloodAlert {
    const lake = MOCK_GLACIAL_LAKES.find(
      (l) => l.id === payload.lake_id || l.icimod_code === payload.lake_id || l.name.toLowerCase().includes(payload.lake_id.toLowerCase())
    );
    const lakeName = lake ? lake.name : payload.lake_id;

    const newAlert: FloodAlert = {
      id: `a-${Date.now()}`,
      lake_id: payload.lake_id,
      lake_name: lakeName,
      severity: payload.severity,
      trigger_reason: payload.trigger_reason,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };

    this.alertsStore.unshift(newAlert);
    this.dispatchNotification(newAlert);
    return newAlert;
  }

  private dispatchNotification(alert: FloodAlert) {
    console.log(`[DISPATCH] 🚨 Dispatched ${alert.severity} Flood Alert for ${alert.lake_name || alert.lake_id}`);
  }
}

export const alertService = new AlertService();
