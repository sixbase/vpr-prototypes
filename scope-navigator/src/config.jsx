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
    stroke: 'var(--vds-azure-600)',
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
    bgClass: 'bg-rose-600',
    ring: 'ring-rose-700 dark:ring-rose-500',
    stroke: 'var(--vds-rose-600)',
    tintColor: 'text-rose-700 dark:text-rose-300',
    legacyColor: 'text-white',
    bg: 'bg-rose-600',
  },
  customer: {
    label: 'Customer',
    Icon: Briefcase,
    icon: Briefcase,
    color: 'text-white',
    iconColor: 'text-white',
    textClass: 'text-white',
    bgClass: 'bg-emerald-600',
    ring: 'ring-emerald-700 dark:ring-emerald-500',
    stroke: 'var(--vds-emerald-600)',
    tintColor: 'text-emerald-700 dark:text-emerald-300',
    legacyColor: 'text-white',
    bg: 'bg-emerald-600',
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
    stroke: 'var(--vds-graphite-700)',
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
    bgClass: 'bg-rose-600',
    ring: 'ring-rose-700 dark:ring-rose-500',
    stroke: 'var(--vds-rose-600)',
    tintColor: 'text-rose-700 dark:text-rose-300',
    legacyColor: 'text-white',
    bg: 'bg-rose-600',
  },
};
// @deprecated - use displayTypeOrder (or entityTypeOrder for data-model iteration)
export const typeOrder = displayTypeOrder;

// ── Entity-type iconography (single source of truth) ───────────────
// Every place that shows a distributor / reseller / customer icon (KPI tiles,
// drawer list rows, breadcrumb crumbs, detail cards, package sub-rows) renders
// it the SAME way: a neutral ring chip + a DS-toned glyph. Tones match the
// rollup KPIs — distributor→azure, reseller/partner→rose, customer→emerald.
export const TYPE_DS_GLYPH = {
  distributor: 'text-azure-600 dark:text-azure-400',
  partner: 'text-rose-600 dark:text-rose-400',
  reseller: 'text-rose-600 dark:text-rose-400',
  customer: 'text-emerald-600 dark:text-emerald-400',
  root: 'text-ink-muted',
};
const ENTITY_ICON_CHIP = { xs: 'w-5 h-5', sm: 'w-6 h-6', md: 'w-7 h-7', lg: 'w-10 h-10' };
const ENTITY_ICON_GLYPH = { xs: 'w-3 h-3', sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-5 h-5' };

export function EntityTypeIcon({ type, size = 'md', className = '' }) {
  const cfg = typeConfig[type] || typeConfig.customer;
  const Glyph = cfg.Icon;
  const glyphColor = TYPE_DS_GLYPH[type] ?? 'text-ink-muted';
  return (
    <span className={`inline-flex items-center justify-center rounded-full border border-line-strong flex-shrink-0 ${ENTITY_ICON_CHIP[size]} ${className}`}>
      {Glyph && <Glyph className={`${ENTITY_ICON_GLYPH[size]} ${glyphColor}`} />}
    </span>
  );
}

// Vipre logomark (the angular "V" — just the mark, not the VIPRE wordmark).
// Accepts width/height (so it works as a DS `Icon as={VipreMark}`) and className.
// currentColor-filled, so `text-*` controls its color.
export function VipreMark({ className, width, height, ...props }) {
  return (
    <svg viewBox="0 0 47 40" width={width} height={height} className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.4474 10.6562C13.149 9.44293 14.283 9.44293 14.9845 10.6562L26.6408 30.8076C27.3424 32.0209 27.3424 34.0259 26.6408 35.2393L24.4826 39.0898C23.781 40.3031 22.648 40.3031 21.9465 39.0898L10.2892 18.9385C9.58766 17.7252 9.58766 15.7202 10.2892 14.4541L12.4474 10.6562Z" fill="currentColor"/>
      <path d="M45.4758 0C46.9329 0 47.4723 1.0025 46.7707 2.21582L34.5744 22.209C33.8189 23.4222 32.0383 24.4246 30.5812 24.4248H26.1017C24.6447 24.4248 24.1044 23.4222 24.8058 22.209L37.0031 2.21582C37.7586 1.00258 39.5392 0.000127689 40.9963 0H45.4758Z" fill="currentColor"/>
      <path d="M25.2638 0.0527344C26.7209 0.0529233 28.5015 1.05535 29.257 2.26855L31.5773 6.06641C32.3329 7.27973 31.7393 8.28223 30.3361 8.28223H6.64471C5.18761 8.28223 3.40711 7.2797 2.65154 6.06641L0.330252 2.26855C-0.425245 1.05531 0.168497 0.0528588 1.57146 0.0527344H25.2638Z" fill="currentColor"/>
    </svg>
  );
}

// Full VIPRE wordmark (mark + letters). currentColor-filled — set color via text-*.
export function VipreWordmark({ className, width = 90, height = 16, ...props }) {
  return (
    <svg viewBox="0 0 220 40" width={width} height={height} className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.4474 10.6562C13.149 9.44293 14.283 9.44293 14.9845 10.6562L26.6408 30.8076C27.3424 32.0209 27.3424 34.0259 26.6408 35.2393L24.4826 39.0898C23.781 40.3031 22.648 40.3031 21.9465 39.0898L10.2892 18.9385C9.58766 17.7252 9.58766 15.7202 10.2892 14.4541L12.4474 10.6562Z" fill="currentColor"/>
      <path d="M45.4758 0C46.9329 0 47.4723 1.0025 46.7707 2.21582L34.5744 22.209C33.8189 23.4222 32.0383 24.4246 30.5812 24.4248H26.1017C24.6447 24.4248 24.1044 23.4222 24.8058 22.209L37.0031 2.21582C37.7586 1.00258 39.5392 0.000127689 40.9963 0H45.4758Z" fill="currentColor"/>
      <path d="M25.2638 0.0527344C26.7209 0.0529233 28.5015 1.05535 29.257 2.26855L31.5773 6.06641C32.3329 7.27973 31.7393 8.28223 30.3361 8.28223H6.64471C5.18761 8.28223 3.40711 7.2797 2.65154 6.06641L0.330252 2.26855C-0.425245 1.05531 0.168497 0.0528588 1.57146 0.0527344H25.2638Z" fill="currentColor"/>
      <path d="M106.538 31.2637H96.6086L99.7385 15.3857C100.332 12.2733 103.084 10.0577 106.322 10.0576H110.748L106.538 31.2637Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M139.862 10.1104C144.341 10.1104 146.878 11.429 147.957 13.2754C148.443 14.0666 148.605 14.9636 148.605 15.8604C148.605 17.0208 148.335 18.0759 147.741 19.1309C146.176 21.7685 142.56 23.7207 136.947 23.7207H123.671L122.16 31.2637H112.176L116.386 10.1104H139.862ZM124.535 19.2363V19.2891H134.411C136.246 19.289 137.542 18.7092 138.081 17.7598C138.297 17.3905 138.404 16.9679 138.404 16.4932C138.404 16.124 138.35 15.8077 138.189 15.5439C137.865 14.9637 137.055 14.5938 135.814 14.5938H125.452L124.535 19.2363Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M176.855 10.1104C180.902 10.1104 183.384 11.2181 184.518 13.0645C185.003 13.8557 185.166 14.6999 185.166 15.5967C185.166 16.6516 184.896 17.5486 184.41 18.3926C183.115 20.5553 180.039 21.663 175.56 21.9268L177.773 24.9863L182.467 31.2637H171.189L164.874 22.9814H160.395L158.776 31.2637H148.792L153.001 10.1104H176.855ZM161.204 19.0254H171.512C173.131 19.0254 174.264 18.4981 174.804 17.6543C175.02 17.285 175.128 16.9152 175.128 16.4404C175.128 16.0713 175.074 15.8076 174.912 15.5439C174.535 14.911 173.779 14.5938 172.646 14.5938H162.121L161.204 19.0254Z" fill="currentColor"/>
      <path d="M219.083 14.6992H199.762L199.007 18.4453H217.896L217.032 22.876H198.144L197.388 26.6221H216.708L215.791 31.2637H186.594L189.725 15.3857C190.318 12.3261 193.071 10.0576 196.309 10.0576H220L219.083 14.6992Z" fill="currentColor"/>
      <path d="M72.8088 25.1973L73.4025 26.833L74.59 25.25L74.6437 25.1445L83.8185 12.8008C85.1137 11.1127 87.1101 10.1104 89.2687 10.1104V10.0576H96.9318L80.0402 31.2109H65.6848L57.2121 10.0576H67.4123L72.8088 25.1973Z" fill="currentColor"/>
    </svg>
  );
}

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
// Status colors bind to the DS semantic status tokens (success=emerald, warning=amber,
// danger=rose) via the soft/solid utilities — they flip light/dark automatically.
export const statusConfig = {
  active:    { pill: 'bg-success-soft text-success', dot: 'bg-success', label: 'Active',    desc: 'Live, paying subscription' },
  trial:     { pill: 'bg-warning-soft text-warning', dot: 'bg-warning', label: 'Trial',     desc: 'Evaluating, not yet converted' },
  suspended: { pill: 'bg-danger-soft text-danger',   dot: 'bg-danger',  label: 'Suspended', desc: 'Access paused — billing or policy hold' },
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
