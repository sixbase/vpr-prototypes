// ---------------------------------------------------------------------------
// VIPRE Harmony Overview — Upsell pattern switcher (10 patterns)
// Two pattern families: Ambient (low persistence) and Active (engaged surfaces).
// ---------------------------------------------------------------------------

// ---- Imports --------------------------------------------------------------
import { useState } from 'react'
import {
  Eye,
  LayoutGrid,
  Mail,
  Send,
  Monitor,
  GraduationCap,
  FileText,
  Lock,
  ArrowRight,
  Users,
  Shield,
  LogOut,
  User,
  ChevronRight,
  ChevronLeft,
  FileClock,
  Check,
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  LineChart,
  Cell,
} from 'recharts'

// ---- TypeScript interface documentation -----------------------------------
/**
 * type UpsellPattern =
 *   | 'none' | 'ghost' | 'compact' | 'posture' | 'nudges'
 *   | 'lock' | 'roi' | 'dock' | 'tabs' | 'checklist';
 *
 * type PatternFamily = 'ambient' | 'active';
 *
 * interface UpsellProduct {
 *   id: 'safesend' | 'edr' | 'sat';
 *   icon: LucideIcon;
 *   name: string;
 *   shortName: string;
 *   category: string;
 *   accent: 'emerald' | 'violet' | 'amber';
 *   shortTagline: string;
 *   longTagline: string;
 *   bullets: string[];
 *   postureMetric: string;
 *   roiInput: { label: string; min: number; max: number; default: number; unit: string };
 *   roiCalc: (n: number) => { primary: string; secondary: string };
 *   preview: React.ComponentType;
 *   previewRich: React.ComponentType;
 * }
 *
 * interface SwitcherToolbarProps { pattern: UpsellPattern; onChange: (p: UpsellPattern) => void }
 * interface LockOverlaySectionProps { product: UpsellProduct }
 * interface ROICalculatorCardProps { product: UpsellProduct }
 * interface RightDockPanelProps { collapsed: boolean; onToggle: () => void }
 * interface TabbedDeepDiveProps { activeTab: UpsellProduct['id']; onTabChange: (id: UpsellProduct['id']) => void }
 */

// ---- cn utility -----------------------------------------------------------
const cn = (...classes) => classes.filter(Boolean).join(' ')

// ---- Accent lookup --------------------------------------------------------
const accents = {
  blue: {
    bar: 'bg-blue-600', text: 'text-blue-700', dot: 'bg-blue-500',
    soft: 'bg-blue-50', softText: 'text-blue-700', ring: 'ring-blue-200',
    border: 'border-blue-300', hoverBorder: 'hover:border-blue-300',
    btn: 'bg-blue-600 hover:bg-blue-700',
    resultBg: 'bg-blue-50', resultBorder: 'border-blue-100',
    resultPrimary: 'text-blue-800', resultSecondary: 'text-blue-700',
    sliderAccent: 'accent-blue-600',
    tabBorder: 'border-blue-600',
  },
  emerald: {
    bar: 'bg-emerald-600', text: 'text-emerald-700', dot: 'bg-emerald-500',
    soft: 'bg-emerald-50', softText: 'text-emerald-700', ring: 'ring-emerald-200',
    border: 'border-emerald-300', hoverBorder: 'hover:border-emerald-300',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    resultBg: 'bg-emerald-50', resultBorder: 'border-emerald-100',
    resultPrimary: 'text-emerald-800', resultSecondary: 'text-emerald-700',
    sliderAccent: 'accent-emerald-600',
    tabBorder: 'border-emerald-600',
  },
  violet: {
    bar: 'bg-violet-600', text: 'text-violet-700', dot: 'bg-violet-500',
    soft: 'bg-violet-50', softText: 'text-violet-700', ring: 'ring-violet-200',
    border: 'border-violet-300', hoverBorder: 'hover:border-violet-300',
    btn: 'bg-violet-600 hover:bg-violet-700',
    resultBg: 'bg-violet-50', resultBorder: 'border-violet-100',
    resultPrimary: 'text-violet-800', resultSecondary: 'text-violet-700',
    sliderAccent: 'accent-violet-600',
    tabBorder: 'border-violet-600',
  },
  amber: {
    bar: 'bg-amber-500', text: 'text-amber-700', dot: 'bg-amber-500',
    soft: 'bg-amber-50', softText: 'text-amber-700', ring: 'ring-amber-200',
    border: 'border-amber-300', hoverBorder: 'hover:border-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-600',
    resultBg: 'bg-amber-50', resultBorder: 'border-amber-100',
    resultPrimary: 'text-amber-800', resultSecondary: 'text-amber-700',
    sliderAccent: 'accent-amber-500',
    tabBorder: 'border-amber-500',
  },
}

// ---- Sample data ----------------------------------------------------------
const EMAILS_VS_THREATS = [
  { x: '08:00',  email: 10, malicious: 4, suspicious: 3 },
  { x: 'APR 16', email: 4,  malicious: 2, suspicious: 1 },
  { x: '16:00',  email: 5,  malicious: 3, suspicious: 2 },
  { x: '08:00',  email: 11, malicious: 5, suspicious: 4 },
  { x: 'APR 18', email: 3,  malicious: 1, suspicious: 0 },
  { x: '16:00',  email: 2,  malicious: 0, suspicious: 1 },
  { x: '08:00',  email: 6,  malicious: 2, suspicious: 2 },
  { x: 'APR 20', email: 2,  malicious: 0, suspicious: 0 },
  { x: '16:00',  email: 8,  malicious: 4, suspicious: 2 },
  { x: '08:00',  email: 5,  malicious: 2, suspicious: 1 },
  { x: 'APR 22', email: 24, malicious: 22, suspicious: 18 },
]

const TOP_TARGETED_USERS = [
  { email: 'user1@example.com', count: 56 },
  { email: 'user2@example.com', count: 12 },
  { email: 'user3@example.com', count: 1 },
  { email: 'user4@example.com', count: 1 },
]

const TOP_TARGETED_GROUPS = [
  { name: 'All Company', count: 1 },
  { name: 'VIPRE Vancouver', count: 1 },
]

const EDR_DEVICES = [
  { name: 'DESK-AC104', status: 'clean' },
  { name: 'LAP-FIN-203', status: 'alert' },
  { name: 'SRV-DB-01', status: 'clean' },
  { name: 'LAP-ENG-44', status: 'threat' },
  { name: 'DESK-MKT-09', status: 'clean' },
]
const EDR_DEVICES_RICH = [
  ...EDR_DEVICES,
  { name: 'SRV-APP-02', status: 'clean' },
  { name: 'LAP-HR-12', status: 'alert' },
  { name: 'DESK-ACC-05', status: 'clean' },
]

const EDR_INCIDENTS_TREND = [
  { d: 'A09', v: 3 }, { d: 'A10', v: 5 }, { d: 'A11', v: 4 },
  { d: 'A12', v: 6 }, { d: 'A13', v: 4 }, { d: 'A14', v: 3 },
  { d: 'A15', v: 5 }, { d: 'A16', v: 7 }, { d: 'A17', v: 4 },
  { d: 'A18', v: 3 }, { d: 'A19', v: 6 }, { d: 'A20', v: 8 },
  { d: 'A21', v: 5 }, { d: 'A22', v: 15 },
]

const SAT_COMPLETIONS = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 71 },
  { month: 'Apr', value: 84 },
]

const SAT_RECENT_FLAGS = [
  { kind: 'External recipient', user: 'anna.k@…', when: '2m ago' },
  { kind: 'Sensitive attachment', user: 'jack@…', when: '18m ago' },
  { kind: 'BCC misuse', user: 'mark.t@…', when: '1h ago' },
  { kind: 'Wrong domain', user: 'shelly@…', when: '3h ago' },
  { kind: 'External recipient', user: 'omar@…', when: '5h ago' },
]

const SAT_DEPT_RISK = [
  // 3 rows × 4 cols heatmap of training risk by dept.
  [1, 2, 3, 4],
  [2, 3, 2, 5],
  [3, 4, 2, 3],
]

// ---- Ghost preview components (used by Ghost, Compact, Tabs) --------------
function SafeSendPreview() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Sending to
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
            john@clientdomain.com
          </span>
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
            j.smith@wrongdomain.com
          </span>
        </div>
      </div>
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Shield className="mt-[1px] h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2} />
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-amber-900">
              SafeSend caught an external recipient
            </div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
              <span className="font-mono">j.smith@wrongdomain.com</span> is outside your organization. Confirm before sending.
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <button className="rounded border border-amber-400 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100">Confirm</button>
              <button className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50">Remove</button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span><span className="font-semibold text-slate-700">1,240</span> Emails checked</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span><span className="font-semibold text-slate-700">47</span> Flagged</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span><span className="font-semibold text-emerald-700">12</span> Prevented</span>
      </div>
    </div>
  )
}

function EdrStatCard({ label, value, accent }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn('mt-0.5 text-[16px] font-semibold tabular-nums', accent ? 'text-violet-700' : 'text-slate-800')}>
        {value}
      </div>
    </div>
  )
}

function EDRDeviceRow({ name, status }) {
  const statusStyle = {
    clean: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Clean' },
    alert: { chip: 'bg-amber-50 text-amber-700 ring-amber-200', label: '1 alert' },
    threat: { chip: 'bg-red-50 text-red-700 ring-red-200', label: '3 threats' },
  }
  const s = statusStyle[status]
  return (
    <li className="flex items-center justify-between px-3 py-1.5">
      <div className="flex items-center gap-2">
        <Monitor className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
        <span className="font-mono text-[11px] text-slate-700">{name}</span>
      </div>
      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1', s.chip)}>
        {s.label}
      </span>
    </li>
  )
}

function EDRPreview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <EdrStatCard label="Devices" value="248" />
        <EdrStatCard label="Incidents" value="12" />
        <EdrStatCard label="Resolved" value="9" accent />
      </div>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {EDR_DEVICES.map((d) => <EDRDeviceRow key={d.name} {...d} />)}
      </ul>
    </div>
  )
}

function ProgressBar({ label, value, accent }) {
  const fill = accent === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', fill)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function SATPreview() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col justify-center gap-3">
        <ProgressBar label="Training completion" value={84} accent="amber" />
        <ProgressBar label="Phishing sim pass rate" value={92} accent="emerald" />
        <div className="mt-1">
          <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Top pending</div>
          <ul className="mt-1 space-y-1 text-[11px]">
            <li className="flex items-center justify-between">
              <span className="truncate text-slate-700">user1@example.com</span>
              <span className="font-mono text-[10px] text-slate-500">3</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="truncate text-slate-700">user3@example.com</span>
              <span className="font-mono text-[10px] text-slate-500">2</span>
            </li>
          </ul>
        </div>
      </div>
      <div>
        <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-slate-500">Completions trend</div>
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SAT_COMPLETIONS} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {SAT_COMPLETIONS.map((d, i) => (
                  <Cell key={i} fill={i === SAT_COMPLETIONS.length - 1 ? '#f59e0b' : '#fcd34d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ---- Rich preview components (used by Lock Overlay) ----------------------
function Sparkline({ data, color }) {
  return (
    <div style={{ height: 22 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatColumnCard({ label, value, accent, trend }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn('mt-0.5 text-[20px] font-semibold tabular-nums', accent || 'text-slate-800')}>
        {value}
      </div>
      <div className="mt-1">
        <Sparkline data={trend} color={accent === 'text-emerald-700' ? '#059669' : '#64748b'} />
      </div>
    </div>
  )
}

function SafeSendPreviewRich() {
  const checkedTrend = [{ v: 800 }, { v: 950 }, { v: 880 }, { v: 1100 }, { v: 1240 }]
  const flaggedTrend = [{ v: 22 }, { v: 34 }, { v: 28 }, { v: 41 }, { v: 47 }]
  const preventedTrend = [{ v: 4 }, { v: 7 }, { v: 6 }, { v: 10 }, { v: 12 }]
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-4 space-y-3">
        <StatColumnCard label="Emails checked" value="1,240" trend={checkedTrend} />
        <StatColumnCard label="Flagged" value="47" trend={flaggedTrend} />
        <StatColumnCard label="Prevented" value="12" accent="text-emerald-700" trend={preventedTrend} />
      </div>
      <div className="col-span-4">
        <div className="h-full rounded-md border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" strokeWidth={2} />
            <div className="text-[12px] font-semibold text-amber-900">
              External recipient caught
            </div>
          </div>
          <div className="mt-2 rounded border border-amber-200 bg-white/70 px-2 py-1.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-amber-700">Sending to</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">john@clientdomain.com</span>
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">j.smith@wrongdomain.com</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-amber-800">
            <span className="font-mono">j.smith@wrongdomain.com</span> is outside your organization. Confirm before sending or remove the recipient.
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <button className="rounded border border-amber-400 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100">Confirm send</button>
            <button className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50">Remove</button>
          </div>
        </div>
      </div>
      <div className="col-span-4">
        <div className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Recent flags
          </div>
          <ul className="divide-y divide-slate-100">
            {SAT_RECENT_FLAGS.map((f, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-slate-700">{f.kind}</div>
                  <div className="truncate text-[10px] text-slate-500">{f.user}</div>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">{f.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function EDRPreviewRich() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <EdrStatCard label="Devices" value="248" />
        <EdrStatCard label="Incidents" value="12" />
        <EdrStatCard label="Resolved" value="9" accent />
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Active Threats</div>
          <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-red-600">3</div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7">
          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Devices
            </div>
            <ul className="divide-y divide-slate-100">
              {EDR_DEVICES_RICH.map((d) => <EDRDeviceRow key={d.name} {...d} />)}
            </ul>
          </div>
        </div>
        <div className="col-span-5">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Incidents over time
            </div>
            <div className="mt-1" style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={EDR_INCIDENTS_TREND} margin={{ top: 6, right: 4, left: -26, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <Line type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={1.75} dot={{ r: 1.5, fill: '#7c3aed' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RiskHeatCell({ level }) {
  const bgs = ['bg-amber-100', 'bg-amber-200', 'bg-amber-300', 'bg-amber-400', 'bg-amber-500', 'bg-amber-600']
  return <div className={cn('h-6 rounded-sm', bgs[level] || bgs[0])} />
}

function SATPreviewRich() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-7 space-y-3">
        <div className="rounded-md border border-slate-200 bg-white p-3 space-y-3">
          <ProgressBar label="Training completion" value={84} accent="amber" />
          <ProgressBar label="Phishing sim pass rate" value={92} accent="emerald" />
        </div>
        <div className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Top 5 pending users
          </div>
          <ul className="divide-y divide-slate-100 text-[11px]">
            {['user1@example.com', 'user3@example.com', 'user4@example.com', 'anna.k@example.com', 'mark.t@example.com'].map((u, i) => (
              <li key={u} className="flex items-center justify-between px-3 py-1.5">
                <span className="truncate text-slate-700">{u}</span>
                <span className="font-mono text-[10px] text-slate-500">{5 - i} pending</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Risk by department</div>
          <div className="grid grid-cols-4 gap-1">
            {SAT_DEPT_RISK.flat().map((lv, i) => <RiskHeatCell key={i} level={lv} />)}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-400">
            <span>Eng</span><span>Ops</span><span>Sales</span><span>Support</span>
          </div>
        </div>
      </div>
      <div className="col-span-5">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Completions trend</div>
          <div className="mt-1" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SAT_COMPLETIONS} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {SAT_COMPLETIONS.map((d, i) => (
                    <Cell key={i} fill={i === SAT_COMPLETIONS.length - 1 ? '#f59e0b' : '#fcd34d'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Shared upsell content ------------------------------------------------
const upsellProducts = [
  {
    id: 'safesend',
    icon: Send,
    name: 'SafeSend',
    shortName: 'SafeSend',
    category: 'Outbound Protection',
    accent: 'emerald',
    shortTagline: 'Catches misaddressed emails before they leave Outlook.',
    longTagline: 'Catch misaddressed emails and sensitive data before they leave Outlook.',
    bullets: [
      'Warns users about external recipients and autocomplete mistakes',
      'Scans attachments for sensitive content pre-send',
      'Integrates natively with Outlook — no training required',
      'Sender-level analytics to spot high-risk behaviors',
    ],
    postureMetric: '12 prevented last 30 days',
    roiInput: { label: 'Employees sending email', min: 10, max: 5000, default: 250, unit: 'users' },
    roiCalc: (n) => ({
      primary: `~${Math.round(n * 0.19)} prevented incidents/year`,
      secondary: `$${(n * 500).toLocaleString()} avg breach cost avoided`,
    }),
    preview: SafeSendPreview,
    previewRich: SafeSendPreviewRich,
  },
  {
    id: 'edr',
    icon: Monitor,
    name: 'Endpoint Detection & Response',
    shortName: 'EDR',
    category: 'Endpoint Detection',
    accent: 'violet',
    shortTagline: 'Continuous endpoint protection, real-time response.',
    longTagline: 'See every device, detect every threat, respond in real time.',
    bullets: [
      'Continuous monitoring across laptops, desktops, and servers',
      'Automatic threat isolation before spread',
      'Full incident timelines for forensic investigation',
      'Rolls up into Harmony with email + identity signals',
    ],
    postureMetric: '248 devices could be protected',
    roiInput: { label: 'Total endpoint devices', min: 10, max: 1000, default: 248, unit: 'devices' },
    roiCalc: (n) => ({
      primary: `Continuous coverage for ${n} devices`,
      secondary: `~4.2s avg threat response time`,
    }),
    preview: EDRPreview,
    previewRich: EDRPreviewRich,
  },
  {
    id: 'sat',
    icon: GraduationCap,
    name: 'Security Awareness Training',
    shortName: 'SAT',
    category: 'Awareness Training',
    accent: 'amber',
    shortTagline: 'Turn your people into your strongest defense.',
    longTagline: 'Turn your people from your weakest link into your strongest defense.',
    bullets: [
      'Phishing simulations that mirror real-world attacks',
      'Short, role-based courses users actually finish',
      'Track completion and risk reduction per user and group',
      'Adaptive difficulty per user based on prior results',
    ],
    postureMetric: 'Reduce phishing risk by ~70%',
    roiInput: { label: 'Users to train', min: 10, max: 5000, default: 180, unit: 'users' },
    roiCalc: (n) => ({
      primary: `~68% projected risk reduction`,
      secondary: `${n} users · ~92% completion forecast`,
    }),
    preview: SATPreview,
    previewRich: SATPreviewRich,
  },
]

// ---- Shared IES sub-components --------------------------------------------
function EmailThreatJourney() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Email Threat Journey</div>
      <svg viewBox="0 0 760 220" className="w-full" style={{ height: 200 }}>
        <defs>
          <linearGradient id="flowBlue" x1="0" x2="1">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <linearGradient id="flowPink" x1="0" x2="1">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="flowPinkSoft" x1="0" x2="1">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>
          <linearGradient id="flowAmber" x1="0" x2="1">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
        </defs>
        <rect x="120" y="60" width="10" height="120" rx="2" fill="#1e3a5f" />
        <path d="M 130,60 C 260,60 260,50 370,50 L 370,130 C 260,130 260,120 130,120 Z" fill="url(#flowBlue)" opacity="0.85" />
        <path d="M 130,120 C 260,120 260,140 370,140 L 370,180 C 260,180 260,180 130,180 Z" fill="url(#flowBlue)" opacity="0.6" />
        <rect x="370" y="50" width="12" height="80" rx="2" fill="#dc2626" />
        <rect x="370" y="140" width="12" height="40" rx="2" fill="#f59e0b" />
        <path d="M 382,52 C 500,52 500,58 620,58 L 620,98 C 500,98 500,95 382,95 Z" fill="url(#flowPink)" opacity="0.85" />
        <path d="M 382,98 C 500,98 500,128 620,128 L 620,138 C 500,138 500,112 382,112 Z" fill="url(#flowAmber)" opacity="0.85" />
        <path d="M 382,115 C 500,115 500,156 620,156 L 620,170 C 500,170 500,130 382,128 Z" fill="url(#flowPinkSoft)" opacity="0.9" />
        <path d="M 382,140 C 500,140 500,82 620,82 L 620,98 C 500,98 500,155 382,155 Z" fill="url(#flowPinkSoft)" opacity="0.75" />
        <path d="M 382,155 C 500,155 500,138 620,138 L 620,148 C 500,148 500,168 382,168 Z" fill="url(#flowAmber)" opacity="0.7" />
        <path d="M 382,168 C 500,168 500,170 620,170 L 620,182 C 500,182 500,180 382,180 Z" fill="url(#flowPinkSoft)" opacity="0.7" />
        <rect x="620" y="58" width="8" height="40" rx="1" fill="#94a3b8" />
        <rect x="620" y="128" width="8" height="20" rx="1" fill="#94a3b8" />
        <rect x="620" y="156" width="8" height="26" rx="1" fill="#94a3b8" />
        <text x="330" y="38" fontSize="13" fontWeight="700" fill="#0f172a" textAnchor="middle">42,000</text>
        <text x="330" y="52" fontSize="10" fill="#64748b" textAnchor="middle">Malicious</text>
        <text x="330" y="200" fontSize="13" fontWeight="700" fill="#0f172a" textAnchor="middle">18,000</text>
        <text x="330" y="212" fontSize="10" fill="#64748b" textAnchor="middle">Suspicious</text>
        <text x="642" y="72" fontSize="13" fontWeight="700" fill="#0f172a">40,000</text>
        <text x="642" y="86" fontSize="10" fill="#64748b">Quarantined</text>
        <text x="642" y="136" fontSize="13" fontWeight="700" fill="#0f172a">10,000</text>
        <text x="642" y="148" fontSize="10" fill="#64748b">Released</text>
        <text x="642" y="166" fontSize="13" fontWeight="700" fill="#0f172a">10,000</text>
        <text x="642" y="178" fontSize="10" fill="#64748b">Reported</text>
      </svg>
    </div>
  )
}

function ChartLegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function EmailsVsThreatsChart() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Emails vs Threats</div>
        <div className="flex items-center gap-3">
          <ChartLegendDot color="#1e3a5f" label="Email" />
          <ChartLegendDot color="#dc2626" label="Malicious" />
          <ChartLegendDot color="#f59e0b" label="Suspicious" />
        </div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={EMAILS_VS_THREATS} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 3" vertical={false} />
            <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} interval={0} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} domain={[0, 25]} ticks={[0, 5, 10, 15, 20, 25]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} />
            <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0', padding: '6px 8px' }} />
            <Bar yAxisId="right" dataKey="suspicious" stackId="t" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="right" dataKey="malicious" stackId="t" fill="#dc2626" radius={[2, 2, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="email" stroke="#1e3a5f" strokeWidth={1.75} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SimpleList({ title, icon: Icon, rows, getLabel, getCount, footer }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />}
      </div>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate text-slate-700">{getLabel(row)}</span>
            <span className="shrink-0 font-mono text-[11px] text-slate-500">{getCount(row)}</span>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  )
}

// ---- NudgeCallout ---------------------------------------------------------
function NudgeCallout({ accent, icon: Icon, children, ctaLabel }) {
  const a = accents[accent]
  return (
    <div className={cn('flex items-center gap-3 rounded-md border px-3 py-2.5', a.soft, a.border)}>
      <Icon className={cn('h-4 w-4 shrink-0', a.softText)} strokeWidth={2} />
      <div className="flex-1 text-[11px] leading-relaxed text-slate-700">{children}</div>
      <button
        type="button"
        // TODO: wire to product detail / trial flow
        className={cn('inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold transition-colors duration-150 hover:underline', a.softText)}
      >
        {ctaLabel}
        <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  )
}

// ---- IES section ----------------------------------------------------------
function IESSection({ showNudges }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
          <Mail className="h-4 w-4 text-blue-700" strokeWidth={1.75} />
        </div>
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Integrated Email Security</h2>
      </div>
      <div className="mt-5 space-y-4">
        <EmailThreatJourney />
        {showNudges && (
          <NudgeCallout accent="emerald" icon={Send} ctaLabel="Try SafeSend">
            <span className="font-semibold text-slate-900">Email outbound protection?</span>{' '}
            SafeSend stops data leaks from misaddressed emails before they leave Outlook.
          </NudgeCallout>
        )}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <EmailsVsThreatsChart />
          </div>
          <div className="col-span-3 flex flex-col gap-3">
            <SimpleList title="Top Targeted Users" icon={User} rows={TOP_TARGETED_USERS} getLabel={(r) => r.email} getCount={(r) => r.count} />
            {showNudges && (
              <NudgeCallout accent="amber" icon={GraduationCap} ctaLabel="Try SAT">
                These users are frequent phishing targets.{' '}
                <span className="font-semibold text-slate-900">SAT training reduces successful phishing by ~70%.</span>
              </NudgeCallout>
            )}
          </div>
          <div className="col-span-3">
            <SimpleList title="Top Targeted Groups" icon={Users} rows={TOP_TARGETED_GROUPS} getLabel={(r) => r.name} getCount={(r) => r.count} />
          </div>
        </div>
        {showNudges && (
          <NudgeCallout accent="violet" icon={Monitor} ctaLabel="Learn about EDR">
            <span className="font-semibold text-slate-900">For full-posture coverage, add endpoint detection.</span>{' '}
            EDR protects every device on your network.
          </NudgeCallout>
        )}
      </div>
    </section>
  )
}

// ---- GhostSection + GhostSections ----------------------------------------
function GhostSection({ product }) {
  const { icon: Icon, name, accent, longTagline, bullets, preview: Preview } = product
  const a = accents[accent]
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white transition-opacity duration-150 ease-out dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-900">
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', a.soft)}>
              <Icon className={cn('h-4 w-4', a.softText)} strokeWidth={1.75} />
            </div>
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-700">{name}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
              <Lock className="h-2.5 w-2.5" strokeWidth={2} />
              Not in your plan
            </span>
          </div>
          <button
            type="button"
            // TODO: wire to trial activation flow
            className="group inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition-colors duration-150 ease-out hover:border-slate-400 hover:bg-slate-50"
          >
            Start free trial
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-200/80 dark:border-slate-800" />
      <div className="grid grid-cols-12 gap-5 px-6 py-5">
        <div className="col-span-7">
          <div className="relative rounded-md border border-dashed border-slate-300 bg-white p-4 dark:bg-slate-900/40">
            <span className="absolute right-3 top-2 text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">Example view</span>
            <Preview />
          </div>
        </div>
        <div className="col-span-5 flex flex-col justify-center">
          <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{longTagline}</p>
          <ul className="mt-3 space-y-1.5">
            {bullets.slice(0, 3).map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                <span className={cn('mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full', a.dot)} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3 text-[12px]">
            <button type="button" className="inline-flex items-center gap-1 text-slate-600 transition-colors duration-150 hover:text-slate-900">
              See how it works <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </button>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <button type="button" className="text-slate-600 transition-colors duration-150 hover:text-slate-900">Request a demo</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function GhostSections() {
  return (
    <>
      {upsellProducts.map((p) => <GhostSection key={p.id} product={p} />)}
    </>
  )
}

// ---- CompactStrip + CompactStrips ----------------------------------------
function CompactStrip({ product }) {
  const { icon: Icon, name, accent, shortTagline } = product
  const a = accents[accent]
  return (
    <div className="group flex h-16 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors duration-150 ease-out hover:border-slate-300">
      <div className={cn('h-full w-1', a.bar)} />
      <div className="flex flex-1 items-center gap-3 pl-4 pr-4">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', a.soft)}>
          <Icon className={cn('h-4 w-4', a.softText)} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{name}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 ring-1 ring-slate-200">
              <Lock className="h-2 w-2" strokeWidth={2.25} />
              Not in your plan
            </span>
          </div>
          <div className="truncate text-[12px] text-slate-500">{shortTagline}</div>
        </div>
        <button
          type="button"
          // TODO: wire to trial activation flow
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors duration-150 ease-out hover:border-slate-400 hover:bg-slate-50"
        >
          Try it
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

function CompactStrips() {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Explore other products</div>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
      </div>
      <div className="space-y-2">
        {upsellProducts.map((p) => <CompactStrip key={p.id} product={p} />)}
      </div>
    </section>
  )
}

// ---- PostureTile + PostureBar ---------------------------------------------
function PostureTile({ product, owned }) {
  if (owned) {
    const a = accents.blue
    return (
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', a.soft)}>
            <Mail className={cn('h-3.5 w-3.5', a.softText)} strokeWidth={1.75} />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-slate-900">Integrated Email Security</span>
        </div>
        <div className="mt-3">
          <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Active</span>
        </div>
        <div className="mt-auto pt-2 text-[11px] tabular-nums text-slate-600">42K threats blocked this month</div>
      </div>
    )
  }
  const { icon: Icon, name, accent } = product
  const a = accents[accent]
  return (
    <button
      type="button"
      className={cn(
        'group flex flex-col rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-left transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-white',
        a.hoverBorder,
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', a.soft)}>
          <Icon className={cn('h-3.5 w-3.5', a.softText)} strokeWidth={1.75} />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-slate-700">{name}</span>
      </div>
      <div className="mt-3">
        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Available</span>
      </div>
      <div className={cn('mt-auto pt-2 inline-flex items-center gap-1 text-[11px] font-semibold', a.softText)}>
        Add to plan
        <ArrowRight className="h-3 w-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={2} />
      </div>
    </button>
  )
}

function PostureBar() {
  return (
    <section>
      <div className="mb-2 text-[12px] font-medium uppercase tracking-wider text-slate-500">Your security coverage</div>
      <div className="grid grid-cols-4 gap-3">
        <PostureTile owned product={null} />
        {upsellProducts.map((p) => <PostureTile key={p.id} product={p} owned={false} />)}
      </div>
    </section>
  )
}

// ---- LockOverlaySection + LockOverlaySections ----------------------------
function LockOverlaySection({ product }) {
  const { icon: Icon, name, accent, longTagline, previewRich: PreviewRich } = product
  const a = accents[accent]
  const [hover, setHover] = useState(false)
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Header like IES */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', a.soft)}>
            <Icon className={cn('h-4 w-4', a.softText)} strokeWidth={1.75} />
          </div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{name}</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
          <Lock className="h-2.5 w-2.5" strokeWidth={2} />
          Upgrade required
        </span>
      </div>
      {/* Body with overlay */}
      <div className="relative border-t border-slate-200 dark:border-slate-800">
        <div className="px-6 py-5" aria-hidden="true">
          <PreviewRich />
        </div>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className={cn(
            'absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-[background-color] duration-200 ease-out',
            hover ? 'bg-white/45 dark:bg-slate-900/45' : 'bg-white/60 dark:bg-slate-900/60',
          )}
          style={{
            backgroundImage: 'radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)',
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
              <Lock className="h-8 w-8 text-slate-400" strokeWidth={1.75} />
            </div>
            <div className="text-[15px] font-semibold text-slate-800">Unlock {name}</div>
            <div className="max-w-sm text-[12px] text-slate-500">{longTagline}</div>
            <button
              type="button"
              // TODO: wire to trial activation flow
              className={cn(
                'mt-1 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition-colors duration-150 ease-out',
                a.btn,
              )}
            >
              Start 14-day free trial
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <button type="button" className="text-[12px] text-slate-500 hover:text-slate-700">See pricing</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function LockOverlaySections() {
  return (
    <>
      {upsellProducts.map((p) => <LockOverlaySection key={p.id} product={p} />)}
    </>
  )
}

// ---- ROICalculatorCard + ROICalculatorTiles ------------------------------
function ROICalculatorCard({ product }) {
  const { icon: Icon, name, accent, roiInput, roiCalc } = product
  const a = accents[accent]
  const [value, setValue] = useState(roiInput.default)
  const result = roiCalc(value)
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', a.soft)}>
          <Icon className={cn('h-4 w-4', a.softText)} strokeWidth={1.75} />
        </div>
        <div className="flex-1 truncate text-[15px] font-semibold tracking-tight text-slate-900">{name}</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 ring-1 ring-slate-200">
          <Lock className="h-2 w-2" strokeWidth={2.25} />
          Not in plan
        </span>
      </div>

      {/* Input */}
      <div className="mt-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{roiInput.label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[20px] font-semibold tabular-nums text-slate-900">{value.toLocaleString()}</span>
          <span className="text-[11px] text-slate-500">{roiInput.unit}</span>
        </div>
        <input
          type="range"
          min={roiInput.min}
          max={roiInput.max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className={cn('mt-2 w-full cursor-pointer', a.sliderAccent)}
        />
        <div className="mt-1 flex justify-between text-[9px] text-slate-400 tabular-nums">
          <span>{roiInput.min}</span>
          <span>{roiInput.max.toLocaleString()}</span>
        </div>
      </div>

      {/* Result */}
      <div className={cn('mt-4 rounded-md border p-3', a.resultBg, a.resultBorder)}>
        <div className="flex items-start gap-2">
          <Sparkles className={cn('mt-[2px] h-3.5 w-3.5 shrink-0', a.softText)} strokeWidth={2} />
          <div className="min-w-0">
            <div className={cn('text-[14px] font-semibold', a.resultPrimary)}>{result.primary}</div>
            <div className={cn('mt-0.5 text-[11px]', a.resultSecondary)}>{result.secondary}</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        // TODO: wire to trial activation flow
        className={cn(
          'mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors duration-150 ease-out',
          a.btn,
        )}
      >
        Start free trial
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

function ROICalculatorTiles() {
  return (
    <section>
      <div className="mb-2 text-[12px] font-medium uppercase tracking-wider text-slate-500">
        Estimate the value of expanding your security
      </div>
      <div className="grid grid-cols-3 gap-4">
        {upsellProducts.map((p) => <ROICalculatorCard key={p.id} product={p} />)}
      </div>
      <p className="mt-3 text-[10px] italic text-slate-400">
        Projections based on industry benchmarks. Actual results vary.
      </p>
    </section>
  )
}

// ---- RightDockPanel -------------------------------------------------------
function DockCard({ product }) {
  const { icon: Icon, name, accent, shortTagline, bullets } = product
  const a = accents[accent]
  return (
    <div className="py-4">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', a.soft)}>
          <Icon className={cn('h-4 w-4', a.softText)} strokeWidth={1.75} />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-slate-900">{name}</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-600 line-clamp-2">{shortTagline}</p>
      <div className={cn('mt-2 flex items-start gap-1.5 text-[11px]', a.softText)}>
        <span className={cn('mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full', a.dot)} />
        <span className="leading-relaxed">Key benefit: {bullets[0]}</span>
      </div>
      <button
        type="button"
        // TODO: wire to product detail sheet
        className={cn(
          'mt-3 inline-flex items-center gap-1 text-[12px] font-semibold transition-colors duration-150 hover:underline',
          a.softText,
        )}
      >
        Learn more
        <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  )
}

function RightDockPanel({ collapsed, onToggle }) {
  if (collapsed) {
    return (
      <aside
        onMouseEnter={onToggle}
        className="sticky top-[120px] flex w-12 shrink-0 cursor-pointer flex-col items-center gap-3 self-start border-l border-slate-200 bg-white py-4"
      >
        <button type="button" onClick={onToggle} className="flex h-6 w-6 items-center justify-center text-slate-400 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-2">
          {upsellProducts.map((p) => {
            const Icon = p.icon
            const a = accents[p.accent]
            return (
              <div key={p.id} className={cn('flex h-6 w-6 items-center justify-center rounded-full', a.soft)}>
                <Icon className={cn('h-3.5 w-3.5', a.softText)} strokeWidth={1.75} />
              </div>
            )
          })}
        </div>
      </aside>
    )
  }
  return (
    <aside className="sticky top-[120px] w-[280px] shrink-0 self-start border-l border-slate-200 bg-white px-4 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Recommended for you</div>
        <button type="button" onClick={onToggle} aria-label="Collapse" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-1 divide-y divide-slate-100">
        {upsellProducts.map((p) => <DockCard key={p.id} product={p} />)}
      </div>
    </aside>
  )
}

// ---- TabbedDeepDive -------------------------------------------------------
function TabbedDeepDive({ activeTab, onTabChange }) {
  const active = upsellProducts.find((p) => p.id === activeTab) || upsellProducts[0]
  const Preview = active.preview
  const a = accents[active.accent]
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Expand your security coverage</div>
        <span className="text-[11px] text-slate-500">3 available</span>
      </div>
      {/* Tabs */}
      <div className="flex items-stretch border-b border-slate-200">
        {upsellProducts.map((p) => {
          const isActive = p.id === activeTab
          const pa = accents[p.accent]
          const Icon = p.icon
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onTabChange(p.id)}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-3 text-[13px] font-semibold transition-colors duration-150',
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? pa.softText : 'text-slate-400')} strokeWidth={1.75} />
              {p.shortName}
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Not in plan</span>
              {isActive && (
                <span className={cn('absolute inset-x-3 bottom-0 h-[2px]', pa.bar)} />
              )}
            </button>
          )
        })}
      </div>
      {/* Pane */}
      <div className="grid grid-cols-12 gap-6 p-6">
        <div className="col-span-6">
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4">
            <Preview />
          </div>
        </div>
        <div className="col-span-6 flex flex-col justify-center">
          <h3 className="text-[20px] font-semibold tracking-tight text-slate-900">{active.name}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{active.longTagline}</p>
          <ul className="mt-4 space-y-2">
            {active.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-600">
                <span className={cn('mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full', a.dot)} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              // TODO: wire to trial activation flow
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors duration-150 ease-out',
                a.btn,
              )}
            >
              Start 14-day free trial
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition-colors duration-150 hover:border-slate-400 hover:bg-slate-50"
            >
              See pricing
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---- SecurityChecklist ----------------------------------------------------
function ProgressRing({ percent }) {
  const size = 120
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - percent / 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#2563eb"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[32px] font-semibold tabular-nums text-slate-900 leading-none">{percent}%</div>
        <div className="mt-1 text-[11px] text-slate-500">complete</div>
      </div>
    </div>
  )
}

function ChecklistItem({ complete, name, category, accent, shortName }) {
  const a = accents[accent]
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="shrink-0">
        {complete ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-[13px] font-semibold text-slate-900', complete && 'line-through decoration-slate-400/60')}>
          {name}
        </div>
        <div className="text-[11px] text-slate-500">{category}</div>
      </div>
      <div className="shrink-0">
        {complete ? (
          <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Active
          </span>
        ) : (
          <button
            type="button"
            // TODO: wire to trial activation flow
            className={cn('inline-flex items-center gap-1 text-[12px] font-semibold transition-colors duration-150 hover:underline', a.softText)}
          >
            Add {shortName}
            <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </button>
        )}
      </div>
    </li>
  )
}

function SecurityChecklist() {
  const completeCount = 1
  const total = 4
  const percent = Math.round((completeCount / total) * 100)
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
          Complete your security posture
        </h2>
        <span className="text-[11px] text-slate-500">
          {completeCount} of {total} complete
        </span>
      </div>
      <div className="mt-4 grid grid-cols-12 gap-6">
        <div className="col-span-4 flex items-center justify-center">
          <ProgressRing percent={percent} />
        </div>
        <div className="col-span-8">
          <ul className="divide-y divide-slate-100">
            <ChecklistItem
              complete
              name="Integrated Email Security"
              category="Email Security"
              accent="blue"
              shortName="IES"
            />
            {upsellProducts.map((p) => (
              <ChecklistItem
                key={p.id}
                complete={false}
                name={p.name}
                category={p.category}
                accent={p.accent}
                shortName={p.shortName}
              />
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 text-center text-[12px] italic text-slate-500">
        Complete your stack to reach full-posture coverage.
      </p>
    </section>
  )
}

// ---- Switcher toolbar + helper row ---------------------------------------
const AMBIENT_PATTERNS = [
  { id: 'none', label: 'None' },
  { id: 'ghost', label: 'Ghost Sections' },
  { id: 'compact', label: 'Compact Strips' },
  { id: 'posture', label: 'Posture Bar' },
  { id: 'nudges', label: 'Inline Nudges' },
]

const ACTIVE_PATTERNS = [
  { id: 'lock', label: 'Lock Overlay' },
  { id: 'roi', label: 'ROI Tiles' },
  { id: 'dock', label: 'Right Dock' },
  { id: 'tabs', label: 'Tabbed Deep-Dive' },
  { id: 'checklist', label: 'Checklist' },
]

const HELPER_TEXT = {
  none: 'Baseline: no upsell surfaces. Shows what the page looks like with only owned products.',
  ghost: 'Full-width muted sections per unsubscribed product. Matches rhythm of owned sections.',
  compact: 'Single-row strips per unsubscribed product. Minimal footprint, dedicated real estate.',
  posture: 'Top-of-page coverage summary. All four products in a single consolidated row.',
  nudges: 'Contextual callouts embedded within owned sections. No dedicated upsell real estate.',
  lock: 'Full product dashboards visible behind a frosted lock overlay. Shows the full value, gates the access.',
  roi: 'Interactive value calculators. User adjusts inputs to see projected benefit.',
  dock: 'Persistent right rail with stacked recommendation cards. Keeps main content sacred.',
  tabs: 'Single section with tabbed exploration. User picks which product to explore at their own pace.',
  checklist: 'Security posture completion card. Uses completion psychology: "1 of 4 done".',
}

function SegButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-2 text-[12px] font-semibold transition-colors duration-150 ease-out',
        active ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  )
}

function SwitcherToolbar({ pattern, onChange }) {
  const renderRow = (label, patterns) => (
    <div className="flex h-11 items-center gap-3">
      <span className="w-16 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {patterns.map((p) => (
          <SegButton key={p.id} active={pattern === p.id} onClick={() => onChange(p.id)}>
            {p.label}
          </SegButton>
        ))}
      </div>
    </div>
  )
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
        <div className="flex flex-col">
          {renderRow('AMBIENT', AMBIENT_PATTERNS)}
          {renderRow('ACTIVE', ACTIVE_PATTERNS)}
        </div>
      </div>
    </div>
  )
}

function HelperRow({ pattern }) {
  return (
    <div className="flex h-8 items-center border-b border-slate-200 bg-slate-50 px-6 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
      {HELPER_TEXT[pattern]}
    </div>
  )
}

// ---- Sidebar --------------------------------------------------------------
function NavItem({ icon: Icon, label, active, locked, subdued }) {
  return (
    <button
      type="button"
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors duration-150 ease-out',
        active ? 'bg-white/10 text-white' : subdued ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
      <span className="flex-1 text-left">{label}</span>
      {locked && <Lock className="h-3 w-3 text-slate-500" strokeWidth={2} />}
    </button>
  )
}

function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between bg-slate-900 text-slate-200 dark:bg-slate-950">
      <div>
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-violet-600 text-[11px] font-bold text-white">V</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight text-white">VIPRE</span>
            <span className="text-[9px] font-medium tracking-[0.14em] text-slate-400">HARMONY</span>
          </div>
        </div>
        <nav className="space-y-0.5 px-3">
          <NavItem icon={LayoutGrid} label="Overview" active />
          <NavItem icon={Mail} label="IES" />
          <NavItem icon={Send} label="SafeSend" subdued />
        </nav>
        <div className="mt-5 px-3">
          <NavItem icon={GraduationCap} label="SAT" locked subdued />
          <NavItem icon={Monitor} label="EDR" locked subdued />
          <NavItem icon={FileText} label="Archive" locked subdued />
        </div>
      </div>
      <div className="px-3 pb-5">
        <NavItem icon={FileClock} label="Logs" subdued />
        <NavItem icon={Users} label="Admins" subdued />
        <div className="flex items-center justify-between gap-2 pr-1">
          <div className="flex-1"><NavItem icon={User} label="Profile" subdued /></div>
          <button type="button" aria-label="Sign out" className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ---- Page -----------------------------------------------------------------
export default function VipreOverview() {
  const [pattern, setPattern] = useState('ghost')
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('safesend')

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top header strip */}
        <div className="relative h-14 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 dark:border-slate-800">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_60%)]" />
          <div className="relative flex h-full items-center gap-2 px-6">
            <LayoutGrid className="h-4 w-4 text-blue-300" strokeWidth={1.75} />
            <span className="text-[15px] font-semibold text-white">Overview</span>
          </div>
        </div>

        {/* Switcher + helper */}
        <SwitcherToolbar pattern={pattern} onChange={setPattern} />
        <HelperRow pattern={pattern} />

        {/* Body with optional dock split */}
        <div className="flex flex-1">
          <div className="flex-1 px-8 py-6">
            <div className="mx-auto max-w-[1280px]">
              {/* Date range */}
              <div className="mb-5 flex items-center justify-end">
                <span className="text-[11px] text-slate-500">
                  Data shown for:{' '}
                  <span className="font-semibold text-slate-700">Last 30 days</span>
                  <ChevronRight className="ml-0.5 -mr-0.5 inline-block h-3 w-3 -rotate-90" strokeWidth={2} />
                </span>
              </div>

              <div className="space-y-5">
                {pattern === 'posture' && <PostureBar />}

                <IESSection showNudges={pattern === 'nudges'} />

                {pattern === 'ghost' && <GhostSections />}
                {pattern === 'compact' && <CompactStrips />}
                {pattern === 'lock' && <LockOverlaySections />}
                {pattern === 'roi' && <ROICalculatorTiles />}
                {pattern === 'tabs' && (
                  <TabbedDeepDive activeTab={activeTab} onTabChange={setActiveTab} />
                )}
                {pattern === 'checklist' && <SecurityChecklist />}
              </div>
            </div>
          </div>
          {pattern === 'dock' && (
            <RightDockPanel
              collapsed={dockCollapsed}
              onToggle={() => setDockCollapsed((c) => !c)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
