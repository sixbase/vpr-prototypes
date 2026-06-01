import {
  Building2, Store, Users, Network, Boxes,
  Mail, Send, ShieldCheck, Bug, Globe, Shield, Monitor, Cloud, Key, Package,
  Layers, Tag, Split, Briefcase, EyeOff, CaptionsOff,
} from 'lucide-react';

// ── Entity type + partner capability taxonomy ──────────────────────
// Entity types stored on the data model.
export const entityTypeOrder = ['distributor', 'partner', 'customer'];

// Partner capability variants — only meaningful when entity.type === 'partner'.
export const partnerCapabilityOrder = ['msp', 'hybrid', 'reseller'];

// ── Display type config ────────────────────────────────────────────
// The 5 display variants users see. This is the visual source of truth;
// resolve a runtime entity to one of these keys via getDisplayType(entity).
// Saturated-fill palette: each variant's `bg` is a solid tier-600 swatch in
// both light and dark mode, with `color` set to white so an entity icon
// rendered inside a filled container reads with maximum contrast. The
// tier-700 stroke colors stay available on `tintColor` for standalone /
// non-filled contexts (breadcrumb dropdowns, count chips) where white
// icons would disappear against the surrounding white surface.
//
// Hybrid lives on fuchsia (was indigo — too close to MSP blue and Customer
// violet to differentiate). Icons swapped where silhouettes collided:
// Combine → Layers (hybrid), Receipt → Tag (reseller), Users → Briefcase
// (customer, freeing Users for the structural Partner fallback).
export const displayTypeConfig = {
  distributor: {
    label: 'Distributor',
    Icon: Building2,
    icon: Building2,
    color: 'text-white',
    iconColor: 'text-white',
    textClass: 'text-white',
    bgClass: 'bg-blue-600',
    ring: 'ring-blue-700 dark:ring-blue-500',
    stroke: '#1d4ed8',
    tintColor: 'text-blue-700 dark:text-blue-300',
    // Legacy aliases preserved for components reading typeConfig[type].color/.bg
    legacyColor: 'text-white',
    bg: 'bg-blue-600',
  },
  // Three-tier model: Distributor · Reseller · Customer. The partner tier is
  // presented uniformly as "Reseller" (the prior MSP / Hybrid / Reseller
  // capability sub-variants are no longer surfaced as distinct display types).
  // Reseller iconography: Network (org-chart) on red-600 — the canonical
  // reseller look shown across the app (e.g. the Descendants card). B and C
  // both read from here, so they stay identical.
  reseller: {
    label: 'Reseller',
    Icon: Network,
    icon: Network,
    color: 'text-white',
    iconColor: 'text-white',
    textClass: 'text-white',
    bgClass: 'bg-red-600',
    ring: 'ring-red-700 dark:ring-red-500',
    stroke: '#b91c1c',
    tintColor: 'text-red-700 dark:text-red-300',
    legacyColor: 'text-white',
    bg: 'bg-red-600',
  },
  customer: {
    label: 'Customer',
    Icon: Briefcase,
    icon: Briefcase,
    color: 'text-white',
    iconColor: 'text-white',
    textClass: 'text-white',
    bgClass: 'bg-green-600',
    ring: 'ring-green-700 dark:ring-green-500',
    stroke: '#15803d',
    tintColor: 'text-green-700 dark:text-green-300',
    legacyColor: 'text-white',
    bg: 'bg-green-600',
  },
};

export const displayTypeOrder = ['distributor', 'reseller', 'customer'];

// Transitional compatibility layer: the legacy typeConfig alias additionally
// exposes a generic 'partner' entry so consumers that still do
// typeConfig[entity.type] on partner entities don't crash. This entry is
// intentionally neutral (zinc, generic icon) so any badge rendered from it
// is visibly distinct from the real msp / hybrid / reseller capability
// chips — a "this consumer hasn't been migrated to getDisplayType() yet"
// marker. Drop the partner fallback once all consumers resolve display
// type via getDisplayType(entity).
// displayTypeConfig itself stays keyed by exactly the 5 display variants.
// @deprecated - use displayTypeConfig with getDisplayType() instead
export const typeConfig = {
  ...displayTypeConfig,
  // Synthetic "All Accounts" root scope — neutral zinc so it reads as the
  // top-of-hierarchy aggregate rather than any one entity tier. Lets the
  // shared entity-detail view render the root landing without special-casing
  // every typeConfig[entity.type] lookup.
  root: {
    label: 'All Accounts',
    Icon: Boxes,
    icon: Boxes,
    color: 'text-white',
    iconColor: 'text-white',
    textClass: 'text-white',
    bgClass: 'bg-zinc-700',
    ring: 'ring-zinc-800 dark:ring-zinc-500',
    stroke: '#3f3f46',
    tintColor: 'text-zinc-700 dark:text-zinc-300',
    legacyColor: 'text-white',
    bg: 'bg-zinc-700',
  },
  partner: {
    label: 'Reseller',
    Icon: Network,
    icon: Network,
    color: 'text-white',
    iconColor: 'text-white',
    textClass: 'text-white',
    bgClass: 'bg-red-600',
    ring: 'ring-red-700 dark:ring-red-500',
    stroke: '#b91c1c',
    tintColor: 'text-red-700 dark:text-red-300',
    legacyColor: 'text-white',
    bg: 'bg-red-600',
  },
};
// @deprecated - use displayTypeOrder (or entityTypeOrder for data-model iteration)
export const typeOrder = displayTypeOrder;

// ── Management mode config ─────────────────────────────────────────
export const managementModeConfig = {
  managed: {
    label: 'Managed',
    Icon: ShieldCheck,
    icon: ShieldCheck,
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
  },
  unmanaged: {
    label: 'Unmanaged',
    Icon: CaptionsOff,
    icon: CaptionsOff,
    bgClass: 'bg-zinc-100 dark:bg-zinc-800',
    textClass: 'text-zinc-600 dark:text-zinc-400',
    borderClass: 'border-zinc-200 dark:border-zinc-700',
  },
  mixed: {
    label: 'Mixed',
    Icon: Split,
    icon: Split,
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
};

// ── Helper functions ───────────────────────────────────────────────

export function getDisplayType(entity) {
  if (!entity) return null;
  // Three-tier model: every partner — whatever its underlying
  // partnerCapability (msp / hybrid / reseller) — displays as a Reseller.
  if (entity.type === 'partner') return 'reseller';
  return entity.type;
}

export function isLeaf(entity) {
  return entity?.type === 'customer';
}

export function isPartner(entity) {
  return entity?.type === 'partner';
}

export function hasCapability(entity, capability) {
  return entity?.type === 'partner' && entity?.partnerCapability === capability;
}

// True for entities that sit outside the SecOps observability boundary:
//   - customers explicitly marked managementMode === 'unmanaged'
//   - partners with the reseller capability (their entire customer book is
//     all-unmanaged by data-model constraint)
//   - distributors marked managementMode === 'unmanaged' (sub-distributors
//     that aggregate transactional / reseller business)
// msp / hybrid partners are never "unmanaged" wholesale.
export function isEntityUnmanaged(entity) {
  if (!entity) return false;
  if (entity.type === 'customer') return entity.managementMode === 'unmanaged';
  if (entity.type === 'partner') return entity.partnerCapability === 'reseller';
  if (entity.type === 'distributor') return entity.managementMode === 'unmanaged';
  return false;
}

export function canProvisionManaged(entity) {
  if (!entity) return false;
  if (entity.type === 'distributor') return true;
  if (hasCapability(entity, 'msp')) return true;
  if (hasCapability(entity, 'hybrid')) return true;
  return false;
}

export function canProvisionUnmanaged(entity) {
  if (!entity) return false;
  if (entity.type === 'distributor') return true;
  if (hasCapability(entity, 'reseller')) return true;
  if (hasCapability(entity, 'hybrid')) return true;
  return false;
}

export function hasSecOpsVisibility(entity) {
  if (!entity) return false;
  return !hasCapability(entity, 'reseller');
}

export function getCustomerEffectiveMode(customer) {
  if (customer?.type !== 'customer') return null;
  if (!customer.packages?.length) return customer.managementMode;
  const overrides = customer.packages.filter(
    pkg => pkg.managed !== null && pkg.managed !== (customer.managementMode === 'managed')
  );
  if (overrides.length > 0) return 'mixed';
  return customer.managementMode;
}

// ── Status config ──────────────────────────────────────────────────
export const statusConfig = {
  active:    { pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500', label: 'Active',    desc: 'Live, paying subscription' },
  trial:     { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500', label: 'Trial',     desc: 'Evaluating, not yet converted' },
  suspended: { pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',         dot: 'bg-red-400',   label: 'Suspended', desc: 'Access paused — billing or policy hold' },
};

// Status is visualized as a simple colored dot (hover for meaning). Pass
// `showLabel` in pickers/menus where the text is needed alongside the dot.
export function StatusBadge({ status, showLabel = false }) {
  const cfg = statusConfig[status];
  if (!cfg) return null;
  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}
      title={cfg.desc ? `${cfg.label} — ${cfg.desc}` : cfg.label}
    />
  );
}

export function TypeBadge({ type }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium leading-none uppercase dark:bg-zinc-700 dark:text-zinc-300">
      {typeConfig[type].label}
    </span>
  );
}

// ── Package icon map ──────────────────────────────────────────────
export const pkgIconMap = {
  'ies':               { icon: Mail,        color: 'text-indigo-500' },
  'ies-beta':          { icon: Mail,        color: 'text-indigo-400' },
  'safesend':          { icon: Send,        color: 'text-emerald-500' },
  'safesend-ai':       { icon: Send,        color: 'text-emerald-600' },
  'safesend-beta':     { icon: Send,        color: 'text-emerald-400' },
  'tep':               { icon: ShieldCheck, color: 'text-violet-500' },
  'atp':               { icon: Bug,         color: 'text-rose-500' },
  'edge':              { icon: Globe,       color: 'text-cyan-500' },
  'complete':          { icon: Shield,      color: 'text-blue-600' },
  'edge-nordics':      { icon: Globe,       color: 'text-cyan-600' },
  'complete-nordics':  { icon: Shield,      color: 'text-blue-700' },
  'email360':          { icon: Mail,        color: 'text-violet-600' },
  'epmail':            { icon: Monitor,     color: 'text-teal-500' },
  'epmail360':         { icon: Monitor,     color: 'text-teal-600' },
  'essentials':        { icon: Shield,      color: 'text-blue-500' },
  'emailcloud':        { icon: Cloud,       color: 'text-sky-500' },
  'exchangesmart':     { icon: Mail,        color: 'text-sky-600' },
  'exchangesmart-suite': { icon: Mail,      color: 'text-sky-700' },
  'essentials-inbound': { icon: Shield,     color: 'text-blue-400' },
  'vaultcritical':     { icon: Key,         color: 'text-amber-500' },
};
export const defaultPkgIcon = { icon: Package, color: 'text-zinc-400' };

// ── Sorting ────────────────────────────────────────────────────────
const typeDepth = Object.fromEntries(typeOrder.map((t, i) => [t, i]));

export const sortOptions = [
  { value: 'children-desc', label: 'Most direct descendants' },
  { value: 'children-asc',  label: 'Fewest direct descendants' },
  { value: 'name-asc',      label: 'Name A-Z' },
  { value: 'name-desc',     label: 'Name Z-A' },
  { value: 'status',        label: 'Status' },
  { value: 'level',         label: 'Level' },
];

export function applySorting(items, sortBy) {
  if (!sortBy) return items;
  const sorted = [...items];
  const statusOrder = { active: 0, trial: 1, suspended: 2 };
  switch (sortBy) {
    case 'name-asc':      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':     return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'status':        return sorted.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));
    case 'level':         return sorted.sort((a, b) => {
      const rank = (t) => { const i = entityTypeOrder.indexOf(t); return i === -1 ? 99 : i; };
      return rank(a.type) - rank(b.type);
    });
    case 'children-desc': return sorted.sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0));
    case 'children-asc':  return sorted.sort((a, b) => (a.children?.length || 0) - (b.children?.length || 0));
    default:              return sorted;
  }
}
