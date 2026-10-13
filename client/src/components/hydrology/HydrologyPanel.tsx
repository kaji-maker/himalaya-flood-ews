'use client';

import React, { useEffect, useId, useState } from 'react';
import { CloudRain, RefreshCw, Waves } from 'lucide-react';
import {
  DASHBOARD_REFRESH_MS, emptySnapshot, fetchHydrologySnapshot, formatMeasurement, formatNepalTime,
  HydrologySnapshot, measurementState, officialSourceUrl, RAINFALL_WINDOWS, RainfallWindow, riverStatus,
} from '../../lib/hydrology';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const statusLabels: Record<string, string> = {
  NORMAL: 'Below warning level', WATCH: 'Warning level reached', CRITICAL_SURGE: 'Danger level reached', UNKNOWN: 'Unknown',
};
const badge = 'inline-block rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-200';
const cell = 'p-3 align-top';

function SourceLink({ url }: { url: string | null }) {
  const safe = officialSourceUrl(url);
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">DHM source</a> : null;
}
function Timestamp({ value }: { value: string | null }) {
  return value ? <time dateTime={value} title={value}>{formatNepalTime(value)}</time> : <span>Unavailable</span>;
}
function ResourceNote({ error, checked, loading }: { error: string | null; checked: string | null; loading: boolean }) {
  return <p className="mb-3 text-xs text-slate-400" role={error ? 'alert' : 'status'}>
    {error ? `Unavailable: ${error}. No demo fallback.` : checked ? <>API checked: <Timestamp value={checked} />. This is not the measurement time.</> : loading ? 'Loading canonical data…' : 'No data received.'}
  </p>;
}

export function HydrologySnapshotView({ snapshot, hours, now, loading, onHoursChange, onRefresh }: {
  snapshot: HydrologySnapshot; hours: RainfallWindow; now: number; loading: boolean;
  onHoursChange: (hours: RainfallWindow) => void; onRefresh: () => void;
}) {
  const selectId = useId();
  const rivers = snapshot.rivers.data;
  const rain = snapshot.rainfall.data;
  const health = snapshot.health.data;
  return <section aria-label="Research hydrology monitoring" className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-6 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Waves className="h-5 w-5 text-cyan-400" />Rainfall & river monitoring</h2>
        <p className="mt-1 text-sm text-amber-200">Experimental research view — not an operational public-warning service.</p>
        <p className="mt-1 text-xs text-slate-400">Canonical DHM records only. Partial coverage and missing data do not indicate safety. Times are Nepal Time (UTC+05:45).</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-white disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh data
      </button>
    </div>

    <div>
      <h3 className="font-semibold text-white">Ingestion health {health && <span className={badge}>Last backend status: {health.status}</span>}</h3>
      <ResourceNote error={snapshot.health.error} checked={snapshot.health.checked_at} loading={loading} />
      <p className="mb-3 text-xs text-slate-400">Dashboard reads every 60 seconds; ingestion interval: {health ? `${health.poll_interval_seconds / 60} minutes` : 'unknown'}. Feed success is not a hazard assessment.</p>
      {health && health.feeds.length === 0 && <p className="text-sm text-amber-200">Ingestion has never run. No feed health is available.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {health?.feeds.map(feed => {
          const attemptAge = feed.last_attempt_at ? now - Date.parse(feed.last_attempt_at) : NaN;
          const dataAge = feed.last_data_at ? now - Date.parse(feed.last_data_at) : NaN;
          const schedulerStale = feed.scheduler_stale || !Number.isFinite(attemptAge) || attemptAge < -300_000 || attemptAge > health.poll_interval_seconds * 2000;
          const dataStale = feed.data_stale || !Number.isFinite(dataAge) || dataAge < -300_000 || dataAge > 6 * 3600_000;
          return <article key={feed.feed_key} className="rounded-lg border border-slate-700 p-3 text-xs text-slate-300">
            <h4 className="font-semibold text-white">{feed.feed_key} <span className={badge}>{feed.status}</span></h4>
            <p className="mt-2">Scheduler: {schedulerStale ? 'STALE / unavailable' : 'recent attempt'} · Source data: {dataStale ? 'STALE / unavailable' : 'recent timestamp'}</p>
            <p>Last attempt: <Timestamp value={feed.last_attempt_at} /></p>
            <p>Last successful ingestion: <Timestamp value={feed.last_success_at} /></p>
            <p>Latest source time: <Timestamp value={feed.last_data_at} /></p>
            <p>Consecutive failures: {feed.consecutive_failures} · Source: {feed.source_key}</p>
            {feed.last_error_code && <p className="text-amber-200">Error: {feed.last_error_code}</p>}
          </article>;
        })}
      </div>
    </div>

    <div>
      <h3 className="font-semibold text-white">River gauges {rivers && <span className="text-xs text-slate-400">({rivers.length} registered)</span>}</h3>
      <ResourceNote error={snapshot.rivers.error} checked={snapshot.rivers.checked_at} loading={loading} />
      <p className="mb-3 text-xs text-slate-400">Comparison is reported by the backend using published station thresholds. “Below warning level” does not mean safe; missing or stale assessments are unknown. Partial thresholds are marked.</p>
      {rivers?.length === 0 && <p className="text-sm text-amber-200">No canonical river stations registered.</p>}
      {!!rivers?.length && <p className="mb-2 text-xs text-slate-400 sm:hidden">Scroll the table horizontally for thresholds, timestamps, and sources.</p>}
      {!!rivers?.length && <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable river measurements"><table className="w-full min-w-[900px] text-left text-xs text-slate-300">
        <caption className="sr-only">Canonical river measurements and published thresholds</caption>
        <thead className="bg-slate-800 text-slate-200"><tr>{['Station / basin', 'Stage / discharge', 'Backend comparison', 'Published thresholds', 'Observation / provenance'].map(label => <th scope="col" key={label} className={cell}>{label}</th>)}</tr></thead>
        <tbody>{rivers.map(row => {
          const state = measurementState(row, row.stage_m, now);
          const status = riverStatus(row, now);
          return <tr key={row.id} className="border-b border-slate-800">
            <th scope="row" className={cell}><span className="block text-white">{row.name}</span><span className="font-normal">#{row.station_number} · {row.river} · {row.basin}</span></th>
            <td className={cell}><span className="block">{formatMeasurement(row.stage_m, 'm')}</span><span>{formatMeasurement(row.discharge_cms, 'm³/s')}</span><span className="mt-1 block">{state === 'STALE' ? 'Last known measurement' : state}</span></td>
            <td className={cell}><span className={`${badge} ${status === 'WATCH' || status === 'CRITICAL_SURGE' ? 'text-amber-200' : ''}`}>{statusLabels[status]}</span></td>
            <td className={cell}><p>Warning: {formatMeasurement(row.warning_stage_m, 'm')}</p><p>Danger: {formatMeasurement(row.danger_stage_m, 'm')}</p><p>Quality: {row.threshold_status}</p><p>Retrieved: <Timestamp value={row.threshold_retrieved_at} /></p><SourceLink url={row.threshold_source_url} />{row.threshold_flags.length > 0 && <p className="text-amber-200">{row.threshold_flags.join(', ')}</p>}</td>
            <td className={cell}><p>Observed: <Timestamp value={row.observed_at} /></p><p>Received: <Timestamp value={row.received_at} /></p><p>Source: {row.source_key}</p><p>Quality: {row.quality_status}</p>{row.quality_flags.length > 0 && <p className="text-amber-200">{row.quality_flags.join(', ')}</p>}</td>
          </tr>;
        })}</tbody>
      </table></div>}
    </div>

    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-white flex items-center gap-2"><CloudRain className="h-4 w-4" />Rainfall gauges {rain && <span className="text-xs text-slate-400">({rain.length} registered)</span>}</h3>
        <label htmlFor={selectId} className="text-xs text-slate-300">Accumulation window <select id={selectId} value={hours} onChange={event => onHoursChange(Number(event.target.value) as RainfallWindow)} className="ml-2 rounded border border-slate-600 bg-slate-800 p-2 text-white">{RAINFALL_WINDOWS.map(value => <option key={value} value={value}>{value} hours</option>)}</select></label>
      </div>
      <ResourceNote error={snapshot.rainfall.error} checked={snapshot.rainfall.checked_at} loading={loading} />
      <p className="mb-3 text-xs text-slate-400">Separate {hours}-hour accumulated totals, not rainfall rates. Timestamp basis: latest station observation published by DHM, not independently verified window-end times. No rainfall-based hazard decision is calculated.</p>
      {rain?.length === 0 && <p className="text-sm text-amber-200">No canonical rainfall stations registered.</p>}
      {!!rain?.length && <p className="mb-2 text-xs text-slate-400 sm:hidden">Scroll the table horizontally for timestamps and sources.</p>}
      {!!rain?.length && <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable rainfall measurements"><table className="w-full min-w-[720px] text-left text-xs text-slate-300">
        <caption className="sr-only">{hours}-hour accumulated rainfall measurements</caption>
        <thead className="bg-slate-800 text-slate-200"><tr>{['Station / location', `Rainfall (${hours}h total)`, 'Data quality', 'Observation / provenance'].map(label => <th scope="col" key={label} className={cell}>{label}</th>)}</tr></thead>
        <tbody>{rain.map(row => {
          const state = measurementState(row, row.rainfall_mm, now);
          return <tr key={row.id} className="border-b border-slate-800">
            <th scope="row" className={cell}><span className="block text-white">{row.name}</span><span className="font-normal">{row.station_number ? `#${row.station_number}` : 'Station code unavailable'} · DHM ID {row.dhm_station_id} · {row.basin || 'Basin unavailable'} · {row.district || 'District unavailable'}</span></th>
            <td className={cell}>{formatMeasurement(row.rainfall_mm, 'mm')}{state === 'STALE' && <span className="block">Last known measurement</span>}</td>
            <td className={cell}><span className={badge}>{state}</span><p>{row.quality_status}</p>{row.quality_flags.length > 0 && <p className="text-amber-200">{row.quality_flags.join(', ')}</p>}</td>
            <td className={cell}><p>Observed: <Timestamp value={row.observed_at} /></p><p>Received: <Timestamp value={row.received_at} /></p><p>Source: {row.source_key}</p><SourceLink url={row.source_url} /></td>
          </tr>;
        })}</tbody>
      </table></div>}
    </div>
  </section>;
}

export function HydrologyPanel() {
  const [hours, setHours] = useState<RainfallWindow>(24);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    setSnapshot(emptySnapshot());
    async function poll() {
      setLoading(true);
      const result = await fetchHydrologySnapshot(API_BASE, hours, controller.signal);
      if (controller.signal.aborted) return;
      setSnapshot(result);
      setNow(Date.now());
      setLoading(false);
      timer = setTimeout(poll, DASHBOARD_REFRESH_MS);
    }
    void poll();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [hours, refresh]);
  return <HydrologySnapshotView snapshot={snapshot} hours={hours} now={now} loading={loading} onHoursChange={setHours} onRefresh={() => setRefresh(value => value + 1)} />;
}
