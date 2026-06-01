import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight, ChevronDown, Monitor, Key, ShieldCheck, Clock, Globe,
  Shield, Mail, Send, Bug, ScanSearch, CheckCircle, AlertTriangle,
  Trash2, Paperclip, UserCheck, Plus, Copy, Search, X, Cloud,
  Fingerprint, Check, TrendingUp, TrendingDown, AlertCircle, Settings,
  Activity, Target, Zap, BarChart3, Info, MapPin, Phone, User, Languages, ArrowLeft, EyeOff, CaptionsOff, Loader2, Package
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { typeConfig, statusConfig, StatusBadge, entityTypeOrder, isEntityUnmanaged } from './config';
import { countDescendantsByType, hash, VIPRE_PACKAGES, VIPRE_ADD_ONS, genPartnerPackages, genCustomerPackages, collectPackageAdoption } from './data';

// ── Hooks ──
function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    setValue(0);
    const start = performance.now();
    let raf;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function useBarAnimation(delay = 0) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return animated;
}

// ── Data generation helpers ──
const periodMultipliers = { '7D': 0.25, '14D': 0.5, '30D': 1, '90D': 2.8 };
const periodPointCounts = { '7D': 7, '14D': 7, '30D': 8, '90D': 10 };

function generateSparkline(seed, current, period = '30D') {
  let h = hash(seed + period);
  const points = [];
  const numPoints = periodPointCounts[period] || 8;
  let val = Math.max(1, current * 0.5);
  for (let i = 0; i < numPoints - 1; i++) {
    h = ((h << 5) - h + i) | 0;
    val = Math.max(1, val + (((h >>> 0) % 100) / 100 - 0.5) * current * 0.35);
    points.push({ v: Math.round(val) });
  }
  points.push({ v: current });
  return points;
}

const periodLabels = {
  '7D': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  '14D': ['W1-M', 'W1-T', 'W1-S', 'W2-W', 'W2-S', 'W2-M', 'W2-T'],
  '30D': ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  '90D': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function generatePerformanceData(entityId, products, period = '30D') {
  const labels = periodLabels[period] || periodLabels['30D'];
  return labels.map((label, mi) => {
    const point = { month: label };
    products.forEach((product, pi) => {
      let h = hash(entityId + product + period);
      const s = (h >>> 0) % 1000;
      const base = 50 + pi * 12;
      const trends = [mi * 5, -mi * 4, Math.sin(mi * 0.8 + pi * 1.2) * 30, mi < 4 ? mi * 6 : (8 - mi) * 6, mi < 3 ? -mi * 5 : (mi - 3) * 7];
      h = ((h << 5) - h + mi * 7 + s) | 0;
      const noise = (((h >>> 0) % 100) / 100 - 0.5) * 20;
      point[product] = Math.min(100, Math.max(5, Math.round(base + trends[s % 5] + noise)));
    });
    return point;
  });
}

function generateGrowthData(entityId, period = '30D') {
  const labels = periodLabels[period] || periodLabels['30D'];
  return labels.map((label, i) => {
    const h1 = hash(entityId + 'new' + label + period);
    const h2 = hash(entityId + 'churn' + label + period);
    const added = ((h1 >>> 0) % 5) + 1;
    const churned = -((h2 >>> 0) % 3);
    return { month: label, added, churned, net: added + churned };
  });
}

function getStatusBreakdown(entities) {
  const counts = { active: 0, trial: 0, suspended: 0 };
  for (const e of entities) counts[e.status]++;
  return counts;
}

function getDirectChildTypes(children) {
  const types = new Set();
  for (const n of children) types.add(n.type);
  return entityTypeOrder.filter(t => types.has(t));
}

function formatLastActive(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scaleByPeriod(value, period, seed = '') {
  if (typeof value !== 'number') return value;
  const mult = periodMultipliers[period] || 1;
  const h = hash(seed + period);
  const jitter = 1 + (((h >>> 0) % 100) / 100 - 0.5) * 0.15;
  return Math.max(1, Math.round(value * mult * jitter));
}

function getOpportunityLabel(score) {
  if (score >= 80) return 'Untapped';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Limited';
  return 'Saturated';
}

// ── Opportunity Score Gauge ──
function OpportunityGauge({ score }) {
  const displayScore = useCountUp(score);
  const radius = 44;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gaugeColor = score >= 60 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444';
  const label = getOpportunityLabel(score);
  const labelColor = score >= 60 ? 'text-emerald-600 dark:text-emerald-400' : score >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative group">
        <svg width="120" height="68" viewBox="0 0 120 68">
          {/* Background arc */}
          <path d="M 10 62 A 44 44 0 0 1 110 62" fill="none" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="8" strokeLinecap="round" />
          {/* Progress arc */}
          <path d="M 10 62 A 44 44 0 0 1 110 62" fill="none" stroke={gaugeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${progress} ${circumference}`} className="transition-all duration-700 ease-out" />
          {/* Score text */}
          <text x="60" y="54" textAnchor="middle" className="fill-zinc-900 dark:fill-zinc-100" fontSize="24" fontWeight="600">{displayScore}</text>
        </svg>
        {/* Info tooltip */}
        <div className="absolute -top-1 -right-1 group/tip">
          <Info className="w-3 h-3 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 cursor-help" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 p-2.5 rounded-lg bg-zinc-800 text-white text-[10px] leading-relaxed opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible pointer-events-none transition-all duration-150 z-50 shadow-xl">
            Composite of seat utilization gaps, product whitespace, renewal pipeline, and growth trends.
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-800" />
          </div>
        </div>
      </div>
      <span className={`text-sm font-bold uppercase tracking-wide ${labelColor}`}>{label}</span>
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Opportunity</span>
    </div>
  );
}

// ── Utilization bar (Fix 1: semantic color + proportional fill) ──
function UtilizationBar({ consumed, licensed }) {
  const animated = useBarAnimation(200);
  const pct = Math.min(100, Math.round((consumed / Math.max(licensed, 1)) * 100));
  // Threshold-based color
  let barColor = 'bg-zinc-500 dark:bg-zinc-400'; // 30-85% healthy neutral
  if (pct < 30) barColor = 'bg-emerald-500'; // underutilized — opportunity
  else if (pct >= 95) barColor = 'bg-red-500'; // over-provisioned risk
  else if (pct >= 85) barColor = 'bg-amber-500'; // approaching capacity

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{pct}%</span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
          {consumed.toLocaleString()} / {licensed.toLocaleString()} seats
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`} style={{ width: animated ? `${pct}%` : '0%' }} />
      </div>
    </div>
  );
}

// ── Signal badge ──
function SignalBadge({ icon: IconComp, value, label, variant = 'neutral' }) {
  const colors = {
    healthy: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    critical: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    neutral: 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs ${colors[variant]}`}>
      <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

// ── Customer Growth (Fix 3: minimal sparkline + expandable bar chart) ──
function CustomerGrowthSection({ entityId, period, hasChildren }) {
  const [expanded, setExpanded] = useState(false);
  const growthData = generateGrowthData(entityId, period);
  const totalNet = growthData.reduce((s, d) => s + d.net, 0);
  const totalAdded = growthData.reduce((s, d) => s + d.added, 0);
  const totalChurned = growthData.reduce((s, d) => s + Math.abs(d.churned), 0);
  const periodText = period === '7D' ? '7 days' : period === '14D' ? '14 days' : period === '30D' ? '30 days' : '90 days';

  if (!hasChildren) return null;

  return (
    <div
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Summary line — always visible */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold tabular-nums ${totalNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {totalNet >= 0 ? '+' : ''}{totalNet} net
          </span>
          {totalNet >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">customers · last {periodText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{expanded ? 'Collapse' : 'Details'}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Sparkline — always visible */}
      {!expanded && (
        <div className="px-4 pb-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growthData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="net" stroke="#a1a1aa" strokeWidth={1.5} fill="url(#netGrad)" dot={false} isAnimationActive animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expanded bar chart */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-4 py-2 text-[11px] text-zinc-400 dark:text-zinc-500">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />{totalAdded} added</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-1" />{totalChurned} churned</span>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgb(39 39 42)', border: '1px solid rgb(63 63 70)', borderRadius: '8px', fontSize: '11px', color: '#e4e4e7' }}
                  formatter={(value, name) => [Math.abs(value), name === 'added' ? 'Added' : name === 'churned' ? 'Churned' : 'Net']}
                />
                <Bar dataKey="added" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="churned" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="net" stroke="#71717a" strokeWidth={1.5} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function TierRow({ tier, totalSubs }) {
  const tierPct = Math.round((tier.count / Math.max(totalSubs, 1)) * 100);
  const annPct = tier.count > 0 ? Math.round(((tier.annual || 0) / tier.count) * 100) : 0;
  const moPct = 100 - annPct;
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{tier.name}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-zinc-800 dark:text-zinc-200 tabular-nums font-semibold">{tier.count.toLocaleString()} <span className="text-zinc-400 dark:text-zinc-500 font-normal">({tierPct}%)</span></span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">{annPct}% annual · {moPct}% monthly</span>
      </div>
    </div>
  );
}

// ── Package Adoption Table ──

const CUST_NAMES = [
  'Apex Systems', 'Bridgepoint IT', 'Clearview Solutions', 'Deltaforce Tech',
  'Evermore Digital', 'FrontLine Security', 'GridLock Networks', 'HorizonTech',
  'InfraCore LLC', 'Jetstream MSP', 'KiloBase Corp', 'Limitless IT',
  'Maximus Solutions', 'NexGen Systems', 'OmniPath Networks', 'Pinnacle Corp',
];


function genCustomerRows(entityId, pkgId, count, entityType) {
  const allowedTypes = entityType === 'distributor'
    ? ['distributor', 'reseller', 'customer']
    : ['reseller', 'customer'];
  return Array.from({ length: count }, (_, i) => {
    const name = CUST_NAMES[(hash(entityId + pkgId + 'n' + i) >>> 0) % CUST_NAMES.length];
    const declared = 10 + ((hash(entityId + pkgId + 'd' + i) >>> 0) % 200);
    const h3 = hash(entityId + pkgId + 'a' + i);
    const actual = ((h3 >>> 0) % 10) < 2
      ? declared + 1 + ((h3 >>> 0) % 20)
      : Math.max(1, declared - ((h3 >>> 0) % Math.max(1, Math.floor(declared * 0.4))));
    const hao = hash(entityId + pkgId + 'ao' + i);
    const aoCountWeights = [0, 0, 1, 1, 2, 2, 3, 4];
    const aoCount = aoCountWeights[(hao >>> 0) % aoCountWeights.length];
    const available = [...VIPRE_ADD_ONS];
    const addOns = [];
    for (let ai = 0; ai < aoCount; ai++) {
      const idx = (hash(entityId + pkgId + 'aoi' + i + ai) >>> 0) % available.length;
      addOns.push(available.splice(idx, 1)[0]);
    }
    const type = allowedTypes[(hash(entityId + pkgId + 'type' + i) >>> 0) % allowedTypes.length];
    return { name, declared, actual, addOns, type };
  });
}


function AddOnTag({ name }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] leading-none">
      {name}
    </span>
  );
}

function utilColor(util) {
  if (util >= 70) return 'text-green-600 dark:text-green-500';
  if (util >= 40) return 'text-amber-600 dark:text-amber-500';
  return 'text-red-600 dark:text-red-500';
}

function PackageAdoptionTable({ entityId, entityType, onPackageClick }) {
  const isCustomer = entityType === 'customer';
  const [expandedPkg, setExpandedPkg] = useState(null);
  const [showAllMap, setShowAllMap] = useState({});

  const pkgIconMap = Object.fromEntries(
    availableProducts.filter(p => p.category !== 'Add-on').map(p => [p.key, { icon: p.icon, iconColor: p.iconColor }])
  );

  if (isCustomer) {
    const packages = genCustomerPackages(entityId);
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_96px_48px] gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          <span>Package</span>
          <span className="text-center">Status</span>
          <span className="text-right">Seats</span>
          <span className="text-right">Util.</span>
        </div>
        {packages.map((pkg, i) => {
          const { icon: PkgIcon, iconColor: pkgIconColor } = pkgIconMap[pkg.id] || {};
          return (
          <div key={pkg.id} className={i < packages.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}>
            <div
              className={`grid grid-cols-[1fr_60px_96px_48px] gap-2 px-4 py-2.5 ${onPackageClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors' : ''}`}
              onClick={onPackageClick ? () => onPackageClick(pkg) : undefined}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {PkgIcon && <PkgIcon className={`w-3.5 h-3.5 flex-shrink-0 ${pkgIconColor}`} />}
                  <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{pkg.name}</span>
                </div>
                {pkg.addOns.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pkg.addOns.map(a => <AddOnTag key={a} name={a} />)}
                  </div>
                )}
              </div>
              <div className="pt-1.5 flex justify-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${statusConfig[pkg.status]?.dot || 'bg-zinc-400'}`}
                  title={statusConfig[pkg.status]?.label || pkg.status}
                />
              </div>
              <div className="text-right pt-0.5 tabular-nums">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{pkg.declared.toLocaleString()}</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500"> / </span>
                <span className={`text-[13px] font-medium ${pkg.actual > pkg.declared ? 'text-red-600 dark:text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>{pkg.actual.toLocaleString()}</span>
              </div>
              <span className={`text-[13px] tabular-nums text-right pt-0.5 font-medium ${utilColor(pkg.util)}`}>{pkg.util}%</span>
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  // Partner (distributor / reseller) view — and the synthetic root ("All
  // Accounts"), which reuses the same table but draws aggregate adoption
  // rolled up across the whole tree instead of one entity's package list.
  const packages = entityType === 'root'
    ? collectPackageAdoption(null).packages.map(p => ({ ...p, customers: p.entities, util: p.avgUtil }))
    : genPartnerPackages(entityId);
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="grid grid-cols-[1fr_72px_72px_48px] gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
        <span>Package</span>
        <span className="text-right">Customers</span>
        <span className="text-right">Seats</span>
        <span className="text-right">Util.</span>
      </div>
      {packages.map((pkg, i) => {
        const isExpanded = expandedPkg === pkg.id;
        const showAll = showAllMap[pkg.id] || false;
        const customerRows = isExpanded ? genCustomerRows(entityId, pkg.id, pkg.customers, entityType) : [];
        const visible = !showAll && customerRows.length > 6 ? customerRows.slice(0, 6) : customerRows;
        const { icon: PkgIcon, iconColor: pkgIconColor } = pkgIconMap[pkg.id] || {};
        return (
          <div key={pkg.id} className={i < packages.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}>
            <div
              className="grid grid-cols-[1fr_72px_72px_48px] gap-2 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              onClick={() => {
                if (onPackageClick) { onPackageClick(pkg); return; }
                setExpandedPkg(isExpanded ? null : pkg.id);
                if (!isExpanded) setShowAllMap(prev => ({ ...prev, [pkg.id]: false }));
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {!onPackageClick && <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400 transition-transform duration-150 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />}
                {PkgIcon && <PkgIcon className={`w-3.5 h-3.5 flex-shrink-0 ${pkgIconColor}`} />}
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{pkg.name}</span>
              </div>
              <span className="text-[13px] text-zinc-700 dark:text-zinc-300 tabular-nums text-right self-start pt-0.5">{pkg.customers}</span>
              <span className="text-[13px] text-zinc-700 dark:text-zinc-300 tabular-nums text-right self-start pt-0.5">{pkg.seats.toLocaleString()}</span>
              <span className={`text-[13px] tabular-nums text-right self-start pt-0.5 font-medium ${utilColor(pkg.util)}`}>{pkg.util}%</span>
            </div>
            {isExpanded && (
              <div className="bg-zinc-50/60 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800">
                <div className="grid grid-cols-[1fr_100px] gap-2 px-8 py-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <span>Customer</span>
                  <span className="text-right">Decl. / Actual</span>
                </div>
                {visible.map((row, ri) => {
                  // tintColor (not `color`, which is 'text-white') so the bare icon is visible.
                  const { Icon: RowIcon, tintColor: rowColor } = typeConfig[row.type];
                  return (
                  <div key={ri} className="grid grid-cols-[1fr_100px] gap-2 px-8 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <RowIcon className={`w-3 h-3 flex-shrink-0 ${rowColor}`} />
                        <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{row.name}</span>
                      </div>
                      {row.addOns.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {row.addOns.map(a => <AddOnTag key={a} name={a} />)}
                        </div>
                      )}
                    </div>
                    <div className="text-right tabular-nums self-start pt-0.5">
                      <span className="text-[12px] text-zinc-700 dark:text-zinc-300">{row.declared}</span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500"> / </span>
                      <span className={`text-[12px] font-medium ${row.actual > row.declared ? 'text-red-600 dark:text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>{row.actual}</span>
                    </div>
                  </div>
                  );
                })}
                {customerRows.length > 6 && !showAll && (
                  <div className="px-8 py-2">
                    <button
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      onClick={e => { e.stopPropagation(); setShowAllMap(prev => ({ ...prev, [pkg.id]: true })); }}
                    >
                      View all {pkg.customers} customers
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Sortable, lazy-loaded table of customers on a package. Default: most seats first.
const PKG_CUST_PAGE = 25;
function CustomerSeatTable({ rows }) {
  const [sortKey, setSortKey] = useState('seats');
  const [sortDir, setSortDir] = useState('desc');
  const [visibleCount, setVisibleCount] = useState(PKG_CUST_PAGE);

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === 'name') {
      const r = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? r : -r;
    }
    const d = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    return sortDir === 'asc' ? d : -d;
  });
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  // Lazy-load: grow the window when the sentinel scrolls into view (only matters
  // for long lists — short ones render fully on first paint).
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisibleCount(c => Math.min(c + PKG_CUST_PAGE, sorted.length)); },
      { rootMargin: '160px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, sorted.length]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  }

  const Header = ({ label, k, right }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${right ? 'justify-end' : ''} ${sortKey === k ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
    >
      {label}
      <ChevronDown className={`w-3 h-3 transition-transform ${sortKey === k ? 'opacity-100' : 'opacity-0'} ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="grid grid-cols-[1fr_64px_56px] gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <Header label="Customer" k="name" />
        <div className="flex justify-end"><Header label="Seats" k="seats" right /></div>
        <div className="flex justify-end"><Header label="Util" k="util" right /></div>
      </div>
      <div>
        {visible.map((row, ri) => {
          const rowCfg = typeConfig[row.type === 'reseller' ? 'partner' : row.type] || typeConfig.customer;
          const RowIcon = rowCfg.Icon;
          return (
            <div key={ri} className="grid grid-cols-[1fr_64px_56px] gap-2 items-center px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${rowCfg.bg || 'bg-zinc-100 dark:bg-zinc-800'}`}>
                  <RowIcon className={`w-3 h-3 ${rowCfg.color || 'text-zinc-400'}`} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{row.name}</div>
                  {row.addOns.length > 0 && (
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{row.addOns.length} add-on{row.addOns.length !== 1 ? 's' : ''}</div>
                  )}
                </div>
              </div>
              <div className="text-right text-[13px] tabular-nums text-zinc-700 dark:text-zinc-300">{row.seats.toLocaleString()}</div>
              <div className={`text-right text-[13px] tabular-nums font-medium ${utilColor(row.util)}`}>{row.util}%</div>
            </div>
          );
        })}
        {hasMore && (
          <div ref={sentinelRef} className="px-3 py-2 flex items-center justify-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading… ({visible.length} of {sorted.length})
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single package's adoption detail, scoped to one entity (drawer view) ──
export function EntityPackageDetail({ entity, pkg, onBack, embedded = false }) {
  const isCustomer = entity.type === 'customer';
  const pkgIconMap = Object.fromEntries(
    availableProducts.filter(p => p.category !== 'Add-on').map(p => [p.key, { icon: p.icon, iconColor: p.iconColor }])
  );
  const { icon: PkgIcon, iconColor: pkgIconColor } = pkgIconMap[pkg.id] || {};

  // Per-customer rows enriched with seats (consumed) + utilization for the table.
  const customerRows = isCustomer ? [] : genCustomerRows(entity.id, pkg.id, pkg.customers, entity.type)
    .map(r => ({ ...r, seats: r.actual, util: r.declared > 0 ? Math.round((r.actual / r.declared) * 100) : 0 }));

  const kpis = isCustomer
    ? [
        { label: 'Status', value: pkg.status === 'active' ? 'Active' : 'Trial', color: pkg.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
        { label: 'Seats (decl/actual)', value: `${pkg.declared} / ${pkg.actual}` },
        { label: 'Utilization', value: `${pkg.util}%`, color: utilColor(pkg.util) },
      ]
    : [
        { label: 'Customers', value: pkg.customers },
        { label: 'Total Seats', value: pkg.seats },
        { label: 'Avg Utilization', value: `${pkg.util}%`, color: utilColor(pkg.util) },
      ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — back to the entity (hidden when embedded under a persistent header) */}
      {!embedded && (
        <div className="flex items-center gap-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors group"
            aria-label={`Back to ${entity.name}`}
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors flex-shrink-0" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[220px]">{entity.name}</span>
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Package header — linked to the entity above by a vertical connector */}
        <div className="relative flex items-center gap-3">
          {/* Connector rising to meet the entity icon's stub above */}
          <span aria-hidden className="absolute -top-5 h-7 w-px bg-zinc-200 dark:bg-zinc-700" style={{ left: '19.5px' }} />
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
            {PkgIcon ? <PkgIcon className={`w-5 h-5 ${pkgIconColor}`} /> : <Package className="w-5 h-5 text-zinc-400" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Package</div>
            <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">{pkg.name}</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-3">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">{k.label}</div>
              <div className={`text-lg font-semibold tabular-nums ${k.color || 'text-zinc-900 dark:text-zinc-100'}`}>
                {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Customer-specific: add-ons */}
        {isCustomer && pkg.addOns?.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Add-ons</div>
            <div className="flex flex-wrap gap-1.5">
              {pkg.addOns.map(a => <AddOnTag key={a} name={a} />)}
            </div>
          </div>
        )}

        {/* Partner: per-customer breakdown table */}
        {!isCustomer && (
          <div>
            <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Customers ({customerRows.length})
            </div>
            <CustomerSeatTable rows={customerRows} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compliance donut ──
function ComplianceDonut({ score }) {
  const data = [
    { name: 'Compliant', value: score },
    { name: 'Non-compliant', value: 100 - score },
  ];
  const displayScore = useCountUp(score);
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={20} outerRadius={28} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
            <Cell fill={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'} />
            <Cell fill="currentColor" className="text-zinc-100 dark:text-zinc-800" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{displayScore}%</span>
      </div>
    </div>
  );
}

// ── Children list panel view ──
// How many list rows to mount per lazy-load page.
const LIST_PAGE_SIZE = 40;

export function ChildrenListView({ entity, filter, onBack, onDrillDown, deep = false, labelOverrides, hideTypeBadge = false, statusAsDot = false, showManagementFilter = false, subtleUnmanaged = false, typeTitle = false, hideHeader = false }) {
  const [search, setSearch] = useState('');
  // Managed / Unmanaged audience filter (opt-in via showManagementFilter).
  const [mgmtFilter, setMgmtFilter] = useState('all');
  // Reset the audience filter whenever the drilled-in type changes.
  useEffect(() => { setMgmtFilter('all'); }, [filter]);
  // Progressive (lazy) rendering: only mount the first `visibleCount` rows and
  // grow as the user scrolls near the bottom. Keeps long lists (e.g. 2.9k
  // customers) cheap to render. Short lists render fully on the first page.
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);
  // labelOverrides lets a caller relabel an entity type for this view only
  // (e.g. the Customer Management B tab shows "partner" entities as "Reseller")
  // without mutating the shared typeConfig used everywhere else.
  const labelFor = (t) => labelOverrides?.[t] ?? typeConfig[t]?.label;
  const label = labelOverrides?.[entity.type] ?? (typeConfig[entity.type]?.label ?? 'All Accounts');

  // `deep` mode walks every descendant under `entity` and collects nodes whose
  // entity.type matches `filter`. Used by the dashboard tile drill-in where
  // the displayed count is a full-tree rollup (e.g. "300 Customers") and the
  // user expects to see all 300, not just direct children of the current
  // scope. Default behavior (direct children only) is preserved for the
  // entity-detail chip drill-in where the chip counts are intentionally
  // direct.
  const allChildren = (() => {
    if (!deep || !filter) return entity.children || [];
    const matches = [];
    function walk(nodes) {
      for (const node of nodes) {
        if (node.type === filter) matches.push(node);
        if (node.children?.length) walk(node.children);
      }
    }
    walk(entity.children || []);
    return matches;
  })();
  const scopedChildren = filter ? allChildren.filter(c => c.type === filter) : allChildren;

  // Managed / Unmanaged audience counts (computed before search so the segment
  // counts reflect the whole scope, not just the current text query).
  const managedCount = scopedChildren.filter(c => !isEntityUnmanaged(c)).length;
  const unmanagedCount = scopedChildren.filter(c => isEntityUnmanaged(c)).length;
  const audienceFiltered = showManagementFilter && mgmtFilter !== 'all'
    ? scopedChildren.filter(c => mgmtFilter === 'unmanaged' ? isEntityUnmanaged(c) : !isEntityUnmanaged(c))
    : scopedChildren;

  const filtered = search
    ? audienceFiltered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : audienceFiltered;

  // Reset the lazy-load window when the result set changes (filter / search /
  // audience). Depends on length + filter so a new query starts from the top.
  useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
    setLoadingMore(false);
    loadingRef.current = false;
  }, [filter, search, mgmtFilter, filtered.length]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  function handleListScroll(e) {
    if (!hasMore || loadingRef.current) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 280) {
      // Brief, visible "loading" beat so the lazy-load is obvious when demoing.
      loadingRef.current = true;
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(c => Math.min(c + LIST_PAGE_SIZE, filtered.length));
        setLoadingMore(false);
        loadingRef.current = false;
      }, 600);
    }
  }

  // Group by type in entityTypeOrder. Headers count the full filtered set;
  // rows render only the loaded (visible) slice.
  const groupTypes = entityTypeOrder.filter(t => visible.some(c => c.type === t));

  const searchPlaceholder = filter ? `Search ${labelFor(filter).toLowerCase()}s` : 'Search entities…';
  const audienceSegments = [
    { key: 'all', label: 'All', count: scopedChildren.length },
    { key: 'managed', label: 'Managed', count: managedCount },
    { key: 'unmanaged', label: 'Unmanaged', count: unmanagedCount },
  ];

  const getChildCountLabel = (child) => {
    if (!child.children?.length) return null;
    const typeCounts = {};
    for (const gc of child.children) typeCounts[gc.type] = (typeCounts[gc.type] || 0) + 1;
    const types = entityTypeOrder.filter(t => typeCounts[t]);
    if (types.length === 1) {
      const t = types[0];
      const n = typeCounts[t];
      return `${n} ${labelFor(t)}${n !== 1 ? 's' : ''}`;
    }
    return `${child.children.length} children`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compressed parent header (omitted when an outer chrome already provides nav) */}
      {!hideHeader && (
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <button
            onClick={onBack}
            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 group"
            aria-label="Back to entity details"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
          </button>
          {typeTitle ? (
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
              {filter ? `${labelFor(filter)}s` : label}
            </span>
          ) : (
            <>
              <span
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:underline underline-offset-2 flex-1 min-w-0"
                onClick={onBack}
              >{entity.name}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] font-medium leading-none dark:bg-zinc-800 dark:text-zinc-400 flex-shrink-0">{label}</span>
              {filter && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">· {labelFor(filter)}s only</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Audience filter — All / Managed / Unmanaged */}
      {showManagementFilter && (
        <div className="px-4 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {audienceSegments.map(seg => (
              <button
                key={seg.key}
                onClick={() => setMgmtFilter(seg.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mgmtFilter === seg.key
                    ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {seg.label}
                <span className={`tabular-nums ${mgmtFilter === seg.key ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400 dark:text-zinc-600'}`}>{seg.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        {/* // TODO: add 150ms debounce in production */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Scrollable children list */}
      <div className="flex-1 overflow-y-auto overscroll-contain" onScroll={handleListScroll}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <span className="text-sm text-zinc-400 dark:text-zinc-500">No matching children</span>
          </div>
        ) : (
          groupTypes.map(type => {
            const groupChildren = visible.filter(c => c.type === type);
            const groupTotal = filtered.filter(c => c.type === type).length;
            const typeLabel = labelFor(type);
            return (
              <div key={type}>
                <div className="sticky top-0 px-4 py-2 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 z-10">
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{typeLabel}s ({groupTotal})</span>
                </div>
                {groupChildren.map(child => {
                  const { Icon: ChildIcon, color: childColor, bg: childBg } = typeConfig[child.type];
                  const childLabel = labelFor(child.type);
                  const childCountLabel = getChildCountLabel(child);
                  return (
                    <div
                      key={child.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer border-b border-zinc-100 dark:border-zinc-800 group"
                      onClick={() => onDrillDown(child)}
                    >
                      <div className={`relative w-7 h-7 rounded-lg ${childBg} flex items-center justify-center flex-shrink-0`}>
                        <ChildIcon className={`w-3.5 h-3.5 ${childColor}`} />
                        {!subtleUnmanaged && isEntityUnmanaged(child) && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-700 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center" title="Unmanaged">
                            <CaptionsOff className="w-2 h-2 text-white" strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{child.name}</div>
                        {childCountLabel && <div className="text-xs text-zinc-400 dark:text-zinc-500">{childCountLabel}</div>}
                      </div>
                      {!hideTypeBadge && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] font-medium leading-none dark:bg-zinc-800 dark:text-zinc-400 flex-shrink-0">{childLabel}</span>
                      )}
                      {isEntityUnmanaged(child) && (
                        subtleUnmanaged ? (
                          <span className="inline-flex items-center text-zinc-400 dark:text-zinc-500 flex-shrink-0" title="Unmanaged — outside the managed boundary">
                            <CaptionsOff className="w-3.5 h-3.5" strokeWidth={2} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-700 text-white text-[10px] font-medium leading-none flex-shrink-0">
                            <CaptionsOff className="w-2.5 h-2.5" />
                            Unmanaged
                          </span>
                        )
                      )}
                      <span className="relative flex items-center flex-shrink-0 group/status">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[child.status].dot}`} />
                        <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 z-20 hidden group-hover/status:block whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] leading-none px-2 py-1.5 shadow-lg">
                          <span className="font-medium">{statusConfig[child.status].label}</span>
                          <span className="text-zinc-300"> — {statusConfig[child.status].desc}</span>
                        </span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
        {loadingMore && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800" style={{ width: `${55 - i * 10}%` }} />
                  <div className="h-2 rounded bg-zinc-100 dark:bg-zinc-800/70 w-1/4" />
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading more…
            </div>
          </>
        )}
        {!loadingMore && hasMore && (
          <button
            onClick={() => setVisibleCount(c => Math.min(c + LIST_PAGE_SIZE, filtered.length))}
            className="w-full px-4 py-3 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors border-t border-zinc-100 dark:border-zinc-800"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} — scroll for more
          </button>
        )}
      </div>
    </div>
  );
}

// ── Rollup card ──
function RollupCard({ type, count, entityId, period, onClick }) {
  // Use tintColor (readable brand tint) for the bare icon — `color` is 'text-white',
  // meant for icons sitting inside a colored bg, so it'd be invisible here.
  const { Icon: TypeIcon, tintColor: typeColor, label: typeLabel, stroke } = typeConfig[type];
  const displayCount = useCountUp(count);
  return (
    <div
      className={`flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 ${onClick ? 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <TypeIcon className={`w-3.5 h-3.5 ${typeColor}`} />
        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{typeLabel}s</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className={`text-2xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight tabular-nums ${onClick ? 'group-hover:underline' : ''}`}>{displayCount}</div>
        <div className="w-20 h-8 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={generateSparkline(entityId + type, count, period)}>
              <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Metric cell ──
function MetricCell({ label, value, sparkSeed, strokeColor, period }) {
  const isRate = typeof value === 'string' && value.trim().endsWith('%');
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;
  const displayVal = useCountUp(numVal);
  const sparkData = (!isRate && typeof value === 'number') ? generateSparkline(sparkSeed, numVal, period) : null;
  const pct = isRate ? Math.min(100, parseInt(value) || 0) : 0;
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{label}</div>
      <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5">
        {typeof value === 'number' ? displayVal.toLocaleString() : value}
      </div>
      {sparkData && (
        <div className="h-6 mt-1.5 -ml-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
              <Line type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={1.5} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {isRate && (
        <div className="h-1.5 mt-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: strokeColor }} />
        </div>
      )}
    </div>
  );
}

// ── Operations product health card ──
function OpsProductCard({ title, icon: ProductIcon, iconColor, accentBorder, metrics, entityId, period, agentVersions, footer }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2">
          <ProductIcon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{title}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`} />
      </div>
      {!collapsed && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="px-4 pt-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-4">
            {metrics.map((m) => <MetricCell key={m.label} {...m} period={period} />)}
          </div>
          {agentVersions && (
            <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Agent Versions</span>
              <div className="mt-1.5"><AgentVersionBar versions={agentVersions} /></div>
            </div>
          )}
          {footer && (
            <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Agent version distribution ──
function AgentVersionBar({ versions }) {
  const entries = Object.entries(versions).filter(([, v]) => v > 0);
  const colors = { 'v4.2': 'bg-emerald-500', 'v4.1': 'bg-amber-400', 'v3.x': 'bg-red-400' };
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {entries.map(([version, pct]) => <div key={version} className={`${colors[version] || 'bg-zinc-300'} rounded-full`} style={{ width: `${pct}%` }} />)}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {entries.map(([version, pct]) => (
          <span key={version} className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
            {version}: {pct}%{version === 'v3.x' && pct > 5 ? ' ⚠' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Expandable children section ──
function ExpandableChildrenSection({ entity, onDrillDown }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => { setExpanded(false); setSearch(''); }, [entity.id]);
  useEffect(() => {
    if (contentRef.current) setContentHeight(contentRef.current.scrollHeight);
  }, [expanded, search, entity.children]);

  const children = entity.children || [];
  const total = children.length;
  const breakdown = getStatusBreakdown(children);
  const showSearch = total > 10;
  const counts = {};
  for (const c of children) counts[c.type] = (counts[c.type] || 0) + 1;
  const chips = entityTypeOrder.filter(t => counts[t]);
  const filtered = search ? children.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : children;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border-b transition-[background-color,border-color] duration-200 ease-out ${expanded ? 'border-zinc-200 dark:border-zinc-800' : 'border-transparent'}`}
        onClick={() => setExpanded(!expanded)}
        role="button" tabIndex={0} aria-expanded={expanded}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <span className="text-[11px] flex-shrink-0">
            <span className="uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Children</span>{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{total}</span>
          </span>
          {chips.map(type => {
            const cfg = typeConfig[type];
            const { Icon, label } = cfg;
            return (
              <div key={type} className="inline-flex items-center gap-1 flex-shrink-0">
                <span className="text-zinc-200 dark:text-zinc-700 text-[10px]">&middot;</span>
                <Icon className={`w-3 h-3 ${cfg.tintColor ?? cfg.color}`} />
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">{counts[type]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-32 h-1.5 flex gap-0.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
            {breakdown.active > 0 && <div className="bg-emerald-500 rounded-full" style={{ width: `${(breakdown.active / total) * 100}%` }} />}
            {breakdown.trial > 0 && <div className="bg-amber-500 rounded-full" style={{ width: `${(breakdown.trial / total) * 100}%` }} />}
            {breakdown.suspended > 0 && <div className="bg-red-400 rounded-full" style={{ width: `${(breakdown.suspended / total) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(breakdown).map(([status, count]) => count > 0 && (
              <span key={status} className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">{count} {statusConfig[status].label}</span>
            ))}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </div>

      <div style={{ maxHeight: expanded ? `${Math.min(contentHeight, 340)}px` : '0px', opacity: expanded ? 1 : 0 }} className="transition-all duration-200 ease-out overflow-hidden">
        <div ref={contentRef}>
          {showSearch && expanded && (
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter children..." className="w-full pl-7 pr-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-md outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400" />
              </div>
            </div>
          )}
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: showSearch ? '280px' : '300px' }}>
            {filtered.map((child, i) => {
              const { Icon, color, bg, label } = typeConfig[child.type];
              return (
                <div key={child.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group ${i > 0 ? 'border-t border-zinc-100 dark:border-zinc-800' : ''}`} onClick={() => onDrillDown(child)} tabIndex={expanded ? 0 : -1}>
                  <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3 h-3 ${color}`} />
                  </div>
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{child.name}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] font-medium leading-none dark:bg-zinc-800 dark:text-zinc-400">{label}</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig[child.status].dot}`} title={statusConfig[child.status].label} />
                  {child.children?.length > 0 && <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">{child.children.length}</span>}
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </div>
              );
            })}
            {filtered.length === 0 && <div className="px-4 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">No matching children</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Product Modal ──
const availableProducts = [
  // ── IES ──
  { key: 'ies',      category: 'IES',      name: 'VIPRE IES',                            icon: Mail,      iconColor: 'text-indigo-500', accent: 'border-indigo-500', bgAccent: 'bg-indigo-50 dark:bg-indigo-950/30', description: 'Advanced, cloud-native email security technology that integrates seamlessly via API.', features: ['Sandboxing', 'Malware analysis', 'Inbound threat filtering'] },
  { key: 'ies-beta', category: 'IES',      name: 'VIPRE IES BETA',                       icon: Mail,      iconColor: 'text-indigo-400', accent: 'border-indigo-400', bgAccent: 'bg-indigo-50 dark:bg-indigo-950/30', description: 'Beta release of VIPRE Integrated Email Security with the latest threat protection updates.', features: ['Early access', 'Sandboxing', 'Inbound filtering'] },
  // ── SafeSend ──
  { key: 'safesend',      category: 'SafeSend', name: 'VIPRE SafeSend',             icon: Send, iconColor: 'text-emerald-500', accent: 'border-emerald-500', bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30', description: 'Outbound email safety prompts to prevent misdirected emails and accidental data leaks.', features: ['Recipient verification', 'DLP prompts', 'Attachment review'] },
  { key: 'safesend-ai',   category: 'SafeSend', name: 'VIPRE SafeSend + AI addon',  icon: Send, iconColor: 'text-emerald-600', accent: 'border-emerald-600', bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30', description: 'SafeSend with AI-powered content analysis for smarter outbound email safety checks.', features: ['AI content analysis', 'Recipient verification', 'DLP prompts'] },
  { key: 'safesend-beta', category: 'SafeSend', name: 'VIPRE SafeSend Beta',        icon: Send, iconColor: 'text-emerald-400', accent: 'border-emerald-400', bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30', description: 'Beta release of VIPRE SafeSend with the latest outbound email safety features.', features: ['Early access', 'Recipient verification', 'DLP prompts'] },
  // ── Security / Email SEG ──
  { key: 'tep',                category: 'Security', name: 'VIPRE Total Email Protection',  icon: ShieldCheck, iconColor: 'text-violet-500', accent: 'border-violet-500', bgAccent: 'bg-violet-50 dark:bg-violet-950/30', description: 'Comprehensive multi-tier protection with SEG and IES — the only package combining both.', features: ['SEG + IES combined', 'Anti-phishing', 'Threat intelligence'] },
  { key: 'atp',                category: 'Security', name: 'Advanced Threat Protection',    icon: Bug,         iconColor: 'text-rose-500',   accent: 'border-rose-500',   bgAccent: 'bg-rose-50 dark:bg-rose-950/30',   description: 'Core VIPRE Email Security Cloud with EDR and attachment sandboxing.', features: ['EDR', 'Attachment sandboxing', 'Behavioural analysis'] },
  { key: 'edge',               category: 'Security', name: 'Edge Defense',                  icon: Globe,       iconColor: 'text-cyan-500',   accent: 'border-cyan-500',   bgAccent: 'bg-cyan-50 dark:bg-cyan-950/30',   description: 'Comprehensive email protection bundle including Email IES and DNS navigation.', features: ['Email IES', 'DNS navigation', 'Threat blocking'] },
  { key: 'complete',           category: 'Security', name: 'Complete Defense',              icon: Shield,      iconColor: 'text-blue-600',   accent: 'border-blue-600',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',   description: 'Comprehensive email protection bundle including Email IES and DNS navigation.', features: ['Email IES', 'DNS navigation', 'Full defence stack'] },
  { key: 'edge-nordics',       category: 'Security', name: 'Edge Defense Nordics',          icon: Globe,       iconColor: 'text-cyan-600',   accent: 'border-cyan-600',   bgAccent: 'bg-cyan-50 dark:bg-cyan-950/30',   description: 'Edge Defense bundle with Email IES and SafeSend, tailored for Nordic markets.', features: ['Email IES', 'SafeSend included', 'Nordics localisation'] },
  { key: 'complete-nordics',   category: 'Security', name: 'Complete Defense Nordics',      icon: Shield,      iconColor: 'text-blue-700',   accent: 'border-blue-700',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',   description: 'Complete Defense bundle with Email IES and SafeSend, tailored for Nordic markets.', features: ['Email IES', 'SafeSend included', 'Nordics localisation'] },
  { key: 'email360',           category: 'Security', name: 'VIPRE Email 360',               icon: Mail,        iconColor: 'text-violet-600', accent: 'border-violet-600', bgAccent: 'bg-violet-50 dark:bg-violet-950/30', description: 'Full solution combining VIPRE System EndPoint Enhanced Threat Protection with Security Awareness Training.', features: ['Endpoint + email', 'Security awareness', 'Full stack protection'] },
  { key: 'epmail',             category: 'Security', name: 'VIPRE Endpoint+Email',          icon: Monitor,     iconColor: 'text-teal-500',   accent: 'border-teal-500',   bgAccent: 'bg-teal-50 dark:bg-teal-950/30',   description: 'Combination of VIPRE Endpoint Cloud and Email Cloud for essential protection.', features: ['Endpoint + email', 'Cloud-native', 'SMB-optimised'] },
  { key: 'epmail360',          category: 'Security', name: 'VIPRE Endpoint+Email 360',      icon: Monitor,     iconColor: 'text-teal-600',   accent: 'border-teal-600',   bgAccent: 'bg-teal-50 dark:bg-teal-950/30',   description: 'Next-gen email and endpoint threat protection with Security Awareness Training.', features: ['Endpoint + email + SAT', 'Full stack', 'SMB-optimised'] },
  { key: 'essentials',         category: 'Security', name: 'Essentials',                    icon: Shield,      iconColor: 'text-blue-500',   accent: 'border-blue-500',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',   description: 'Protect your organisation from spam and viruses with 30-day email replay and 7-day email assist.', features: ['Spam & virus protection', '30-day email replay', '7-day email assist'] },
  { key: 'emailcloud',         category: 'Security', name: 'Email Cloud',                   icon: Cloud,       iconColor: 'text-sky-500',    accent: 'border-sky-500',    bgAccent: 'bg-sky-50 dark:bg-sky-950/30',     description: 'Get additional security with Email Cloud and protect yourself from unplanned email outages. Includes 90 days of continuity.', features: ['Email continuity', '90-day continuity', 'Cloud-native'] },
  { key: 'exchangesmart',      category: 'Security', name: 'ExchangeSMART',                 icon: Mail,        iconColor: 'text-sky-600',    accent: 'border-sky-600',    bgAccent: 'bg-sky-50 dark:bg-sky-950/30',     description: 'All the enhanced collaboration features of Microsoft Exchange with email filtering, PrivacySMART, and 14-day email replay.', features: ['Exchange integration', 'PrivacySMART', '14-day replay'] },
  { key: 'exchangesmart-suite',category: 'Security', name: 'ExchangeSMART Suite',           icon: Mail,        iconColor: 'text-sky-700',    accent: 'border-sky-700',    bgAccent: 'bg-sky-50 dark:bg-sky-950/30',     description: 'The complete Microsoft Exchange bundle including unlimited archiving, compliance, and extended search.', features: ['Unlimited archiving', 'Compliance', 'Extended search'] },
  { key: 'essentials-inbound', category: 'Security', name: 'Essentials Inbound Only',       icon: Shield,      iconColor: 'text-blue-400',   accent: 'border-blue-400',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',   description: 'Get unlimited security with SecureSmartand protect yourself from unplanned email outages. Includes 90 days of Email Continuity Service.', features: ['Inbound only', 'SecureSmart', '90-day continuity'] },
  { key: 'vaultcritical',      category: 'Security', name: 'VaultCritical Suite',           icon: Key,         iconColor: 'text-amber-500',  accent: 'border-amber-500',  bgAccent: 'bg-amber-50 dark:bg-amber-950/30', description: 'VaultCritical Suite seamlessly pairs our cloud email archiving with "Email Cloud" giving you world-class archiving and email continuity.', features: ['Cloud archiving', 'Email continuity', 'Compliance'] },
  // ── Add-ons ──
  { key: 'addon-archiving-3y',  category: 'Add-on', name: 'Legacy Archiving, 3 years',       icon: Paperclip, iconColor: 'text-zinc-500', accent: 'border-zinc-400', bgAccent: 'bg-zinc-50 dark:bg-zinc-800/50', description: 'Improve the accessibility of your stored email with 3-year regulatory compliance archiving.', features: ['3-year retention', 'eDiscovery', 'Compliance'] },
  { key: 'addon-archiving-unl', category: 'Add-on', name: 'Legacy Archiving, unlimited',     icon: Paperclip, iconColor: 'text-zinc-600', accent: 'border-zinc-500', bgAccent: 'bg-zinc-50 dark:bg-zinc-800/50', description: 'Improve the accessibility of your stored email with unlimited regulatory compliance archiving.', features: ['Unlimited retention', 'eDiscovery', 'Compliance'] },
  { key: 'addon-image',         category: 'Add-on', name: 'Image Analyzer',                  icon: ScanSearch, iconColor: 'text-amber-500', accent: 'border-amber-500', bgAccent: 'bg-amber-50 dark:bg-amber-950/30', description: 'Block unwanted "illicit" images from suspicious emails with AI-powered image content scanning.', features: ['AI image scanning', 'Illicit content blocking', 'Attachment analysis'] },
  { key: 'addon-dns',           category: 'Add-on', name: 'DNS Service',                     icon: Activity,  iconColor: 'text-cyan-600', accent: 'border-cyan-600', bgAccent: 'bg-cyan-50 dark:bg-cyan-950/30', description: 'Serve DNS records for your domains with enhanced filtering and analytics.', features: ['DNS filtering', 'Domain management', 'DNS analytics'] },
  { key: 'addon-logs-1y',       category: 'Add-on', name: 'Extended Message Logs - 1 year',  icon: Clock,     iconColor: 'text-zinc-500', accent: 'border-zinc-400', bgAccent: 'bg-zinc-50 dark:bg-zinc-800/50', description: 'Extend the retention of your message logs from 30 days to 1 year.', features: ['1-year retention', 'Advanced search', 'Audit exports'] },
  { key: 'addon-logs-5y',       category: 'Add-on', name: 'Extended Message Logs - 5 years', icon: Clock,     iconColor: 'text-zinc-600', accent: 'border-zinc-500', bgAccent: 'bg-zinc-50 dark:bg-zinc-800/50', description: 'Extend the retention of your message logs from 30 days to 5 years.', features: ['5-year retention', 'Advanced search', 'Audit exports'] },
  { key: 'addon-logs-10y',      category: 'Add-on', name: 'Extended Message Logs - 10 years',icon: Clock,     iconColor: 'text-zinc-700', accent: 'border-zinc-600', bgAccent: 'bg-zinc-50 dark:bg-zinc-800/50', description: 'Extend the retention of your message logs from 30 days to 10 years.', features: ['10-year retention', 'Advanced search', 'Audit exports'] },
];

function AddProductModal({ open, onClose, existingProducts }) {
  const [selected, setSelected] = useState(new Set());
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);
  if (!open) return null;
  const existingKeys = new Set(Object.keys(existingProducts || {}));
  const toggleProduct = (key) => {
    if (existingKeys.has(key)) return;
    setSelected(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ paddingTop: '2vh' }}>
      <div className="absolute inset-0 bg-zinc-950/50 transition-opacity duration-150" onClick={onClose} />
      <div className="relative w-[520px] max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col animate-palette-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Add Package</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Select packages to provision for this entity</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"><X className="w-4 h-4 text-zinc-400 dark:text-zinc-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {[{ label: 'IES', category: 'IES' }, { label: 'SafeSend', category: 'SafeSend' }, { label: 'Security', category: 'Security' }, { label: 'Add-ons', category: 'Add-on' }].map(({ label, category }) => {
            const group = availableProducts.filter(p => p.category === category);
            return (
              <div key={category} className="mb-5 last:mb-0">
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">{label}</div>
                <div className="space-y-2">
                  {group.map(product => {
                    const isExisting = existingKeys.has(product.key);
                    const isSelected = selected.has(product.key);
                    const ProductIcon = product.icon;
                    return (
                      <div key={product.key} onClick={() => toggleProduct(product.key)} className={`relative rounded-lg border-l-[3px] p-4 transition-all ${isExisting ? `${product.accent} bg-zinc-50 dark:bg-zinc-800/40 opacity-60 cursor-default` : isSelected ? `${product.accent} ${product.bgAccent} ring-1 ring-zinc-300 dark:ring-zinc-600 cursor-pointer` : `border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer`}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${isExisting ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600' : isSelected ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
                            {(isExisting || isSelected) && <Check className={`w-3 h-3 ${isExisting ? 'text-zinc-400 dark:text-zinc-500' : 'text-white dark:text-zinc-900'}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <ProductIcon className={`w-4 h-4 ${product.iconColor}`} />
                              <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{product.name}</span>
                              {isExisting && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium leading-none">Active</span>}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{product.description}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {product.features.map(f => <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-none">{f}</span>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{selected.size > 0 ? `${selected.size} package${selected.size > 1 ? 's' : ''} selected` : 'No packages selected'}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">Cancel</button>
            <button onClick={onClose} disabled={selected.size === 0} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${selected.size > 0 ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'}`}>Provision {selected.size > 0 ? `(${selected.size})` : ''}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Copy UUID helper ──
function CopyableUUID({ id }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 font-mono hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer">
      {id.slice(0, 8)}...
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Summary stat card ──
function SummaryStatCard({ label, value, format, sparkSeed, period, variant }) {
  const numVal = typeof value === 'number' ? value : 0;
  const displayVal = useCountUp(numVal);
  const sparkData = generateSparkline(sparkSeed, numVal, period);

  // Semantic border color
  let borderClass = 'border-zinc-200 dark:border-zinc-800';
  let valueColorClass = 'text-zinc-900 dark:text-zinc-100';
  if (variant === 'healthy') {
    borderClass = 'border-emerald-200 dark:border-emerald-800/50';
    valueColorClass = 'text-emerald-700 dark:text-emerald-400';
  } else if (variant === 'warning') {
    borderClass = 'border-amber-200 dark:border-amber-800/50';
    valueColorClass = 'text-amber-700 dark:text-amber-400';
  } else if (variant === 'critical') {
    borderClass = 'border-red-200 dark:border-red-800/50';
    valueColorClass = 'text-red-700 dark:text-red-400';
  }

  const formatted = format === 'currency'
    ? `$${displayVal.toLocaleString()}`
    : displayVal.toLocaleString();

  return (
    <div className={`flex-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg border ${borderClass} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`text-2xl font-semibold tabular-nums leading-tight ${valueColorClass}`}>
            {formatted}
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1 block">{label}</span>
        </div>
        {sparkSeed && (
          <div className="w-16 h-6 flex-shrink-0 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="#a1a1aa" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
// Entity identity header — icon, name, status, UUID/region/last-active. Extracted
// so a drawer can keep it pinned while the body below it drills into datapoints.
export function EntityIdentityHeader({ entity, scrolled = false, statusAsDot = false, hideTypeBadge = false, connectorBelow = false }) {
  const { Icon, color, bg, ring, label } = typeConfig[entity.type];
  const isUnmanaged = isEntityUnmanaged(entity);
  return (
    <div className={`relative px-6 py-4 flex-shrink-0 ${connectorBelow ? '' : `border-b transition-colors ${scrolled ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-100 dark:border-zinc-800'}`}`}>
      {/* Connector stub dropping from the entity icon toward the package below */}
      {connectorBelow && (
        <span aria-hidden className="absolute top-14 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" style={{ left: '43.5px' }} />
      )}
      <div className="flex items-start gap-3">
        <div className={`relative w-10 h-10 rounded-lg ${bg} ring-1 ${ring} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
          {isUnmanaged && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-zinc-700 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center" title="Unmanaged">
              <CaptionsOff className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{entity.name}</h2>
            {!hideTypeBadge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] font-medium leading-none dark:bg-zinc-800 dark:text-zinc-400 flex-shrink-0">{label}</span>
            )}
            {isUnmanaged && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-700 text-white text-[10px] font-medium leading-none flex-shrink-0">
                <CaptionsOff className="w-2.5 h-2.5" />
                Unmanaged
              </span>
            )}
            <span className="relative flex items-center flex-shrink-0 group/status">
              <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[entity.status].dot}`} />
              <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 hidden group-hover/status:block whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] leading-none px-2 py-1.5 shadow-lg">
                <span className="font-medium">{statusConfig[entity.status].label}</span>
                <span className="text-zinc-300"> — {statusConfig[entity.status].desc}</span>
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {entity.type === 'root' ? (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Global view across all accounts</span>
            ) : (
              <CopyableUUID id={entity.id} />
            )}
            {entity.region && (
              <>
                <span className="text-zinc-200 dark:text-zinc-700 text-[10px]">&middot;</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{entity.region}</span>
              </>
            )}
            {entity.lastActive && (
              <>
                <span className="text-zinc-200 dark:text-zinc-700 text-[10px]">&middot;</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Active {formatLastActive(entity.lastActive)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EntityDetail({ entity, siblings, onDrillDown, onAddProduct, showFuture = false, externalFilter, onExternalFilterChange, onViewAll, hideTypeBadge = false, statusAsDot = false, hideContactInfo = false, hideHeader = false, hideAddProduct = false, onPackageClick, onOpenChildren, childListProps = {} }) {
  const { Icon, color, bg, ring, label } = typeConfig[entity.type];
  const hasChildren = entity.children?.length > 0;
  const isLeaf = entity.type === 'customer' || !hasChildren;
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [period, setPeriod] = useState('30D');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showChildrenPanelInternal, setShowChildrenPanelInternal] = useState(false);
  const [childrenFilterInternal, setChildrenFilterInternal] = useState(null);

  const isControlled = onExternalFilterChange !== undefined;
  const childrenFilter = isControlled ? (externalFilter ?? null) : childrenFilterInternal;
  const showChildrenPanel = isControlled ? Boolean(externalFilter) : showChildrenPanelInternal;

  function openChildrenPanel(type) {
    // When a host wants to open its own side-drawer instead of the inline panel.
    if (onOpenChildren) { onOpenChildren(type); return; }
    if (isControlled) {
      onExternalFilterChange(type);
    } else {
      setChildrenFilterInternal(type);
      setShowChildrenPanelInternal(true);
    }
  }
  function closeChildrenPanel() {
    if (isControlled) {
      onExternalFilterChange(null);
    } else {
      setShowChildrenPanelInternal(false);
    }
  }

  useEffect(() => {
    if (!isControlled) {
      setShowChildrenPanelInternal(false);
      setChildrenFilterInternal(null);
    }
  }, [entity.id, isControlled]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 0);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const biz = entity.business || {};
  const ops = entity.operations || {};
  const products = entity.products || {};
  // Unmanaged entities (unmanaged customers + reseller-capability partners)
  // sit outside the SecOps observability boundary — their ops / analytics /
  // performance telemetry isn't shown in the detail pane. See the Section 2
  // conditional below. Distributors and msp / hybrid partners always render
  // ops normally.
  const isUnmanaged = isEntityUnmanaged(entity);
  const isUnmanagedPartner = isUnmanaged && entity.type === 'partner';
  const isUnmanagedDistributor = isUnmanaged && entity.type === 'distributor';
  const adoption = biz.productAdoption || {};

  // Direct child-type counts for the Descendants cards. The synthetic root
  // ("All Accounts") rolls up the FULL tree instead — its descendants drawer
  // is deep, so the card counts must match the totals you'd see drilling in.
  const childTypeCounts = {};
  if (hasChildren) {
    if (entity.type === 'root') {
      Object.assign(childTypeCounts, countDescendantsByType(entity.children));
    } else {
      for (const child of entity.children) childTypeCounts[child.type] = (childTypeCounts[child.type] || 0) + 1;
    }
  }
  const childTypeEntries = entityTypeOrder.filter(t => childTypeCounts[t]).map(t => ({ type: t, count: childTypeCounts[t] }));

  const periodText = period === '7D' ? '7 days' : period === '14D' ? '14 days' : period === '30D' ? '30 days' : '90 days';

  const activeProducts = ['Endpoint', 'Email Security', 'SafeSend'];
  const productColors = { 'Endpoint': '#3b82f6', 'Email Security': '#8b5cf6', 'SafeSend': '#10b981' };

  // Utilization
  const consumed = biz.seatsConsumed || 0;
  const licensed = biz.seatsLicensed || 1;
  const utilPct = Math.round((consumed / licensed) * 100);

  return (
    <div className="flex-1 min-h-0 relative">
      {/* ── Children list panel (fades in) ── */}
      <div className={`absolute inset-0 flex flex-col transition-opacity duration-150 ease-out ${showChildrenPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ChildrenListView
          entity={entity}
          filter={childrenFilter === 'all' ? null : childrenFilter}
          onBack={closeChildrenPanel}
          onDrillDown={(child) => { onDrillDown(child); closeChildrenPanel(); }}
          {...childListProps}
        />
      </div>

      {/* ── Entity details panel (fades out) ── */}
      <div className={`absolute inset-0 flex flex-col transition-opacity duration-150 ease-out ${showChildrenPanel ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* ── Entity header (sticky) ── */}
      {!hideHeader && (
        <EntityIdentityHeader entity={entity} scrolled={scrolled} statusAsDot={statusAsDot} hideTypeBadge={hideTypeBadge} />
      )}

      {/* ══════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT
          ══════════════════════════════════════════════════════════════ */}
      <div ref={scrollRef} className="flex-1 overflow-y-scroll overscroll-contain px-6 pt-5 pb-6" style={{ scrollbarGutter: 'stable' }}>
        <div className="space-y-6">

          {/* ── Entity contact info ── */}
          {!hideContactInfo && entity.address && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Location</span>
                </div>
                <div className="pl-5 space-y-0.5">
                  <div className="text-xs text-zinc-700 dark:text-zinc-300">{entity.address.street}</div>
                  <div className="text-xs text-zinc-700 dark:text-zinc-300">
                    {entity.address.city}{entity.address.state ? `, ${entity.address.state}` : ''} {entity.address.zip}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{entity.address.country}</div>
                </div>
                <div className="pl-5 flex items-center gap-3 pt-0.5">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{entity.address.tz}</span>
                  <span className="text-zinc-200 dark:text-zinc-700 text-[10px]">&middot;</span>
                  <div className="flex items-center gap-1">
                    <Languages className="w-3 h-3 text-zinc-400" />
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{entity.address.lang}</span>
                  </div>
                </div>
              </div>

              {/* Primary contact */}
              {entity.contact && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Primary Contact</span>
                  </div>
                  <div className="pl-5 space-y-1">
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{entity.contact.firstName} {entity.contact.lastName}</div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{entity.contact.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{entity.contact.phone}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 1: BUSINESS HEALTH (hidden for customers)
              ══════════════════════════════════════════════════════════ */}
          {entity.type !== 'customer' && (
            <>
              <div className={hideContactInfo ? '' : 'border-t border-zinc-200 dark:border-zinc-800 pt-5'}>
                <div className={`flex items-center justify-between ${showFuture ? 'mb-4' : 'mb-0'}`}>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{showFuture ? 'Business Health' : 'Overview'}</h3>
                    <span className="text-xs text-zinc-300 dark:text-zinc-600">&middot;</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Last {periodText}</span>
                  </div>
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                    {['7D', '14D', '30D', '90D'].map(opt => (
                      <button key={opt} onClick={() => setPeriod(opt)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${period === opt ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>{opt}</button>
                    ))}
                  </div>
                </div>

                {/* ── Attention row: future state ── */}
                {showFuture && (
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0">
                      <OpportunityGauge score={biz.opportunityScore || 50} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">${(biz.mrr || 0).toLocaleString()}</span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">/mo</span>
                        <div className="w-16 h-5 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={generateSparkline(entity.id + 'mrr', biz.mrr || 0, period)}>
                              <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <UtilizationBar consumed={consumed} licensed={licensed} />
                      <div className="flex flex-wrap gap-2">
                        <SignalBadge
                          icon={Clock}
                          value={biz.renewals?.d30 || 0}
                          label={`renewal${(biz.renewals?.d30 || 0) !== 1 ? 's' : ''} in 30d`}
                          variant={(biz.renewals?.d30 || 0) > 0 ? 'warning' : 'neutral'}
                        />
                        <SignalBadge
                          icon={AlertTriangle}
                          value={biz.churnRisk || 0}
                          label="churn risk"
                          variant={(biz.churnRisk || 0) > 0 ? 'critical' : 'healthy'}
                        />
                        {(biz.activeTrials || 0) > 0 && (
                          <SignalBadge icon={Zap} value={biz.activeTrials} label="active trials" variant="neutral" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {childTypeEntries.length > 0 && (
                <div className="space-y-2">
                  {onViewAll && childTypeEntries.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Descendants</span>
                      <button
                        onClick={onViewAll}
                        className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors"
                      >
                        View all →
                      </button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {childTypeEntries.map(({ type, count }) => (
                      <RollupCard key={type} type={type} count={count} entityId={entity.id} period={period}
                        onClick={() => openChildrenPanel(type)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Customer Growth ── */}
              {showFuture && (
                <CustomerGrowthSection entityId={entity.id} period={period} hasChildren={hasChildren} />
              )}

              {/* ── Package Adoption ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Package Adoption</span>
                  {!hideAddProduct && (
                    <button onClick={() => onAddProduct ? onAddProduct(entity) : setShowAddProduct(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1">
                      <Plus className="w-3 h-3" />Add
                    </button>
                  )}
                </div>
                <PackageAdoptionTable entityId={entity.id} entityType={entity.type} onPackageClick={onPackageClick} />
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════
              CUSTOMER PRODUCT SUBSCRIPTIONS (customers only)
              ══════════════════════════════════════════════════════════ */}
          {entity.type === 'customer' && (
            <div className={hideContactInfo ? '' : 'border-t border-zinc-200 dark:border-zinc-800 pt-5'}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Package Adoption</h3>
                {!hideAddProduct && (
                  <button onClick={() => onAddProduct ? onAddProduct(entity) : setShowAddProduct(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" />Add
                  </button>
                )}
              </div>
              <PackageAdoptionTable entityId={entity.id} entityType={entity.type} />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              UNMANAGED NOTICE — replaces ops/analytics for unmanaged
              customers, who sit outside the SecOps boundary
              ══════════════════════════════════════════════════════════ */}
          {isUnmanaged && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <CaptionsOff className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{
                    isUnmanagedDistributor ? 'Unmanaged distributor'
                    : isUnmanagedPartner ? 'Unmanaged partner'
                    : 'Unmanaged customer'
                  }</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Operations health, device telemetry, and per-product analytics are hidden — this {
                      isUnmanagedDistributor ? 'distributor aggregates transactional / reseller business'
                      : isUnmanagedPartner ? 'partner sells through a transactional / reseller motion'
                      : 'customer is'
                    } outside the SecOps observability boundary.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 2: OPERATIONS HEALTH (hidden for unmanaged customers)
              ══════════════════════════════════════════════════════════ */}
          {!isUnmanaged && (
          <>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Operations Health</h3>

            {/* Attention signals */}
            <div className="flex items-center gap-3">
              <SignalBadge
                icon={AlertCircle}
                value={ops.criticalIssues || 0}
                label="critical issues"
                variant={ops.criticalIssues > 0 ? 'critical' : 'healthy'}
              />
              <div className="flex items-center gap-3 flex-1">
                <ComplianceDonut score={ops.complianceScore || 80} />
                <div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Compliance</span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">{ops.complianceScore || 80}% of entities</span>
                </div>
              </div>
              <SignalBadge
                icon={Settings}
                value={ops.configDrift || 0}
                label="config drift"
                variant={ops.configDrift > 3 ? 'warning' : 'neutral'}
              />
            </div>
          </div>

          {/* ── Summary stat cards (Devices / Licenses / Threats) ── */}
          <div className="flex gap-3">
            <SummaryStatCard label="Devices" value={entity.devices || 0} sparkSeed={entity.id + 'dev'} period={period} />
            <SummaryStatCard label="Licenses" value={entity.licenses || 0} sparkSeed={entity.id + 'lic'} period={period} />
            <SummaryStatCard
              label="Threats (30d)"
              value={entity.threatsBlocked || 0}
              sparkSeed={entity.id + 'thr'}
              period={period}
              variant={(entity.threatsBlocked || 0) > 500 ? 'warning' : (entity.threatsBlocked || 0) === 0 ? 'healthy' : undefined}
            />
          </div>

          {/* // TODO: consider making analytics toolbar sticky below entity header if user research shows frequent period switching while scrolled */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">Analytics</span>
              <span className="text-[13px] text-zinc-400 dark:text-zinc-500">&middot; Last {periodText}</span>
            </div>
          </div>

          {/* Per-product health cards */}
          <div className="space-y-3">
            <OpsProductCard
              title="Endpoint" icon={Shield} iconColor="text-blue-500" accentBorder="border-l-blue-400"
              entityId={entity.id} period={period}
              agentVersions={ops.agentVersions}
              metrics={[
                { label: 'Devices protected', value: scaleByPeriod(products.endpoint?.devicesProtected || 0, period, entity.id + 'ep-dev'), sparkSeed: entity.id + 'ep-dev', strokeColor: '#3b82f6' },
                { label: 'Threats blocked', value: scaleByPeriod(products.endpoint?.threatsBlocked || 0, period, entity.id + 'ep-thr'), sparkSeed: entity.id + 'ep-thr', strokeColor: '#3b82f6' },
                { label: 'Scans completed', value: scaleByPeriod(products.endpoint?.scansCompleted || 0, period, entity.id + 'ep-scan'), sparkSeed: entity.id + 'ep-scan', strokeColor: '#3b82f6' },
                { label: 'Compliance', value: (products.endpoint?.complianceRate || 0) + '%', sparkSeed: entity.id + 'ep-comp', strokeColor: '#3b82f6' },
              ]}
            />

            <OpsProductCard
              title="Email Security" icon={Mail} iconColor="text-violet-500" accentBorder="border-l-violet-400"
              entityId={entity.id} period={period}
              metrics={[
                { label: 'Emails scanned', value: scaleByPeriod(products.emailSecurity?.emailsScanned || 0, period, entity.id + 'es-scan'), sparkSeed: entity.id + 'es-scan', strokeColor: '#8b5cf6' },
                { label: 'Threats caught', value: scaleByPeriod(products.emailSecurity?.threatsCaught || 0, period, entity.id + 'es-thr'), sparkSeed: entity.id + 'es-thr', strokeColor: '#8b5cf6' },
                { label: 'Phishing blocked', value: scaleByPeriod(products.emailSecurity?.phishingBlocked || 0, period, entity.id + 'es-ph'), sparkSeed: entity.id + 'es-ph', strokeColor: '#8b5cf6' },
                { label: 'Spam filtered', value: scaleByPeriod(products.emailSecurity?.spamFiltered || 0, period, entity.id + 'es-sp'), sparkSeed: entity.id + 'es-sp', strokeColor: '#8b5cf6' },
              ]}
              footer={ops.domainHealth && (
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{ops.domainHealth.healthy}</span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-1">healthy domains</span>
                  </div>
                  {ops.domainHealth.issues > 0 && (
                    <div>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{ops.domainHealth.issues}</span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-1">with issues</span>
                    </div>
                  )}
                  {ops.quarantineDepth > 0 && (
                    <div>
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{ops.quarantineDepth}</span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-1">in quarantine</span>
                    </div>
                  )}
                </div>
              )}
            />

            <OpsProductCard
              title="SafeSend" icon={Send} iconColor="text-emerald-500" accentBorder="border-l-emerald-400"
              entityId={entity.id} period={period}
              metrics={[
                { label: 'Emails sent', value: scaleByPeriod(products.safeSend?.emailsSent || 0, period, entity.id + 'ss-sent'), sparkSeed: entity.id + 'ss-sent', strokeColor: '#10b981' },
                { label: 'Attachments scanned', value: scaleByPeriod(products.safeSend?.attachmentsScanned || 0, period, entity.id + 'ss-att'), sparkSeed: entity.id + 'ss-att', strokeColor: '#10b981' },
                { label: 'DLP triggers', value: scaleByPeriod(products.safeSend?.dlpTriggers || 0, period, entity.id + 'ss-dlp'), sparkSeed: entity.id + 'ss-dlp', strokeColor: '#10b981' },
                { label: 'Recipients verified', value: scaleByPeriod(products.safeSend?.recipientsVerified || 0, period, entity.id + 'ss-rec'), sparkSeed: entity.id + 'ss-rec', strokeColor: '#10b981' },
              ]}
            />
          </div>

          {/* Performance over time (multi-series area chart) */}
          {showFuture && <div>
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Performance over time</span>
            <div className="h-48 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generatePerformanceData(entity.id, activeProducts, period)} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    {activeProducts.map(p => (
                      <linearGradient key={p} id={`grad-${p.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={productColors[p]} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={productColors[p]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgb(39 39 42)', border: '1px solid rgb(63 63 70)', borderRadius: '8px', fontSize: '11px', color: '#e4e4e7' }} />
                  <Legend verticalAlign="bottom" height={24} iconType="plainline" wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />
                  {activeProducts.map(p => (
                    <Area key={p} type="monotone" dataKey={p} name={p} stroke={productColors[p]} strokeWidth={2} fill={`url(#grad-${p.replace(/\s/g, '')})`} dot={false} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>}
          </>
          )}

          {/* Leaf details */}
          {isLeaf && (
            <div>
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Details</span>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Entity ID</span>
                  <CopyableUUID id={entity.id} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Type</span>
                  <span className="text-[13px] text-zinc-700 dark:text-zinc-300">{label}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        <AddProductModal open={showAddProduct} onClose={() => setShowAddProduct(false)} existingProducts={entity.products} />
      </div>
    </div>
  );
}
