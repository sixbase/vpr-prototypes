import { useMemo, useState, useRef } from 'react';
import { X } from '@icons';
import { useScope } from './ScopeContext';
import useClickOutside from './useClickOutside';
import { countDescendantsByType, collectDevicesInScope, computeDeviceStats, collectPackageAdoption } from './data';
import { typeConfig, pkgIconMap, defaultPkgIcon } from './config';

function utilColorClass(util) {
  if (util >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (util >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function countDirectByType(entities) {
  const counts = {};
  for (const e of entities) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  return counts;
}

export default function ScopeSummaryStrip({
  onTypeClick,
  activeType,
  rollUp: rollUpProp,
  onRollUpChange,
} = {}) {
  const { currentEntity, childEntities } = useScope();
  const [showPkgPopover, setShowPkgPopover] = useState(false);
  const [rollUpInternal, setRollUpInternal] = useState(true);
  const rollUp = rollUpProp !== undefined ? rollUpProp : rollUpInternal;
  const handleRollUpToggle = () => {
    const next = !rollUp;
    if (onRollUpChange) onRollUpChange(next);
    else setRollUpInternal(next);
  };

  const allDescendantCounts = useMemo(
    () => countDescendantsByType(childEntities),
    [childEntities]
  );

  const directCounts = useMemo(
    () => countDirectByType(childEntities),
    [childEntities]
  );

  const descendantCounts = rollUp ? allDescendantCounts : directCounts;

  const devices = useMemo(
    () => collectDevicesInScope(currentEntity),
    [currentEntity]
  );
  const deviceStats = useMemo(() => computeDeviceStats(devices), [devices]);

  const pkgAdoption = useMemo(
    () => collectPackageAdoption(currentEntity),
    [currentEntity]
  );

  return (
    <div className="mx-6 mb-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">

      {/* Descendant counts with roll-up toggle */}
      <Group>
        {['distributor', 'reseller', 'customer'].map(type => {
          const count = descendantCounts[type] || 0;
          const cfg = typeConfig[type];
          const isActive = activeType === type;
          const content = (
            <>
              <cfg.Icon className={`w-3.5 h-3.5 ${cfg.tintColor ?? cfg.color}`} />
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count}</span>
              <span className="text-zinc-400 dark:text-zinc-500 capitalize">{cfg.label}s</span>
            </>
          );
          if (onTypeClick) {
            return (
              <button
                key={type}
                onClick={() => onTypeClick(type)}
                className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-600'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {content}
              </button>
            );
          }
          return (
            <div key={type} className="flex items-center gap-1.5">
              {content}
            </div>
          );
        })}
        <button
          onClick={handleRollUpToggle}
          className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
            rollUp
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
          title={rollUp ? 'Showing all descendants — click for direct only' : 'Showing direct children — click for all descendants'}
        >
          {rollUp ? 'All' : 'Direct'}
        </button>
      </Group>

      <Sep />

      {/* Package KPIs — click to open popover */}
      <div className="relative">
        <button
          onClick={() => setShowPkgPopover(v => !v)}
          className="flex items-center gap-3.5 cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Stat label="Packages" value={pkgAdoption.uniquePackages} />
          <Stat label="Subscriptions" value={pkgAdoption.totalSubscriptions} />
          <Stat label="Seats" value={pkgAdoption.totalSeats} />
          <Stat label="Utilization" value={`${pkgAdoption.avgUtil}%`} valueClass={utilColorClass(pkgAdoption.avgUtil)} />
        </button>

        {showPkgPopover && pkgAdoption.packages.length > 0 && (
          <PackagePopover packages={pkgAdoption.packages} onClose={() => setShowPkgPopover(false)} />
        )}
      </div>

      <Sep />

      {/* Device overview */}
      <Group>
        <Stat label="Devices" value={deviceStats.total} />
        <Stat label="Compliant" value={deviceStats.compliant} valueClass="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Non-Compliant" value={deviceStats.nonCompliant} valueClass="text-rose-600 dark:text-rose-400" />
        <Stat label="Outdated" value={deviceStats.outdatedAgent} valueClass="text-amber-600 dark:text-amber-400" />
      </Group>
    </div>
  );
}

function Group({ children }) {
  return <div className="flex items-center gap-3.5">{children}</div>;
}

function Sep() {
  return <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />;
}

function Stat({ label, value, valueClass = 'text-zinc-900 dark:text-zinc-100' }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-semibold tabular-nums ${valueClass}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className="text-zinc-400 dark:text-zinc-500">{label}</span>
    </div>
  );
}

function PackagePopover({ packages, onClose }) {
  const ref = useClickOutside(onClose);
  return (
    <div ref={ref} className="absolute left-0 top-full mt-2 z-50 w-[420px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">Package Breakdown</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <td className="px-3 py-1.5">Package</td>
              <td className="px-3 py-1.5 text-right w-[60px]">Entities</td>
              <td className="px-3 py-1.5 text-right w-[72px]">Seats</td>
              <td className="px-3 py-1.5 text-right w-[48px]">Util</td>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg, i) => {
              const { icon: PkgIcon, color: pkgColor } = pkgIconMap[pkg.id] || defaultPkgIcon;
              return (
                <tr
                  key={pkg.id}
                  className={i < packages.length - 1 ? 'border-b border-zinc-50 dark:border-zinc-800' : ''}
                >
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <PkgIcon className={`w-3.5 h-3.5 flex-shrink-0 ${pkgColor}`} />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{pkg.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{pkg.entities}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{pkg.seats.toLocaleString()}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${utilColorClass(pkg.avgUtil)}`}>{pkg.avgUtil}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
