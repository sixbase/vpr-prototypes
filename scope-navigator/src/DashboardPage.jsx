import { useMemo, useState, useEffect } from 'react';
import {
  Building2, Monitor, Shield, Activity,
  Package, Mail, Send, ShieldCheck, Bug, Globe, Cloud, Key, ScanSearch, Clock, Paperclip,
  MapPin, Phone, User, Network,
} from '@icons';
import { useScope } from './ScopeContext';
import { collectDevicesInScope, computeDeviceStats, collectPackageAdoption, mockData } from './data';
import { typeConfig, statusConfig, pkgIconMap, defaultPkgIcon, isPartner, isLeaf } from './config';
import { ChildrenListView } from './EntityDetail';
import { StatTile, Surface, Button } from './vds/components/index.js';

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
// Defined locally so it doesn't pollute displayTypeConfig (which stays keyed
// by exactly the 5 display variants).
const PARTNER_TILE = {
  label: 'Partner',
  Icon: Network,
  bg: 'bg-rose-600',
  color: 'text-white',
};

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

export default function DashboardPage({ externalFilter, onExternalFilterChange, onDrillDown, onViewAll } = {}) {
  const { currentEntity, currentLevel, childEntities, path, navigate } = useScope();
  const [internalFilter, setInternalFilter] = useState(null);

  const isControlled = onExternalFilterChange !== undefined;
  const childrenFilter = isControlled ? (externalFilter ?? null) : internalFilter;

  function openChildrenPanel(type) {
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

  if (childrenFilter) {
    return (
      <div className="h-full flex flex-col">
        <ChildrenListView
          entity={listEntity}
          filter={childrenFilter}
          onBack={closeChildrenPanel}
          onDrillDown={handleChildDrillDown}
          deep
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Scope context card */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-5">
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
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig[currentEntity.status].dot}`} title={statusConfig[currentEntity.status].label} />
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
        </div>

        {/* Entity metadata */}
        {currentEntity && (currentEntity.address || currentEntity.contact) && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 grid grid-cols-2 gap-4">
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

      {/* Descendant counts */}
      <div className="space-y-2">
        {onViewAll && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Descendants</span>
            <Button variant="ghost" size="sm" onClick={onViewAll}>View all →</Button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          {['distributor', 'partner', 'customer'].map(type => {
          const count = descendantCounts[type] || 0;
          const config = getTileConfig(type);
          const Icon = config.Icon;
          return (
            <button
              key={type}
              onClick={() => openChildrenPanel(type)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 flex items-center gap-3 cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="text-left">
                <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{config.label}s</div>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Package Adoption */}
      <Surface padding={5}>
        <div className="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium mb-4">Package Adoption</div>

        <div className="grid grid-cols-2 gap-5">
          {/* KPI cards — left column */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {[
              { label: 'Unique Packages', value: pkgAdoption.uniquePackages },
              { label: 'Subscriptions', value: pkgAdoption.totalSubscriptions },
              { label: 'Total Seats', value: pkgAdoption.totalSeats },
              {
                label: 'Avg Utilization',
                value: pkgAdoption.avgUtil,
                suffix: '%',
                tone: pkgAdoption.avgUtil >= 70 ? 'success' : pkgAdoption.avgUtil >= 40 ? 'warning' : 'danger',
              },
            ].map(item => (
              <StatTile
                key={item.label}
                layout="stacked"
                size="sm"
                label={item.label}
                value={item.value}
                suffix={item.suffix}
                tone={item.tone ?? 'default'}
              />
            ))}
          </div>

          {/* Package table — right side */}
          {pkgAdoption.packages.length > 0 && (
            <div className="min-w-0">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    <td className="pb-2">Package</td>
                    <td className="pb-2 text-right w-[60px]">Entities</td>
                    <td className="pb-2 text-right w-[72px]">Seats</td>
                    <td className="pb-2 text-right w-[48px]">Util</td>
                  </tr>
                </thead>
                <tbody>
                  {pkgAdoption.packages.map((pkg, i) => {
                    const { icon: PkgIcon, color: pkgColor } = pkgIconMap[pkg.id] || defaultPkgIcon;
                    return (
                      <tr
                        key={pkg.id}
                        className={i < pkgAdoption.packages.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}
                      >
                        <td className="py-1.5 pr-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <PkgIcon className={`w-3.5 h-3.5 flex-shrink-0 ${pkgColor}`} />
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{pkg.name}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{pkg.entities}</td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{pkg.seats.toLocaleString()}</td>
                        <td className={`py-1.5 text-right tabular-nums font-medium ${
                          pkg.avgUtil >= 70
                            ? 'text-emerald-600 dark:text-emerald-500'
                            : pkg.avgUtil >= 40
                              ? 'text-amber-600 dark:text-amber-500'
                              : 'text-rose-600 dark:text-rose-500'
                        }`}>{pkg.avgUtil}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Surface>

      {/* Device stats */}
      <Surface padding={5}>
        <div className="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium mb-3">Device Overview</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Devices', value: stats.total },
            { label: 'Compliant', value: stats.compliant, tone: 'success' },
            { label: 'Non-Compliant', value: stats.nonCompliant, tone: 'danger' },
            { label: 'Outdated Agent', value: stats.outdatedAgent, tone: 'warning' },
          ].map(item => (
            <StatTile
              key={item.label}
              layout="stacked"
              size="sm"
              label={item.label}
              value={item.value}
              tone={item.tone ?? 'default'}
            />
          ))}
        </div>
      </Surface>

      {/* Scope persistence proof */}
      <div className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">
        Navigate to other pages — scope persists across the sidebar.
      </div>
    </div>
  );
}
