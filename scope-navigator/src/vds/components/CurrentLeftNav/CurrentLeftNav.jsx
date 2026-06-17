import { forwardRef, useState } from 'react'
import { ChevronDown, ChevronUp, Lock, ArrowRight, LogOut } from '@icons'
import { cx } from '../../lib/cx.js'
import { Icon } from '../Icon/Icon.jsx'

/* One sub-page row inside a product card: small icon + label, optional badge.
   Renders as a <button> so the whole row is the hit target. */
function NavItem({ item, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.id, item)}
      className={cx('vds-clnav__item', active && 'vds-clnav__item--active')}
      aria-current={active ? 'page' : undefined}
    >
      <span className="vds-clnav__item-glyph">
        {item.icon && <Icon as={item.icon} size="sm" />}
      </span>
      <span className="vds-clnav__item-label">{item.label}</span>
      {item.badge != null && <span className="vds-clnav__item-badge">{item.badge}</span>}
    </button>
  )
}

/* The "full portal" escape link pinned to the bottom of a product card — the
   door from the curated set out to the product's full standalone portal. */
function EscapeLink({ escape, onSelect }) {
  return (
    <button
      type="button"
      className="vds-clnav__escape"
      onClick={() => onSelect?.(escape.id, escape)}
    >
      <span className="vds-clnav__escape-icon">
        <Icon as={escape.icon || ArrowRight} size="xs" />
      </span>
      <span className="vds-clnav__escape-label">{escape.label || 'full portal'}</span>
    </button>
  )
}

/* A product group rendered as a bordered translucent card: a header (brand
   glyph + product name + collapse toggle), the curated sub-pages, and an
   optional "full portal" escape link. The `active` product shows a filled
   toggle so the user can see which product they're currently inside. */
function ProductCard({ group, activeId, onSelect, open, onToggleOpen }) {
  const { label, icon, items = [], escape, active, collapsible = true } = group
  const showItems = collapsible ? open : true
  const Header = collapsible ? 'button' : 'div'

  return (
    <div className={cx('vds-clnav__card', active && 'vds-clnav__card--active', !showItems && 'vds-clnav__card--collapsed')}>
      <Header
        type={collapsible ? 'button' : undefined}
        className="vds-clnav__card-header"
        onClick={collapsible ? onToggleOpen : undefined}
        aria-expanded={collapsible ? showItems : undefined}
      >
        <span className="vds-clnav__card-icon">
          {icon && <Icon as={icon} size="md" />}
        </span>
        <span className="vds-clnav__card-title">{label}</span>
        {collapsible && (
          <span className={cx('vds-clnav__card-toggle', active && 'vds-clnav__card-toggle--active')}>
            <Icon as={showItems ? ChevronDown : ChevronUp} size="xs" />
          </span>
        )}
      </Header>

      {showItems && (items.length > 0 || escape) && (
        <div className="vds-clnav__card-body">
          {items.map((item) => (
            <NavItem key={item.id} item={item} active={item.id === activeId} onSelect={onSelect} />
          ))}
          {escape && <EscapeLink escape={escape} onSelect={onSelect} />}
        </div>
      )}
    </div>
  )
}

/* A locked / no-entitlement product: a flat row (no card) with a dimmed brand
   glyph, the product name, and a padlock. Not expandable — it's a teaser for a
   product the tenant hasn't bought. */
function LockedRow({ group }) {
  return (
    <div className="vds-clnav__locked" title={group.lockHint}>
      <span className="vds-clnav__locked-icon">{group.icon && <Icon as={group.icon} size="md" />}</span>
      <span className="vds-clnav__locked-label">{group.label}</span>
      <Icon as={Lock} size="xs" className="vds-clnav__locked-lock" label={group.lockHint || 'Locked'} />
    </div>
  )
}

/* A bottom-cluster account/admin row: icon + label, with an optional trailing
   action (e.g. the log-out control on the Profile row). */
function FooterItem({ item, active, onSelect }) {
  return (
    <div className={cx('vds-clnav__footer-item', active && 'vds-clnav__footer-item--active')}>
      <button
        type="button"
        className="vds-clnav__footer-main"
        onClick={() => onSelect?.(item.id, item)}
        aria-current={active ? 'page' : undefined}
      >
        <span className="vds-clnav__footer-icon">{item.icon && <Icon as={item.icon} size="sm" />}</span>
        <span className="vds-clnav__footer-label">{item.label}</span>
      </button>
      {item.trailingIcon && (
        <button
          type="button"
          className="vds-clnav__footer-trailing"
          onClick={() => item.onTrailingClick?.(item)}
          aria-label={item.trailingLabel || 'Action'}
        >
          <Icon as={item.trailingIcon} size="sm" />
        </button>
      )}
    </div>
  )
}

/**
 * CurrentLeftNav
 *
 * The product navigation rail as it ships in VIPRE today — the "current" left
 * nav, captured as a design-system component. A single data-driven composite
 * that owns the whole rail: a centered brand lockup, a standalone "Overview"
 * entry, a stack of product cards (each a bordered translucent panel with a
 * brand glyph, collapsible sub-pages and a "full portal" escape link), locked
 * teaser rows for un-entitled products, and a pinned account/admin footer.
 *
 * Unlike the newer {@link SideNav} this rail is intentionally NOT theme-following
 * — it reproduces the production chrome, which is always the deep product navy.
 * Every surface is driven by local `--vds-clnav-*` custom properties (seeded with
 * the shipped values) so a consumer can still retint a single rail if needed.
 *
 * Products come in two shapes via the group's `locked` flag:
 * - product (default): renders as a card. `collapsible` (default true) shows a
 *   collapse toggle; mark the group the user is currently inside with `active`
 *   to give it the filled accent toggle.
 * - locked: renders as a flat dimmed row with a padlock — a teaser for a product
 *   the tenant hasn't purchased (set `locked: true`).
 *
 * Props:
 * - brand:       node rendered centered in the header (logo / wordmark)
 * - overview:    optional standalone top item — { id, label, icon }
 * - groups:      Group[] — the scrollable product stack (see Group shape)
 * - footerItems: FooterItem[] — the account/admin cluster pinned to the bottom
 * - activeId:    id of the currently-active item (drives the row highlight)
 * - onSelect:    (id, item) => void — fired when any item / overview / escape is clicked
 * - collapsed:   boolean — icon-only rail. Labels disappear, cards shrink to 48px
 *   icon tiles (keeping the dotted connector rail), and the footer stacks to
 *   centered icons. Controlled by the consumer (pass a compact brand when set).
 * - className:   extra classes
 * - all native attributes (aria-*, …)
 *
 * Group shape:  { id, label, icon, active?: boolean, collapsible?: boolean (default true),
 *   defaultOpen?: boolean (default true), locked?: boolean, lockHint?: string,
 *   items: Item[], escape?: { id, label?, icon? } }
 * Item shape:   { id, label, icon?, badge?: string|number }
 * FooterItem:   { id, label, icon, trailingIcon?, trailingLabel?, onTrailingClick? }
 *
 * @example
 * <CurrentLeftNav
 *   brand={<VipreSymphonyLockup />}
 *   overview={{ id: 'overview', label: 'Overview', icon: LayoutGrid }}
 *   activeId={page}
 *   onSelect={setPage}
 *   groups={[
 *     {
 *       id: 'ies', label: 'IES', icon: Mail,
 *       items: [
 *         { id: 'message-logs', label: 'Message Logs', icon: ScrollText },
 *         { id: 'threat-explorer', label: 'Threat Explorer', icon: Radar },
 *       ],
 *       escape: { id: 'ies-portal', label: 'full portal' },
 *     },
 *     { id: 'edr', label: 'EDR', icon: Laptop, active: true, items: [
 *       { id: 'devices', label: 'Devices', icon: Monitor },
 *     ] },
 *     { id: 'sat', label: 'SAT', icon: GraduationCap, locked: true, lockHint: 'Not in your plan' },
 *   ]}
 *   footerItems={[
 *     { id: 'logs', label: 'Logs', icon: ScrollText },
 *     { id: 'profile', label: 'Profile', icon: User, trailingIcon: LogOut, trailingLabel: 'Sign out' },
 *   ]}
 * />
 */
export const CurrentLeftNav = forwardRef(function CurrentLeftNav(
  { brand, overview, groups = [], footerItems = [], activeId, onSelect, collapsed = false, className, ...props },
  ref,
) {
  // Track only the cards the user has toggled; everything else falls back to its
  // `defaultOpen` (open unless explicitly false), so cards added later still
  // honor their own default.
  const [openOverrides, setOpenOverrides] = useState({})
  const isOpen = (g) => openOverrides[g.id] ?? g.defaultOpen !== false
  const toggle = (id) => setOpenOverrides((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))

  return (
    <nav ref={ref} className={cx('vds-clnav', collapsed && 'vds-clnav--collapsed', className)} aria-label={props['aria-label'] || 'Primary'} {...props}>
      {/* Shared gradient for the silver product glyphs — referenced from CSS via
          stroke: url(#…). Zero-size + aria-hidden so it never affects layout. */}
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="vds-clnav-brand-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8c2cb" />
            <stop offset="1" stopColor="#929eaa" />
          </linearGradient>
        </defs>
      </svg>

      {brand && <div className="vds-clnav__header">{brand}</div>}

      <div className="vds-clnav__scroll">
        {overview && (
          <button
            type="button"
            onClick={() => onSelect?.(overview.id, overview)}
            className={cx('vds-clnav__overview', overview.id === activeId && 'vds-clnav__overview--active')}
            aria-current={overview.id === activeId ? 'page' : undefined}
          >
            <span className="vds-clnav__overview-icon">
              {overview.icon && <Icon as={overview.icon} size="md" />}
            </span>
            <span className="vds-clnav__overview-label">{overview.label}</span>
          </button>
        )}

        <div className="vds-clnav__stack">
          {groups.map((group) =>
            group.locked ? (
              <LockedRow key={group.id} group={group} />
            ) : (
              <ProductCard
                key={group.id}
                group={group}
                activeId={activeId}
                onSelect={onSelect}
                open={isOpen(group)}
                onToggleOpen={() => toggle(group.id)}
              />
            ),
          )}
        </div>
      </div>

      {footerItems.length > 0 && (
        <div className="vds-clnav__footer">
          {footerItems.map((item) => (
            <FooterItem key={item.id} item={item} active={item.id === activeId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </nav>
  )
})

CurrentLeftNav.displayName = 'CurrentLeftNav'

// Re-exported for convenience so consumers don't need a second import just to
// build the default footer log-out affordance.
export { LogOut as CurrentLeftNavLogOutIcon }
