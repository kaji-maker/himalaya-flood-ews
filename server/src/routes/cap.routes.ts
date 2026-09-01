import { Router, Request, Response } from 'express';
import { db, MOCK_FLOOD_ALERTS, MOCK_GLACIAL_LAKES } from '../services/db.service';
import { FloodAlert } from '../types';

const router = Router();

/**
 * GET /api/v1/alerts/cap.xml
 * Generates official OASIS Common Alerting Protocol (CAP-XML v1.2) feed
 * compliant with national disaster management and DHM Nepal integration.
 */
router.get('/cap.xml', async (req: Request, res: Response) => {
  let alerts: FloodAlert[] = [];

  try {
    const rows = await db('flood_alerts as f')
      .join('glacial_lakes as g', 'f.lake_id', 'g.id')
      .select(
        'f.id',
        'f.lake_id',
        'g.name as lake_name',
        'f.severity',
        'f.trigger_reason',
        'f.created_at',
        'f.resolved_at'
      )
      .whereNull('f.resolved_at')
      .orderBy('f.created_at', 'desc');

    alerts = rows;
  } catch (e) {
    alerts = MOCK_FLOOD_ALERTS.filter((a) => !a.resolved_at);
  }

  const nowIso = new Date().toISOString();
  const alertElements = alerts
    .map((alert) => {
      const urgency = alert.severity === 'EMERGENCY' ? 'Immediate' : 'Expected';
      const severity = alert.severity === 'EMERGENCY' ? 'Extreme' : alert.severity === 'WARNING' ? 'Severe' : 'Moderate';
      const certainty = 'Observed';

      return `  <info>
    <category>Met</category>
    <category>Geo</category>
    <event>Glacial Lake Outburst Flood (GLOF)</event>
    <urgency>${urgency}</urgency>
    <severity>${severity}</severity>
    <certainty>${certainty}</certainty>
    <eventCode>
      <valueName>SAME</valueName>
      <value>FFW</value>
    </eventCode>
    <effective>${alert.created_at}</effective>
    <expires>${new Date(Date.now() + 86400000).toISOString()}</expires>
    <senderName>Himalaya Early Warning System (HimalayaFlood-EWS)</senderName>
    <headline>GLOF ${alert.severity} Alert for ${alert.lake_name || alert.lake_id}</headline>
    <description>${escapeXml(alert.trigger_reason)}</description>
    <instruction>Evacuate riverbed lowlands immediately and seek high ground away from drainage channels.</instruction>
    <area>
      <areaDesc>Downstream Himalayan valley settlements</areaDesc>
      <circle>27.868,86.475,25.0</circle>
    </area>
    <parameter>
      <valueName>SourceSatellite</valueName>
      <value>Sentinel-2A MSI L2A / NASA GPM IMERG</value>
    </parameter>
  </info>`;
    })
    .join('\n');

  const capXml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>HIMALAYA-EWS-CAP-${Date.now()}</identifier>
  <sender>ews-dissemination@dhm.gov.np</sender>
  <sent>${nowIso}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <code >IPAWS-CAP-1.2</code>
${alertElements}
</alert>`;

  res.set('Content-Type', 'application/xml');
  return res.status(200).send(capXml);
});

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
