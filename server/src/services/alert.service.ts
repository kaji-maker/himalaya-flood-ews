import { GLOFAlert, AlertLevel, AlertStatus } from '../types';
import { MOCK_ALERTS, MOCK_LAKES } from './db.service';

export class AlertService {
  private alertsStore: GLOFAlert[] = [...MOCK_ALERTS];

  public getAllAlerts(filters?: { status?: AlertStatus; alert_level?: AlertLevel; basin_code?: string }): GLOFAlert[] {
    return this.alertsStore.filter((alert) => {
      if (filters?.status && alert.status !== filters.status) return false;
      if (filters?.alert_level && alert.alert_level !== filters.alert_level) return false;
      if (filters?.basin_code && alert.basin_code !== filters.basin_code) return false;
      return true;
    });
  }

  public getAlertById(id: string): GLOFAlert | undefined {
    return this.alertsStore.find((a) => a.id === id || a.alert_code === id);
  }

  public acknowledgeAlert(id: string): GLOFAlert | null {
    const alert = this.getAlertById(id);
    if (!alert) return null;
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledged_at = new Date().toISOString();
    return alert;
  }

  public resolveAlert(id: string): GLOFAlert | null {
    const alert = this.getAlertById(id);
    if (!alert) return null;
    alert.status = 'RESOLVED';
    alert.resolved_at = new Date().toISOString();
    return alert;
  }

  public createOrUpdateFromRiskAssessment(payload: {
    lake_id: string;
    risk_score: number;
    alert_level: AlertLevel;
    triggers: Record<string, any>;
    triggers_list?: string[];
  }): GLOFAlert | null {
    if (payload.alert_level === 'NORMAL') {
      return null;
    }

    const lake = MOCK_LAKES.find((l) => l.id === payload.lake_id || l.name.toLowerCase().includes(payload.lake_id.toLowerCase()));
    const lakeName = lake ? lake.name : payload.lake_id;
    const basinCode = lake?.basin_code || 'KOSHI';

    const existing = this.alertsStore.find((a) => a.lake_id === payload.lake_id && a.status === 'ACTIVE');
    if (existing) {
      existing.risk_score = payload.risk_score;
      existing.alert_level = payload.alert_level;
      existing.triggers = payload.triggers;
      return existing;
    }

    const newAlert: GLOFAlert = {
      id: `a-${Date.now()}`,
      alert_code: `GLOF-${new Date().getFullYear()}-${lakeName.replace(/\s+/g, '').toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
      lake_id: payload.lake_id,
      lake_name: lakeName,
      basin_code: basinCode,
      alert_level: payload.alert_level,
      risk_score: payload.risk_score,
      headline: `GLOF ${payload.alert_level} Alert for ${lakeName}`,
      description: `Automated satellite & meteorological triggers reached ${payload.alert_level} threshold with composite score ${payload.risk_score}.`,
      triggers: payload.triggers,
      affected_villages: ['Downstream settlements within 45km buffer'],
      status: 'ACTIVE',
      dispatched_channels: ['WEBHOOK', 'SMS'],
      issued_at: new Date().toISOString(),
    };

    this.alertsStore.unshift(newAlert);
    this.dispatchNotification(newAlert);
    return newAlert;
  }

  private dispatchNotification(alert: GLOFAlert) {
    console.log(`[DISPATCH] 🚨 Dispatched ${alert.alert_level} Notification for ${alert.lake_name} [${alert.alert_code}] to channels:`, alert.dispatched_channels);
  }
}

export const alertService = new AlertService();
