// ============================================================================
// ScopeNavigator shared parts
//
// The data-driven bits both the horizontal ScopeNavigator and the vertical
// ScopeTree compose: the type chip, status dot, and the searchable / sortable /
// filterable drill-down DropdownPopover (plus its small helpers). Extracted here
// so the vertical tree reuses the EXACT popover the horizontal bar ships — same
// search/sort/filter UI, same semantics — instead of duplicating it.
// ============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Search, ArrowUpDown, Filter, X, Check } from '@icons'
import { cx } from '../../lib/cx.js'
import { Surface } from '../Surface/Surface.jsx'
import { Icon } from '../Icon/Icon.jsx'
import { Input } from '../Input/Input.jsx'

/* Close the popover when a click lands outside the referenced element. */
export function useClickOutside(onClose) {
  const ref = useRef(null)
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])
  return ref
}

/* Sort a list of entities. `typeOrder` / `statusOrder` are derived from the
   config map key order so the domain taxonomy drives ranking without hardcoding. */
function applySorting(items, sortBy, typeOrder, statusOrder) {
  if (!sortBy) return items
  const sorted = [...items]
  const rank = (order, key) => {
    const i = order.indexOf(key)
    return i === -1 ? 99 : i
  }
  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case 'status':
      return sorted.sort((a, b) => rank(statusOrder, a.status) - rank(statusOrder, b.status))
    case 'level':
      return sorted.sort((a, b) => rank(typeOrder, a.type) - rank(typeOrder, b.type))
    case 'children-desc':
      return sorted.sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0))
    case 'children-asc':
      return sorted.sort((a, b) => (a.children?.length || 0) - (b.children?.length || 0))
    default:
      return sorted
  }
}

/* Build the "DRILL INTO RESELLERS" / "SWITCH ACCOUNT" eyebrow over a dropdown. */
export function getDropdownHeader(items, mode, typeConfig) {
  if (!items?.length) return ''
  const types = [...new Set(items.map((i) => i.type))]
  const isMixed = types.length > 1
  const verb = mode === 'switch' ? 'SWITCH' : 'DRILL INTO'
  if (isMixed) return `${verb} ACCOUNT`
  const label = typeConfig[types[0]]?.label?.toUpperCase() ?? 'ACCOUNT'
  return mode === 'drill' ? `${verb} ${label}S` : `${verb} ${label}`
}

/* A filled, family-tinted square holding an entity-type (or root) icon. When a
   `tile` (a gradient-tile SVG, e.g. Figma 78:531) is supplied it renders that image
   instead — same box size — so consumers can opt into the richer tile chip. The root
   has no `tone`, so it falls back to the chip's default navy (midnight-600). */
export function TypeChip({ tone, icon, tile, size = 'sm' }) {
  if (tile) {
    return (
      <img
        src={tile}
        alt=""
        aria-hidden="true"
        className={cx('vds-scope__chip', 'vds-scope__chip--tile', `vds-scope__chip--${size}`)}
      />
    )
  }
  const tint = tone ? `var(--vds-${tone}-600)` : undefined
  return (
    <span
      className={cx('vds-scope__chip', `vds-scope__chip--${size}`)}
      style={tint ? { '--vds-scope-chip-bg': tint } : undefined}
      aria-hidden="true"
    >
      {icon && <Icon as={icon} size={size === 'sm' ? 'xs' : 'sm'} />}
    </span>
  )
}

/* A status dot (color only) with a hover title carrying the meaning. */
export function StatusDot({ status, statusConfig, showLabel = false }) {
  const cfg = statusConfig[status]
  if (!cfg) return null
  const dot = (
    <span
      className="vds-scope__dot"
      style={{ '--vds-scope-dot': `var(--vds-${cfg.tone})` }}
      title={cfg.description ? `${cfg.label} — ${cfg.description}` : cfg.label}
    />
  )
  if (!showLabel) return dot
  return (
    <span className="vds-scope__status">
      {dot}
      {cfg.label}
    </span>
  )
}

/* A toolbar dropdown (Sort / Filter) inside the segment popover. */
function ToolbarMenu({ icon, label, isActive, isOpen, onToggle, children }) {
  return (
    <div className="vds-scope__menu">
      <button
        type="button"
        onClick={onToggle}
        className={cx('vds-scope__menu-btn', isActive && 'vds-scope__menu-btn--active')}
      >
        <Icon as={icon} size="xs" />
        <span>{label}</span>
      </button>
      {isOpen && <div className="vds-scope__menu-pop">{children}</div>}
    </div>
  )
}

function MenuButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('vds-scope__menu-item', active && 'vds-scope__menu-item--active')}
    >
      {children}
    </button>
  )
}

/* The searchable, sortable, filterable list of children/siblings for a segment.
   Shared by the horizontal bar (anchored below its trigger) and the vertical tree
   (anchored as a fixed right-flyout). When `disableAutoPosition` is set the caller
   owns placement entirely (via `style`) and the built-in on-screen clamp is off. */
export function DropdownPopover({
  items,
  onSelect,
  onClose,
  header,
  currentEntityId,
  typeConfig,
  statusConfig,
  sortOptions,
  typeOrder,
  statusOrder,
  className,
  style,
  disableAutoPosition = false,
}) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('level')
  const [statusFilter, setStatusFilter] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const ref = useClickOutside(onClose)
  const inputRef = useRef(null)

  // Keep the panel on-screen. It's anchored under its trigger (left: 0), but a
  // deep/right-side trigger would push a viewport-wide panel off the edge. We
  // measure after layout and shift its actual `left` (not a transform) so the
  // layout box itself stays in view — otherwise the off-screen box widens the
  // scroll area. Skipped when the caller positions the panel itself (flyout).
  useLayoutEffect(() => {
    if (disableAutoPosition) return
    const el = ref.current
    if (!el) return
    const clamp = () => {
      el.style.left = '0px'
      const r = el.getBoundingClientRect()
      const m = 8
      let dx = 0
      if (r.left < m) dx = m - r.left
      else if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right
      el.style.left = dx ? `${dx}px` : ''
    }
    clamp()
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [disableAutoPosition])

  // Note: the search input is intentionally NOT auto-focused on open — clicking a
  // node should just reveal the list, not put the cursor in the search field. The
  // user can click/tab into search when they want to filter.

  const statusKeys = Object.keys(statusConfig)
  let displayed = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  if (statusFilter) displayed = displayed.filter((i) => i.status === statusFilter)
  displayed = applySorting(displayed, sortBy, typeOrder, statusOrder)

  return (
    <Surface
      ref={ref}
      elevation="overlay"
      padding={null}
      radius="md"
      className={cx('vds-scope__pop', className)}
      style={style}
    >
      {header && (
        <div className="vds-scope__pop-header">
          <span className="vds-scope__eyebrow">{header}</span>
        </div>
      )}
      <div className="vds-scope__pop-search">
        <Input
          ref={inputRef}
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          leading={<Icon as={Search} size="xs" />}
        />
      </div>

      <div className="vds-scope__pop-toolbar">
        <span className="vds-scope__results-count">
          {displayed.length} {displayed.length === 1 ? 'Result' : 'Results'}
        </span>
        <div className="vds-scope__toolbar-actions">
          <ToolbarMenu
            icon={ArrowUpDown}
            label="Sort"
            isActive={false}
            isOpen={activeMenu === 'sort'}
            onToggle={() => setActiveMenu(activeMenu === 'sort' ? null : 'sort')}
          >
            {sortOptions.map((opt) => (
              <MenuButton
                key={opt.value}
                active={sortBy === opt.value}
                onClick={() => {
                  setSortBy(opt.value)
                  setActiveMenu(null)
                }}
              >
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
              <MenuButton
                onClick={() => {
                  setStatusFilter(null)
                  setActiveMenu(null)
                }}
              >
                <Icon as={X} size="xs" className="vds-scope__menu-item-icon" />
                Clear filter
              </MenuButton>
            )}
            {statusKeys.map((s) => (
              <MenuButton
                key={s}
                active={statusFilter === s}
                onClick={() => {
                  setStatusFilter(s)
                  setActiveMenu(null)
                }}
              >
                <StatusDot status={s} statusConfig={statusConfig} showLabel />
              </MenuButton>
            ))}
          </ToolbarMenu>
        </div>
      </div>

      <div className="vds-scope__results">
        {displayed.length === 0 ? (
          <div className="vds-scope__empty">No results found</div>
        ) : (
          displayed.map((item) => {
            const cfg = typeConfig[item.type]
            const isCurrent = currentEntityId && item.id === currentEntityId
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  if (!isCurrent) {
                    onSelect(item)
                    onClose()
                  }
                }}
                className={cx('vds-scope__item', isCurrent && 'vds-scope__item--current')}
              >
                <TypeChip tone={cfg?.tone} icon={cfg?.icon} tile={cfg?.tile} size="md" />
                <span className="vds-scope__item-body">
                  <span className="vds-scope__item-name">{item.name}</span>
                  {item.children?.length > 0 && (
                    <span className="vds-scope__item-sub">{item.children.length} children</span>
                  )}
                </span>
                <StatusDot status={item.status} statusConfig={statusConfig} />
                {isCurrent && <Icon as={Check} size="sm" className="vds-scope__item-check" />}
              </button>
            )
          })
        )}
      </div>
    </Surface>
  )
}
