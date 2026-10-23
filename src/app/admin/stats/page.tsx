import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chatAdminMetadata, isChatAdmin } from '@/lib/chat/admin';
import { loadStats } from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  return chatAdminMetadata(session, 'Site stats');
}

const fmt = (v: number | null) => (v == null ? '–' : v.toLocaleString('en-GB'));
const secs = (s: number | null) => (s == null ? '–' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
const money = (pence: number) => `£${(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      {note && <p className="text-sm text-secondary mt-1">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Daily columns, one series: hover (title) gives the day's figures. */
function Columns({ rows, value, tip }: { rows: { day: string }[]; value: (i: number) => number; tip: (i: number) => string }) {
  const max = Math.max(1, ...rows.map((_, i) => value(i)));
  return (
    <div className="card p-4">
      <div className="flex items-end gap-[2px] h-40" role="img" aria-label="Daily chart; the table view is in each column's tooltip">
        {rows.map((r, i) => (
          <div key={r.day} className="flex-1 h-full flex items-end group" title={tip(i)}>
            <div className="w-full rounded-t bg-brand/80 group-hover:bg-brand" style={{ height: `${(value(i) / max) * 100}%`, minHeight: value(i) ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted mt-2">
        <span>{dayLabel(rows[0].day)}</span>
        <span>max {fmt(max)}</span>
        <span>{dayLabel(rows[rows.length - 1].day)}</span>
      </div>
    </div>
  );
}

/** A ranked list with a bar under each value, scaled to the top one. */
function Ranked({ rows, unit, empty = 'Nothing yet.' }: { rows: { label: string; value: number; extra?: string }[]; unit: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="card p-4 text-sm text-secondary">{empty}</p>;
  return (
    <ul className="card divide-y divide-border">
      {rows.map((r) => (
        <li key={r.label} className="px-4 py-2">
          <div className="flex justify-between gap-4 text-sm">
            <span className="truncate text-foreground">{r.label}</span>
            <span className="tabular-nums text-secondary shrink-0">{fmt(r.value)} {unit}{r.extra ? ` · ${r.extra}` : ''}</span>
          </div>
          <div className="h-1 mt-1 rounded bg-surface-secondary"><div className="h-1 rounded bg-brand/70" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number | null)[][] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted">{head.map((h, i) => <th key={h} className={`px-4 py-2 font-medium ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, j) => (
            <tr key={j}>{r.map((c, i) => <td key={i} className={`px-4 py-2 ${i ? 'text-right tabular-nums text-secondary' : 'text-foreground'}`}>{typeof c === 'number' ? fmt(c) : c ?? '–'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) notFound();
  const s = await loadStats();
  const t = s.traffic;
  const appToday = s.app.daily[s.app.daily.length - 1];
  const appWeek = s.app.daily.slice(-7);

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Admin</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">Site stats</h1>
        <p className="text-secondary mt-2">
          Rolling windows: today is the last 24 hours, then the last 7 and 30 days. A visitor is one browser tab session, so a
          person who comes back tomorrow counts twice. Bots are left out.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <Tile label="Visitors, 24 h" value={fmt(t.visitors1)} sub={`${fmt(t.views1)} page views`} />
          <Tile label="Visitors, 7 days" value={fmt(t.visitors7)} sub={`${fmt(t.views7)} page views`} />
          <Tile label="Visitors, 30 days" value={fmt(t.visitors30)} sub={`${fmt(t.views30)} page views · ${secs(t.avgSecs)} a page`} />
          <Tile label="Newsletter" value={fmt(s.newsletter.active)} sub={`+${fmt(s.newsletter.new7)} this week, +${fmt(s.newsletter.new30)} in 30 days, ${fmt(s.newsletter.unsub30)} left`} />
          <Tile label="Accounts" value={fmt(s.members.total)} sub={`+${fmt(s.members.new30)} in 30 days`} />
          <Tile label="Paying members" value={fmt(s.members.paying)} sub="Premium or Pro, not lapsed" />
          <Tile label="Shop, 30 days" value={money(s.orders.pence30)} sub={`${fmt(s.orders.orders30)} orders · ${money(s.orders.penceAll)} all time`} />
          <Tile label="iPhone app today" value={fmt(appToday.devices)} sub={`devices · ${fmt(s.app.pushDevices)} with push`} />
        </div>

        <Section title="Visitors per day" note="Last 30 days. Hover a column for the figures.">
          <Columns rows={s.daily} value={(i) => s.daily[i].visitors} tip={(i) => `${dayLabel(s.daily[i].day)}: ${fmt(s.daily[i].visitors)} visitors, ${fmt(s.daily[i].views)} page views`} />
        </Section>

        <Section title="Most-read blog posts" note="Ordered by the last 30 days. Readers are tab sessions; time is the average on the page.">
          <Table head={['Post', 'Views, 30 d', 'Readers', 'Avg time', 'All time']}
            rows={s.blog.map((p) => [p.title, p.views30, p.readers30, secs(p.avgSecs), p.viewsAll])} />
        </Section>

        <Section title="Most-read news" note="Last 30 days; stories from the last 90.">
          <Table head={['Story', 'Views, 30 d', 'Readers', 'Avg time']} rows={s.news.map((p) => [p.title, p.views30, p.readers30, secs(p.avgSecs)])} />
        </Section>

        <Section title="Tools and games" note="A use is the moment it does its job (a calculation, a search, a quiz finished), not just opening the page. Tool events started on 23 Oct 2026, so earlier uses aren't counted; quiz, Fartlex and assistant come from their own records. Sign-in walls: uses stopped by the sign-in box.">
          <Table head={['Tool', 'Uses, 7 d', 'Uses, 30 d', 'People, 30 d', 'Sign-in walls', 'Page views, 30 d']}
            rows={s.tools.map((x) => [x.name, x.measured ? x.uses7 ?? 0 : null, x.measured ? x.uses30 ?? 0 : null, x.measured ? x.people30 : null, x.walls30, x.views30])} />
          {s.toolDetails.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div><h3 className="text-sm font-medium text-foreground mb-2">Which calculator</h3>
                <Ranked unit="uses" rows={s.toolDetails.filter((d) => d.tool === 'calculators').map((d) => ({ label: d.detail, value: d.uses }))} /></div>
              <div><h3 className="text-sm font-medium text-foreground mb-2">Races opened on the map</h3>
                <Ranked unit="opens" rows={s.toolDetails.filter((d) => d.tool === 'race-map').slice(0, 10).map((d) => ({ label: d.detail, value: d.uses }))} /></div>
            </div>
          )}
        </Section>

        <Section title="iPhone app" note="Devices are estimated: the app sends no install id, so a device is its network and app version for the day. Push: production devices with notifications registered.">
          <Columns rows={s.app.daily} value={(i) => s.app.daily[i].devices} tip={(i) => `${dayLabel(s.app.daily[i].day)}: ${fmt(s.app.daily[i].devices)} devices, ${fmt(s.app.daily[i].calls)} requests`} />
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <Tile label="Devices, avg a day (7 d)" value={fmt(Math.round(appWeek.reduce((a, d) => a + d.devices, 0) / 7))} />
            <Tile label="Push devices" value={fmt(s.app.pushDevices)} sub={`${fmt(s.app.newsOn)} with the news push on`} />
            <Tile label="Push devices seen, 30 d" value={fmt(s.app.seen30)} />
          </div>
          <h3 className="text-sm font-medium text-foreground mt-4 mb-2">What the app asks for (30 days)</h3>
          <Ranked unit="requests" rows={s.app.routes} empty="No app requests recorded yet (counting started 23 Oct 2026)." />
        </Section>

        <div className="grid sm:grid-cols-2 gap-x-6">
          <Section title="Where visitors come from" note="Referring sites, last 30 days.">
            <Ranked unit="visits" rows={s.referrers} />
          </Section>
          <Section title="Outbound clicks" note="Links to other sites (shops, discounts, YouTube, Strava), last 30 days.">
            <Ranked unit="clicks" rows={s.outbound.map((r) => ({ label: r.label, value: r.value, extra: `${fmt(r.people)} people` }))} empty="None yet (counting started 23 Oct 2026)." />
          </Section>
          <Section title="Newsletter sign-ups by source" note="Active subscribers; + is new in the last 30 days.">
            <Ranked unit="active" rows={s.sources.map((r) => ({ label: r.label, value: r.value, extra: `+${fmt(r.new30)}` }))} />
          </Section>
          <Section title="Countries" note="Visitors, last 30 days.">
            <Ranked unit="visitors" rows={s.countries} />
          </Section>
          <Section title="Devices" note="Visitors, last 30 days.">
            <Ranked unit="visitors" rows={s.devices} />
          </Section>
        </div>

        <Section title="Top pages" note="Every page, last 30 days.">
          <Table head={['Page', 'Views', 'Visitors']} rows={s.pages.map((p) => [p.path, p.views, p.visitors])} />
        </Section>
      </div>
    </main>
  );
}
