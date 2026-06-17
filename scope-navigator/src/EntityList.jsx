import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Search, ArrowUpDown, Filter, X, Users, Plus, CaptionsOff } from '@icons';
import { typeConfig, statusConfig, StatusBadge, entityTypeOrder, sortOptions, applySorting, isEntityUnmanaged, managementModeConfig } from './config';
import useClickOutside from './useClickOutside';
import { flattenFrom } from './data';

function DropdownMenu({ children, onClose }) {
  const ref = useClickOutside(onClose);
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-50 overflow-hidden">
      {children}
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

function ChildCounts({ entity }) {
  const isLeaf = !entity.children?.length;
  if (isLeaf) {
    return <span className="text-[13px] text-zinc-300 dark:text-zinc-600">&mdash;</span>;
  }

  const childCounts = {};
  for (const child of entity.children) {
    childCounts[child.type] = (childCounts[child.type] || 0) + 1;
  }
  const pairs = entityTypeOrder.filter(t => childCounts[t]);

  return (
    <span className="inline-flex items-center">
      <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{entity.children.length}</span>
      <span className="inline-flex items-center gap-1.5 ml-2">
        {pairs.map(t => {
          const cfg = typeConfig[t];
          return (
            <span key={t} className="inline-flex items-center gap-0.5">
              <cfg.Icon className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
              <span className="text-[12px] text-zinc-500 dark:text-zinc-400 tabular-nums">{childCounts[t]}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

// Build parent path annotation string for deep descendants
function formatAncestorPath(ancestorPath) {
  if (!ancestorPath?.length) return null;
  // ancestorPath is ordered: [directParent, grandparent, ...closestToScope]
  // We reverse so it reads: direct parent first, then upward
  const names = ancestorPath.map(e => e.name);
  if (names.length <= 3) return names.join(' → ');
  return `${names[0]} → ... → ${names[names.length - 1]}`;
}

function EntityRowImpl({ entity, onDrillDown, onSelect, isSelected, isEven, ancestorPath, onTeleport, fullPath, selectOnRowClick = false }) {
  const rowRef = useRef(null);
  const { Icon, color, bg } = typeConfig[entity.type];
  const isLeaf = entity.type === 'customer';
  const hasAnnotation = ancestorPath?.length > 0;
  // All rows wear the same saturated icon tile regardless of depth — direct
  // and non-direct descendants share one consistent treatment. The "via …"
  // ancestor annotation below the name still telegraphs that a row sits one
  // or more levels below the current scope.
  const tileBg = bg;
  const tileFg = color;

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  function handleClick() {
    // selectOnRowClick: View-All pane wants every row click to populate the
    // detail panel on the right (like distributors do as immediate children),
    // not teleport into the entity. Deep descendants still expose teleport
    // via the "Manage" / "Scope" hover buttons (handleDrillAction below).
    if (selectOnRowClick) {
      onSelect(entity);
      return;
    }
    if (hasAnnotation && onTeleport && fullPath) {
      onTeleport(entity, fullPath);
    } else {
      onSelect(entity);
    }
  }

  function handleDrillAction(e) {
    e.stopPropagation();
    if (hasAnnotation && onTeleport && fullPath) {
      onTeleport(entity, fullPath);
    } else {
      onDrillDown(entity);
    }
  }

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      className={`group/row relative flex items-center gap-2.5 px-3 ${hasAnnotation ? 'py-2' : 'h-10'} border-b border-zinc-100 dark:border-zinc-800 cursor-pointer transition-[background-color] duration-75 ease-out ${
        isSelected
          ? 'bg-white dark:bg-zinc-900 border-l-2 border-l-zinc-900 dark:border-l-zinc-100'
          : `border-l-2 border-l-transparent hover:border-l-zinc-300 dark:hover:border-l-zinc-600 hover:bg-white dark:hover:bg-zinc-900 ${isEven ? 'bg-zinc-100/70 dark:bg-zinc-900/40' : 'bg-zinc-50/60 dark:bg-zinc-900/20'}`
      }`}
    >
      <div className={`relative w-6 h-6 rounded-md ${tileBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-3 h-3 ${tileFg}`} />
        {isEntityUnmanaged(entity) && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-700 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center" title="Unmanaged">
            <CaptionsOff className="w-2 h-2 text-white" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm truncate block ${
          isSelected
            ? 'font-medium text-zinc-900 dark:text-zinc-100'
            : 'text-zinc-700 dark:text-zinc-300 group-hover/row:font-medium group-hover/row:text-zinc-950 dark:group-hover/row:text-zinc-50'
        }`}>{entity.name}</span>
        {hasAnnotation && (
          <span className="text-[12px] text-zinc-400 dark:text-zinc-500 truncate block">
            <span className="italic">via</span>{' '}{formatAncestorPath(ancestorPath)}
          </span>
        )}
      </div>
      {/* Right-side metadata (unmanaged label, status, child counts) —
          fades out on hover so the row collapses to icon + name + the
          two action buttons. */}
      <div className="flex items-center gap-2.5 transition-opacity duration-100 ease-out group-hover/row:opacity-0">
        {isEntityUnmanaged(entity) && (
          <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[10px] font-medium leading-none flex-shrink-0">
            <CaptionsOff className="w-2.5 h-2.5" />
            Unmanaged
          </span>
        )}
        <span className="w-16 flex-shrink-0 flex justify-end">
          <StatusBadge status={entity.status} />
        </span>
        <div className="flex-shrink-0 w-32 flex items-center justify-end">
          <ChildCounts entity={entity} />
        </div>
      </div>
      {/* Hover action buttons — pinned to the row's right edge with their
          own white background so they cleanly cover the status pill /
          child counts beneath without being constrained by the
          surrounding cell widths. */}
      <div className="absolute right-3 inset-y-0 flex items-center gap-1 pl-3 opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto transition-opacity duration-100 ease-out bg-white dark:bg-zinc-900">
        {!isLeaf && !isEntityUnmanaged(entity) && (
          <button
            onClick={handleDrillAction}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors whitespace-nowrap"
          >
            Manage
          </button>
        )}
        <button
          onClick={handleDrillAction}
          className="px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

// Skip re-renders when only callback identity changes — the parent passes
// fresh function refs each render, but the EntityRow's behavior only cares
// that the entity / selection / position props are stable.
const EntityRow = memo(EntityRowImpl, (prev, next) => (
  prev.entity === next.entity &&
  prev.isSelected === next.isSelected &&
  prev.isEven === next.isEven &&
  prev.ancestorPath === next.ancestorPath &&
  prev.fullPath === next.fullPath &&
  prev.selectOnRowClick === next.selectOnRowClick
));

// ── Scope-aware provisioning button ───────────────────────────────────────────

function ScopeAddButton({ currentLevel, onAdd }) {
  if (!currentLevel || currentLevel === 'customer') return null;

  const availableTypes =
    currentLevel === 'root'        ? ['distributor', 'reseller', 'customer'] :
    currentLevel === 'distributor' ? ['distributor', 'reseller', 'customer'] :
    /* reseller */                   ['reseller', 'customer'];

  return (
    <button
      onClick={() => onAdd(availableTypes)}
      className="inline-flex items-center gap-1 pl-3 pr-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer flex-shrink-0"
    >
      <Plus className="w-3 h-3" />
      Add
    </button>
  );
}

// ── Main entity list ───────────────────────────────────────────────────────────

export default function EntityList({ entities, onDrillDown, onSelect, selectedEntity, onTeleport, scopeName, currentLevel, onAdd, viewAllDescendants = false }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('children-desc');
  const [statusFilter, setStatusFilter] = useState(null);
  const [managementFilter, setManagementFilter] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [includeDescendants, setIncludeDescendants] = useState(true);

  const entityKey = entities?.map(e => e.id).join(',');
  const [prevKey, setPrevKey] = useState(entityKey);
  if (entityKey !== prevKey) {
    setPrevKey(entityKey);
    setSearch('');
    setSortBy('children-desc');
    setStatusFilter(null);
    setManagementFilter(null);
    setIncludeDescendants(true);
  }

  // Memoize flattened descendants for search
  const allDescendants = useMemo(() => {
    if (!entities?.length) return [];
    return flattenFrom(entities);
  }, [entityKey]);

  // Set of immediate child IDs for distinguishing shallow vs deep results
  const immediateChildIds = useMemo(() => {
    if (!entities?.length) return new Set();
    return new Set(entities.map(e => e.id));
  }, [entityKey]);

  if (!entities?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <Users className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No child entities</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">This is a leaf-level account with no nested entities.</p>
      </div>
    );
  }

  const isSearching = search.length > 0;
  // The list always shows direct children only when not searching. Deep
  // descendants surface solely through search (when "Include all
  // descendants" is checked) — there is no flat all-descendants listing.
  const useDeepSearch = isSearching && includeDescendants;

  // Build display list
  let displayItems = []; // Array of { entity, ancestorPath?, fullPath? }

  if (useDeepSearch) {
    const lowerQuery = search.toLowerCase();
    const matches = allDescendants.filter(({ entity }) =>
      entity.name.toLowerCase().includes(lowerQuery)
    );
    displayItems = matches.map(({ entity, path }) => {
      const isImmediate = immediateChildIds.has(entity.id);
      // path is [child, grandchild, ...entity] from flattenFrom
      // ancestorPath = intermediates between scope and entity (excluding entity itself)
      const ancestors = isImmediate ? [] : path.slice(0, -1);
      return {
        entity,
        ancestorPath: ancestors.length > 0 ? ancestors : null,
        fullPath: path,
      };
    });
    if (statusFilter) displayItems = displayItems.filter(d => d.entity.status === statusFilter);
    if (managementFilter === 'unmanaged') displayItems = displayItems.filter(d => isEntityUnmanaged(d.entity));
    if (managementFilter === 'managed') displayItems = displayItems.filter(d => !isEntityUnmanaged(d.entity));
    displayItems = applySorting(displayItems.map(d => d.entity), sortBy).map(e =>
      displayItems.find(d => d.entity.id === e.id)
    );
  } else {
    let filtered = entities;
    if (search) filtered = filtered.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) filtered = filtered.filter(e => e.status === statusFilter);
    if (managementFilter === 'unmanaged') filtered = filtered.filter(e => isEntityUnmanaged(e));
    if (managementFilter === 'managed') filtered = filtered.filter(e => !isEntityUnmanaged(e));
    filtered = applySorting(filtered, sortBy);
    displayItems = filtered.map(entity => ({ entity, ancestorPath: null, fullPath: null }));
  }

  // Group by type
  const typesPresent = [...new Set(displayItems.map(d => d.entity.type))];
  const levelLabel = !isSearching && typesPresent.length === 1 ? typeConfig[typesPresent[0]].label + 's' : 'Entities';
  const hasMultipleTypes = typesPresent.length > 1;

  const groups = hasMultipleTypes
    ? entityTypeOrder.filter(t => displayItems.some(d => d.entity.type === t)).map(t => ({
        type: t,
        items: displayItems.filter(d => d.entity.type === t),
      }))
    : null;

  function renderRows(items, indexOffset = 0) {
    return items.map((item, i) => (
      <EntityRow
        key={item.entity.id}
        entity={item.entity}
        onDrillDown={onDrillDown}
        onSelect={onSelect}
        isSelected={selectedEntity?.id === item.entity.id}
        isEven={(i + indexOffset) % 2 === 1}
        ancestorPath={item.ancestorPath}
        onTeleport={onTeleport}
        fullPath={item.fullPath}
        selectOnRowClick={viewAllDescendants}
      />
    ));
  }

  // Empty state messages
  function renderEmptyState() {
    if (useDeepSearch) {
      return (
        <div className="p-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No matching entities found below {scopeName || 'this scope'}.</p>
          <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-2">Uncheck &ldquo;Include all descendants&rdquo; to search immediate children only.</p>
        </div>
      );
    }
    if (isSearching) {
      return (
        <div className="p-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No matching children found.</p>
          <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-2">Check &ldquo;Include all descendants&rdquo; to search deeper.</p>
        </div>
      );
    }
    return <div className="p-8 text-center text-sm text-zinc-400 dark:text-zinc-500">No results found</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black/[0.03] dark:bg-white/[0.03]">
      {/* Toolbar — pinned at top */}
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Row 1: label + add button */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
          <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex-shrink-0">
            {levelLabel}
            <span className="ml-1.5 text-zinc-500 dark:text-zinc-400 font-semibold">
              {isSearching ? `${displayItems.length} / ${entities.length}` : useDeepSearch ? displayItems.length : entities.length}
            </span>
          </h2>
          {onAdd && (
            <ScopeAddButton currentLevel={currentLevel} onAdd={onAdd} />
          )}
        </div>
        {/* Row 2: search + sort + filter */}
        <div className="flex items-center gap-1.5 px-3 pb-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={() => setActiveMenu(activeMenu === 'sort' ? null : 'sort')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                sortBy ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortBy ? sortOptions.find(o => o.value === sortBy)?.label : 'Sort'}</span>
            </button>
            {activeMenu === 'sort' && (
              <DropdownMenu onClose={() => setActiveMenu(null)}>
                {sortOptions.map(opt => (
                  <MenuButton key={opt.value} active={sortBy === opt.value} onClick={() => { setSortBy(opt.value); setActiveMenu(null); }}>
                    {opt.label}
                  </MenuButton>
                ))}
              </DropdownMenu>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={() => setActiveMenu(activeMenu === 'filter' ? null : 'filter')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                (statusFilter || managementFilter) ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{
                statusFilter && managementFilter ? 'Filters · 2' :
                statusFilter ? statusConfig[statusFilter].label :
                managementFilter ? managementModeConfig[managementFilter].label :
                'Filter'
              }</span>
            </button>
            {activeMenu === 'filter' && (
              <DropdownMenu onClose={() => setActiveMenu(null)}>
                {(statusFilter || managementFilter) && (
                  <MenuButton onClick={() => { setStatusFilter(null); setManagementFilter(null); setActiveMenu(null); }}>
                    <X className="w-3 h-3 inline mr-1" />Clear filters
                  </MenuButton>
                )}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Status</div>
                {['active', 'trial', 'suspended'].map(s => (
                  <MenuButton key={s} active={statusFilter === s} onClick={() => { setStatusFilter(statusFilter === s ? null : s); setActiveMenu(null); }}>
                    <StatusBadge status={s} showLabel />
                  </MenuButton>
                ))}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-700 mt-1">Management</div>
                {['managed', 'unmanaged'].map(m => (
                  <MenuButton key={m} active={managementFilter === m} onClick={() => { setManagementFilter(managementFilter === m ? null : m); setActiveMenu(null); }}>
                    {managementModeConfig[m].label}
                  </MenuButton>
                ))}
              </DropdownMenu>
            )}
          </div>

          {(search || sortBy || statusFilter || managementFilter) && (
            <button
              onClick={() => { setSearch(''); setSortBy(null); setStatusFilter(null); setManagementFilter(null); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />Clear
            </button>
          )}
        </div>
      </div>

      {/* Include descendants checkbox — visible only when searching */}
      {isSearching && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDescendants}
              onChange={e => setIncludeDescendants(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
            <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Include all descendants</span>
          </label>
        </div>
      )}

      {/* Scrollable table body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {displayItems.length === 0 ? renderEmptyState() : groups ? (
          groups.map(group => {
            const cfg = typeConfig[group.type];
            return (
              <div key={group.type}>
                <div className="sticky top-0 z-[5] flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{cfg.label}s</span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{group.items.length}</span>
                </div>
                {renderRows(group.items)}
              </div>
            );
          })
        ) : renderRows(displayItems)}
      </div>
    </div>
  );
}
