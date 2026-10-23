// Records a site event (/api/track/event, table site_events) for /admin/stats. Fire and forget: tracking never
// breaks the page. `label` is what the stats group by (the tool, the host), `detail` the specifics.
export function track(name: 'tool' | 'outbound', label: string, detail?: string) {
  if (typeof window === 'undefined' || /bot|crawler|spider/i.test(navigator.userAgent)) return;
  const body = JSON.stringify({ name, label, detail, path: location.pathname, sessionId: sessionStorage.getItem('fmr_sid') });
  if (navigator.sendBeacon?.('/api/track/event', new Blob([body], { type: 'application/json' }))) return;
  fetch('/api/track/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
