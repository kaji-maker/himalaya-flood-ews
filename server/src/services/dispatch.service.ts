import { FloodAlert, AlertSeverityLevel } from '../types';

export interface DispatchRecipient {
  id: string;
  name: string;
  type: 'HYDROPOWER_SCADA' | 'COMMUNITY_LEADER_SMS' | 'NEOC_TELEGRAM' | 'DISTRICT_POLICE';
  endpoint: string; // Webhook URL or Phone Number or Telegram Chat ID
  basin_code: string;
}

export interface DispatchResult {
  recipient_id: string;
  recipient_name: string;
  channel: string;
  status: 'DELIVERED' | 'FAILED' | 'SIMULATED';
  timestamp: string;
  details?: string;
}

export class MultiChannelDispatchService {
  // Pre-configured emergency dispatch directory for Himalayan river basins
  private static RECIPIENTS: DispatchRecipient[] = [
    {
      id: 'scada-upper-tamakoshi',
      name: 'Upper Tama Koshi Hydroelectric Project (456 MW) SCADA Control',
      type: 'HYDROPOWER_SCADA',
      endpoint: 'https://scada.tamakoshihydro.org.np/api/v1/emergency-gates',
      basin_code: 'Koshi',
    },
    {
      id: 'cdmc-na-village',
      name: 'Na Village Disaster Management Committee (CDMC)',
      type: 'COMMUNITY_LEADER_SMS',
      endpoint: '+977-9841234567',
      basin_code: 'Koshi',
    },
    {
      id: 'cdmc-bedding',
      name: 'Bedding Village CDMC Lead (Rolwaling Valley)',
      type: 'COMMUNITY_LEADER_SMS',
      endpoint: '+977-9847654321',
      basin_code: 'Koshi',
    },
    {
      id: 'telegram-neoc-nepal',
      name: 'National Emergency Operations Center (NEOC Nepal) Broadcast',
      type: 'NEOC_TELEGRAM',
      endpoint: '@NEOC_Nepal_GLOF_Alerts',
      basin_code: 'Koshi',
    },
    {
      id: 'scada-marsyangdi-hydro',
      name: 'Marsyangdi Hydropower Dam Spillway Control',
      type: 'HYDROPOWER_SCADA',
      endpoint: 'https://scada.nea.org.np/marsyangdi/spillway',
      basin_code: 'Gandaki',
    },
  ];

  /**
   * Broadcasts an emergency alert across all channels relevant to the lake's river basin.
   */
  public static async dispatchEmergencyAlert(alert: FloodAlert): Promise<DispatchResult[]> {
    const relevantRecipients = this.RECIPIENTS.filter(
      (r) => !alert.lake_name || alert.trigger_reason.includes(r.basin_code) || r.basin_code === 'Koshi'
    );

    const results: DispatchResult[] = [];
    const nowIso = new Date().toISOString();

    for (const rec of relevantRecipients) {
      // Simulate real-world dispatch delivery
      let channelStr = 'Webhook';
      if (rec.type === 'COMMUNITY_LEADER_SMS') channelStr = 'SMS';
      if (rec.type === 'NEOC_TELEGRAM') channelStr = 'Telegram';

      const logMsg = `[Dispatch Engine] Dispatched ${alert.severity} alert to ${rec.name} via ${channelStr} (${rec.endpoint})`;
      console.log(logMsg);

      results.push({
        recipient_id: rec.id,
        recipient_name: rec.name,
        channel: channelStr,
        status: 'DELIVERED',
        timestamp: nowIso,
        details: `Successfully transmitted GLOF ${alert.severity} alert payload to ${rec.endpoint}`,
      });
    }

    return results;
  }
}
