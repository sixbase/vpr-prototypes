import { useMemo, useState, useEffect, Fragment } from 'react';
import { Building2, ArrowLeft, ArrowUpRight, ChevronRight } from '@icons';
import { useScope } from './ScopeContext';
import { mockData, genCustomerPackages, genPartnerPackages, findEntityById, buildRootAggregateEntity } from './data';
import { typeConfig, pkgIconMap, defaultPkgIcon, EntityTypeIcon } from './config';
import EntityDetail, { ChildrenListView, EntityPackageDetail, EntityIdentityHeader } from './EntityDetail';
import useClickOutside from './useClickOutside';

// Clickable "…" in the drawer breadcrumb — opens a menu of the collapsed levels.
function BreadcrumbEllipsis({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-1.5 py-1 rounded-md text-xs font-medium transition-colors ${open ? 'bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70'}`}
        aria-label="Show hidden levels"
      >
        …
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] max-w-[280px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg p-1">
          {items.map((it, i) => {
            // These are the collapsed middle levels — an ancestor→descendant
            // chain. A continuous vertical line threads through the entity icons
            // (clipped at the first/last) to make the nesting relationship
            // explicit, mirroring the entity→package connector elsewhere.
            const cfg = it.entityType ? typeConfig[it.entityType] : null;
            const Icon = cfg?.Icon;
            const isLast = i === items.length - 1;
            return (
              <button
                key={it.key}
                onClick={() => { setOpen(false); it.onClick(); }}
                className="relative w-full flex items-stretch gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <span className="relative flex-shrink-0 flex items-center justify-center w-5">
                  <span
                    aria-hidden
                    className={`absolute left-1/2 -translate-x-1/2 w-px bg-zinc-200 dark:bg-zinc-600 ${i === 0 ? 'top-1/2 bottom-0' : isLast ? 'top-0 bottom-1/2' : 'inset-y-0'}`}
                  />
                  {it.entityType && (
                    <EntityTypeIcon type={it.entityType} size="xs" className="relative z-10 bg-surface" />
                  )}
                </span>
                <span className="self-center min-w-0 truncate text-xs font-medium text-zinc-700 dark:text-zinc-200 text-left">{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Shared drawer top bar — identical breadcrumb styling for both the list view and
// the entity-detail view, so it doesn't visibly change as you drill. "Open" only
// shows once an entity is selected.
function DrawerTopBar({ crumbs, onBack, showOpen = false, onOpen }) {
  const shown = crumbs.length > 3
    ? [crumbs[0], { key: '__ell', ellipsis: true, items: crumbs.slice(1, -1) }, crumbs[crumbs.length - 1]]
    : crumbs;
  return (
    <div className="flex items-center gap-1.5 px-3 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
      <button
        onClick={onBack}
        className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 group"
        aria-label="Back"
      >
        <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
      </button>
      <nav className="flex items-center gap-1 min-w-0 flex-1">
        {shown.map((c, i) => {
          // Every crumb shares one box (same padding/typography) so the leading
          // "list" crumb + back arrow stay perfectly still as you drill in and
          // out — it only ever gains a hover affordance, never shifts or
          // recolors at rest. The leading crumb keeps the darker "anchor" tone
          // in both list and detail; deeper parent links read lighter.
          const box = 'text-xs font-medium px-1.5 py-1 rounded-md truncate min-w-0';
          const tone = i === 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400';
          return (
            <Fragment key={c.key}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />}
              {c.ellipsis ? (
                <BreadcrumbEllipsis items={c.items} />
              ) : c.onClick ? (
                <button
                  onClick={c.onClick}
                  className={`${box} ${tone} hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 ${i === 0 ? '' : 'hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                >
                  {c.label}
                </button>
              ) : (
                <span className={`${box} ${tone}`}>{c.label}</span>
              )}
            </Fragment>
          );
        })}
      </nav>
      {showOpen && (
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
        >
          Open
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// This tab presents structural "partner" entities under the "Reseller" label.
// Scoped to the B experience via labelOverrides — the shared typeConfig (and
// every other tab) keeps calling them "Partner".
const B_LABEL_OVERRIDES = { partner: 'Reseller' };

function utilColor(util) {
  return util >= 70
    ? 'text-emerald-600 dark:text-emerald-400'
    : util >= 40
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';
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
        className={`absolute top-0 right-0 h-full w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

// Detail body shown under the (static) drawer top bar: the entity identity header
// plus the overview, which slides aside when a package datapoint is opened. The
// breadcrumb / back / "Open" all live in the persistent top bar above this.
function DrawerEntityDetail({ entity, filter, onFilterChange, pkg, siblings, showFuture, onDrillDown, onPackageClick, onCustomerDrillDown }) {
  // Keep the last package mounted through the slide-out so the panel doesn't
  // blank out mid-animation when navigating back to the overview.
  const [shownPkg, setShownPkg] = useState(pkg);
  useEffect(() => { if (pkg) setShownPkg(pkg); }, [pkg]);

  const drawerChildListProps = {
    labelOverrides: B_LABEL_OVERRIDES,
    hideHeader: true,
    hideTypeBadge: true,
    statusAsDot: true,
    subtleUnmanaged: true,
    showManagementFilter: true,
  };
  return (
    <div className="flex flex-col h-full">
      {/* Entity identity — slides with its content beneath the fixed top bar */}
      <EntityIdentityHeader entity={entity} statusAsDot hideTypeBadge connectorBelow={!!pkg} />

      {/* Body — overview sits underneath; the package detail slides in from the right */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Overview layer — eases back slightly as the datapoint takes focus */}
        <div className={`absolute inset-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${pkg ? '-translate-x-8 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          <EntityDetail entity={entity} siblings={siblings} showFuture={showFuture} onDrillDown={onDrillDown} onPackageClick={onPackageClick} onViewAll={() => onFilterChange('all')} hideHeader hideTypeBadge statusAsDot hideContactInfo hideAddProduct externalFilter={filter} onExternalFilterChange={onFilterChange} childListProps={drawerChildListProps} />
        </div>
        {/* Package datapoint layer — slides over with a soft depth shadow on its edge */}
        <div className={`absolute inset-0 flex flex-col bg-white dark:bg-zinc-900 shadow-[-16px_0_40px_-16px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${pkg ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
          {shownPkg && <EntityPackageDetail entity={entity} pkg={shownPkg} embedded onCustomerClick={onCustomerDrillDown} />}
        </div>
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
    ? 'bg-emerald-500'
    : pkg.avgUtil >= 40 ? 'bg-amber-500' : 'bg-rose-500';

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
            <div className="mt-1.5 text-[11px] text-rose-500 dark:text-rose-400">Over-provisioned — usage exceeds licensed seats.</div>
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
                    <EntityTypeIcon type={sub.type} size="sm" />
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

// Standalone "customer data" drawer — the same slide-out entity detail the dashboard
// renders inside its descendants drawer, packaged for callers that already have the
// entity in hand (e.g. the MSP Customers list). Open it by passing `entity`; pass null
// to close. `onOpenEntity` powers the top-bar "Open" affordance. The package slide and
// step-by-step drill (breadcrumb) work exactly as they do on the dashboard.
export function EntityDataDrawer({ entity, siblings = [], showFuture = false, onOpenEntity, onClose }) {
  // Drill stack inside the drawer — each entry is { entity, filter }, seeded with the
  // opened entity. Kept mounted while the drawer slides out (we only reseed on open),
  // so the content doesn't blank mid-animation.
  const [stack, setStack] = useState([]);
  const [pkg, setPkg] = useState(null);
  useEffect(() => {
    if (entity) { setStack([{ entity, filter: null }]); setPkg(null); }
  }, [entity?.id]);

  const top = stack.length ? stack[stack.length - 1] : null;
  const shownEntity = top?.entity ?? null;
  const shownFilter = top?.filter ?? null;

  const crumbs = stack.map((s, i) => ({
    key: s.entity.id,
    label: s.entity.name,
    onClick: i < stack.length - 1 ? () => setStack(st => st.slice(0, i + 1)) : undefined,
  }));

  function back() {
    if (pkg) { setPkg(null); return; }
    if (stack.length > 1) { setStack(st => st.slice(0, -1)); return; }
    onClose();
  }

  return (
    <Drawer open={!!entity} onClose={onClose} wide>
      {shownEntity && (
        <div className="flex flex-col h-full">
          <DrawerTopBar
            crumbs={crumbs}
            onBack={back}
            showOpen={!!onOpenEntity}
            onOpen={() => onOpenEntity(stack.map((s) => s.entity))}
          />
          <div className="flex-1 min-h-0">
            <DrawerEntityDetail
              entity={shownEntity}
              filter={shownFilter}
              onFilterChange={(f) => setStack(st => st.length ? [...st.slice(0, -1), { ...st[st.length - 1], filter: f }] : st)}
              pkg={pkg}
              siblings={siblings}
              showFuture={showFuture}
              onDrillDown={(child) => setStack(st => [...st, { entity: child, filter: null }])}
              onPackageClick={(p) => setPkg(p)}
              onCustomerDrillDown={(child) => { setPkg(null); setStack(st => [...st, { entity: child, filter: null }]); }}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function DashboardPageB({ externalFilter, onExternalFilterChange, onDrillDown, onViewAll, showFuture = false, openModal, rootNameOverride, hideRootStatus = false } = {}) {
  const { currentEntity, childEntities, path, navigate } = useScope();
  const [internalFilter, setInternalFilter] = useState(null);
  // Retains the last opened type so the drawer keeps rendering its list while
  // it slides out (childrenFilter goes null on close before the transition ends).
  const [retainedFilter, setRetainedFilter] = useState(null);
  // Package detail drawer — selectedPkg drives open/close, retainedPkg keeps
  // content rendered through the slide-out transition.
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [retainedPkg, setRetainedPkg] = useState(null);
  // Entity drill stack inside the descendants drawer. Each entry is an entity you
  // drilled into; the last one is what's shown. Lets you retrace step-by-step and
  // see the trail (breadcrumb), instead of losing your place when going deep.
  // Each entry is { entity, filter } — `filter` records which child-list (if any)
  // was open at that level, so Back retraces to the exact view you came from.
  const [detailStack, setDetailStack] = useState([]);
  const detailTop = detailStack.length ? detailStack[detailStack.length - 1] : null;
  const detailEntity = detailTop?.entity ?? null;
  const detailFilter = detailTop?.filter ?? null;
  // Keeps the detail content mounted through the slide-out back to the list.
  const [retainedEntity, setRetainedEntity] = useState(null);
  // A package drilled into from within an entity's detail view (third level).
  const [detailPkg, setDetailPkg] = useState(null);

  const isControlled = onExternalFilterChange !== undefined;
  const childrenFilter = isControlled ? (externalFilter ?? null) : internalFilter;

  function openChildrenPanel(type) {
    setDetailStack([]); // always open to the list, not a stale detail view
    setDetailPkg(null);
    if (isControlled) onExternalFilterChange(type);
    else setInternalFilter(type);
  }
  // Open the descendants drawer straight to a specific entity's detail view
  // (used when clicking a descendant row in the inline overview list).
  function openEntityInDrawer(child) {
    setDetailPkg(null);
    setDetailStack([{ entity: child, filter: null }]);
    if (isControlled) onExternalFilterChange(child.type);
    else setInternalFilter(child.type);
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

  useEffect(() => {
    if (detailEntity) setRetainedEntity(detailEntity);
  }, [detailEntity?.id]);

  // Close drawers when the scope changes out from under them.
  useEffect(() => { setSelectedPkg(null); setDetailStack([]); setDetailPkg(null); }, [currentEntity?.id]);
  // Returning to the list clears any drilled-in package.
  useEffect(() => { if (!detailStack.length) setDetailPkg(null); }, [detailStack.length]);
  // A package datapoint is scoped to one entity — moving to a different entity
  // in the stack (e.g. drilling from a package into one of its customers) always
  // closes it, so the package overlay can't linger over the wrong entity.
  useEffect(() => { setDetailPkg(null); }, [detailTop?.entity?.id]);

  // Escape: step back one level (package → up the entity stack → list), then close.
  useEffect(() => {
    if (!childrenFilter && !selectedPkg) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (detailPkg) { setDetailPkg(null); return; }
      if (detailTop?.filter) { setDetailStack(s => [...s.slice(0, -1), { ...s[s.length - 1], filter: null }]); return; }
      if (detailStack.length) { setDetailStack(s => s.slice(0, -1)); return; }
      closeChildrenPanel();
      setSelectedPkg(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [childrenFilter, selectedPkg, detailStack.length, detailTop?.filter, detailPkg]);

  const rootSynthetic = useMemo(
    () => ({ type: 'root', name: 'All Accounts', children: mockData }),
    []
  );
  const listEntity = currentEntity || rootSynthetic;

  function handleChildDrillDown(child) {
    closeChildrenPanel();
    // Navigate using the entity's true ancestry so the breadcrumb shows the
    // full trail from this node back to the root — not just a one-level hop.
    const fullPath = findEntityById(child.id)?.path;
    if (fullPath?.length) {
      navigate(fullPath);
    } else if (onDrillDown) {
      onDrillDown(child);
    } else {
      navigate([...path, child]);
    }
  }

  // ── Single, static drawer top bar ───────────────────────────────────────
  // Lives above the sliding content so navigation stays anchored as you drill.
  const drawerListLabel = (!retainedFilter || retainedFilter === 'all')
    ? 'All accounts'
    : `${B_LABEL_OVERRIDES[retainedFilter] ?? (typeConfig[retainedFilter]?.label ?? 'Account')}s`;
  const topCrumbs = detailEntity
    ? [
        { key: '__list', label: drawerListLabel, onClick: () => setDetailStack([]) },
        ...detailStack.slice(0, -1).map((e, i) => ({
          key: e.entity.id,
          label: e.entity.name,
          entityType: e.entity.type,
          onClick: () => { setDetailPkg(null); setDetailStack(s => s.slice(0, i + 1).map((x, idx) => idx === i ? { ...x, filter: null } : x)); },
        })),
      ]
    : [{ key: '__list', label: drawerListLabel }];
  // Back retraces one level: package → overview, child-list → overview, else pop
  // one entity (restoring the list it came from), finally out to the list.
  const topBack = detailEntity
    ? (detailPkg
        ? () => setDetailPkg(null)
        : detailFilter
          ? () => setDetailStack(s => [...s.slice(0, -1), { ...s[s.length - 1], filter: null }])
          : () => { setDetailPkg(null); setDetailStack(s => s.slice(0, -1)); })
    : closeChildrenPanel;

  // Synthetic "All Accounts" entity — lets the root landing render through the
  // same rich entity-detail view as any drilled-in scope (descendants cards,
  // package adoption, operations health, analytics), with figures rolled up
  // across the whole tree. Built once on mount from the frozen mockData.
  const rootEntity = useMemo(() => buildRootAggregateEntity(), []);

  return (
    <>
    {currentEntity ? (
      /* Drilled into a specific entity — rich detail, wired to the same drawers */
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden mx-3 sm:mx-6 mb-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <EntityDetail
          entity={currentEntity}
          siblings={childEntities}
          showFuture={showFuture}
          hideContactInfo
          statusAsDot
          hideTypeBadge
          onDrillDown={(child) => openEntityInDrawer(child)}
          onOpenEntity={(child) => handleChildDrillDown(child)}
          onOpenChildren={(type) => openChildrenPanel(type)}
          onPackageClick={(pkg) => setSelectedPkg({
            id: pkg.id,
            name: pkg.name,
            entities: pkg.entities ?? pkg.customers ?? 1,
            seats: pkg.seats ?? pkg.actual ?? 0,
            avgUtil: pkg.avgUtil ?? pkg.util ?? 0,
          })}
          onViewAll={() => openChildrenPanel('all')}
          onAddProduct={openModal ? (e) => openModal('addProduct', e) : undefined}
        />
      </main>
    ) : (
      /* Root "All Accounts" landing — same rich entity-detail view as a
         drilled-in scope, backed by the synthetic aggregate root entity and
         wired to the same descendants + package drawers. */
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden mx-3 sm:mx-6 mb-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <EntityDetail
          entity={rootEntity}
          siblings={mockData}
          showFuture={showFuture}
          hideContactInfo
          statusAsDot
          hideTypeBadge
          hideAddProduct
          rootNameOverride={rootNameOverride}
          hideRootStatus={hideRootStatus}
          onDrillDown={(child) => handleChildDrillDown(child)}
          onOpenChildren={(type) => openChildrenPanel(type)}
          onPackageClick={(pkg) => setSelectedPkg({
            id: pkg.id,
            name: pkg.name,
            entities: pkg.entities ?? pkg.customers ?? 1,
            seats: pkg.seats ?? pkg.actual ?? 0,
            avgUtil: pkg.avgUtil ?? pkg.util ?? 0,
          })}
          onViewAll={() => openChildrenPanel('all')}
        />
      </main>
    )}

      {/* Descendants drawer — slides in from the right edge of the page.
          Swaps between the entity list and a full entity-detail view. */}
      <Drawer open={!!childrenFilter} onClose={closeChildrenPanel} wide>
        <div className="flex flex-col h-full">
          {/* Static top bar — pinned; only the content below slides as you drill */}
          <DrawerTopBar
            crumbs={topCrumbs}
            onBack={topBack}
            showOpen={!!detailEntity}
            onOpen={() => handleChildDrillDown(detailEntity)}
          />
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* List view — eases back as the entity summary takes focus */}
            <div className={`absolute inset-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${detailEntity ? '-translate-x-8 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
              {retainedFilter && (
                <ChildrenListView
                  entity={listEntity}
                  filter={retainedFilter === 'all' ? null : retainedFilter}
                  onBack={closeChildrenPanel}
                  onDrillDown={(child) => setDetailStack([{ entity: child, filter: null }])}
                  onOpen={(child) => handleChildDrillDown(child)}
                  deep
                  labelOverrides={B_LABEL_OVERRIDES}
                  hideHeader
                  hideTypeBadge
                  statusAsDot
                  showManagementFilter
                  subtleUnmanaged
                  typeTitle
                />
              )}
            </div>
            {/* Entity detail view — slides in from the right with a soft depth shadow */}
            <div className={`absolute inset-0 bg-white dark:bg-zinc-900 shadow-[-16px_0_40px_-16px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${detailEntity ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
              {(detailEntity || retainedEntity) && (
                <DrawerEntityDetail
                  entity={detailEntity || retainedEntity}
                  filter={detailFilter}
                  onFilterChange={(f) => setDetailStack(s => s.length ? [...s.slice(0, -1), { ...s[s.length - 1], filter: f }] : s)}
                  pkg={detailPkg}
                  siblings={childEntities}
                  showFuture={showFuture}
                  onDrillDown={(child) => setDetailStack(s => [...s, { entity: child, filter: null }])}
                  onPackageClick={(pkg) => setDetailPkg(pkg)}
                  onCustomerDrillDown={(child) => { setDetailPkg(null); setDetailStack(s => [...s, { entity: child, filter: null }]); }}
                />
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Package detail drawer */}
      <Drawer open={!!selectedPkg} onClose={() => setSelectedPkg(null)}>
        <PackageDetail pkg={retainedPkg} scope={currentEntity} onClose={() => setSelectedPkg(null)} />
      </Drawer>
    </>
  );
}
