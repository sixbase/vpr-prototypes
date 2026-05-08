// PRODUCTION: This page receives scope from ScopeContext. It does not own scope state.
// PRODUCTION: Local filters (OS, Compliance, Agent Version) operate WITHIN scoped data.
// PRODUCTION: The hierarchy filter panel is a page-level filter — it narrows within the scope, not across it.
// PRODUCTION: At 1000+ devices, virtualize table rows and add server-side pagination.

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ShieldCheck, ShieldX, Shield, AlertTriangle, Monitor,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Building2, Store, Users, Filter, X, Check, Minus,
} from 'lucide-react';
import { useScope } from './ScopeContext';
import { collectDevicesInScope, computeDeviceStats, findEntityById, generateDevicesForCustomer } from './data';
import HierarchyFilterPanel from './HierarchyFilterPanel';

// ── Collect all leaf customer IDs from a tree ───────────────────────
function collectLeafCustomerIds(entity) {
  if (!entity) return [];
  if (entity.type === 'customer') return [entity.id];
  const ids = [];
  for (const child of (entity.children || [])) ids.push(...collectLeafCustomerIds(child));
  return ids;
}

// ── Derive platform from OS ─────────────────────────────────────────
function getPlatform(os) {
  if (os.startsWith('Windows')) return 'Windows';
  if (os.startsWith('macOS') || os.startsWith('OS X')) return 'Mac';
  return 'Linux';
}

// ── Derive device type from hostname ────────────────────────────────
function getDeviceType(hostname) {
  if (hostname.startsWith('LAPTOP')) return 'Laptop';
  if (hostname.startsWith('SERVER')) return 'Server';
  return 'Desktop';
}

// ── Compute facet counts from a device list ─────────────────────────
function computeFacets(devices) {
  const platform = {};
  const type = {};
  const os = {};
  const customer = {};
  for (const d of devices) {
    const p = getPlatform(d.os);
    platform[p] = (platform[p] || 0) + 1;
    const t = getDeviceType(d.hostname);
    type[t] = (type[t] || 0) + 1;
    os[d.os] = (os[d.os] || 0) + 1;
    customer[d.customer] = (customer[d.customer] || 0) + 1;
  }
  // Sort each facet by count descending
  const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  return {
    platform: sortDesc(platform),
    type: sortDesc(type),
    os: sortDesc(os),
    customer: sortDesc(customer),
  };
}

// ── Custom checkbox (matches HierarchyFilterPanel style) ────────────
function FilterCheckbox({ checked, onChange }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 transition-colors duration-100 cursor-pointer ${
        checked
          ? 'bg-blue-600 border-blue-600'
          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}

// ── Filter section with checkboxes ──────────────────────────────────
function FilterSection({ title, items, selected, onToggle, collapsed, onToggleCollapse }) {
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-700 last:border-b-0">
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-1.5 w-full text-left cursor-pointer select-none px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`} />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</span>
        {selected.size > 0 && (
          <span className="ml-auto text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded-full">{selected.size}</span>
        )}
      </button>
      {!collapsed && (
        <div className="pb-2 px-4 space-y-0.5">
          {items.map(([value, count]) => {
            const isChecked = selected.has(value);
            return (
              <div
                key={value}
                onClick={() => onToggle(value)}
                className={`flex items-center gap-2 h-8 cursor-pointer select-none rounded px-2 -mx-1 transition-colors duration-100 ${
                  isChecked ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <FilterCheckbox checked={isChecked} onChange={() => onToggle(value)} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate flex-1 min-w-0">{value}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums flex-shrink-0">{count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Filters sidebar ─────────────────────────────────────────────────
function FiltersSidebar({ devices, localFilters, onLocalFiltersChange }) {
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const facets = useMemo(() => computeFacets(devices), [devices]);

  const toggleCollapse = useCallback((section) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const toggleValue = useCallback((facetKey, value) => {
    onLocalFiltersChange(prev => {
      const next = { ...prev };
      const set = new Set(prev[facetKey]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[facetKey] = set;
      return next;
    });
  }, [onLocalFiltersChange]);

  const hasAnyFilter = localFilters.platform.size + localFilters.type.size + localFilters.os.size + localFilters.customer.size > 0;

  return (
    <div className="w-48 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
      {/* Header — h-11 matches Filter by Account header exactly */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
      </div>

      {/* Selection summary — always reserves space to prevent jump */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-700 text-xs flex-shrink-0">
        {hasAnyFilter ? (
          <>
            <span className="text-zinc-600 dark:text-zinc-400">
              {localFilters.platform.size + localFilters.type.size + localFilters.os.size + localFilters.customer.size} active
            </span>
            <button
              onClick={() => onLocalFiltersChange({ platform: new Set(), type: new Set(), os: new Set(), customer: new Set() })}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
            >
              Clear filter
            </button>
          </>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">No filters applied</span>
        )}
      </div>

      {/* Filter sections — overflow-y-scroll to reserve scrollbar space */}
      <div className="flex-1 overflow-y-scroll">
        <FilterSection
          title="Platform"
          items={facets.platform}
          selected={localFilters.platform}
          onToggle={(v) => toggleValue('platform', v)}
          collapsed={collapsedSections.has('platform')}
          onToggleCollapse={() => toggleCollapse('platform')}
        />
        <FilterSection
          title="Type"
          items={facets.type}
          selected={localFilters.type}
          onToggle={(v) => toggleValue('type', v)}
          collapsed={collapsedSections.has('type')}
          onToggleCollapse={() => toggleCollapse('type')}
        />
        <FilterSection
          title="OS"
          items={facets.os}
          selected={localFilters.os}
          onToggle={(v) => toggleValue('os', v)}
          collapsed={collapsedSections.has('os')}
          onToggleCollapse={() => toggleCollapse('os')}
        />
        <FilterSection
          title="Customer"
          items={facets.customer}
          selected={localFilters.customer}
          onToggle={(v) => toggleValue('customer', v)}
          collapsed={collapsedSections.has('customer')}
          onToggleCollapse={() => toggleCollapse('customer')}
        />
      </div>
    </div>
  );
}

// ── Inline summary of active local filters ──────────────────────────
function ActiveFilterPills({ localFilters, onLocalFiltersChange }) {
  const all = [];
  for (const [key, set] of Object.entries(localFilters)) {
    for (const value of set) all.push({ key, value });
  }
  if (all.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {all.map(({ key, value }) => (
        <span
          key={`${key}-${value}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
        >
          {value}
          <button
            onClick={() => onLocalFiltersChange(prev => {
              const next = { ...prev };
              const set = new Set(prev[key]);
              set.delete(value);
              next[key] = set;
              return next;
            })}
            className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <button
        onClick={() => onLocalFiltersChange({ platform: new Set(), type: new Set(), os: new Set(), customer: new Set() })}
        className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer ml-1"
      >
        Clear all
      </button>
    </div>
  );
}

// ── Apply local filters to devices ──────────────────────────────────
function applyLocalFilters(devices, filters) {
  return devices.filter(d => {
    if (filters.platform.size > 0 && !filters.platform.has(getPlatform(d.os))) return false;
    if (filters.type.size > 0 && !filters.type.has(getDeviceType(d.hostname))) return false;
    if (filters.os.size > 0 && !filters.os.has(d.os)) return false;
    if (filters.customer.size > 0 && !filters.customer.has(d.customer)) return false;
    return true;
  });
}

// ── Animated counter hook ────────────────────────────────────────────
function useAnimatedValue(target, duration = 400) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef(null);
  const startRef = useRef({ value: target, time: 0 });

  useEffect(() => {
    const from = display;
    if (from === target) return;
    const start = performance.now();
    startRef.current = { value: from, time: start };

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

// ── Animated stat card ──────────────────────────────────────────────
function AnimatedStat({ value, label, color, icon: Icon, iconColor }) {
  const animatedValue = useAnimatedValue(value);
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
      <Icon className={`w-4.5 h-4.5 ${iconColor} flex-shrink-0`} />
      <div>
        <div className={`text-lg font-semibold tabular-nums leading-tight ${color}`}>{animatedValue.toLocaleString()}</div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</div>
      </div>
    </div>
  );
}

// ── Stats bar ───────────────────────────────────────────────────────
function StatsBar({ stats }) {
  const items = [
    { label: 'Total Devices', value: stats.total, color: 'text-zinc-900 dark:text-zinc-100', icon: Monitor, iconColor: 'text-zinc-400' },
    { label: 'Compliant', value: stats.compliant, color: 'text-emerald-600 dark:text-emerald-400', icon: ShieldCheck, iconColor: 'text-emerald-500' },
    { label: 'Non-Compliant', value: stats.nonCompliant, color: 'text-red-600 dark:text-red-400', icon: ShieldX, iconColor: 'text-red-500' },
    { label: 'Outdated Agent', value: stats.outdatedAgent, color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle, iconColor: 'text-amber-500' },
    { label: 'Stale (3+ days)', value: stats.stale, color: 'text-zinc-500 dark:text-zinc-400', icon: Shield, iconColor: 'text-zinc-400' },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map(item => (
        <AnimatedStat key={item.label} {...item} />
      ))}
    </div>
  );
}

// ── Compliance cell ─────────────────────────────────────────────────
function ComplianceCell({ status }) {
  if (status === 'compliant') return (
    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="w-4 h-4" /><span className="text-sm">Compliant</span>
    </span>
  );
  if (status === 'non-compliant') return (
    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
      <ShieldX className="w-4 h-4" /><span className="text-sm">Non-Compliant</span>
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
      <Shield className="w-4 h-4" /><span className="text-sm">Pending Scan</span>
    </span>
  );
}

// ── Sort header ─────────────────────────────────────────────────────
function SortHeader({ label, sortKey, currentSort, onSort }) {
  const active = currentSort.key === sortKey;
  const asc = active && currentSort.dir === 'asc';
  return (
    <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none">
      {label}
      {active ? (asc ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
    </button>
  );
}

// ── Format relative time ────────────────────────────────────────────
function formatLastSeen(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = diff / 3600000;
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Main page component ─────────────────────────────────────────────
export default function DevicesPage() {
  const { currentEntity, currentLevel, navigate, childEntities } = useScope();
  const [sort, setSort] = useState({ key: 'hostname', dir: 'asc' });
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [localFilters, setLocalFilters] = useState({ platform: new Set(), type: new Set(), os: new Set(), customer: new Set() });
  const triggerRef = useRef(null);

  // Reset panel filter when scope changes
  const prevScopeId = useRef(currentEntity?.id ?? null);
  if ((currentEntity?.id ?? null) !== prevScopeId.current) {
    prevScopeId.current = currentEntity?.id ?? null;
    if (selectedIds.size > 0) setSelectedIds(new Set());
    setLocalFilters({ platform: new Set(), type: new Set(), os: new Set(), customer: new Set() });
  }

  // Tree children for the panel (descendants of current scope)
  const treeChildren = currentEntity?.children ?? childEntities;

  // Total leaf customers in scope
  const totalLeafCount = useMemo(() => {
    const count = (nodes) => {
      let n = 0;
      for (const node of nodes) {
        if (node.type === 'customer') n++;
        else if (node.children?.length) n += count(node.children);
      }
      return n;
    };
    return count(treeChildren);
  }, [treeChildren]);

  // All devices within current scope
  const allDevices = useMemo(
    () => collectDevicesInScope(currentEntity).devices,
    [currentEntity]
  );

  // Filter devices by panel selection
  const accountFilteredDevices = useMemo(() => {
    if (selectedIds.size === 0) return allDevices;
    return allDevices.filter(d => selectedIds.has(d.customerId));
  }, [allDevices, selectedIds]);

  // Apply local filters (Platform, Type, OS, Customer)
  const filteredDevices = useMemo(
    () => applyLocalFilters(accountFilteredDevices, localFilters),
    [accountFilteredDevices, localFilters]
  );

  const hasLocalFilters = localFilters.platform.size + localFilters.type.size + localFilters.os.size + localFilters.customer.size > 0;

  // Sort
  const sortedDevices = useMemo(() => {
    const arr = [...filteredDevices];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'hostname': return a.hostname.localeCompare(b.hostname) * dir;
        case 'customer': return a.customer.localeCompare(b.customer) * dir;
        case 'os': return a.os.localeCompare(b.os) * dir;
        case 'agentVersion': return a.agentVersion.localeCompare(b.agentVersion) * dir;
        case 'compliance': return a.compliance.localeCompare(b.compliance) * dir;
        case 'lastSeen': return (new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime()) * dir;
        default: return 0;
      }
    });
    return arr;
  }, [filteredDevices, sort]);

  const displayDevices = sortedDevices.slice(0, 50);
  const stats = useMemo(() => computeDeviceStats(filteredDevices), [filteredDevices]);
  const isFiltered = selectedIds.size > 0;

  const handleSort = useCallback((key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }, []);

  const handleCustomerClick = useCallback((device) => {
    const result = findEntityById(device.customerId);
    if (result) navigate(result.path);
  }, [navigate]);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Don't show panel trigger at customer level (no descendants to filter)
  const showPanelTrigger = currentLevel !== 'customer';

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter by Account panel — slides in/out */}
      {showPanelTrigger && (
        <HierarchyFilterPanel
          open={panelOpen}
          onClose={handleClosePanel}
          treeChildren={treeChildren}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          totalLeafCount={totalLeafCount}
        />
      )}

      {/* Filters sidebar — always visible */}
      <FiltersSidebar
        devices={accountFilteredDevices}
        localFilters={localFilters}
        onLocalFiltersChange={setLocalFilters}
      />

      {/* Table area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {showPanelTrigger && (
                <button
                  ref={triggerRef}
                  aria-expanded={panelOpen}
                  onClick={() => setPanelOpen(!panelOpen)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                    isFiltered
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{isFiltered ? `${selectedIds.size} of ${totalLeafCount} accounts` : `All accounts (${totalLeafCount})`}</span>
                  {isFiltered ? (
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); setSelectedIds(new Set()); }}
                      className="p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                      aria-label="Clear filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <Filter className="w-3.5 h-3.5 opacity-50" />
                  )}
                </button>
              )}

              <div className="ml-auto text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                Showing{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filteredDevices.length.toLocaleString()}</span>
                {isFiltered && <> of <span className="font-semibold text-zinc-900 dark:text-zinc-100">{allDevices.length.toLocaleString()}</span></>}
                {' '}devices
              </div>
            </div>

            {/* Stats */}
            <StatsBar stats={stats} />

            {/* Table */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
                    {[
                      ['Hostname', 'hostname'],
                      ['Customer', 'customer'],
                      ['OS', 'os'],
                      ['Agent Version', 'agentVersion'],
                      ['Compliance', 'compliance'],
                      ['Last Seen', 'lastSeen'],
                    ].map(([label, key]) => (
                      <th key={key} className="text-left px-4 py-2.5">
                        <SortHeader label={label} sortKey={key} currentSort={sort} onSort={handleSort} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {displayDevices.map(device => {
                    const isOutdated = device.agentVersion < '4.0';
                    const isStale = Date.now() - new Date(device.lastSeen).getTime() > 3 * 24 * 3600000;
                    return (
                      <tr key={device.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="font-mono text-zinc-900 dark:text-zinc-100">{device.hostname}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {currentLevel === 'customer' ? (
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">{device.customer}</span>
                          ) : (
                            <button
                              onClick={() => handleCustomerClick(device)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left"
                            >
                              {device.customer}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">{device.os}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 text-sm ${isOutdated ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {isOutdated && <AlertTriangle className="w-3.5 h-3.5" />}
                            {device.agentVersion}
                          </span>
                        </td>
                        <td className="px-4 py-2"><ComplianceCell status={device.compliance} /></td>
                        <td className="px-4 py-2">
                          <span className={`text-sm tabular-nums ${isStale ? 'text-red-500 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {formatLastSeen(device.lastSeen)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>Showing {Math.min(50, filteredDevices.length)} of {filteredDevices.length.toLocaleString()} devices</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Pagination placeholder</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
