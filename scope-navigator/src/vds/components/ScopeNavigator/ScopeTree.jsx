import { useState } from 'react'
import { ChevronDown } from '@icons'
import { cx } from '../../lib/cx.js'
import { defaultTypeConfig, defaultStatusConfig, defaultSortOptions } from './ScopeNavigator.jsx'
import { TypeChip, getDropdownHeader, DropdownPopover } from './parts.jsx'

/**
 * ScopeTree
 *
 * The VERTICAL counterpart to ScopeNavigator — the same MSP account hierarchy
 * (distributor → reseller → customer), rendered as a vertical breadcrumb in a
 * left nav instead of a horizontal bar. It shares the data model (`path`,
 * `typeConfig`, entity `{ id, name, type, status, children? }`) and reuses the
 * EXACT drill-down DropdownPopover (search / sort / filter), opened as a fixed
 * right-flyout so it escapes the nav's scroll clipping.
 *
 * Semantics mirror ScopeNavigator 1:1:
 *   • the root row's caret lists the top-level accounts (drill from root)
 *   • an ancestor row's caret lists its children with the current next-level
 *     pick checked (switch which child you drilled into)
 *   • the active leaf's caret lists its children (drill deeper)
 * Clicking a row's BODY jumps scope to that level. The root row's body is a
 * dedicated action (`onSelectRoot`) — it opens the MSP/Customers prototype and
 * KEEPS the current path rather than resetting scope.
 *
 * Built for the always-navy shell nav: chrome colors use the fixed midnight ramp
 * (theme-stable), while the floating popover follows the ambient theme like any
 * other dropdown.
 *
 * Props:
 * - path:          entity[] root→current ([] = root, trail hidden)
 * - onNavigate:    (nextPath) => void
 * - rootItems:     entity[] for the root drill-down
 * - rootLabel:     root row label                       (default 'Customers')
 * - rootTile:      <img src> for the root's 32px tile   (optional)
 * - rootSelected:  highlight the root row as active     (default false)
 * - rootDrillable: show the root caret (drill from root) (default true)
 * - onSelectRoot:  () => void — root body click (open MSP prototype)
 * - collapsed:     icon-only rail                       (default false)
 * - typeConfig / statusConfig / sortOptions: taxonomy (Vipre defaults)
 */
export function ScopeTree({
  path = [],
  onNavigate,
  rootItems = [],
  rootLabel = 'Customers',
  rootTile,
  rootTileNode,
  rootSelected = false,
  rootDrillable = true,
  collapseTrail = false,
  onSelectRoot,
  collapsed = false,
  typeConfig = defaultTypeConfig,
  statusConfig = defaultStatusConfig,
  sortOptions = defaultSortOptions,
}) {
  const typeOrder = Object.keys(typeConfig)
  const statusOrder = Object.keys(statusConfig)

  // The single open flyout: { id, top, left, items, header, onSelect, currentEntityId }.
  const [flyout, setFlyout] = useState(null)
  const close = () => setFlyout(null)

  // collapseTrail mode (MSP "customer button"): the trail is condensed to just the
  // current leaf, with a "View relationship" toggle that reveals the full ancestor
  // path. The toggle persists — it stays expanded/collapsed across scope changes
  // until the user flips it.
  const [relOpen, setRelOpen] = useState(false)

  // Open a fixed right-flyout next to the clicked row. We anchor off the row's
  // <nav> ancestor's right edge so the panel always clears the whole rail
  // (expanded OR collapsed), and clamp the top into the viewport.
  const openFlyout = (e, seg) => {
    e.stopPropagation()
    const wasOpen = flyout?.id === seg.id
    if (wasOpen) return close()
    const rowEl = e.currentTarget.closest('[data-scope-row]')
    const navEl = e.currentTarget.closest('nav')
    const rowRect = (rowEl || e.currentTarget).getBoundingClientRect()
    const navRect = navEl ? navEl.getBoundingClientRect() : { right: rowRect.right }
    const EST_H = 440
    const top = Math.max(8, Math.min(rowRect.top, window.innerHeight - 8 - EST_H))
    setFlyout({
      id: seg.id,
      top,
      left: navRect.right + 8,
      items: seg.dropdownItems,
      header: seg.dropdownHeader,
      onSelect: seg.onDropdownSelect,
      currentEntityId: seg.currentEntityId,
    })
  }

  // ---- build segments (same shape as ScopeNavigator) ----
  const rootSeg = {
    id: 'root',
    isRoot: true,
    label: rootLabel,
    selected: rootSelected,
    onMain: onSelectRoot,
    dropdownItems: rootItems,
    dropdownHeader: getDropdownHeader(rootItems, 'drill', typeConfig),
    onDropdownSelect: (child) => onNavigate([child]),
    currentEntityId: path[0]?.id ?? null,
  }

  const pathSegs = path.map((entity, i) => {
    const isLast = i === path.length - 1
    const children = entity.children ?? []
    const base = {
      id: entity.id,
      label: entity.name,
      entityType: entity.type,
      dropdownItems: children,
      dropdownHeader: children.length > 0 ? getDropdownHeader(children, 'drill', typeConfig) : '',
    }
    if (isLast) {
      // The active leaf re-selects itself: scope is unchanged, but consumers can
      // use onNavigate to (re)open that entity's page when you're viewing something
      // else (e.g. a product) for the same scope.
      return { ...base, isActive: true, onMain: () => onNavigate(path), onDropdownSelect: (c) => onNavigate([...path, c]), currentEntityId: null }
    }
    return {
      ...base,
      isActive: false,
      onMain: () => onNavigate(path.slice(0, i + 1)),
      onDropdownSelect: (c) => onNavigate([...path.slice(0, i + 1), c]),
      currentEntityId: path[i + 1]?.id ?? null,
    }
  })

  const hasTrail = pathSegs.length > 0
  // "View relationship" only matters when there are ancestors to reveal (>1 level).
  // Works collapsed too (renders as a compact centered chevron) so the vertical scope
  // can be expanded/collapsed in the icon rail as well.
  const showRelToggle = collapseTrail && path.length > 1
  // In collapse mode the ancestors animate open/closed; the leaf is always shown.
  const ancestorSegs = showRelToggle ? pathSegs.slice(0, -1) : []
  const leafOnlySegs = showRelToggle ? pathSegs.slice(-1) : pathSegs

  const renderSeg = (seg) => {
    const cfg = typeConfig[seg.entityType]
    const hasDropdown = seg.dropdownItems?.length > 0
    const isOpen = flyout?.id === seg.id
    return (
      <div
        key={seg.id}
        data-scope-row
        className={cx('stree-row', seg.isActive && 'stree-row--active', isOpen && 'stree-row--open')}
      >
        <button
          type="button"
          className="stree-main"
          onClick={seg.onMain}
          disabled={!seg.onMain}
          aria-current={seg.isActive ? 'page' : undefined}
          title={seg.label}
        >
          <TypeChip tone={cfg?.tone} icon={cfg?.icon} tile={cfg?.tile} size="md" />
          <span className={cx('stree-label', seg.isActive && 'stree-label--active')}>{seg.label}</span>
        </button>
        {!collapsed && hasDropdown && (
          <button
            type="button"
            className={cx('stree-caret', isOpen && 'stree-caret--open')}
            onClick={(e) => openFlyout(e, seg)}
            aria-label="Switch this scope level"
            aria-expanded={isOpen}
          >
            <ChevronDown size={12} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cx('vds-scope-tree', collapsed && 'vds-scope-tree--collapsed', collapseTrail && 'vds-scope-tree--card')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ---- root "Customers" row ---- */}
      <div data-scope-row className={cx('stree-row stree-row--root', rootSelected && 'stree-row--sel')}>
        <button
          type="button"
          className="stree-main"
          onClick={onSelectRoot}
          aria-current={rootSelected ? 'page' : undefined}
          title={rootLabel}
        >
          {rootTileNode ? (
            rootTileNode
          ) : rootTile ? (
            <img src={rootTile} alt="" className="stree-tile" />
          ) : (
            <span className="stree-tile stree-tile--fallback" />
          )}
          <span className="stree-label stree-label--root">{rootLabel}</span>
        </button>
        {!collapsed && rootDrillable && rootSeg.dropdownItems.length > 0 && (
          <button
            type="button"
            className={cx('stree-caret', flyout?.id === 'root' && 'stree-caret--open')}
            onClick={(e) => openFlyout(e, rootSeg)}
            aria-label="Switch top-level account"
            aria-expanded={flyout?.id === 'root'}
          >
            <ChevronDown size={12} />
          </button>
        )}
      </div>

      {/* ---- trail well (only when drilled) ---- */}
      {hasTrail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: collapseTrail ? 2 : 8 }}>
        <div className="stree-well" style={{ position: 'relative' }}>
          <span className="stree-line" aria-hidden="true" />
          {showRelToggle ? (
            <>
              {/* Ancestors — accordion that animates open/closed (same 0fr↔1fr grid the
                  product groups use). The leaf below is always shown. */}
              <div style={{ display: 'grid', gridTemplateRows: relOpen ? '1fr' : '0fr', transition: 'grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ overflow: 'hidden', minHeight: 0 }} aria-hidden={!relOpen}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: relOpen ? 1 : 0, transition: 'opacity 180ms ease' }}>
                    {ancestorSegs.map(renderSeg)}
                  </div>
                </div>
              </div>
              {leafOnlySegs.map(renderSeg)}
            </>
          ) : (
            pathSegs.map(renderSeg)
          )}
        </div>
        {/* "View relationship" — reveals the full ancestor path (only when >1 level). */}
        {showRelToggle && (
          <button
            type="button"
            className="stree-rel"
            onClick={() => setRelOpen((o) => !o)}
            aria-expanded={relOpen}
            title={relOpen ? 'Hide Relationship' : 'View Relationship'}
          >
            <span className={cx('stree-rel__icon', relOpen && 'stree-rel__icon--open')}>
              <ChevronDown size={16} />
            </span>
            <span className="stree-rel__label">{relOpen ? 'Hide Relationship' : 'View Relationship'}</span>
          </button>
        )}
        </div>
      )}

      {/* ---- the reused drill-down popover, as a fixed right-flyout ---- */}
      {flyout && (
        <DropdownPopover
          items={flyout.items}
          onSelect={flyout.onSelect}
          onClose={close}
          header={flyout.header}
          currentEntityId={flyout.currentEntityId}
          typeConfig={typeConfig}
          statusConfig={statusConfig}
          sortOptions={sortOptions}
          typeOrder={typeOrder}
          statusOrder={statusOrder}
          disableAutoPosition
          className="stree-pop"
          style={{ position: 'fixed', top: flyout.top, left: flyout.left, width: 300, marginTop: 0, zIndex: 1000 }}
        />
      )}
    </div>
  )
}
