import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
  Eye, EyeOff, Search, AlertTriangle, ChevronRight, ChevronDown, X,
  Mail, Shield, Send, Download, Ban, Check,
  Layers, MapPin, Phone, Clock, Copy, Building2, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { useScope } from './ScopeContext';
import {
  typeConfig, statusConfig, StatusBadge, isEntityUnmanaged, getDisplayType,
  pkgIconMap, defaultPkgIcon,
} from './config';
import { mockData, collectPackageAdoption } from './data';

/*
  Customer Management C
  =====================
  A single recursive page that looks the same at every level
  (root → distributor → reseller/partner → customer):

      Scope Navigator (global breadcrumb, reused from App)
      Identity header
      Summary band (the "dashboard" for the current scope)
      Package adoption
      Directory (scale-adaptive, virtualized find-and-act surface)

  C changes only presentation/interaction — it reads the SAME entities B
  reads (see data.js). The prototype's entity model is the source of truth,
  so every value below maps to a real field:

    entity.type               'distributor' | 'partner' | 'customer'
    entity.partnerCapability  'msp' | 'reseller' | 'hybrid'   (partners)
    entity.managementMode     'managed' | 'unmanaged'         (customers / distributors)
    entity.status             'active' | 'trial' | 'suspended'
    entity.region, .lastActive, .address, .contact
    entity.devices, .threatsBlocked
    entity.business.seatsLicensed / .seatsConsumed            (declared / in-use seats)
    entity.business.productAdoption.{endpoint,emailSecurity,safeSend}
                              .subscribers (declared seats), .avgUtilization (%)
    entity.operations.criticalIssues / .complianceScore

  Visibility rule: money counts every customer; security counts only the
  watchable (fully-managed) path. One unmanaged link (an unmanaged customer,
  a reseller-capability partner, or an unmanaged distributor anywhere on the
  path) drops that subtree from ops/console — never from billing.
*/

// ── Tokens / small helpers ─────────────────────────────────────────────
const ROW_H = { compact: 48, comfortable: 64 };
const VIEWPORT_H = 560; // directory virtual-scroller height (px)
const OVERSCAN = 6;

// The three VIPRE product families carried by every customer. Icons + colors
// mirror Customer Management B's per-product cards (EntityDetail): Endpoint =
// Shield/blue, Email Security = Mail/violet, SafeSend = Send/emerald.
const FAMILIES = [
  { key: 'endpoint', label: 'Endpoint', category: 'endpoint', Icon: Shield, color: 'text-blue-500' },
  { key: 'emailSecurity', label: 'Email Security', category: 'email', Icon: Mail, color: 'text-violet-500' },
  { key: 'safeSend', label: 'SafeSend', category: 'email', Icon: Send, color: 'text-emerald-500' },
];

// Category-level signal (compact directory rows). Endpoint blue, Email violet —
// same palette as B.
const CATEGORY_ICON = {
  endpoint: { Icon: Shield, color: 'text-blue-500' },
  email: { Icon: Mail, color: 'text-violet-500' },
};

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

// Unmanaged = billing-only (see config.isEntityUnmanaged).
const isUnmanaged = (e) => isEntityUnmanaged(e);

// Resolve an entity to its DISPLAY config (icon / tile color / label).
// Three-tier model: getDisplayType collapses every partner to 'reseller', so
// partners render with the unified Reseller look (Network / red-600) —
// identical to Customer Management B. Distributors and customers resolve normally.
const cfgFor = (entity) => typeConfig[getDisplayType(entity)] ?? typeConfig[entity.type] ?? typeConfig.customer;

function utilTone(pct) {
  if (pct >= 70) return 'green';
  if (pct >= 50) return 'amber';
  return 'red';
}
const TONE_FILL = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };
const TONE_TEXT = {
  green: 'text-green-700 dark:text-green-400',
  amber: 'text-amber-700 dark:text-amber-400',
  red: 'text-red-700 dark:text-red-400',
};

// Recency ordering: larger = more recent. lastActive is an ISO string.
function recencyValue(e) {
  const t = e?.lastActive ? new Date(e.lastActive).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

// ── Tiny presentational primitives ─────────────────────────────────────
function UtilBar({ pct, width = 88 }) {
  const tone = utilTone(pct);
  return (
    <span
      className="inline-block rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden align-middle"
      style={{ width, height: 6 }}
    >
      <span className={`block h-full rounded-full ${TONE_FILL[tone]}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

function ManagedTag({ entity, withLabel = false }) {
  // Eye / EyeOff makes managed vs unmanaged obvious and meaningful.
  const unmanaged = isUnmanaged(entity);
  const Icon = unmanaged ? EyeOff : Eye;
  return (
    <span
      className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-medium"
      style={{ fontSize: 11 }}
      title={unmanaged ? 'Billing only — no console / ops' : 'Managed'}
    >
      <Icon style={{ width: 13, height: 13 }} />
      {withLabel && (unmanaged ? 'Billing only' : 'Managed')}
    </span>
  );
}

function TypeTag({ children }) {
  return (
    <span
      className="inline-flex items-center rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wide font-medium"
      style={{ fontSize: 10, padding: '2px 5px' }}
    >
      {children}
    </span>
  );
}

function TierIcon({ entity, size = 16 }) {
  const cfg = cfgFor(entity);
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center justify-center rounded-md ${cfg.bg} flex-shrink-0`} style={{ width: size + 8, height: size + 8 }}>
      <Icon className="text-white" style={{ width: size - 2, height: size - 2 }} />
    </span>
  );
}

function MetricTile({ label, value, sub, tone }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-2.5">
      <div className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 11 }}>{label}</div>
      <div className={`font-semibold tabular-nums ${tone || 'text-zinc-900 dark:text-zinc-100'}`} style={{ fontSize: 19, marginTop: 2 }}>{value}</div>
      {sub && <div className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ── Aggregation (faithful to the real fields) ───────────────────────────
// Walk the subtree below `scope`, seeding watchability. Money counts every
// customer; security counts only watchable customers.
function aggregateScope(scope, children) {
  const counts = { distributor: 0, partner: 0, customer: 0 };
  const status = { active: 0, trial: 0, suspended: 0 };
  let seatsDeclared = 0, seatsActual = 0;
  let customerTotal = 0, watchableCustomers = 0, excludedCustomers = 0;
  let devices = 0, threats = 0, critical = 0, complianceSum = 0, complianceN = 0, attention = 0;
  const fams = {};
  for (const f of FAMILIES) fams[f.key] = { declared: 0, actual: 0, customers: 0, breakdown: [] };

  // If the scope itself is an unmanaged link, its whole subtree is billing-only.
  const seed = scope ? !isUnmanaged(scope) : true;

  const walk = (nodes, watchable) => {
    for (const n of nodes) {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
      if (status[n.status] !== undefined) status[n.status]++;
      const w = watchable && !isUnmanaged(n);

      if (n.type === 'customer') {
        customerTotal++;
        const b = n.business || {};
        seatsDeclared += b.seatsLicensed || 0;
        seatsActual += b.seatsConsumed || 0;
        const pa = b.productAdoption || {};
        for (const f of FAMILIES) {
          const fam = pa[f.key];
          if (fam && fam.subscribers > 0) {
            const used = Math.round(fam.subscribers * (fam.avgUtilization || 0) / 100);
            fams[f.key].declared += fam.subscribers;
            fams[f.key].actual += used;
            fams[f.key].customers += 1;
            fams[f.key].breakdown.push({ id: n.id, name: n.name, declared: fam.subscribers, actual: used, managed: w });
          }
        }
        if (w) {
          watchableCustomers++;
          const op = n.operations || {};
          devices += n.devices || 0;
          threats += n.threatsBlocked || 0;
          critical += op.criticalIssues || 0;
          if (op.complianceScore) { complianceSum += op.complianceScore; complianceN++; }
          if ((op.criticalIssues || 0) > 0) attention++;
        } else {
          excludedCustomers++;
        }
      }
      if (n.children?.length) walk(n.children, w);
    }
  };
  walk(children || [], seed);

  return {
    counts, status,
    seatsDeclared, seatsActual,
    utilPct: seatsDeclared > 0 ? Math.round((seatsActual / seatsDeclared) * 100) : 0,
    customerTotal, watchableCustomers, excludedCustomers,
    devices, threats, critical,
    compliance: complianceN ? Math.round(complianceSum / complianceN) : 0,
    attention,
    families: FAMILIES.map((f) => {
      const a = fams[f.key];
      return {
        ...f,
        customers: a.customers,
        declared: a.declared,
        actual: a.actual,
        util: a.declared > 0 ? Math.round((a.actual / a.declared) * 100) : 0,
        breakdown: a.breakdown,
      };
    }),
  };
}

// Light per-child rollup for directory rows.
function subtreeRollup(node, watchable) {
  let declared = 0, actual = 0, customers = 0, attention = 0;
  const walk = (n, w) => {
    const ww = w && !isUnmanaged(n);
    if (n.type === 'customer') {
      customers++;
      const b = n.business || {};
      declared += b.seatsLicensed || 0;
      actual += b.seatsConsumed || 0;
      if (ww && (n.operations?.criticalIssues || 0) > 0) attention++;
    }
    if (n.children?.length) for (const c of n.children) walk(c, ww);
  };
  walk(node, watchable);
  return { declared, actual, customers, attention, util: declared > 0 ? Math.round((actual / declared) * 100) : 0 };
}

function customerFamilies(entity) {
  const pa = entity?.business?.productAdoption || {};
  return FAMILIES.filter((f) => pa[f.key]?.subscribers > 0);
}

// ── Identity header ─────────────────────────────────────────────────────
function IdentityHeader({ scope }) {
  if (!scope) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100" style={{ width: 40, height: 40 }}>
          <Layers className="text-white dark:text-zinc-900" style={{ width: 20, height: 20 }} />
        </span>
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontSize: 18 }}>All Accounts</h2>
          <p className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 13 }}>Everything you can see.</p>
        </div>
      </div>
    );
  }

  const cfg = cfgFor(scope);
  const Icon = cfg.Icon;
  const unmanaged = isUnmanaged(scope);
  const contact = scope.contact;
  const addr = scope.address;

  return (
    <div className="flex items-start gap-3">
      <span className={`inline-flex items-center justify-center rounded-xl ${cfg.bg} flex-shrink-0`} style={{ width: 44, height: 44 }}>
        <Icon className="text-white" style={{ width: 22, height: 22 }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" style={{ fontSize: 18 }}>{scope.name}</h2>
          <TypeTag>{cfg.label}</TypeTag>
          <StatusBadge status={scope.status} />
          <ManagedTag entity={scope} withLabel />
        </div>
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-zinc-500 dark:text-zinc-400" style={{ fontSize: 12, marginTop: 6 }}>
          {scope.region && <span className="inline-flex items-center gap-1"><MapPin style={{ width: 12, height: 12 }} />{scope.region}</span>}
          {scope.lastActive && <span className="inline-flex items-center gap-1"><Clock style={{ width: 12, height: 12 }} />Active {new Date(scope.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {addr?.city && <span className="inline-flex items-center gap-1"><Building2 style={{ width: 12, height: 12 }} />{addr.city}{addr.country ? `, ${addr.country}` : ''}</span>}
          <span className="inline-flex items-center gap-1"><Copy style={{ width: 12, height: 12 }} /><span className="font-mono truncate" style={{ maxWidth: 160 }}>{scope.id}</span></span>
          {contact && <span className="inline-flex items-center gap-1"><Phone style={{ width: 12, height: 12 }} />{contact.firstName} {contact.lastName}</span>}
        </div>
        {unmanaged && (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-1" style={{ fontSize: 11, marginTop: 8 }}>
            <EyeOff style={{ width: 12, height: 12 }} />
            Billing only — no console, ops, or analytics for this account.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary band (the merged dashboard for the current scope) ───────────
function SummaryBand({ agg }) {
  const { counts, status, customerTotal } = agg;
  const statusTotal = status.active + status.trial + status.suspended || 1;
  const segs = [
    { key: 'active', n: status.active, color: 'bg-green-500' },
    { key: 'trial', n: status.trial, color: 'bg-amber-500' },
    { key: 'suspended', n: status.suspended, color: 'bg-red-500' },
  ];

  return (
    // Chromeless: rendered inside the page's single tabbed container.
    <div className="p-4">
      {/* These chips roll up the ENTIRE subtree (every level below this scope),
          so they intentionally differ from the directory facet counts, which
          only tally the direct rows on the list. The caption below makes the
          distinction explicit. */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
        <CountChip Icon={typeConfig.distributor.Icon} label="Distributors" value={counts.distributor} />
        <CountChip Icon={typeConfig.reseller.Icon} label="Resellers" value={counts.partner} />
        <CountChip Icon={typeConfig.customer.Icon} label="Customers" value={counts.customer} />
        {agg.attention > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 px-2 py-1 font-medium" style={{ fontSize: 12 }}>
            <AlertTriangle style={{ width: 13, height: 13 }} />
            {agg.attention} need attention
          </span>
        )}
      </div>
      <p className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11, marginBottom: 14 }}>
        Totals across all levels below this scope.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <MetricTile label="Seats declared" value={fmt(agg.seatsDeclared)} sub="across all accounts" />
        <MetricTile label="Utilization" value={`${agg.utilPct}%`} sub={`${fmt(agg.seatsActual)} in use`} tone={TONE_TEXT[utilTone(agg.utilPct)]} />
        <MetricTile label="Devices" value={fmt(agg.devices)} sub="watchable only" />
        <MetricTile label="Compliance" value={agg.compliance ? `${agg.compliance}%` : '—'} sub={`${fmt(agg.threats)} threats blocked`} />
      </div>

      {agg.excludedCustomers > 0 && (
        <p className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11, marginTop: 8 }}>
          Security metrics exclude {fmt(agg.excludedCustomers)} unmanaged {agg.excludedCustomers === 1 ? 'account' : 'accounts'} (billing only). Seats &amp; utilization count everyone.
        </p>
      )}

      {customerTotal > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400" style={{ fontSize: 11, marginBottom: 4 }}>
            <span>Status distribution</span>
            <span className="tabular-nums">{fmt(statusTotal)} accounts</span>
          </div>
          {/* gap-1 separates each segment; each segment is its own rounded pill */}
          <div className="flex w-full items-center gap-1" style={{ height: 8 }}>
            {segs.map((s) => s.n > 0 && (
              <span key={s.key} className={`${s.color} rounded-full`} style={{ height: '100%', width: `${(s.n / statusTotal) * 100}%` }} title={`${statusConfig[s.key].label}: ${s.n}`} />
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-zinc-500 dark:text-zinc-400" style={{ fontSize: 11, marginTop: 6 }}>
            {segs.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span className={`rounded-full ${s.color}`} style={{ width: 7, height: 7 }} />
                {statusConfig[s.key].label} <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{fmt(s.n)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CountChip({ Icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1" style={{ fontSize: 12 }}>
      <Icon className="text-zinc-400 dark:text-zinc-500" style={{ width: 13, height: 13 }} />
      <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{fmt(value)}</span>
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
    </span>
  );
}

// ── Package adoption ────────────────────────
// Reads the SAME shared source as Customer Management B (collectPackageAdoption),
// so C lists B's real VIPRE packages and reflects the per-reseller package mix
// B uses. Each row is a real package { id, name, entities (=customers),
// seats (=seats in use), avgUtil }. Flat list, no product-type grouping: B's
// packages are commercial SKUs that cut across Endpoint / Email / SafeSend.
function PackageAdoption({ adoption }) {
  const [sort, setSort] = useState('adopted');
  const [selected, setSelected] = useState(null); // package row opens the right drawer

  const rows = useMemo(() => {
    const r = [...(adoption?.packages || [])];
    const sorters = {
      adopted: (a, b) => b.entities - a.entities,
      seats: (a, b) => b.seats - a.seats,
      util: (a, b) => a.avgUtil - b.avgUtil,
    };
    return r.sort(sorters[sort]);
  }, [adoption, sort]);

  if (!rows.length) {
    return (
      <div className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400" style={{ fontSize: 13 }}>
        No package adoption in this scope.
      </div>
    );
  }

  return (
    <>
    {/* Chromeless: rendered inside the page's single tabbed container. The tab
        strip already labels this, so just the summary line + sort control. */}
    <div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-wrap">
        <p className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 12 }}>
          {rows.length} {rows.length === 1 ? 'package' : 'packages'} {"·"} {fmt(adoption.totalSeats || 0)} seats in use {"·"} {adoption.avgUtil || 0}% avg utilization
        </p>
        <LabeledSelect label="Sort" value={sort} onChange={setSort} options={[{ v: 'adopted', l: 'Most adopted' }, { v: 'seats', l: 'Most seats' }, { v: 'util', l: 'Lowest utilization' }]} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800" style={{ fontSize: 11 }}>
        <span className="flex-1">Package</span>
        <span className="text-right tabular-nums" style={{ width: 90 }}>Customers</span>
        <span className="text-right tabular-nums" style={{ width: 90 }}>Seats</span>
        <span style={{ width: 120 }}>Utilization</span>
        <span className="text-right tabular-nums" style={{ width: 44 }}>Util</span>
        <span style={{ width: 16 }} />
      </div>

      <div>
        {rows.map((r) => {
          const { icon: PkgIcon, color: pkgColor } = pkgIconMap[r.id] || defaultPkgIcon;
          const isOpen = selected?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors cursor-pointer ${
                isOpen ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <span className="flex-1 inline-flex items-center gap-2 min-w-0">
                <PkgIcon className={`${pkgColor} flex-shrink-0`} style={{ width: 15, height: 15 }} />
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate" style={{ fontSize: 13 }}>{r.name}</span>
              </span>
              <span className="text-right tabular-nums text-zinc-700 dark:text-zinc-300" style={{ width: 90, fontSize: 13 }}>{fmt(r.entities)}</span>
              <span className="text-right tabular-nums text-zinc-500 dark:text-zinc-400" style={{ width: 90, fontSize: 13 }}>{fmt(r.seats)}</span>
              <span className="inline-flex items-center" style={{ width: 120 }}>
                <UtilBar pct={r.avgUtil} width={108} />
              </span>
              <span className={`text-right tabular-nums font-medium ${TONE_TEXT[utilTone(r.avgUtil)]}`} style={{ width: 44, fontSize: 13 }}>{r.avgUtil}%</span>
              <ChevronRight className="text-zinc-300 dark:text-zinc-600 flex-shrink-0" style={{ width: 16, height: 16 }} />
            </button>
          );
        })}
      </div>
    </div>

    {selected && <PackageDrawer pkg={selected} adoption={adoption} onClose={() => setSelected(null)} />}
    </>
  );
}


// Shared elegant slide-in/out for every right-hand drawer. Mounts off-screen,
// flips `show` true on the next frame so the CSS transition runs; on close,
// flips false and defers the actual unmount (onClose) until the exit animation
// finishes — so opening AND closing both animate. Esc closes too. Returns the
// knobs each drawer applies to its backdrop + aside.
function useDrawerTransition(onClose) {
  const ANIM_MS = 280;
  const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'; // quick to start, gentle to settle
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = useCallback(() => {
    setShow(false);
    setTimeout(onClose, ANIM_MS);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return { show, close, ANIM_MS, EASE };
}

// Right slide-out drawer for a single package, sharing the same animated shell
// as DetailPeek so the two read as one system. Reads from collectPackageAdoption
// (B's source): rolled-up totals for the package across this scope, plus the
// managed vs unmanaged seat split when the scope exposes those buckets
// (partner / distributor / root).
function PackageDrawer({ pkg, adoption, onClose }) {
  const { icon: PkgIcon, color: pkgColor } = pkgIconMap[pkg.id] || defaultPkgIcon;

  // Slide-in / slide-out: mount off-screen, flip show true on the next frame so
  // the CSS transition runs; on close, flip false and unmount only after the
  // transition finishes, so the exit animates too.
  const ANIM_MS = 280;
  const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = useCallback(() => {
    setShow(false);
    setTimeout(onClose, ANIM_MS);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const managedRow = adoption?.managed?.packages?.find((p) => p.id === pkg.id);
  const unmanagedRow = adoption?.unmanaged?.packages?.find((p) => p.id === pkg.id);
  const hasSplit = !!(managedRow || unmanagedRow);
  const managedSeats = managedRow?.seats || 0;
  const unmanagedSeats = unmanagedRow?.seats || 0;
  const splitTotal = managedSeats + unmanagedSeats || 1;
  const shareOfSeats = adoption?.totalSeats ? Math.round((pkg.seats / adoption.totalSeats) * 100) : null;

  return (
    <>
      {/* Backdrop fades with the panel; click closes. */}
      <div
        onClick={close}
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity"
        style={{ opacity: show ? 1 : 0, transitionDuration: ANIM_MS + 'ms', transitionTimingFunction: EASE }}
      />
      {/* Panel slides in from the right. */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
        style={{ width: 400, transform: show ? 'translateX(0)' : 'translateX(100%)', transition: 'transform ' + ANIM_MS + 'ms ' + EASE }}
      >
        <div className="flex items-start gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <span className="inline-flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 flex-shrink-0" style={{ width: 36, height: 36 }}>
            <PkgIcon className={pkgColor} style={{ width: 18, height: 18 }} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" style={{ fontSize: 15 }}>{pkg.name}</h3>
            <p className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 12, marginTop: 2 }}>{fmt(pkg.entities)} {pkg.entities === 1 ? 'customer' : 'customers'} in this scope</p>
          </div>
          <button onClick={close} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex-shrink-0" aria-label="Close">
            <X className="text-zinc-500 dark:text-zinc-400" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Rolled-up totals for this package across the scope */}
          <div className="grid grid-cols-2 gap-2.5">
            <MetricTile label="Customers" value={fmt(pkg.entities)} />
            <MetricTile label="Seats in use" value={fmt(pkg.seats)} />
            <MetricTile label="Utilization" value={pkg.avgUtil + '%'} tone={TONE_TEXT[utilTone(pkg.avgUtil)]} />
            <MetricTile label="Share of seats" value={shareOfSeats === null ? '-' : shareOfSeats + '%'} sub="of all packages" />
          </div>

          {/* Managed vs unmanaged seat split (only when the scope exposes buckets) */}
          {hasSplit && (
            <div>
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide" style={{ fontSize: 11, marginBottom: 8 }}>Managed vs unmanaged seats</h4>
              <div className="flex w-full items-center gap-1" style={{ height: 8, marginBottom: 8 }}>
                {managedSeats > 0 && <span className="bg-blue-500 rounded-full" style={{ height: '100%', width: ((managedSeats / splitTotal) * 100) + '%' }} title={'Managed: ' + managedSeats} />}
                {unmanagedSeats > 0 && <span className="bg-zinc-400 dark:bg-zinc-600 rounded-full" style={{ height: '100%', width: ((unmanagedSeats / splitTotal) * 100) + '%' }} title={'Unmanaged: ' + unmanagedSeats} />}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300"><Eye style={{ width: 13, height: 13 }} /> Managed</span>
                  <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{fmt(managedSeats)} seats {"·"} {managedRow?.avgUtil || 0}%</span>
                </div>
                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"><EyeOff style={{ width: 13, height: 13 }} /> Unmanaged (billing only)</span>
                  <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{fmt(unmanagedSeats)} seats {"·"} {unmanagedRow?.avgUtil || 0}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
// ── Shared form controls ────────────────────────────────────────────────
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 transition-colors cursor-pointer ${value === o.v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          style={{ fontSize: 12 }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400" style={{ fontSize: 12 }}>
      <span>{label}</span>
      <span className="relative inline-flex items-center">
        {/* appearance-none + custom Lucide chevron so the control matches the
            Segmented / FacetButton family (rounded-lg border, hover tint, blue
            focus ring) instead of the native OS select chrome. */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 cursor-pointer outline-none transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
          style={{ fontSize: 12, padding: '5px 26px 5px 9px' }}
        >
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute text-zinc-400 dark:text-zinc-500" style={{ width: 13, height: 13, right: 8 }} />
      </span>
    </label>
  );
}

function FacetButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors cursor-pointer ${active ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
      style={{ fontSize: 12 }}
    >
      {children}
    </button>
  );
}

// ── Directory (scale-adaptive, virtualized) ─────────────────────────────
function Directory({ scope, children, seed, onOpenScope, onPeek, peekedId }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('attention');
  const [density, setDensity] = useState('compact');
  const [typeFacet, setTypeFacet] = useState('all');
  const [statusFacet, setStatusFacet] = useState('any');
  const [attnOnly, setAttnOnly] = useState(false);
  const [unmanagedOnly, setUnmanagedOnly] = useState(false);
  const [productFacet, setProductFacet] = useState('all');
  const [selected, setSelected] = useState(() => new Set());

  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Per-child rollup, memoized so a 2,600-row reseller is walked once.
  const meta = useMemo(() => {
    const m = new Map();
    for (const c of children) {
      const watchable = seed && !isUnmanaged(c);
      m.set(c.id, { ...subtreeRollup(c, seed), watchable });
    }
    return m;
  }, [children, seed]);

  const typeCounts = useMemo(() => {
    const t = { distributor: 0, partner: 0, customer: 0 };
    for (const c of children) t[c.type] = (t[c.type] ?? 0) + 1;
    return t;
  }, [children]);

  // NOTE: production debounces this input and queries the whole subtree on the
  // server (paginated). Here it filters the in-memory child set synchronously.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = children.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (typeFacet !== 'all' && c.type !== typeFacet) return false;
      if (statusFacet !== 'any' && c.status !== statusFacet) return false;
      if (unmanagedOnly && !isUnmanaged(c)) return false;
      if (attnOnly && !(meta.get(c.id)?.attention > 0)) return false;
      if (productFacet !== 'all') {
        if (c.type !== 'customer') return false;
        if (!(c.business?.productAdoption?.[productFacet]?.subscribers > 0)) return false;
      }
      return true;
    });
    const tierRank = { distributor: 0, partner: 1, customer: 2 };
    const sorters = {
      attention: (a, b) => ((meta.get(b.id)?.attention > 0) - (meta.get(a.id)?.attention > 0)) || ((meta.get(a.id)?.util ?? 0) - (meta.get(b.id)?.util ?? 0)),
      // Entity type: Distributor → Reseller → Customer, then A–Z within each.
      type: (a, b) => (tierRank[a.type] - tierRank[b.type]) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      util: (a, b) => (meta.get(a.id)?.util ?? 0) - (meta.get(b.id)?.util ?? 0),
      recent: (a, b) => recencyValue(b) - recencyValue(a),
      seats: (a, b) => (meta.get(b.id)?.declared ?? 0) - (meta.get(a.id)?.declared ?? 0),
    };
    list = [...list].sort((a, b) => sorters[sort](a, b) || (tierRank[a.type] - tierRank[b.type]));
    return list;
  }, [children, search, sort, typeFacet, statusFacet, attnOnly, unmanagedOnly, productFacet, meta]);

  // Reset scroll when the result set or scope changes; clear selection on scope change.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [search, sort, typeFacet, statusFacet, attnOnly, unmanagedOnly, productFacet, scope?.id]);
  useEffect(() => { setSelected(new Set()); }, [scope?.id]);

  const rowH = ROW_H[density];
  const total = filtered.length;
  const start = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
  const end = Math.min(total, Math.ceil((scrollTop + VIEWPORT_H) / rowH) + OVERSCAN);
  const visible = filtered.slice(start, end);

  const anyFilter = search || typeFacet !== 'all' || statusFacet !== 'any' || attnOnly || unmanagedOnly || productFacet !== 'all';
  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someSelected = filteredIds.some((id) => selected.has(id));

  const toggleRow = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = () => {
    setSelected((prev) => {
      if (filteredIds.every((id) => prev.has(id))) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  };
  const clearAll = () => {
    setSearch(''); setSort('attention'); setTypeFacet('all'); setStatusFacet('any');
    setAttnOnly(false); setUnmanagedOnly(false); setProductFacet('all');
  };

  return (
    // Chromeless: rendered inside the page's single tabbed container.
    <div>
      {/* Find + filter toolbar */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1" style={{ minWidth: 220 }}>
            <Search className="absolute text-zinc-400 dark:text-zinc-500" style={{ width: 15, height: 15, left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name…"
              aria-label="Search accounts by name"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-400"
              style={{ fontSize: 13, padding: '7px 10px 7px 32px' }}
            />
          </div>
          <LabeledSelect
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { v: 'attention', l: 'Needs attention first' },
              { v: 'type', l: 'Type · Dist → Resel → Cust' },
              { v: 'name', l: 'Name A–Z' },
              { v: 'util', l: 'Lowest utilization' },
              { v: 'recent', l: 'Recently active' },
              { v: 'seats', l: 'Most seats' },
            ]}
          />
          <Segmented value={density} onChange={setDensity} options={[{ v: 'compact', l: 'Compact' }, { v: 'comfortable', l: 'Comfortable' }]} />
        </div>

        {/* Facets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FacetButton active={typeFacet === 'all'} onClick={() => setTypeFacet('all')}>All</FacetButton>
          {typeCounts.distributor > 0 && <FacetButton active={typeFacet === 'distributor'} onClick={() => setTypeFacet(typeFacet === 'distributor' ? 'all' : 'distributor')}>Distributors <span className="tabular-nums opacity-60">{typeCounts.distributor}</span></FacetButton>}
          {typeCounts.partner > 0 && <FacetButton active={typeFacet === 'partner'} onClick={() => setTypeFacet(typeFacet === 'partner' ? 'all' : 'partner')}>Resellers <span className="tabular-nums opacity-60">{typeCounts.partner}</span></FacetButton>}
          {typeCounts.customer > 0 && <FacetButton active={typeFacet === 'customer'} onClick={() => setTypeFacet(typeFacet === 'customer' ? 'all' : 'customer')}>Customers <span className="tabular-nums opacity-60">{typeCounts.customer}</span></FacetButton>}

          <span className="self-stretch bg-zinc-200 dark:bg-zinc-700 mx-1" style={{ width: 1 }} />

          <LabeledSelect label="Status" value={statusFacet} onChange={setStatusFacet} options={[{ v: 'any', l: 'Any' }, { v: 'active', l: 'Active' }, { v: 'trial', l: 'Trial' }, { v: 'suspended', l: 'Suspended' }]} />
          <LabeledSelect label="Product" value={productFacet} onChange={setProductFacet} options={[{ v: 'all', l: 'Any' }, ...FAMILIES.map((f) => ({ v: f.key, l: f.label }))]} />
          <FacetButton active={attnOnly} onClick={() => setAttnOnly((v) => !v)}><AlertTriangle style={{ width: 12, height: 12 }} /> Needs attention</FacetButton>
          <FacetButton active={unmanagedOnly} onClick={() => setUnmanagedOnly((v) => !v)}><EyeOff style={{ width: 12, height: 12 }} /> Unmanaged</FacetButton>
          {anyFilter && (
            <button onClick={clearAll} className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer px-1" style={{ fontSize: 12 }}>
              <X style={{ width: 12, height: 12 }} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Select-all + count, or bulk action bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30" style={{ minHeight: 42 }}>
        <button onClick={toggleAll} className="flex items-center gap-2 cursor-pointer" aria-label="Select all in view">
          <CheckBox checked={allSelected} partial={!allSelected && someSelected} />
        </button>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="font-medium text-zinc-700 dark:text-zinc-300" style={{ fontSize: 12 }}>{fmt(selected.size)} selected</span>
            <span className="self-stretch bg-zinc-200 dark:bg-zinc-700" style={{ width: 1 }} />
            {/* Bulk actions — placeholders; wired to the API in production. */}
            <BulkBtn onClick={() => {}}><ShieldCheck style={{ width: 13, height: 13 }} /> Apply policy</BulkBtn>
            <BulkBtn onClick={() => {}}><Download style={{ width: 13, height: 13 }} /> Export</BulkBtn>
            <BulkBtn onClick={() => {}} danger><Ban style={{ width: 13, height: 13 }} /> Suspend</BulkBtn>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer" style={{ fontSize: 12 }}>Clear selection</button>
          </div>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 12 }}>
            Showing <span className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{fmt(total)}</span> of <span className="tabular-nums">{fmt(children.length)}</span> direct accounts on this list
          </span>
        )}
      </div>

      {/* Virtualized rows — only the visible slice is in the DOM */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6" style={{ height: 220 }}>
          <Search className="text-zinc-300 dark:text-zinc-600" style={{ width: 22, height: 22 }} />
          <p className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 13, marginTop: 8 }}>No accounts match these filters.</p>
          {anyFilter && <button onClick={clearAll} className="text-blue-600 dark:text-blue-400 cursor-pointer" style={{ fontSize: 12, marginTop: 4 }}>Clear all filters</button>}
        </div>
      ) : (
        <div ref={scrollRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} style={{ height: VIEWPORT_H, overflowY: 'auto' }}>
          <div style={{ height: total * rowH, position: 'relative' }}>
            {visible.map((c, i) => {
              const index = start + i;
              return (
                <DirectoryRow
                  key={c.id}
                  entity={c}
                  meta={meta.get(c.id)}
                  density={density}
                  top={index * rowH}
                  height={rowH}
                  selected={selected.has(c.id)}
                  peeked={peekedId === c.id}
                  onToggle={toggleRow}
                  onPeek={onPeek}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckBox({ checked, partial }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded border transition-colors ${checked || partial ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'}`}
      style={{ width: 16, height: 16 }}
    >
      {checked && <Check style={{ width: 12, height: 12 }} strokeWidth={3} />}
      {!checked && partial && <span className="bg-white rounded-sm" style={{ width: 7, height: 2 }} />}
    </span>
  );
}

function BulkBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 cursor-pointer transition-colors ${danger ? 'border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      style={{ fontSize: 12 }}
    >
      {children}
    </button>
  );
}

const DirectoryRow = memo(function DirectoryRow({ entity, meta, density, top, height, selected, peeked, onToggle, onPeek }) {
  const comfortable = density === 'comfortable';
  const isCustomer = entity.type === 'customer';
  const attention = (meta?.attention || 0) > 0;
  const fams = isCustomer ? customerFamilies(entity) : [];

  return (
    <div
      onClick={() => onPeek(entity)}
      className={`absolute left-0 right-0 flex items-center gap-2.5 px-4 cursor-pointer border-b border-zinc-100 dark:border-zinc-800 transition-colors ${
        peeked
          ? 'bg-blue-50/70 dark:bg-blue-950/30'
          : selected
            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
      }`}
      style={{ top, height }}
    >
      <button onClick={(e) => { e.stopPropagation(); onToggle(entity.id); }} className="flex items-center cursor-pointer flex-shrink-0" aria-label={`Select ${entity.name}`}>
        <CheckBox checked={selected} />
      </button>

      <TierIcon entity={entity} size={comfortable ? 18 : 16} />

      <span className="flex items-center justify-center flex-shrink-0" style={{ width: 14 }}>
        {attention && <AlertTriangle className="text-red-500" style={{ width: 14, height: 14 }} aria-label="Needs attention" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate font-medium text-zinc-800 dark:text-zinc-200" style={{ fontSize: 13 }}>{entity.name}</span>
          {isUnmanaged(entity) && <EyeOff className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" style={{ width: 13, height: 13 }} aria-label="Unmanaged" />}
        </div>
        {comfortable && (
          <div className="truncate text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11, marginTop: 1 }}>
            {cfgFor(entity).label} · {entity.region || '—'}
          </div>
        )}
      </div>

      {/* product signal (customers) / child count (resellers & distributors).
          whitespace-nowrap + wider column so big counts like "2,600 customers"
          stay on one line instead of wrapping and breaking the row rhythm. */}
      <div className="flex-shrink-0 flex items-center justify-end whitespace-nowrap" style={{ width: comfortable ? 190 : 120 }}>
        {isCustomer ? (
          comfortable ? (
            <div className="flex items-center gap-1 justify-end flex-wrap">
              {fams.slice(0, 2).map((f) => <TypeTag key={f.key}>{f.label}</TypeTag>)}
              {fams.length > 2 && <span className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11 }}>+{fams.length - 2}</span>}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
              {[...new Set(fams.map((f) => f.category))].map((cat) => {
                const ci = CATEGORY_ICON[cat] || CATEGORY_ICON.email;
                const Icon = ci.Icon;
                return <Icon key={cat} className={ci.color} style={{ width: 13, height: 13 }} />;
              })}
              <span className="tabular-nums" style={{ fontSize: 11 }}>{fams.length}</span>
            </span>
          )
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400 tabular-nums" style={{ fontSize: 12 }}>
            {fmt(meta?.customers || 0)} {meta?.customers === 1 ? 'customer' : 'customers'}
          </span>
        )}
      </div>

      {comfortable && (
        <span className="flex-shrink-0 flex justify-end" style={{ width: 92 }}>
          <StatusBadge status={entity.status} />
        </span>
      )}

      <span className="flex-shrink-0 flex items-center gap-2 justify-end" style={{ width: 116 }}>
        <UtilBar pct={meta?.util ?? 0} width={64} />
        <span className={`tabular-nums font-medium ${TONE_TEXT[utilTone(meta?.util ?? 0)]}`} style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{meta?.util ?? 0}%</span>
      </span>

      <ChevronRight className="text-zinc-300 dark:text-zinc-600 flex-shrink-0" style={{ width: 15, height: 15 }} />
    </div>
  );
});

// ── Detail peek panel (focused — full products, NOT a whole dashboard) ───
function DetailPeek({ entity, seed, onClose, onOpenScope }) {
  // Same elegant slide-in/out as PackageDrawer — see useDrawerTransition.
  const { show, close, ANIM_MS, EASE } = useDrawerTransition(onClose);
  if (!entity) return null;
  const isCustomer = entity.type === 'customer';
  const unmanaged = isUnmanaged(entity);
  const watchable = seed && !unmanaged;
  const b = entity.business || {};
  const op = entity.operations || {};
  const util = b.seatsLicensed > 0 ? Math.round((b.seatsConsumed / b.seatsLicensed) * 100) : 0;
  const roll = !isCustomer ? subtreeRollup(entity, seed) : null;
  const pa = b.productAdoption || {};
  const cfg = cfgFor(entity);
  const Icon = cfg.Icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={close}
        style={{ opacity: show ? 1 : 0, transition: `opacity ${ANIM_MS}ms ease-out` }}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
        style={{
          width: 400,
          transform: show ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${ANIM_MS}ms ${EASE}`,
          willChange: 'transform',
        }}
      >
        <div className="flex items-start gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <span className={`inline-flex items-center justify-center rounded-lg ${cfg.bg} flex-shrink-0`} style={{ width: 36, height: 36 }}>
            <Icon className="text-white" style={{ width: 18, height: 18 }} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" style={{ fontSize: 15 }}>{entity.name}</h3>
            <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 3 }}>
              <TypeTag>{cfg.label}</TypeTag>
              <StatusBadge status={entity.status} />
              <ManagedTag entity={entity} />
            </div>
          </div>
          <button onClick={close} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex-shrink-0" aria-label="Close">
            <X className="text-zinc-500 dark:text-zinc-400" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5 text-zinc-500 dark:text-zinc-400" style={{ fontSize: 12 }}>
            {entity.region && <div className="flex items-center gap-2"><MapPin style={{ width: 13, height: 13 }} />{entity.region}</div>}
            {entity.contact && <div className="flex items-center gap-2"><Phone style={{ width: 13, height: 13 }} />{entity.contact.firstName} {entity.contact.lastName} · {entity.contact.email}</div>}
            {entity.address?.city && <div className="flex items-center gap-2"><Building2 style={{ width: 13, height: 13 }} />{entity.address.street}, {entity.address.city}</div>}
            <div className="flex items-center gap-2"><Copy style={{ width: 13, height: 13 }} /><span className="font-mono truncate">{entity.id}</span></div>
          </div>

          {unmanaged && (
            <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-2 flex items-start gap-2" style={{ fontSize: 12 }}>
              <EyeOff style={{ width: 14, height: 14, marginTop: 1 }} className="flex-shrink-0" />
              <span>Billing only — this account has no console, ops, or analytics. Seats are still tracked.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <MetricTile label="Seats declared" value={fmt(isCustomer ? b.seatsLicensed : (roll?.declared || 0))} />
            <MetricTile
              label="Utilization"
              value={`${isCustomer ? util : (roll?.util ?? 0)}%`}
              sub={`${fmt(isCustomer ? (b.seatsConsumed || 0) : (roll?.actual || 0))} in use`}
              tone={TONE_TEXT[utilTone(isCustomer ? util : (roll?.util ?? 0))]}
            />
          </div>

          {watchable && (op.criticalIssues || 0) > 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 flex items-center gap-2 text-red-700 dark:text-red-400" style={{ fontSize: 12 }}>
              <AlertTriangle style={{ width: 14, height: 14 }} />
              <span><span className="font-semibold">{op.criticalIssues}</span> critical {op.criticalIssues === 1 ? 'issue' : 'issues'}{op.complianceScore ? ` · ${op.complianceScore}% compliant` : ''}</span>
            </div>
          )}

          {isCustomer ? (
            <div>
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide" style={{ fontSize: 11, marginBottom: 8 }}>Products</h4>
              <div className="space-y-2">
                {FAMILIES.map((f) => {
                  const fam = pa[f.key];
                  if (!fam || !(fam.subscribers > 0)) return null;
                  const used = Math.round(fam.subscribers * (fam.avgUtilization || 0) / 100);
                  // Mixed customer: a managed customer may still carry products tracked as
                  // billing-only. The prototype data has no per-product managed bit, so we
                  // mirror the account's state.
                  // TODO: surface a true per-product managed flag when the model adds one.
                  return (
                    <div key={f.key} className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <f.Icon className={f.color} style={{ width: 14, height: 14 }} />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 flex-1" style={{ fontSize: 13 }}>{f.label}</span>
                        <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500" style={{ fontSize: 10 }}>
                          {watchable ? <Eye style={{ width: 11, height: 11 }} /> : <EyeOff style={{ width: 11, height: 11 }} />}
                          {watchable ? 'Managed' : 'Billing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                        <UtilBar pct={fam.avgUtilization || 0} width={120} />
                        <span className="tabular-nums text-zinc-500 dark:text-zinc-400" style={{ fontSize: 11 }}>{fmt(used)}/{fmt(fam.subscribers)} · {fam.avgUtilization || 0}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!watchable && (
                <p className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11, marginTop: 8 }}>
                  Security shown for managed products only — this account is billing-only.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums" style={{ fontSize: 18 }}>{fmt(roll?.customers || 0)}</div>
                  <div className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 11 }}>customers in this subtree</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums" style={{ fontSize: 18 }}>{fmt((entity.children || []).length)}</div>
                  <div className="text-zinc-500 dark:text-zinc-400" style={{ fontSize: 11 }}>direct accounts</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <button
            onClick={() => onOpenScope(entity)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex-1 cursor-pointer transition-colors"
            style={{ fontSize: 13, padding: '8px 12px' }}
          >
            {isCustomer ? <>Open<ExternalLink style={{ width: 14, height: 14 }} /></> : <>Open &amp; browse<ChevronRight style={{ width: 14, height: 14 }} /></>}
          </button>
          <button onClick={close} className="rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer" style={{ fontSize: 13, padding: '8px 14px' }}>Close</button>
        </div>
      </aside>
    </>
  );
}

// ── Leaf customer view (no directory) ───────────────────────────────────
function LeafCustomerView({ customer }) {
  const unmanaged = isUnmanaged(customer);
  const watchable = !unmanaged;
  const b = customer.business || {};
  const op = customer.operations || {};
  const pa = b.productAdoption || {};
  const util = b.seatsLicensed > 0 ? Math.round((b.seatsConsumed / b.seatsLicensed) * 100) : 0;

  return (
    <div className="space-y-4">
      <SectionCard>
        <IdentityHeader scope={customer} />
      </SectionCard>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <MetricTile label="Seats declared" value={fmt(b.seatsLicensed)} />
          <MetricTile label="Utilization" value={`${util}%`} sub={`${fmt(b.seatsConsumed)} in use`} tone={TONE_TEXT[utilTone(util)]} />
          {watchable && <MetricTile label="Devices" value={fmt(customer.devices)} />}
          {watchable && <MetricTile label="Compliance" value={op.complianceScore ? `${op.complianceScore}%` : '—'} sub={`${fmt(customer.threatsBlocked)} threats blocked`} />}
        </div>
        {watchable && (op.criticalIssues || 0) > 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 flex items-center gap-2 text-red-700 dark:text-red-400" style={{ fontSize: 12, marginTop: 12 }}>
            <AlertTriangle style={{ width: 14, height: 14 }} />
            <span><span className="font-semibold">{op.criticalIssues}</span> critical {op.criticalIssues === 1 ? 'issue' : 'issues'} need attention</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontSize: 14, marginBottom: 10 }}>Products</h3>
        <div className="space-y-2">
          {FAMILIES.map((f) => {
            const fam = pa[f.key];
            if (!fam || !(fam.subscribers > 0)) return null;
            const used = Math.round(fam.subscribers * (fam.avgUtilization || 0) / 100);
            return (
              <div key={f.key} className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
                <f.Icon className={`${f.color} flex-shrink-0`} style={{ width: 15, height: 15 }} />
                <span className="font-medium text-zinc-800 dark:text-zinc-200 flex-1" style={{ fontSize: 13 }}>{f.label}</span>
                {watchable
                  ? <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500" style={{ fontSize: 10 }}><Eye style={{ width: 11, height: 11 }} />Managed</span>
                  : <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500" style={{ fontSize: 10 }}><EyeOff style={{ width: 11, height: 11 }} />Billing</span>}
                <UtilBar pct={fam.avgUtilization || 0} width={110} />
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400 text-right" style={{ fontSize: 11, width: 96 }}>{fmt(used)}/{fmt(fam.subscribers)} · {fam.avgUtilization || 0}%</span>
              </div>
            );
          })}
        </div>
        {unmanaged && (
          <p className="text-zinc-400 dark:text-zinc-500" style={{ fontSize: 11, marginTop: 10 }}>
            Security is shown for managed products only. This account is billing-only.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      {children}
    </div>
  );
}

// Underline tab for the consolidated container's section switcher.
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative cursor-pointer transition-colors ${
        active
          ? 'text-zinc-900 dark:text-zinc-100 font-medium'
          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
      }`}
      style={{ fontSize: 13, padding: '10px 12px' }}
    >
      {children}
      {active && <span className="absolute left-3 right-3 bg-blue-600 rounded-full" style={{ height: 2, bottom: -1 }} />}
    </button>
  );
}

// ── Page ────────────────────────────────────────────────────────────────
export default function CustomerManagementPageC() {
  // Scope comes from the global ScopeContext (same as B) and is driven by the
  // global Scope Navigator breadcrumb rendered in App. C opens at the All
  // Accounts root.
  const { currentEntity, childEntities, drillDown } = useScope();
  const scope = currentEntity; // null at the root
  const children = childEntities ?? mockData;

  const [peek, setPeek] = useState(null);
  const [tab, setTab] = useState('all'); // 'all' | 'package' | 'directory' — persists across scope changes

  useEffect(() => { setPeek(null); }, [scope?.id]);

  const isLeafCustomer = scope?.type === 'customer';
  const seed = scope ? !isUnmanaged(scope) : true;

  const agg = useMemo(
    () => (isLeafCustomer ? null : aggregateScope(scope, children)),
    [scope, children, isLeafCustomer]
  );

  // Package adoption reads from the SAME shared source as Customer Management B
  // (collectPackageAdoption), so C lists B's real VIPRE packages — and reflects
  // the per-reseller package mix B uses — instead of an invented grouping.
  const adoption = useMemo(
    () => (isLeafCustomer ? null : collectPackageAdoption(scope)),
    [scope, isLeafCustomer]
  );

  const openScope = useCallback((entity) => {
    setPeek(null);
    drillDown(entity); // drills into partners/distributors AND customers (→ leaf view)
  }, [drillDown]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-6 pb-5">
      {/* No outer tray/border: the white (dark: zinc-900) cards are the
          surfaces, sitting directly on the app page background and aligned to
          the page H1 at the px-6 gutter. Each card keeps its own border so it
          stays defined in dark mode. Avoids the framed-box-in-a-box look. */}
      <div className="space-y-4" style={{ maxWidth: 1120, margin: '0 auto', paddingTop: 2 }}>
        {isLeafCustomer ? (
          <LeafCustomerView customer={scope} />
        ) : (
          // One container: identity header pinned on top, then tabs switch
          // between the overview (All), package adoption, and the directory.
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <IdentityHeader scope={scope} />
            </div>

            <div className="flex items-center gap-1 px-3 border-b border-zinc-200 dark:border-zinc-800">
              <TabButton active={tab === 'all'} onClick={() => setTab('all')}>All</TabButton>
              <TabButton active={tab === 'package'} onClick={() => setTab('package')}>Package adoption</TabButton>
              <TabButton active={tab === 'directory'} onClick={() => setTab('directory')}>Directory</TabButton>
            </div>

            {tab === 'all' && <SummaryBand agg={agg} />}
            {tab === 'package' && <PackageAdoption adoption={adoption} />}
            {tab === 'directory' && (
              <Directory
                scope={scope}
                children={children}
                seed={seed}
                onOpenScope={openScope}
                onPeek={setPeek}
                peekedId={peek?.id}
              />
            )}
          </div>
        )}
      </div>

      {peek && (
        <DetailPeek
          entity={peek}
          seed={seed}
          onClose={() => setPeek(null)}
          onOpenScope={openScope}
        />
      )}
    </main>
  );
}
