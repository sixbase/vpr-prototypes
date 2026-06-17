import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, ChevronRight, Check, Minus } from '@icons';
import { typeConfig } from './config';

// ── Checkbox ────────────────────────────────────────────────────────
function TreeCheckbox({ checked, indeterminate, onChange }) {
  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={-1}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 transition-colors duration-100 cursor-pointer ${
        checked || indeterminate
          ? 'bg-blue-600 border-blue-600'
          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
      }`}
    >
      {checked && !indeterminate && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      {indeterminate && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}

// ── Collect all leaf customer IDs from a node ───────────────────────
function collectLeafIds(node) {
  if (node.type === 'customer') return [node.id];
  const ids = [];
  for (const child of (node.children || [])) ids.push(...collectLeafIds(child));
  return ids;
}

// ── Flatten descendants with paths ──────────────────────────────────
function flattenDescendants(children) {
  const result = [];
  function walk(nodes, path) {
    for (const node of nodes) {
      const currentPath = [...path, node];
      result.push({ entity: node, path: currentPath });
      if (node.children?.length) walk(node.children, currentPath);
    }
  }
  walk(children, []);
  return result;
}

// ── Format ancestor path annotation ────────────────────────────────
function formatAncestorPath(ancestors) {
  if (!ancestors?.length) return null;
  const names = ancestors.map(e => e.name);
  if (names.length <= 3) return names.join(' → ');
  return `${names[0]} → … → ${names[names.length - 1]}`;
}

// ── Build visible items for tree mode (no search) ──────────────────
function buildTreeItems(children, expandedIds) {
  const items = [];
  function walk(nodes, depth) {
    for (const node of nodes) {
      items.push({ node, depth, ancestorPath: null });
      const hasChildren = node.children?.length > 0;
      if (hasChildren && expandedIds.has(node.id)) walk(node.children, depth + 1);
    }
  }
  walk(children, 0);
  return items;
}

// ── Get check state for a node ──────────────────────────────────────
function getCheckState(node, selectedIds) {
  if (node.type === 'customer') {
    return { checked: selectedIds.has(node.id), indeterminate: false };
  }
  const leafIds = collectLeafIds(node);
  if (leafIds.length === 0) return { checked: false, indeterminate: false };
  let count = 0;
  for (const id of leafIds) { if (selectedIds.has(id)) count++; }
  if (count === 0) return { checked: false, indeterminate: false };
  if (count === leafIds.length) return { checked: true, indeterminate: false };
  return { checked: false, indeterminate: true };
}

// ── Tree node row (used in both tree and search modes) ──────────────
function TreeNode({ node, depth, focused, expanded, checkState, onToggleExpand, onToggleCheck, onFocus, onMouseSelect, ancestorPath }) {
  const ref = useRef(null);
  const hasChildren = node.children?.length > 0;
  const cfg = typeConfig[node.type] || typeConfig.customer;
  const TypeIcon = cfg.Icon;
  const hasAnnotation = ancestorPath?.length > 0;

  useEffect(() => {
    if (focused && ref.current) ref.current.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  return (
    <div
      ref={ref}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-checked={checkState.indeterminate ? 'mixed' : checkState.checked ? 'true' : 'false'}
      aria-level={depth + 1}
      tabIndex={focused ? 0 : -1}
      className={`flex items-center gap-2 ${hasAnnotation ? 'py-1.5' : 'h-9'} pr-3 cursor-pointer select-none transition-colors duration-100 rounded outline-none ${
        checkState.checked && !checkState.indeterminate
          ? 'bg-blue-50/50 dark:bg-blue-900/10'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
      }`}
      style={{ paddingLeft: `${16 + depth * 20}px` }}
      onClick={() => onMouseSelect()}
      onFocus={onFocus}
    >
      {hasChildren && !hasAnnotation ? (
        <button
          tabIndex={-1}
          className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
        >
          <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
        </button>
      ) : (
        <span className="w-[18px] flex-shrink-0" />
      )}

      <TreeCheckbox checked={checkState.checked} indeterminate={checkState.indeterminate} onChange={onMouseSelect} />

      <div className={`w-5 h-5 rounded ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <TypeIcon className={`w-3 h-3 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate block">{node.name}</span>
        {hasAnnotation && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate block">
            <span className="italic">via</span>{' '}{formatAncestorPath(ancestorPath)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────
export default function HierarchyFilterPanel({
  open,
  onClose,
  treeChildren,
  selectedIds,
  onSelectionChange,
  totalLeafCount,
}) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [focusIndex, setFocusIndex] = useState(-1);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const searchInputRef = useRef(null);

  const searchLower = search.toLowerCase();
  const isSearching = search.length > 0;
  const isFiltered = selectedIds.size > 0;

  // Flatten all descendants for deep search
  const allDescendants = useMemo(
    () => flattenDescendants(treeChildren),
    [treeChildren]
  );

  // Immediate child IDs (depth-0 nodes)
  const immediateChildIds = useMemo(
    () => new Set(treeChildren.map(n => n.id)),
    [treeChildren]
  );

  // Build display items depending on mode
  const visibleItems = useMemo(() => {
    if (!isSearching) {
      // Tree mode — normal hierarchy with expand/collapse
      return buildTreeItems(treeChildren, expandedIds);
    }

    const useDeep = includeDescendants;

    if (useDeep) {
      // Deep search — flatten all descendants, show matches with ancestor paths
      const matches = allDescendants.filter(({ entity }) =>
        entity.name.toLowerCase().includes(searchLower)
      );
      return matches.map(({ entity, path }) => {
        const isImmediate = immediateChildIds.has(entity.id);
        const ancestors = isImmediate ? [] : path.slice(0, -1);
        return {
          node: entity,
          depth: 0, // flat list, no indentation
          ancestorPath: ancestors.length > 0 ? ancestors : null,
        };
      });
    } else {
      // Shallow search — only immediate children
      return treeChildren
        .filter(n => n.name.toLowerCase().includes(searchLower))
        .map(node => ({ node, depth: 0, ancestorPath: null }));
    }
  }, [isSearching, searchLower, treeChildren, expandedIds, allDescendants, immediateChildIds, includeDescendants]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setFocusIndex(-1);
    }
  }, [open]);

  const toggleNode = useCallback((node) => {
    const next = new Set(selectedIds);
    const leafIds = collectLeafIds(node);
    const state = getCheckState(node, selectedIds);

    if (node.type === 'customer') {
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
    } else {
      if (state.checked) {
        for (const id of leafIds) next.delete(id);
      } else {
        for (const id of leafIds) next.add(id);
      }
    }

    if (next.size >= totalLeafCount) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(next);
    }
  }, [selectedIds, totalLeafCount, onSelectionChange]);

  const clearFilter = useCallback(() => onSelectionChange(new Set()), [onSelectionChange]);

  const toggleExpand = useCallback((nodeId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e) => {
    const isInSearch = document.activeElement === searchInputRef.current;
    switch (e.key) {
      case 'Escape': e.preventDefault(); onClose(); break;
      case 'ArrowDown':
        e.preventDefault();
        if (isInSearch) { if (visibleItems.length > 0) setFocusIndex(0); }
        else setFocusIndex(prev => Math.min(prev + 1, visibleItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusIndex <= 0) { setFocusIndex(-1); searchInputRef.current?.focus(); }
        else setFocusIndex(prev => prev - 1);
        break;
      case 'ArrowRight':
        if (!isSearching && focusIndex >= 0 && focusIndex < visibleItems.length) {
          e.preventDefault();
          const { node } = visibleItems[focusIndex];
          if (node.children?.length && !expandedIds.has(node.id)) toggleExpand(node.id);
          else if (focusIndex + 1 < visibleItems.length) setFocusIndex(focusIndex + 1);
        }
        break;
      case 'ArrowLeft':
        if (!isSearching && focusIndex >= 0 && focusIndex < visibleItems.length) {
          e.preventDefault();
          const { node, depth } = visibleItems[focusIndex];
          if (node.children?.length && expandedIds.has(node.id)) toggleExpand(node.id);
          else if (depth > 0) {
            for (let i = focusIndex - 1; i >= 0; i--) {
              if (visibleItems[i].depth < depth) { setFocusIndex(i); break; }
            }
          }
        }
        break;
      case ' ':
        if (!isInSearch && focusIndex >= 0) {
          e.preventDefault();
          toggleNode(visibleItems[focusIndex].node);
        }
        break;
      case 'Home': if (!isInSearch) { e.preventDefault(); setFocusIndex(0); } break;
      case 'End': if (!isInSearch) { e.preventDefault(); setFocusIndex(visibleItems.length - 1); } break;
      default:
        if (!isInSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          const ch = e.key.toLowerCase();
          const start = focusIndex + 1;
          for (let i = 0; i < visibleItems.length; i++) {
            const idx = (start + i) % visibleItems.length;
            if (visibleItems[idx].node.name.toLowerCase().startsWith(ch)) { setFocusIndex(idx); break; }
          }
        }
        break;
    }
  }, [focusIndex, visibleItems, expandedIds, toggleExpand, toggleNode, onClose, isSearching]);

  return (
    <div
      className={`flex-shrink-0 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-200 ease-out ${
        open ? 'w-80' : 'w-0 border-r-0'
      }`}
      onKeyDown={handleKeyDown}
    >
      <div className="w-80 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filter by Account</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label="Close filter panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {search && (
              <button tabIndex={-1} onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer">
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>
          {/* Include all descendants toggle — only visible when searching */}
          {isSearching && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDescendants}
                onChange={e => setIncludeDescendants(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Include all descendants</span>
            </label>
          )}
        </div>

        {/* Selection summary — always reserves space */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-700 text-xs flex-shrink-0">
          {isFiltered ? (
            <>
              <span className="text-zinc-600 dark:text-zinc-400">{selectedIds.size} of {totalLeafCount} accounts selected</span>
              <button onClick={clearFilter} className="text-azure-600 dark:text-azure-400 hover:underline cursor-pointer font-medium">Clear filter</button>
            </>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500">All {totalLeafCount} accounts</span>
          )}
        </div>

        {/* Tree / Search results */}
        <div role="tree" aria-label="Filter by account" className="flex-1 overflow-y-scroll py-1">
          {visibleItems.length === 0 && isSearching && (
            <div className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
              <p>No matching accounts found</p>
              <p className="text-xs mt-1">
                {includeDescendants
                  ? 'Try a different search or uncheck "Include all descendants"'
                  : 'Try checking "Include all descendants" to search deeper'}
              </p>
            </div>
          )}
          {visibleItems.map((vi, idx) => {
            const isExpanded = !isSearching && (expandedIds.has(vi.node.id) || false);
            return (
              <TreeNode
                key={`${vi.node.id}-${idx}`}
                node={vi.node}
                depth={vi.depth}
                focused={focusIndex === idx}
                expanded={isExpanded}
                checkState={getCheckState(vi.node, selectedIds)}
                onToggleExpand={() => toggleExpand(vi.node.id)}
                onToggleCheck={() => toggleNode(vi.node)}
                onFocus={() => setFocusIndex(idx)}
                onMouseSelect={() => { setFocusIndex(-1); toggleNode(vi.node); }}
                ancestorPath={vi.ancestorPath}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
