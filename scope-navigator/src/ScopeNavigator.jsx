import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Search, ArrowUpDown, Filter, X, Check, MoreHorizontal, Zap } from '@icons';
import { typeConfig, statusConfig, StatusBadge, TypeBadge, sortOptions, applySorting, getDisplayType } from './config';
import { mockData, getSiblingsAtLevel } from './data';
import useClickOutside from './useClickOutside';

function getDropdownHeader(items, mode) {
  if (!items?.length) return '';
  const types = [...new Set(items.map(i => i.type))];
  const isMixed = types.length > 1;
  const verb = mode === 'switch' ? 'SWITCH' : 'DRILL INTO';
  if (isMixed) return `${verb} ACCOUNT`;
  const label = typeConfig[types[0]]?.label?.toUpperCase() ?? 'ACCOUNT';
  return mode === 'drill' ? `${verb} ${label}S` : `${verb} ${label}`;
}

function DropdownPopover({ items, onSelect, onClose, header, currentEntityId }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('level');
  const [statusFilter, setStatusFilter] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const ref = useClickOutside(onClose);
  const inputRef = useRef(null);
  // Keep the panel on-screen. It's anchored under its trigger (left-0), but a
  // deep/right-side trigger would push a viewport-wide panel off the edge. We
  // measure after layout and shift its actual `left` (not a transform) so the
  // layout box itself stays in view — otherwise the off-screen box widens the
  // scroll area and auto-focusing the search input scrolls the page sideways.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clamp = () => {
      el.style.left = '0px';
      const r = el.getBoundingClientRect();
      const m = 8;
      let dx = 0;
      if (r.left < m) dx = m - r.left;
      else if (r.right > window.innerWidth - m) dx = (window.innerWidth - m) - r.right;
      el.style.left = dx ? `${dx}px` : '';
    };
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  // preventScroll: belt-and-suspenders so focusing never nudges the page even
  // if the panel still slightly overruns.
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);

  let displayed = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  if (statusFilter) displayed = displayed.filter(i => i.status === statusFilter);
  displayed = applySorting(displayed, sortBy);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 w-[calc(100vw-1.5rem)] sm:w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 z-50 overscroll-contain whitespace-normal"
    >
      {header && (
        <div className="px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">{header}</span>
        </div>
      )}
      <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-md outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {displayed.length} {displayed.length === 1 ? 'Result' : 'Results'}
        </span>
        <div className="flex items-center gap-1">
          <ToolbarMenu
            icon={ArrowUpDown}
            label="Sort"
            isActive={false}
            isOpen={activeMenu === 'sort'}
            onToggle={() => setActiveMenu(activeMenu === 'sort' ? null : 'sort')}
          >
            {sortOptions.map(opt => (
              <MenuButton key={opt.value} active={sortBy === opt.value} onClick={() => { setSortBy(opt.value); setActiveMenu(null); }}>
                {opt.label}
              </MenuButton>
            ))}
          </ToolbarMenu>
          <ToolbarMenu
            icon={Filter}
            label={statusFilter ? statusConfig[statusFilter].label : 'Filter'}
            isActive={!!statusFilter}
            isOpen={activeMenu === 'filter'}
            onToggle={() => setActiveMenu(activeMenu === 'filter' ? null : 'filter')}
          >
            {statusFilter && (
              <MenuButton onClick={() => { setStatusFilter(null); setActiveMenu(null); }}>
                <X className="w-3 h-3 inline mr-1" />Clear filter
              </MenuButton>
            )}
            {['active', 'trial', 'suspended'].map(s => (
              <MenuButton key={s} active={statusFilter === s} onClick={() => { setStatusFilter(s); setActiveMenu(null); }}>
                <StatusBadge status={s} showLabel />
              </MenuButton>
            ))}
          </ToolbarMenu>
        </div>
      </div>

      <div className="relative z-[1] max-h-[352px] overflow-y-auto overscroll-contain">
        {displayed.length === 0 ? (
          <div className="px-3 py-4 text-sm text-zinc-400 text-center">No results found</div>
        ) : displayed.map(item => {
          const ItemIcon = typeConfig[item.type]?.Icon;
          const isCurrent = currentEntityId && item.id === currentEntityId;
          return (
            <button
              key={item.id}
              onClick={() => { if (!isCurrent) { onSelect(item); onClose(); } }}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 ${
                isCurrent
                  ? 'bg-zinc-100 dark:bg-zinc-700/50 cursor-default'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer'
              }`}
            >
              <div className="w-7 flex-shrink-0 flex items-center justify-center">
                {ItemIcon && (
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${typeConfig[item.type]?.bg ?? 'bg-zinc-500'}`}>
                    <ItemIcon className="w-4 h-4 text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{item.name}</span>
                {item.children?.length > 0 && (
                  <span className="block text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{item.children.length} children</span>
                )}
              </div>
              {isCurrent && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-200 flex-shrink-0">Current</span>
              )}
              <StatusBadge status={item.status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToolbarMenu({ icon: Icon, label, isActive, isOpen, onToggle, children }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
          isActive
            ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
            : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700'
        }`}
      >
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-700 z-[100]">
          {children}
        </div>
      )}
    </div>
  );
}

function MenuButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
        active
          ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  );
}

function EllipsisMenu({ hiddenSegments, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 flex-shrink-0" />
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1.5 rounded-lg text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[calc(100vw-1.5rem)] sm:w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 z-50 overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            {hiddenSegments.map(seg => {
              const SegIcon = typeConfig[seg.entityType]?.Icon;
              return (
                <button
                  key={seg.id}
                  onClick={() => { seg.onClick(); setOpen(false); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 cursor-pointer"
                >
                  {SegIcon && (
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${typeConfig[seg.entityType]?.bg ?? 'bg-zinc-500'}`}>
                      <SegIcon className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{seg.label}</span>
                  <TypeBadge type={seg.entityType} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BreadcrumbSegment({ label, isActive, isRoot, entityType, entity, pathIndex, onClick, dropdownItems, onDropdownSelect, dropdownHeader, currentEntityId, isTeleported }) {
  const [open, setOpen] = useState(false);
  const Icon = isRoot ? typeConfig.root.Icon : typeConfig[entityType]?.Icon;
  const hasDropdown = dropdownItems?.length > 0;

  return (
    <div className={`relative flex items-center ${isActive ? 'min-w-0' : 'flex-shrink-0'}`}>
      <div className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-colors duration-150 min-h-[40px] ${isActive ? 'min-w-0' : ''} ${
        isTeleported ? 'animate-teleport-highlight' : ''
      } ${
        isActive
          ? `pl-3 ${hasDropdown ? 'pr-2' : 'pr-3'} py-1.5 bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold shadow-sm border border-transparent dark:border-zinc-700`
          : `pl-3 ${hasDropdown ? 'pr-2' : 'pr-3'} py-1.5 text-black/70 hover:text-black hover:bg-black/5 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5 border border-black/10 dark:border-white/15`
      }`}>
        <button
          onClick={isActive && !isRoot ? undefined : onClick}
          className={`flex items-center gap-2 min-w-0 ${isActive && !isRoot ? '' : 'cursor-pointer'}`}
        >
          {Icon && (
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${isRoot ? 'bg-zinc-700 dark:bg-zinc-500' : (typeConfig[entityType]?.bg ?? 'bg-zinc-500')}`}>
              <Icon className="w-3 h-3 text-white" />
            </span>
          )}
          <span className={`truncate ${isActive ? 'max-w-[140px] sm:max-w-[230px]' : 'max-w-[110px] sm:max-w-[180px]'}`}>{label}</span>
        </button>
        {hasDropdown && (
          <button
            onClick={e => { e.stopPropagation(); setOpen(!open); }}
            className={`w-7 h-7 flex items-center justify-center rounded-full border cursor-pointer transition-colors flex-shrink-0 ${
              open
                ? 'border-zinc-300 bg-white text-zinc-600 shadow-sm dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-200'
                : 'border-black/15 text-zinc-400 hover:border-zinc-300 hover:bg-white hover:text-zinc-600 hover:shadow-sm dark:border-white/15 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && hasDropdown && (
        <DropdownPopover
          items={dropdownItems}
          onSelect={onDropdownSelect}
          onClose={() => setOpen(false)}
          header={dropdownHeader}
          currentEntityId={currentEntityId}
        />
      )}
    </div>
  );
}

function SearchTrigger({ onClick }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-500 hover:border-zinc-300 dark:hover:text-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer flex-shrink-0 w-full md:w-[200px]"
    >
      <Search className="w-4 h-4 flex-shrink-0" />
      <span className="text-[13px]">Search entities...</span>
      <kbd className="ml-auto px-1.5 py-0.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded flex-shrink-0">
        {shortcutLabel}
      </kbd>
    </button>
  );
}

export default function ScopeNavigator({ path, onNavigate, onSearchOpen, teleportedSegments, showFuture, onToggleFuture }) {
  const isActive = (i) => i === path.length - 1;

  // Build root segment
  const rootIsActive = path.length === 0;
  const rootDropdownItems = mockData;
  const rootSegment = {
    id: 'root',
    label: 'All Accounts',
    isRoot: true,
    isActive: rootIsActive,
    onClick: () => onNavigate([]),
    dropdownItems: rootDropdownItems,
    dropdownHeader: getDropdownHeader(rootDropdownItems, 'drill'),
    onDropdownSelect: (child) => onNavigate([child]),
    currentEntityId: path[0]?.id ?? null,
  };

  // Build path segments
  const pathSegments = path.map((entity, i) => {
    const isLast = i === path.length - 1;
    const siblings = getSiblingsAtLevel(path, i);
    const children = entity.children ?? [];

    if (isLast) {
      // Active/current scope segment — drill-down mode
      return {
        id: entity.id,
        label: entity.name,
        entityType: entity.type,
        entity,
        pathIndex: i,
        isActive: true,
        onClick: () => {},
        dropdownItems: children,
        dropdownHeader: children.length > 0 ? getDropdownHeader(children, 'drill') : '',
        onDropdownSelect: (child) => onNavigate([...path, child]),
        currentEntityId: null,
      };
    } else {
      // Ancestor segment — show children (consistent with active segment)
      return {
        id: entity.id,
        label: entity.name,
        entityType: entity.type,
        entity,
        pathIndex: i,
        isActive: false,
        onClick: () => onNavigate(path.slice(0, i + 1)),
        dropdownItems: children,
        dropdownHeader: children.length > 0 ? getDropdownHeader(children, 'drill') : '',
        onDropdownSelect: (child) => onNavigate([...path.slice(0, i + 1), child]),
        currentEntityId: path[i + 1]?.id ?? null,
      };
    }
  });

  const allSegments = [rootSegment, ...pathSegments];

  // Responsive collapse: drop middle segments into a "…" menu as space tightens.
  const navRef = useRef(null);
  const innerRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [navWidth, setNavWidth] = useState(0);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const check = () => setNavWidth(nav.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // Estimate each segment's rendered width and only collapse the middle into a
  // "…" menu when the trail genuinely won't fit — so a wide screen shows the
  // full path, and only tight widths trim. Deterministic (no measure-driven
  // flicker), and matches the label width caps below.
  const n = allSegments.length;
  const w = navWidth || 9999;
  const LABEL_CAP = 180;
  const GAP = 28; // chevron + gaps between segments
  const ELL = 44; // the "…" chip
  const reserved = w >= 768 ? 400 : 56; // Future State (+ inline search) only shares the row at md+
  const avail = w - reserved;
  const segW = (seg) => {
    const len = seg.isRoot ? 12 : (seg.label || '').length;
    return 36 + Math.min(LABEL_CAP, len * 7.2) + (seg.dropdownItems?.length ? 28 : 0);
  };
  const widthOf = (segs) => segs.reduce((s, x) => s + (x === 'ellipsis' ? ELL : segW(x)), 0) + GAP * Math.max(0, segs.length - 1);

  let visibleSegments = allSegments;
  let ellipsisSegments = null;
  if (n > 2 && widthOf(allSegments) > avail) {
    const first = allSegments[0];
    const lastTwo = allSegments.slice(-2);
    const candidate = [first, 'ellipsis', ...lastTwo];
    if (n > 3 && widthOf(candidate) <= avail) {
      ellipsisSegments = allSegments.slice(1, -2);
      visibleSegments = candidate;
    } else {
      ellipsisSegments = allSegments.slice(1, -1);
      visibleSegments = [first, 'ellipsis', allSegments[n - 1]];
    }
  }

  return (
    // Top bar: same navy as the left nav + matching divider. Scoped `dark` so its
    // contents (breadcrumb, Future State, search) render light-on-navy in both themes.
    <nav ref={navRef} className="dark bg-midnight-950 border-b border-midnight-800 px-4 py-3">
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 whitespace-nowrap">
        <div ref={innerRef} className="flex items-center gap-3 flex-1 min-w-0">
          {visibleSegments.map((seg, i) => {
            if (seg === 'ellipsis') {
              return (
                <EllipsisMenu
                  key="ellipsis"
                  hiddenSegments={ellipsisSegments}
                  onSelect={() => {}}
                />
              );
            }
            const { id, ...segProps } = seg;
            return (
              <div key={id} className="flex items-center gap-2 min-w-0">
                {i > 0 && seg !== 'ellipsis' && visibleSegments[i - 1] !== 'ellipsis' && (
                  <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 flex-shrink-0" />
                )}
                <BreadcrumbSegment {...segProps} isTeleported={teleportedSegments?.has(id)} />
              </div>
            );
          })}
        </div>
        <button
          onClick={onToggleFuture}
          title="Future State"
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex-shrink-0 ${
            showFuture
              ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span className="hidden md:inline">Future State</span>
        </button>
        </div>
        <SearchTrigger onClick={onSearchOpen} />
      </div>
    </nav>
  );
}
