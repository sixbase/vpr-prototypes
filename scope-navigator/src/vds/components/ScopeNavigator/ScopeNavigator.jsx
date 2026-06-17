import {
  Fragment,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  Boxes,
  Building2,
  Network,
  Briefcase,
  Search,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  Filter,
  X,
  Check,
  MoreHorizontal,
} from '@icons'
import { cx } from '../../lib/cx.js'
import { Surface } from '../Surface/Surface.jsx'
import { Icon } from '../Icon/Icon.jsx'
import { Input } from '../Input/Input.jsx'

/* ----------------------------------------------------------------------------
   Default Vipre taxonomy. The component is data-driven — every consumer entity
   carries { id, name, type, status, children? }, and these maps tell the
   navigator how to *render* a given type / status. Override via props for a
   different domain; the DS ships the Vipre defaults so it works out of the box.

   - typeConfig: type → { label, icon, tone }. `tone` is a DS chromatic family
     ('azure'|'harbor'|'emerald'|'amber'|'rose'|'orchid'|'clay'); it colors the
     filled icon chip (family-600 fill, white glyph). Map key *order* defines the
     hierarchy depth used by the "Level" sort.
   - statusConfig: status → { label, tone, description }. `tone` is a status tone
     ('success'|'warning'|'danger'); it colors the status dot. Key order defines
     the "Status" sort order and which statuses appear in the dropdown filter.
   -------------------------------------------------------------------------- */
export const defaultTypeConfig = {
  distributor: { label: 'Distributor', icon: Building2, tone: 'azure' },
  reseller: { label: 'Reseller', icon: Network, tone: 'rose' },
  customer: { label: 'Customer', icon: Briefcase, tone: 'emerald' },
}

export const defaultStatusConfig = {
  active: { label: 'Active', tone: 'success', description: 'Live, paying subscription' },
  trial: { label: 'Trial', tone: 'warning', description: 'Evaluating, not yet converted' },
  suspended: { label: 'Suspended', tone: 'danger', description: 'Access paused — billing or policy hold' },
}

export const defaultSortOptions = [
  { value: 'children-desc', label: 'Most direct descendants' },
  { value: 'children-asc', label: 'Fewest direct descendants' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'status', label: 'Status' },
  { value: 'level', label: 'Level' },
]

/* Close the popover when a click lands outside the referenced element. */
function useClickOutside(onClose) {
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
function getDropdownHeader(items, mode, typeConfig) {
  if (!items?.length) return ''
  const types = [...new Set(items.map((i) => i.type))]
  const isMixed = types.length > 1
  const verb = mode === 'switch' ? 'SWITCH' : 'DRILL INTO'
  if (isMixed) return `${verb} ACCOUNT`
  const label = typeConfig[types[0]]?.label?.toUpperCase() ?? 'ACCOUNT'
  return mode === 'drill' ? `${verb} ${label}S` : `${verb} ${label}`
}

/* A filled, family-tinted square holding an entity-type (or root) icon. The root
   has no `tone`, so it falls back to the chip's default navy (midnight-600). */
function TypeChip({ tone, icon, size = 'sm' }) {
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
function StatusDot({ status, statusConfig, showLabel = false }) {
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

/* The searchable, sortable, filterable list of children/siblings for a segment. */
function DropdownPopover({
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
  // scroll area.
  useLayoutEffect(() => {
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
  }, [])

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
      className="vds-scope__pop"
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
                <TypeChip tone={cfg?.tone} icon={cfg?.icon} size="md" />
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

/* The collapsed "…" menu holding middle breadcrumb segments at tight widths. */
function EllipsisMenu({ hiddenSegments, typeConfig }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))

  return (
    <div ref={ref} className="vds-scope__ellipsis-wrap">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="vds-scope__ellipsis"
        aria-label="Show hidden breadcrumb levels"
      >
        <Icon as={MoreHorizontal} size="md" />
      </button>
      {open && (
        <Surface elevation="overlay" padding={null} radius="md" className="vds-scope__ellipsis-pop">
          <div className="vds-scope__ellipsis-list">
            {hiddenSegments.map((seg) => {
              const cfg = typeConfig[seg.entityType]
              return (
                <button
                  type="button"
                  key={seg.id}
                  onClick={() => {
                    seg.onClick()
                    setOpen(false)
                  }}
                  className="vds-scope__ellipsis-item"
                >
                  <TypeChip tone={cfg?.tone} icon={cfg?.icon} size="sm" />
                  <span className="vds-scope__ellipsis-label">{seg.label}</span>
                </button>
              )
            })}
          </div>
        </Surface>
      )}
    </div>
  )
}

/* One breadcrumb pill: icon chip + label + optional drill-down caret. */
function BreadcrumbSegment({
  label,
  isActive,
  isRoot,
  entityType,
  rootIcon,
  onClick,
  dropdownItems,
  onDropdownSelect,
  dropdownHeader,
  currentEntityId,
  isTeleported,
  typeConfig,
  statusConfig,
  sortOptions,
  typeOrder,
  statusOrder,
}) {
  const [open, setOpen] = useState(false)
  const cfg = isRoot ? null : typeConfig[entityType]
  const icon = isRoot ? rootIcon : cfg?.icon
  const tone = isRoot ? null : cfg?.tone
  const hasDropdown = dropdownItems?.length > 0

  return (
    <div className={cx('vds-scope__seg', isActive && 'vds-scope__seg--active')}>
      <div
        className={cx(
          'vds-scope__crumb',
          isActive && 'vds-scope__crumb--active',
          hasDropdown && 'vds-scope__crumb--has-caret',
          isTeleported && 'vds-scope__crumb--teleport',
        )}
      >
        <button
          type="button"
          onClick={isActive && !isRoot ? undefined : onClick}
          className={cx('vds-scope__crumb-main', !(isActive && !isRoot) && 'vds-scope__crumb-main--clickable')}
        >
          <TypeChip tone={tone} icon={icon} size="sm" />
          <span className="vds-scope__label">{label}</span>
        </button>
        {hasDropdown && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
            className={cx('vds-scope__caret', open && 'vds-scope__caret--open')}
            aria-label="Drill into this scope"
            aria-expanded={open}
          >
            <Icon as={ChevronDown} size="xs" />
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
          typeConfig={typeConfig}
          statusConfig={statusConfig}
          sortOptions={sortOptions}
          typeOrder={typeOrder}
          statusOrder={statusOrder}
        />
      )}
    </div>
  )
}

/**
 * ScopeNavigator
 *
 * The MSP hierarchy breadcrumb — the top bar that lets an operator walk an
 * account tree (distributor → reseller → customer), drill into any level via a
 * searchable / sortable / filterable dropdown, and jump scope. It collapses the
 * middle of a deep trail into a "…" menu as space tightens, and keeps every
 * popover inside the viewport.
 *
 * Data-driven: pass `path` (root→current entities) and an `onNavigate` callback;
 * the bar renders from `typeConfig` / `statusConfig` (Vipre defaults baked in,
 * fully overridable). Each entity is `{ id, name, type, status, children? }`.
 * Composes Surface + Input + Icon. The bar follows the ambient theme: a light bar
 * in light mode, the product navy (light-on-dark) under a `.dark` ancestor — so
 * place it inside `.dark` wherever the chrome should stay dark. It is purely the
 * scope trail: search (the ⌘K palette) and product toggles (e.g. "Future State")
 * are separate components the app composes alongside it, not part of this bar.
 *
 * Props:
 * - path:          entity[] from the root's child down to the current scope ([] = root)
 * - onNavigate:    (nextPath: entity[]) => void — fired on any drill / jump
 * - rootItems:     entity[] shown in the root ("All Accounts") dropdown
 * - rootLabel:     label for the root segment           (default 'All Accounts')
 * - rootIcon:      icon for the root segment            (default Boxes)
 * - typeConfig:    type → { label, icon, tone }         (default Vipre taxonomy)
 * - statusConfig:  status → { label, tone, description } (default active/trial/suspended)
 * - sortOptions:   dropdown sort options                (default defaultSortOptions)
 * - variant:       'full' | 'basic' — 'basic' is a denser, lower-chrome trail
 *                  (shorter pills, smaller chips/caret, tighter gaps); the
 *                  drill-down dropdown is unchanged   (default 'full')
 * - teleportedSegments: Set<id> — segments to flash-highlight (e.g. after a jump)
 *
 * @example
 * <ScopeNavigator
 *   path={path}
 *   onNavigate={setPath}
 *   rootItems={topLevelAccounts}
 * />
 */
export const ScopeNavigator = forwardRef(function ScopeNavigator(
  {
    path = [],
    onNavigate,
    rootItems = [],
    rootLabel = 'All Accounts',
    rootIcon = Boxes,
    typeConfig = defaultTypeConfig,
    statusConfig = defaultStatusConfig,
    sortOptions = defaultSortOptions,
    teleportedSegments,
    variant = 'full',
    className,
    ...props
  },
  ref,
) {
  const isBasic = variant === 'basic'
  const typeOrder = Object.keys(typeConfig)
  const statusOrder = Object.keys(statusConfig)

  // Build root segment.
  const rootSegment = {
    id: 'root',
    label: rootLabel,
    isRoot: true,
    isActive: path.length === 0,
    onClick: () => onNavigate([]),
    dropdownItems: rootItems,
    dropdownHeader: getDropdownHeader(rootItems, 'drill', typeConfig),
    onDropdownSelect: (child) => onNavigate([child]),
    currentEntityId: path[0]?.id ?? null,
  }

  // Build path segments — each shows its children (drill-down) in the dropdown.
  const pathSegments = path.map((entity, i) => {
    const isLast = i === path.length - 1
    const children = entity.children ?? []
    const base = {
      id: entity.id,
      label: entity.name,
      entityType: entity.type,
      pathIndex: i,
      dropdownItems: children,
      dropdownHeader: children.length > 0 ? getDropdownHeader(children, 'drill', typeConfig) : '',
    }
    if (isLast) {
      return {
        ...base,
        isActive: true,
        onClick: () => {},
        onDropdownSelect: (child) => onNavigate([...path, child]),
        currentEntityId: null,
      }
    }
    return {
      ...base,
      isActive: false,
      onClick: () => onNavigate(path.slice(0, i + 1)),
      onDropdownSelect: (child) => onNavigate([...path.slice(0, i + 1), child]),
      currentEntityId: path[i + 1]?.id ?? null,
    }
  })

  const allSegments = [rootSegment, ...pathSegments]

  // Responsive collapse: drop the middle segments into a "…" menu as space
  // tightens. We estimate each segment's rendered width (deterministic — no
  // measure-driven flicker) and only collapse when the trail genuinely won't fit.
  const navRef = useRef(null)
  const [navWidth, setNavWidth] = useState(0)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const check = () => setNavWidth(nav.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(nav)
    // Window-resize fallback: belt-and-suspenders for environments that throttle
    // ResizeObserver delivery, and to catch viewport changes that don't resize
    // the element's box on the same tick.
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [])

  const n = allSegments.length
  const w = navWidth || 9999
  const LABEL_CAP = 180
  // The "basic" variant renders denser chrome, so its width estimate uses tighter
  // constants — otherwise it would collapse into the "…" menu earlier than needed.
  const GAP = isBasic ? 20 : 28 // chevron + gaps between segments
  const ELL = isBasic ? 36 : 44 // the "…" chip
  const BASE = isBasic ? 26 : 36 // chip + padding around the label
  const CARET = isBasic ? 22 : 28 // the drill-down caret
  const CHAR = isBasic ? 6.2 : 7.2 // px per label character
  const reserved = 32 // the nav's own horizontal padding; the trail owns the rest
  const avail = w - reserved
  const segW = (seg) => {
    const len = seg.isRoot ? 12 : (seg.label || '').length
    return BASE + Math.min(LABEL_CAP, len * CHAR) + (seg.dropdownItems?.length ? CARET : 0)
  }
  const widthOf = (segs) =>
    segs.reduce((s, x) => s + (x === 'ellipsis' ? ELL : segW(x)), 0) + GAP * Math.max(0, segs.length - 1)

  let visibleSegments = allSegments
  let ellipsisSegments = null
  if (n > 2 && widthOf(allSegments) > avail) {
    const first = allSegments[0]
    const lastTwo = allSegments.slice(-2)
    const candidate = [first, 'ellipsis', ...lastTwo]
    if (n > 3 && widthOf(candidate) <= avail) {
      ellipsisSegments = allSegments.slice(1, -2)
      visibleSegments = candidate
    } else {
      ellipsisSegments = allSegments.slice(1, -1)
      visibleSegments = [first, 'ellipsis', allSegments[n - 1]]
    }
  }

  return (
    <nav
      ref={mergeRefs(ref, navRef)}
      className={cx('vds-scope', isBasic && 'vds-scope--basic', className)}
      {...props}
    >
      <div className="vds-scope__trail">
        {visibleSegments.map((seg, i) => {
              // One chevron separator before every item (except the first), as a
              // direct trail child — so the gap is uniform on BOTH sides of every
              // segment AND the "…" menu (… reads as a real level: A › … › B).
              const sep =
                i > 0 ? (
                  <Icon
                    key={`sep-${i}`}
                    as={ChevronRight}
                    size="sm"
                    tone="muted"
                    className="vds-scope__sep"
                  />
                ) : null

              if (seg === 'ellipsis') {
                return (
                  <Fragment key="ellipsis">
                    {sep}
                    <EllipsisMenu hiddenSegments={ellipsisSegments} typeConfig={typeConfig} />
                  </Fragment>
                )
              }
              const { id, ...segProps } = seg
              return (
                <Fragment key={id}>
                  {sep}
                  <BreadcrumbSegment
                    {...segProps}
                    rootIcon={rootIcon}
                    isTeleported={teleportedSegments?.has(id)}
                    typeConfig={typeConfig}
                    statusConfig={statusConfig}
                    sortOptions={sortOptions}
                    typeOrder={typeOrder}
                    statusOrder={statusOrder}
                  />
                </Fragment>
              )
            })}
      </div>
    </nav>
  )
})

ScopeNavigator.displayName = 'ScopeNavigator'

/* Merge a forwarded ref with a local ref so the nav element is reachable by both. */
function mergeRefs(...refs) {
  return (node) => {
    for (const r of refs) {
      if (typeof r === 'function') r(node)
      else if (r) r.current = node
    }
  }
}
