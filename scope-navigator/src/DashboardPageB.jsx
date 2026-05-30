import { useMemo, useState, useEffect } from 'react';
import {
  Building2, Monitor, Shield, Activity,
  Package, Mail, Send, ShieldCheck, Bug, Globe, Cloud, Key, ScanSearch, Clock, Paperclip,
  MapPin, Phone, User, Network, ArrowLeft, ArrowUpRight,
} from 'lucide-react';
import { useScope } from './ScopeContext';
import { collectDevicesInScope, computeDeviceStats, collectPackageAdoption, mockData, genCustomerPackages, genPartnerPackages } from './data';
import { typeConfig, statusConfig, pkgIconMap, defaultPkgIcon, isPartner, isLeaf, isEntityUnmanaged } from './config';
import EntityDetail, { ChildrenListView, EntityPackageDetail } from './EntityDetail';

// Roll up descendants into the three structural buckets shown on the dashboard:
// distributor / partner / customer. Partner capability (msp / hybrid / reseller)
// is intentionally not split here — that breakdown belongs on the Partners tile
// drill-in or on the partner-scope view, not at the structural rollup level.
function countDescendantsByStructuralType(entities) {
  let distributor = 0, partner = 0, customer = 0;
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'distributor') distributor++;
      else if (isPartner(node)) partner++;
      else if (isLeaf(node)) customer++;
      if (node.children?.length) walk(node.children);
    }
  }
  walk(entities);
  return { distributor, partner, customer };
}

// The Partners tile is structural rollup — distinct from the per-capability
// chips (msp blue, hybrid fuchsia, reseller teal). Saturated-but-neutral zinc
// + Network icon signals "all partner kinds, regardless of capability".
const PARTNER_TILE = {
  label: 'Reseller',
  Icon: Network,
  bg: 'bg-red-600',
  color: 'text-white',
};

// This tab presents structural "partner" entities under the "Reseller" label.
// Scoped to the B experience via labelOverrides — the shared typeConfig (and
// every other tab) keeps calling them "Partner".
const B_LABEL_OVERRIDES = { partner: 'Reseller' };

function getTileConfig(type) {
  if (type === 'partner') return PARTNER_TILE;
  return typeConfig[type];
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

function utilColor(util) {
  return util >= 70
    ? 'text-green-600 dark:text-green-400'
    : util >= 40
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';
}

// Right-side slide-out drawer shell shared by the descendants and package views.
// `wide` widens the panel (used for the full entity-detail view).
function Drawer({ open, onClose, wide = false, children }) {
  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div
        className={`absolute top-0 right-0 h-full w-full ${wide ? 'max-w-3xl' : 'max-w-md'} bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

// Wraps the full EntityDetail panel with a slim drawer toolbar (back + open).
function DrawerEntityDetail({ entity, siblings, showFuture, onBack, onOpenFull, onDrillDown, onPackageClick }) {
  // Back-button label reflects where you came from (the list you drilled in from).
  const sourceLabel = entity.type === 'partner' ? 'Reseller' : (typeConfig[entity.type]?.label ?? 'Back');
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 group"
          aria-label={`Back to ${sourceLabel}s`}
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{sourceLabel}s</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={onOpenFull}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
        >
          Open
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <EntityDetail entity={entity} siblings={siblings} showFuture={showFuture} onDrillDown={onDrillDown} onPackageClick={onPackageClick} hideTypeBadge statusAsDot hideContactInfo />
      </div>
    </div>
  );
}

// Walk the scope tree and collect every entity that subscribes to a package id,
// along with that entity's seats / utilization for the package. Customers draw
// from genCustomerPackages; partners & distributors from genPartnerPackages.
function collectPackageSubscribers(scope, pkgId) {
  const out = [];
  function consider(node) {
    if (!node) return;
    const pkgs = node.type === 'customer' ? genCustomerPackages(node) : genPartnerPackages(node);
    const m = pkgs.find(p => p.id === pkgId);
    if (m) {
      out.push({
        id: node.id,
        name: node.name,
        type: node.type,
        status: node.status,
        seats: m.seats ?? m.actual ?? 0,
        util: m.util ?? 0,
      });
    }
  }
  function walk(nodes) {
    for (const n of nodes) { consider(n); if (n.children?.length) walk(n.children); }
  }
  if (!scope) walk(mockData);
  else if (scope.type === 'customer') consider(scope);
  else { consider(scope); walk(scope.children || []); }
  return out.sort((a, b) => b.seats - a.seats);
}

// Detail view for a single package, shown inside the package drawer.
function PackageDetail({ pkg, scope, onClose }) {
  const subscribers = useMemo(
    () => (pkg ? collectPackageSubscribers(scope, pkg.id) : []),
    [scope, pkg?.id]
  );
  if (!pkg) return null;
  const { icon: PkgIcon, color: pkgColor } = pkgIconMap[pkg.id] || defaultPkgIcon;

  const kpis = [
    { label: 'Subscriptions', value: pkg.entities },
    { label: 'Total Seats', value: pkg.seats },
    { label: 'Avg Utilization', value: `${pkg.avgUtil}%`, color: utilColor(pkg.avgUtil) },
  ];

  const utilBar = pkg.avgUtil >= 70
    ? 'bg-green-500'
    : pkg.avgUtil >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 group"
          aria-label="Close package details"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
        </button>
        <PkgIcon className={`w-4 h-4 flex-shrink-0 ${pkgColor}`} />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">{pkg.name}</span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">Package</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
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

        {/* Average utilization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Average utilization</span>
            <span className={`text-xs font-medium tabular-nums ${utilColor(pkg.avgUtil)}`}>{pkg.avgUtil}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <div className={`h-full rounded-full ${utilBar}`} style={{ width: `${Math.min(100, pkg.avgUtil)}%` }} />
          </div>
          {pkg.avgUtil > 100 && (
            <div className="mt-1.5 text-[11px] text-red-500 dark:text-red-400">Over-provisioned — usage exceeds licensed seats.</div>
          )}
        </div>

        {/* Subscribed entities */}
        <div>
          <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
            Subscribed entities ({subscribers.length.toLocaleString()})
          </div>
          {subscribers.length === 0 ? (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 py-3">No entities in this scope subscribe to {pkg.name}.</div>
          ) : (
            <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
              {subscribers.map(sub => {
                const cfg = typeConfig[sub.type] || {};
                const SubIcon = cfg.Icon || Building2;
                const typeLabel = sub.type === 'partner' ? 'Reseller' : (cfg.label || sub.type);
                return (
                  <div key={sub.id} className="flex items-center gap-2.5 px-3 py-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.bg || 'bg-zinc-100 dark:bg-zinc-800'}`}>
                      <SubIcon className={`w-3 h-3 ${cfg.color || 'text-zinc-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{sub.name}</div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500">{typeLabel}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] tabular-nums text-zinc-700 dark:text-zinc-300">{sub.seats.toLocaleString()} <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">seats</span></div>
                      <div className={`text-[11px] tabular-nums ${utilColor(sub.util)}`}>{sub.util}% util</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPageB({ externalFilter, onExternalFilterChange, onDrillDown, onViewAll, showFuture = false } = {}) {
  const { currentEntity, currentLevel, childEntities, path, navigate } = useScope();
  const [internalFilter, setInternalFilter] = useState(null);
  // Retains the last opened type so the drawer keeps rendering its list while
  // it slides out (childrenFilter goes null on close before the transition ends).
  const [retainedFilter, setRetainedFilter] = useState(null);
  // Package detail drawer — selectedPkg drives open/close, retainedPkg keeps
  // content rendered through the slide-out transition.
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [retainedPkg, setRetainedPkg] = useState(null);
  // Entity detail shown inside the descendants drawer (clicking a row). When set,
  // the drawer swaps the list for the full EntityDetail panel and widens.
  const [detailEntity, setDetailEntity] = useState(null);
  // A package drilled into from within an entity's detail view (third level).
  const [detailPkg, setDetailPkg] = useState(null);

  const isControlled = onExternalFilterChange !== undefined;
  const childrenFilter = isControlled ? (externalFilter ?? null) : internalFilter;

  function openChildrenPanel(type) {
    setDetailEntity(null); // always open to the list, not a stale detail view
    setDetailPkg(null);
    if (isControlled) onExternalFilterChange(type);
    else setInternalFilter(type);
  }
  function closeChildrenPanel() {
    if (isControlled) onExternalFilterChange(null);
    else setInternalFilter(null);
  }

  useEffect(() => {
    if (!isControlled) setInternalFilter(null);
  }, [currentEntity?.id, isControlled]);

  useEffect(() => {
    if (childrenFilter) setRetainedFilter(childrenFilter);
  }, [childrenFilter]);

  useEffect(() => {
    if (selectedPkg) setRetainedPkg(selectedPkg);
  }, [selectedPkg]);

  // Close drawers when the scope changes out from under them.
  useEffect(() => { setSelectedPkg(null); setDetailEntity(null); setDetailPkg(null); }, [currentEntity?.id]);
  // Returning to the list clears any drilled-in package.
  useEffect(() => { if (!detailEntity) setDetailPkg(null); }, [detailEntity]);

  // Escape: step back one level (package → entity → list), then close.
  useEffect(() => {
    if (!childrenFilter && !selectedPkg) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (detailPkg) { setDetailPkg(null); return; }
      if (detailEntity) { setDetailEntity(null); return; }
      closeChildrenPanel();
      setSelectedPkg(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [childrenFilter, selectedPkg, detailEntity, detailPkg]);

  const rootSynthetic = useMemo(
    () => ({ type: 'root', name: 'All Accounts', children: mockData }),
    []
  );
  const listEntity = currentEntity || rootSynthetic;

  function handleChildDrillDown(child) {
    closeChildrenPanel();
    if (onDrillDown) {
      onDrillDown(child);
    } else {
      navigate([...path, child]);
    }
  }

  const name = currentEntity?.name ?? 'All Accounts';
  const descendantCounts = useMemo(
    () => countDescendantsByStructuralType(childEntities),
    [childEntities]
  );

  const devices = useMemo(
    () => collectDevicesInScope(currentEntity),
    [currentEntity]
  );
  const stats = useMemo(() => computeDeviceStats(devices), [devices]);

  const pkgAdoption = useMemo(
    () => collectPackageAdoption(currentEntity),
    [currentEntity]
  );

  const levelLabel = currentLevel === 'root' ? 'Root' : currentEntity?.type;
  const compliancePct = stats.total ? Math.round((stats.compliant / stats.total) * 100) : 0;

  // At-a-glance summary chips that fill the otherwise-empty right side of the header band.
  const headerStats = [
    { label: 'Devices', value: stats.total.toLocaleString() },
    { label: 'Compliant', value: stats.total ? `${compliancePct}%` : '—', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Customers', value: (descendantCounts.customer || 0).toLocaleString() },
  ];

  const pkgKpis = [
    { label: 'Unique Packages', value: pkgAdoption.uniquePackages },
    { label: 'Subscriptions', value: pkgAdoption.totalSubscriptions },
    { label: 'Total Seats', value: pkgAdoption.totalSeats },
    { label: 'Avg Utilization', value: `${pkgAdoption.avgUtil}%`, color: utilColor(pkgAdoption.avgUtil) },
  ];

  // compliant / non-compliant / pending-scan partition the fleet (they sum to total);
  // outdated-agent is an orthogonal agent-health signal and stays a standalone tile.
  const pendingScan = Math.max(0, stats.total - stats.compliant - stats.nonCompliant);
  const pctOf = (n) => (stats.total ? (n / stats.total) * 100 : 0);
  const complianceSegments = [
    { label: 'Compliant', value: stats.compliant, bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { label: 'Non-compliant', value: stats.nonCompliant, bar: 'bg-red-500', dot: 'bg-red-500' },
    { label: 'Pending scan', value: pendingScan, bar: 'bg-zinc-300 dark:bg-zinc-600', dot: 'bg-zinc-300 dark:bg-zinc-600' },
  ];

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 lg:h-full lg:min-h-0">
      {/* Scope context card */}
      <div className="flex-shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {(() => {
            const config = currentEntity?.type ? typeConfig[currentEntity.type] : null;
            const Icon = config?.Icon || Building2;
            const iconColor = config?.color || 'text-zinc-400';
            const iconBg = config?.bg || 'bg-zinc-100 dark:bg-zinc-700/50';
            return (
              <div className={`p-2 rounded-lg ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{name}</div>
              {currentEntity?.status && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none flex-shrink-0 ${statusConfig[currentEntity.status].pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[currentEntity.status].dot}`} />
                  {statusConfig[currentEntity.status].label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">{levelLabel} level</span>
              {currentEntity?.region && (
                <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                  <Globe className="w-3 h-3" />
                  {currentEntity.region}
                </span>
              )}
              {currentEntity?.lastActive && (
                <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                  <Clock className="w-3 h-3" />
                  Active {formatLastActive(currentEntity.lastActive)}
                </span>
              )}
            </div>
          </div>

          {/* At-a-glance stats — fills the empty horizontal band */}
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0 pl-4">
            {headerStats.map(s => (
              <div key={s.label} className="text-right">
                <div className={`text-lg font-semibold tabular-nums leading-tight ${s.color || 'text-zinc-900 dark:text-zinc-100'}`}>{s.value}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Entity metadata */}
        {currentEntity && (currentEntity.address || currentEntity.contact) && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
            {currentEntity.address && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">Location</span>
                </div>
                <div className="text-xs text-zinc-700 dark:text-zinc-300">{currentEntity.address.street}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {currentEntity.address.city}{currentEntity.address.state ? `, ${currentEntity.address.state}` : ''} {currentEntity.address.zip}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{currentEntity.address.country}</div>
              </div>
            )}
            {currentEntity.contact && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">Primary Contact</span>
                </div>
                <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{currentEntity.contact.firstName} {currentEntity.contact.lastName}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{currentEntity.contact.email}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{currentEntity.contact.phone}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two-column body fills the remaining height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:flex-1 lg:min-h-0">
        {/* Package Adoption — wide, table grows to fill */}
        <div className="order-2 lg:col-span-7 flex flex-col lg:min-h-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex-shrink-0 text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium mb-4">Package Adoption</div>

          {/* KPI strip */}
          <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {pkgKpis.map(item => (
              <div key={item.label} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{item.label}</div>
                <div className={`text-xl font-semibold tabular-nums ${item.color || 'text-zinc-900 dark:text-zinc-100'}`}>
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Package table — fills remaining column height, scrolls internally */}
          {pkgAdoption.packages.length > 0 && (
            <div className="overflow-x-auto lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    <td className="pb-2 sticky top-0 bg-white dark:bg-zinc-900">Package</td>
                    <td className="pb-2 text-right w-[60px] sticky top-0 bg-white dark:bg-zinc-900">Entities</td>
                    <td className="pb-2 text-right w-[72px] sticky top-0 bg-white dark:bg-zinc-900">Seats</td>
                    <td className="pb-2 text-right w-[48px] sticky top-0 bg-white dark:bg-zinc-900">Util</td>
                  </tr>
                </thead>
                <tbody>
                  {pkgAdoption.packages.map((pkg, i) => {
                    const { icon: PkgIcon, color: pkgColor } = pkgIconMap[pkg.id] || defaultPkgIcon;
                    return (
                      <tr
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${i < pkgAdoption.packages.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                      >
                        <td className="py-1.5 pl-1 pr-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <PkgIcon className={`w-3.5 h-3.5 flex-shrink-0 ${pkgColor}`} />
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{pkg.name}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{pkg.entities}</td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{pkg.seats.toLocaleString()}</td>
                        <td className={`py-1.5 text-right tabular-nums font-medium ${
                          pkg.avgUtil >= 70
                            ? 'text-green-600 dark:text-green-500'
                            : pkg.avgUtil >= 40
                              ? 'text-amber-600 dark:text-amber-500'
                              : 'text-red-600 dark:text-red-500'
                        }`}>{pkg.avgUtil}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Left rail — Descendants over Device Overview, together filling the column */}
        <div className="order-1 lg:col-span-5 flex flex-col gap-5 lg:min-h-0">
          {/* Descendants */}
          <div className="flex-shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Descendants</span>
              {onViewAll && (
                <button
                  onClick={onViewAll}
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors"
                >
                  View all →
                </button>
              )}
            </div>
            <div className="space-y-2">
              {['distributor', 'partner', 'customer'].map(type => {
                const count = descendantCounts[type] || 0;
                const config = getTileConfig(type);
                const Icon = config.Icon;
                return (
                  <button
                    key={type}
                    onClick={() => openChildrenPanel(type)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-3 cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{config.label}s</div>
                    </div>
                    <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Overview */}
          <div className="flex flex-col lg:flex-1 lg:min-h-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="flex-shrink-0 text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium mb-3">Device Overview</div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-3">
              {[
                { label: 'Total Devices', value: stats.total, color: 'text-zinc-900 dark:text-zinc-100' },
                { label: 'Compliant', value: stats.compliant, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Non-Compliant', value: stats.nonCompliant, color: 'text-red-600 dark:text-red-400' },
                { label: 'Outdated Agent', value: stats.outdatedAgent, color: 'text-amber-600 dark:text-amber-400' },
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{item.label}</div>
                  <div className={`text-xl font-semibold tabular-nums ${item.color}`}>{item.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Compliance breakdown — anchored to the bottom; legend sits tight under its bar */}
            <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Compliance status</span>
                <span className="text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{compliancePct}% compliant</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {complianceSegments.map(seg => (
                  seg.value > 0 ? (
                    <div key={seg.label} className={seg.bar} style={{ width: `${pctOf(seg.value)}%` }} />
                  ) : null
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {complianceSegments.map(seg => (
                  <div key={seg.label} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${seg.dot}`} />
                    <span className="text-zinc-600 dark:text-zinc-400 flex-1">{seg.label}</span>
                    <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{seg.value.toLocaleString()}</span>
                    <span className="tabular-nums text-zinc-400 dark:text-zinc-500 w-10 text-right">{Math.round(pctOf(seg.value))}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Descendants drawer — slides in from the right edge of the page.
          Swaps between the entity list and a full entity-detail view. */}
      <Drawer open={!!childrenFilter} onClose={closeChildrenPanel} wide={!!detailEntity}>
        <div className="relative h-full">
          {/* List view */}
          <div className={`absolute inset-0 transition-opacity duration-150 ${detailEntity ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {retainedFilter && (
              <ChildrenListView
                entity={listEntity}
                filter={retainedFilter}
                onBack={closeChildrenPanel}
                onDrillDown={(child) => setDetailEntity(child)}
                deep
                labelOverrides={B_LABEL_OVERRIDES}
                hideTypeBadge
                statusAsDot
                showManagementFilter
                subtleUnmanaged
                typeTitle
              />
            )}
          </div>
          {/* Entity detail view */}
          <div className={`absolute inset-0 transition-opacity duration-150 ${detailEntity && !detailPkg ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {detailEntity && (
              <DrawerEntityDetail
                entity={detailEntity}
                siblings={childEntities}
                showFuture={showFuture}
                onBack={() => setDetailEntity(null)}
                onOpenFull={() => handleChildDrillDown(detailEntity)}
                onDrillDown={(child) => setDetailEntity(child)}
                onPackageClick={(pkg) => setDetailPkg(pkg)}
              />
            )}
          </div>
          {/* Package-within-entity detail view */}
          <div className={`absolute inset-0 transition-opacity duration-150 ${detailEntity && detailPkg ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {detailEntity && detailPkg && (
              <EntityPackageDetail
                entity={detailEntity}
                pkg={detailPkg}
                onBack={() => setDetailPkg(null)}
              />
            )}
          </div>
        </div>
      </Drawer>

      {/* Package detail drawer */}
      <Drawer open={!!selectedPkg} onClose={() => setSelectedPkg(null)}>
        <PackageDetail pkg={retainedPkg} scope={currentEntity} onClose={() => setSelectedPkg(null)} />
      </Drawer>
    </div>
  );
}
