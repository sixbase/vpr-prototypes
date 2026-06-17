import { forwardRef, useState } from 'react'
import { ChevronDown, Lock, ArrowUpRight } from '@icons'
import { cx } from '../../lib/cx.js'
import { Icon } from '../Icon/Icon.jsx'

/* One nav row: icon + label + optional trailing badge / lock. Renders as a
   <button> so the whole row is the hit target; a locked item is disabled. */
function NavItem({ item, active, onSelect }) {
  const locked = !!item.locked
  return (
    <button
      type="button"
      disabled={locked}
      onClick={locked ? undefined : () => onSelect?.(item.id, item)}
      className={cx(
        'vds-sidenav__item',
        active && 'vds-sidenav__item--active',
        locked && 'vds-sidenav__item--locked',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {item.icon && <Icon as={item.icon} size="sm" className="vds-sidenav__item-icon" />}
      <span className="vds-sidenav__item-label">{item.label}</span>
      {locked ? (
        <Icon as={Lock} size="xs" className="vds-sidenav__item-lock" label="Locked" />
      ) : item.badge != null ? (
        <span className="vds-sidenav__item-badge">{item.badge}</span>
      ) : null}
    </button>
  )
}

/* A group of items. Three shapes, driven by data:
   - product  (default): an icon + label header. Collapsible (caret) unless
     collapsible:false; a `locked` product shows a padlock and hides its items.
   - section  (variant:'section'): a static uppercase eyebrow label, always open.
   A group may end in an `escape` link — the "full portal" door out of the
   curated set. */
function NavGroup({ group, activeId, onSelect, open, onToggleOpen }) {
  const { label, icon, items = [], escape, locked, lockHint, variant = 'product' } = group
  const isSection = variant === 'section'
  const collapsible = !isSection && !!label && group.collapsible !== false && !locked
  const showItems = locked ? false : isSection || !collapsible || open

  return (
    <div
      className={cx(
        'vds-sidenav__group',
        isSection && 'vds-sidenav__group--section',
        locked && 'vds-sidenav__group--locked',
      )}
    >
      {label && isSection && <div className="vds-sidenav__section-label">{label}</div>}

      {label && !isSection && collapsible && (
        <button
          type="button"
          className="vds-sidenav__group-header"
          onClick={onToggleOpen}
          aria-expanded={open}
        >
          {icon && <Icon as={icon} size="sm" className="vds-sidenav__group-icon" />}
          <span className="vds-sidenav__group-label">{label}</span>
          <Icon
            as={ChevronDown}
            size="xs"
            className={cx('vds-sidenav__group-caret', open && 'vds-sidenav__group-caret--open')}
          />
        </button>
      )}

      {label && !isSection && !collapsible && (
        <div
          className="vds-sidenav__group-header vds-sidenav__group-header--static"
          title={locked ? lockHint : undefined}
        >
          {icon && <Icon as={icon} size="sm" className="vds-sidenav__group-icon" />}
          <span className="vds-sidenav__group-label">{label}</span>
          {locked && (
            <Icon as={Lock} size="xs" className="vds-sidenav__group-lock" label={lockHint || 'Locked'} />
          )}
        </div>
      )}

      {showItems && (
        <div className="vds-sidenav__items">
          {items.map((item) => (
            <NavItem key={item.id} item={item} active={item.id === activeId} onSelect={onSelect} />
          ))}
          {escape && !locked && (
            <button
              type="button"
              className="vds-sidenav__escape"
              onClick={() => onSelect?.(escape.id, escape)}
            >
              <Icon as={escape.icon || ArrowUpRight} size="xs" className="vds-sidenav__escape-icon" />
              <span className="vds-sidenav__escape-label">{escape.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * SideNav
 *
 * The product navigation rail — the left-hand chrome of an application shell. A
 * single data-driven composite that owns the whole rail: a brand header,
 * collapsible product groups (each with items, an optional "full portal" escape
 * link, and a locked / no-entitlement state), an account-admin footer cluster,
 * and an arbitrary footer slot (e.g. a theme toggle). Composes Icon.
 *
 * THEME-FOLLOWING: built from semantic tokens, so it renders as a light rail in
 * light mode and flips to the product navy under a `.dark` ancestor. Because the
 * chrome usually stays dark regardless of the page theme, pass `className="dark"`
 * to force the dark rail anywhere (the same pattern as ScopeNavigator).
 *
 * Groups come in two shapes via `variant`:
 * - 'product' (default): icon + label header, collapsible by default; set
 *   `locked` to show a padlock and hide its items (no entitlement).
 * - 'section': a static uppercase eyebrow label, always expanded — for plain
 *   functional groupings rather than products.
 *
 * Props:
 * - brand:       node rendered in the header (logo / wordmark)
 * - groups:      Group[] — the scrollable middle (see Group shape)
 * - footerItems: Item[] — the account/admin cluster pinned to the bottom
 * - footer:      node rendered below the footer items (e.g. a theme toggle)
 * - activeId:    id of the currently-active item (drives the highlight)
 * - onSelect:    (id, item) => void — fired when any item or escape link is clicked
 * - className:   extra classes (pass 'dark' to force the navy rail)
 * - all native attributes (aria-*, …)
 *
 * Group shape: { id, label?, icon?, variant?: 'product'|'section',
 *   collapsible?: boolean (default true), defaultOpen?: boolean (default true),
 *   locked?: boolean, lockHint?: string, items: Item[], escape?: Item }
 * Item shape:  { id, label, icon?, badge?: string|number, locked?: boolean }
 *
 * @example
 * <SideNav
 *   className="dark"
 *   brand={<VipreMark />}
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
 *     { id: 'safesend', label: 'SafeSend', icon: Send, locked: true, lockHint: 'Not in your plan' },
 *   ]}
 *   footerItems={[{ id: 'profile', label: 'Profile', icon: User }]}
 *   footer={<ThemeToggle />}
 * />
 */
export const SideNav = forwardRef(function SideNav(
  { brand, groups = [], footerItems = [], footer, activeId, onSelect, className, ...props },
  ref,
) {
  // Track only the groups the user has toggled; everything else falls back to
  // its `defaultOpen` (open unless explicitly false). Seeding lazily like this
  // means groups added later still honor their own default.
  const [openOverrides, setOpenOverrides] = useState({})
  const isOpen = (g) => openOverrides[g.id] ?? g.defaultOpen !== false
  const toggle = (id) => setOpenOverrides((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))

  return (
    <nav ref={ref} className={cx('vds-sidenav', className)} {...props}>
      {brand && <div className="vds-sidenav__header">{brand}</div>}

      <div className="vds-sidenav__scroll">
        {groups.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            activeId={activeId}
            onSelect={onSelect}
            open={isOpen(group)}
            onToggleOpen={() => toggle(group.id)}
          />
        ))}
      </div>

      {(footerItems.length > 0 || footer) && (
        <div className="vds-sidenav__footer">
          {footerItems.length > 0 && (
            <div className="vds-sidenav__items">
              {footerItems.map((item) => (
                <NavItem key={item.id} item={item} active={item.id === activeId} onSelect={onSelect} />
              ))}
            </div>
          )}
          {footer && <div className="vds-sidenav__footer-slot">{footer}</div>}
        </div>
      )}
    </nav>
  )
})

SideNav.displayName = 'SideNav'
