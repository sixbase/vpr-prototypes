import { useState, useRef, useEffect } from 'react'
import {
  Mail, Send, Laptop, GraduationCap, Database, ScrollText, Radar, Settings,
  FileText, ShieldCheck, Monitor, Bell, UserCog, User, ArrowUpRight,
  ChevronDown, ChevronUp, ChevronLeft, Check, PanelLeftClose, PanelLeftOpen,
  LayoutDashboard, Plus, Moon, Sun, Building2, Network, Briefcase, Boxes, Lock,
} from '@icons'
import { ScopeProvider, useScope } from '../ScopeContext'
import { ScopeNavigator } from '../vds/components/index.js'
import { useBrand, brandStyleVars, BrandLogo, BrandPicker } from './branding.jsx'
import { ProductTile, OverviewTile, CustomersTile } from './ProductTile.jsx'
import { PRODUCT_GLYPHS } from './productGlyphs.js'
import { mockData } from '../data'
import { ProvisioningModal, SuccessToast } from '../ProvisioningModal'
import CustomerManagementPageB from '../CustomerManagementPageB'
import { PORTALS } from './portalData.js'
// All nav tiles are token-driven inline components (gradient products + flat Overview/
// Customers section tiles) so they re-tint with the reseller theme.
import lockBadge from './assets/lock-badge.svg'
import './shell.css'

/* ============================================================================
   SYMPHONY × SCOPE SHELL
   The Build C "focus-mode" shell (Symphony launcher → product workspace, with the
   fade/glide transition), married to the real DS ScopeNavigator on top. The dark
   navy chrome stays fixed in both themes; the workspace surfaces use semantic DS
   tokens, so dark mode comes for free. Lives in its own corner — render it from
   main.jsx behind a flag and the rest of the app is untouched.
   ========================================================================== */

// Colors as DS tokens. Navy chrome = fixed midnight ramp (same in light/dark);
// workspace = semantic tokens that flip with the .dark class.
const C = {
  topbar: 'var(--vds-midnight-950)',
  menu: 'var(--vds-midnight-950)',
  menuBorder: 'var(--vds-midnight-1000)',   // left-nav outline = deepest ramp step
  tile: 'var(--vds-midnight-700)',       // product icon tile (Figma #1e3e6b)
  tileMuted: 'var(--vds-midnight-900)',  // Overview tile — darker (Figma #0f223d)
  white: 'var(--vds-white)',
  ink: 'var(--vds-midnight-200)',          // nav text on navy (Figma #c4d6ed)
  inkDim: 'var(--vds-midnight-300)',       // dim / Full-Portal text (Figma #98b6dd)
  icon: 'var(--vds-midnight-400)',         // nav icon glyphs (Figma #618bc2)
  iconDim: 'var(--vds-midnight-600)',      // dim / Full-Portal icon (Figma #2b5288)
  navHover: 'var(--vds-midnight-900)',     // row hover lift (Figma #0f223d)
  divider: 'var(--vds-midnight-800)',      // section divider (Figma #152e51)
  selected: 'var(--nav-accent)',     // ACTIVE state — follows the reseller brand (default = cobalt #0068cb)
  onSelected: 'var(--vds-white)',    // white icon + text on the active blue
  portalBg: 'var(--vds-surface)',          // flips in dark mode
  portalInk: 'var(--vds-ink-muted)',
  portalEyebrow: 'var(--vds-ink-subtle)',
  content: 'var(--shell-canvas)',          // body container: canvas in light, deepest midnight-1000 in dark (see shell.css)
  card: 'var(--vds-surface)',
  line: 'var(--vds-line)',
}

const SYM_GUTTER = 32
const SYM_PAD = 8
// Collapsed rail width = 2 × the icon-column center (NAV_PAD_X 16 + card pad 8 + 16 = 40),
// so icons keep the SAME x as expanded — they never slide horizontally on collapse/expand.
const SYM_W_COLLAPSED = 80
const SYM_W_EXPANDED = 242
// Product card (Figma 53:8822): recessed midnight-1000 well, 8px radius, 8px padding,
// 8px gap between the header and the sub-items.
const PRODUCT_CARD = { background: 'var(--vds-midnight-1000)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }
const NAV_PAD_X = 16   // section horizontal padding (Figma px-16)

const POR_PAD = 32
// Collapsed rail = 2 × the icon-column center (POR_PAD 32 + 8 = 40), matching the Symphony
// menu — so portal rows keep the SAME x when collapsing instead of sliding to center.
const POR_W_COLLAPSED = 80
const POR_W_EXPANDED = 200
const OB_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const SLIDE_MS = 300
const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SLIDE_OFFSET = 10

// How the DS ScopeNavigator renders each tenancy type (mirrors the main app).
const SCOPE_TYPE_CONFIG = {
  distributor: { label: 'Distributor', icon: Building2, tone: 'azure' },
  partner: { label: 'Reseller', icon: Network, tone: 'rose' },
  customer: { label: 'Customer', icon: Briefcase, tone: 'emerald' },
}

// Inert handler bag for the outgoing (snapshot) layer during a slide.
const NOOP_H = {
  onSelectSymphony() {}, onOpenWorkspace() {}, onToggleProduct() {}, onToggleSym() {}, onSelectPortal() {},
  onTogglePortal() {}, onSwitchProduct() {}, onHome() {}, onToggleDark() {}, onAddCustomer() {}, onOpenModal() {}, dark: false,
}

/* Position one of the two transition layers. The incoming view fades in over a short
   directional glide (forward → from the right, back → from the left) while the
   outgoing view holds still beneath it, fully covering — no whoosh, no bleed. */
function layerStyle(role, slide) {
  if (!slide) return { position: 'absolute', inset: 0, opacity: 1, transition: 'none' }
  const { dir, running } = slide
  if (role === 'leaving') return { position: 'absolute', inset: 0, zIndex: 1 }
  const from = dir === 'forward' ? SLIDE_OFFSET : dir === 'back' ? -SLIDE_OFFSET : 0
  return {
    position: 'absolute', inset: 0, zIndex: 2, willChange: 'transform, opacity',
    transform: `translate3d(${running ? 0 : from}px, 0, 0)`,
    opacity: running ? 1 : 0,
    transition: running ? `transform ${SLIDE_MS}ms ${SLIDE_EASE}, opacity ${SLIDE_MS}ms ${SLIDE_EASE}` : 'none',
  }
}

/* ---- Data ---- */
const PRODUCTS = [
  { id: 'ies', label: 'IES', icon: Mail, glyph: PRODUCT_GLYPHS.ies, items: [
    { id: 'ies-logs', label: 'Message Logs', icon: ScrollText },
    { id: 'ies-threat', label: 'Threat Explorer', icon: Radar },
    { id: 'ies-config', label: 'Email Config', icon: Settings },
  ] },
  { id: 'safesend', label: 'SafeSend', icon: Send, glyph: PRODUCT_GLYPHS.safesend, items: [
    { id: 'ss-reports', label: 'Reports', icon: FileText },
    { id: 'ss-policies', label: 'Policies', icon: ShieldCheck },
    { id: 'ss-settings', label: 'Settings', icon: Settings },
  ] },
  { id: 'edr', label: 'EDR', icon: Laptop, glyph: PRODUCT_GLYPHS.edr, items: [
    { id: 'edr-devices-s', label: 'Devices', icon: Monitor },
    { id: 'edr-incidents-s', label: 'Incidents', icon: Bell },
    { id: 'edr-settings-s', label: 'Settings', icon: Settings },
  ] },
  { id: 'sat', label: 'SAT', icon: GraduationCap, locked: true, glyph: PRODUCT_GLYPHS.sat },
  { id: 'archive', label: 'Archive', icon: Database, locked: true, glyph: PRODUCT_GLYPHS.archive },
]
const FOOTER = [
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'admins', label: 'Admins', icon: UserCog },
  { id: 'profile', label: 'Profile', icon: User },
]
// PARTNERS group (Figma 53:8800): now just Customers, rendered as a bare tile button
// (32px gradient tile + name), like the standalone Overview. The old Overview leaf is gone.
const PARTNERS = [
  { id: 'customers', label: 'Customers', icon: Building2, Tile: CustomersTile },
]
// Standalone "Overview" tile that opens the PRODUCTS group (no sub-pages, muted tile).
const PRODUCTS_OVERVIEW = { id: 'products-overview', label: 'Overview', icon: Boxes, Tile: OverviewTile }
const FIRST_SYM_ITEM = Object.fromEntries(PRODUCTS.filter((p) => p.items?.length).map((p) => [p.id, p.items[0].id]))

/* ---- Symphony nav rows (dark) — Figma 48:6476 ---- */
// Generic row: 16px icon + label in a full-width rounded pill. Transparent at rest,
// midnight-900 on hover, azure when selected. Collapses to a centered icon.
function MenuItem({ icon, label, labelSize = 12, labelWeight = 500, color, iconColor = C.icon, fp, selected, onClick, collapsed, centerCollapsed, ariaCurrent, title }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      aria-current={ariaCurrent} title={title}
      className={['ob-mrow', selected && 'ob-mrow--sel'].filter(Boolean).join(' ')}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', borderRadius: 5, border: 0,
        // Sub-items keep the same padding in both states (icon never shifts). Bottom-nav rows
        // (centerCollapsed) glide their icon to center when collapsed via the padding transition.
        padding: centerCollapsed && collapsed ? '8px 16px' : '8px 12px 8px 8px',
        background: selected ? C.selected : undefined,   // NOT 'transparent' — inline would override :hover
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left', transition: `background-color 120ms ease, padding 220ms ${OB_EASE}`,
      }}
    >
      {/* icon glyph (Figma #618bc2 = midnight-400) is a different color than the label.
          For Full Portal, color is left to CSS (.ob-fp-icon) so it can transition to white on hover. */}
      <span className={fp ? 'ob-fp-icon' : undefined}
        style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: fp ? undefined : (selected ? C.white : iconColor) }}>{icon}</span>
      <span style={{
        color: selected ? C.white : color,
        maxWidth: collapsed ? 0 : 200, opacity: collapsed ? 0 : 1, minWidth: 0,
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: labelSize, fontWeight: labelWeight,
        transition: `max-width 220ms ${OB_EASE}, opacity 150ms ease`,
      }}>{label}</span>
    </Tag>
  )
}

function Eyebrow({ collapsed, children }) {
  // Always rendered (even collapsed) so its height + the section gap are preserved — only
  // the text fades out. Returning null when collapsed would shift everything below it up.
  return <p style={{ margin: 0, fontSize: 10, fontWeight: 400, letterSpacing: '1px', color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}>{children}</p>
}

function MenuDivider() {
  // Figma 53:9078/9081: full-width 2px rule in the deepest ramp step (midnight-1000).
  return <div style={{ height: 2, width: '100%', background: 'var(--vds-midnight-1000)', flexShrink: 0 }} />
}

// Product header (Figma 53:8516): 32px gradient tile + name + collapse chevron, sitting
// inside a product card. The header IS the click target — it toggles the sub-pages
// (collapsible) or opens the workspace (Overview). Locked products show a lock badge and
// no chevron. The chevron's 24px container is transparent at rest and fills #152E51 on
// header hover (`.ob-phead:hover .ob-chevc` in shell.css).
// `bare` = the card-less standalone Overview: it carries its own p-8 pill and reacts to
// hover (#152E51) / selected (#0068cb) like a nav row (CSS, so hover isn't overridden).
function ProductHeader({ product, collapsed, open, onToggle, onOpen, bare, selected }) {
  const locked = product.locked
  const action = locked ? undefined : (onToggle || onOpen)
  const Tag = action ? 'button' : 'div'
  return (
    <Tag
      {...(action ? { type: 'button', onClick: action } : {})}
      className={['ob-phead', bare && 'ob-phead--bare', bare && selected && 'ob-phead--sel'].filter(Boolean).join(' ')}
      aria-expanded={onToggle ? open : undefined}
      aria-current={bare && selected ? 'page' : undefined}
      title={locked ? `${product.label} — not subscribed` : onToggle ? `${open ? 'Collapse' : 'Expand'} ${product.label}` : `Open ${product.label}`}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', border: 0, padding: bare ? 8 : 0, borderRadius: 5, cursor: action ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left', transition: 'background-color 120ms ease' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {/* exact Figma 32px tile (gradient fill + stroke baked into the SVG). Locked tiles
            add a lock badge overlay at the bottom-right corner. */}
        <span className="ob-ptile" style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          {product.Tile
            ? <product.Tile />
            : product.glyph
            ? <ProductTile glyph={product.glyph} muted={locked} />
            : <img src={product.tileAsset} alt="" style={{ width: 32, height: 32, display: 'block' }} />}
          {locked && <img src={lockBadge} alt="" style={{ position: 'absolute', left: 20, top: 20, width: 16, height: 16 }} />}
        </span>
        {!collapsed && <span style={{ fontSize: 14, fontWeight: 600, color: locked ? C.ink : C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.label}</span>}
      </span>
      {!collapsed && !locked && onToggle && (
        // chevron is visual only (the whole header toggles). Container fills #152E51 on
        // hover; the arrow (currentColor) is #3d68a4 at rest → white on hover (see shell.css).
        <span className="ob-chevc" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 12, flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block', transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 150ms ease' }}>
            <path d="M8 14L12 10L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </Tag>
  )
}

/* ---- Workspace-nav row (light) ---- */
function PortalRow({ iconSize = 16, icon, label, labelSize = 12, labelWeight = 500, selected, collapsed, onClick, ariaLabel }) {
  const pillPad = 8   // matches Symphony's 8px row inset; icon x is unaffected (base - pillPad + pillPad = base)
  // base (icon-column left) stays at POR_PAD in both states — the icon never slides on x;
  // only the label collapses and the rail narrows (no horizontal jump on collapse/expand).
  const base = POR_PAD
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={onClick ? 'obrow obrow--light' : undefined}
      aria-current={selected ? 'page' : undefined} aria-label={ariaLabel}
      style={{
        display: 'flex', alignItems: 'center', width: '100%', minHeight: 24,
        paddingLeft: base - pillPad, paddingRight: base - pillPad, border: 0, background: 'transparent',
        cursor: onClick ? 'pointer' : 'default', color: selected ? C.onSelected : C.portalInk,
        fontFamily: 'inherit', textAlign: 'left', transition: `padding 220ms ${OB_EASE}`,
      }}
    >
      <span className="obrow-pill" style={{
        display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 5,
        paddingTop: 8, paddingBottom: 8, paddingLeft: pillPad, paddingRight: collapsed ? pillPad : 8,
        transition: `padding 220ms ${OB_EASE}, background-color 120ms ease`,
        ...(selected ? { background: C.selected } : {}),
      }}>
        <span style={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{
          maxWidth: collapsed ? 0 : 150, marginLeft: collapsed ? 0 : 8, opacity: collapsed ? 0 : 1, minWidth: 0,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: labelSize, fontWeight: labelWeight,
          transition: `max-width 220ms ${OB_EASE}, margin-left 220ms ${OB_EASE}, opacity 150ms ease`,
        }}>{label}</span>
      </span>
    </Tag>
  )
}

/* ====================== Symphony menu (dark) — Figma 48:6476 ====================== */
function SymphonyMenu({ collapsed, page, openIds, onToggleProduct, onSelectItem, onOpenWorkspace, onToggleCollapse, dark, onToggleDark }) {
  // Per-product open/closed state is owned by ShellInner (lifted) so it survives nav
  // collapse/expand AND workspace round-trips — it never resets to the default.
  const px = NAV_PAD_X   // section padding stays 16 in both states (icons keep their x)

  return (
    <nav style={{
      width: collapsed ? SYM_W_COLLAPSED : SYM_W_EXPANDED, flexShrink: 0, background: C.menu,
      borderRight: `1px solid ${C.menuBorder}`, display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--vds-font-sans)', transition: `width 220ms ${OB_EASE}`,
    }}>
      <div className="ob-scroll-dark" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* PARTNERS — bare tile buttons (32px gradient tile + name), like Overview. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `16px ${px}px` }}>
          <Eyebrow collapsed={collapsed}>PARTNERS</Eyebrow>
          {PARTNERS.map((it) => (
            <ProductHeader key={it.id} product={it} collapsed={collapsed} bare
              selected={page === it.id} onOpen={() => onSelectItem(it.id)} />
          ))}
        </div>

        <MenuDivider />

        {/* PRODUCTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
          <Eyebrow collapsed={collapsed}>PRODUCTS</Eyebrow>
          {/* standalone Overview — gradient tile + name, card-less; selectable (azure active). */}
          <ProductHeader product={PRODUCTS_OVERVIEW} collapsed={collapsed} bare
            selected={page === PRODUCTS_OVERVIEW.id}
            onOpen={() => onSelectItem(PRODUCTS_OVERVIEW.id)} />
          {PRODUCTS.map((p) => {
            // Each product is a recessed card (collapsed nav drops the card → centered tile).
            if (p.locked) {
              return (
                <div key={p.id} style={PRODUCT_CARD}>
                  <ProductHeader product={p} collapsed={collapsed} />
                </div>
              )
            }
            const open = openIds[p.id]
            return (
              // Same card structure in both states — collapsing only hides labels + narrows
              // the rail, so the sub-page icons stay put on the x-axis (no horizontal jump).
              // gap:0 — the header→sub-items gap lives INSIDE the accordion (paddingTop) so it
              // animates away too, and the closed card is exactly header-height (like SAT/Archive).
              <div key={p.id} style={{ ...PRODUCT_CARD, gap: 0 }}>
                <ProductHeader product={p} collapsed={collapsed} open={open}
                  onToggle={() => onToggleProduct(p.id)} onOpen={() => onOpenWorkspace(p.id)} />
                {/* Accordion: animate open/closed via grid-template-rows 0fr↔1fr (no fixed
                    height needed; works the same in the collapsed icon rail and expanded nav). */}
                <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 220ms ${OB_EASE}` }}>
                  <div style={{ overflow: 'hidden', minHeight: 0 }} aria-hidden={!open}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8, opacity: open ? 1 : 0, transition: 'opacity 180ms ease' }}>
                      {p.items.map((it) => (
                        <MenuItem key={it.id} collapsed={collapsed} icon={<it.icon size={16} />} label={it.label} labelSize={13} color={C.ink}
                          selected={page === it.id} ariaCurrent={page === it.id ? 'page' : undefined} onClick={() => onSelectItem(it.id)} />
                      ))}
                      <MenuItem collapsed={collapsed} icon={<ArrowUpRight size={16} />} label="Full Portal" labelSize={11} labelWeight={400} color={C.inkDim} fp onClick={() => onOpenWorkspace(p.id)} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* pinned bottom: OTHER + dark-mode toggle (functional, not in Figma) + collapse.
          OTHER is pulled out of the scroll flow so it stays anchored to the nav bottom. */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <MenuDivider />
        {/* OTHER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `16px ${px}px` }}>
          <Eyebrow collapsed={collapsed}>OTHER</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FOOTER.map((f) => (
              <MenuItem key={f.id} collapsed={collapsed} centerCollapsed icon={<f.icon size={16} />} label={f.label} color={C.ink} />
            ))}
          </div>
        </div>
        <MenuDivider />
        <div style={{ display: 'flex', flexDirection: 'column', padding: `8px ${px}px` }}>
          <MenuItem collapsed={collapsed} centerCollapsed icon={dark ? <Sun size={16} /> : <Moon size={16} />} label={dark ? 'Light mode' : 'Dark mode'} color={C.ink} onClick={onToggleDark} />
          <MenuItem collapsed={collapsed} centerCollapsed icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} label="Collapse" color={C.ink} onClick={onToggleCollapse} />
        </div>
      </div>
    </nav>
  )
}

/* ============= Workspace nav (light) — header is a product switcher ============= */
function WorkspaceNav({ product, page, collapsed, onToggleCollapse, onSelectPage, onSwitchProduct, onHome, dark, onToggleDark, style }) {
  const def = PORTALS[product]
  const ProductGlyph = (PRODUCTS.find((p) => p.id === product) || {}).icon || Laptop
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div style={{
      width: collapsed ? POR_W_COLLAPSED : POR_W_EXPANDED, flexShrink: 0, background: C.portalBg,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'visible',
      transition: `width 220ms ${OB_EASE}`,
      ...style,
    }}>
      <div className="ob-scroll-light" style={{ padding: '12px 0 8px', overflowY: 'auto', overflowX: 'visible', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* back to Symphony */}
        <PortalRow iconSize={16} collapsed={collapsed} label="Symphony" labelWeight={500}
          onClick={onHome} ariaLabel="Back to Symphony" icon={<ChevronLeft size={16} />} />

        {/* product switcher header */}
        <div style={{ position: 'relative' }}>
          <button type="button" className="obrow obrow--light ob-switcher" onClick={() => setSwitcherOpen((o) => !o)}
            aria-label="Switch product" aria-expanded={switcherOpen}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', minHeight: 24, textAlign: 'left',
              /* mirror PortalRow's padding (base - pillPad) on BOTH sides so the
                 switcher's pill box is exactly the width of the nav-row pills. */
              paddingLeft: collapsed ? (POR_W_COLLAPSED - 16) / 2 - 4 : POR_PAD - 6,
              paddingRight: collapsed ? (POR_W_COLLAPSED - 16) / 2 - 4 : POR_PAD - 6,
              border: 0, background: 'transparent', cursor: 'pointer', color: C.portalInk, fontFamily: 'inherit',
              transition: `padding 220ms ${OB_EASE}`,
            }}>
            <span className="obrow-pill" style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 5, padding: collapsed ? '8px' : '8px 8px 8px 6px' }}>
              <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ProductGlyph size={16} style={{ color: C.portalInk }} />
              </span>
              {!collapsed && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--vds-ink)' }}>{def.label}</span>}
              {!collapsed && <ChevronDown size={14} style={{ opacity: 0.55, flexShrink: 0, transform: switcherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />}
            </span>
          </button>
          {switcherOpen && (
            <>
              <div onClick={() => setSwitcherOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 17, zIndex: 31, minWidth: 174,
                background: C.portalBg, borderRadius: 10, border: `1px solid ${C.line}`, boxShadow: 'var(--vds-shadow-lg)', padding: 5,
              }}>
                {PRODUCTS.filter((p) => !p.locked).map((p) => {
                  const G = p.icon
                  const cur = p.id === product
                  return (
                    <button key={p.id} type="button" onClick={() => { setSwitcherOpen(false); if (!cur) onSwitchProduct(p.id) }}
                      className="ob-switch-item"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 0, borderRadius: 6,
                        background: cur ? 'color-mix(in srgb, var(--vds-primary) 12%, transparent)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                        color: cur ? 'var(--vds-ink)' : C.portalInk, textAlign: 'left',
                      }}>
                      <G size={16} style={{ flexShrink: 0, color: cur ? C.selected : C.portalInk }} />
                      <span style={{ flex: 1, fontWeight: cur ? 500 : 400 }}>{p.label}</span>
                      {cur && <Check size={15} style={{ color: C.selected }} />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {def.sections.map((sec) => (
          <div key={sec.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{
              fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: C.portalEyebrow,
              overflow: 'hidden', whiteSpace: 'nowrap', paddingLeft: POR_PAD, marginBottom: 8,
              opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease',
            }}>{sec.label}</div>
            {sec.items.map((it) => {
              const Icon = it.icon
              return (
                <PortalRow key={it.id} iconSize={16} collapsed={collapsed} label={it.label}
                  selected={page === it.id} onClick={() => onSelectPage(it.id)} icon={<Icon size={16} />} />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, padding: '8px 0 24px' }}>
        <PortalRow iconSize={16} collapsed={collapsed} label={dark ? 'Light mode' : 'Dark mode'}
          onClick={onToggleDark} icon={dark ? <Sun size={16} /> : <Moon size={16} />} />
        <PortalRow iconSize={16} collapsed={collapsed} label=""
          onClick={onToggleCollapse} ariaLabel={collapsed ? 'Expand menu' : 'Collapse menu'}
          icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} />
      </div>
    </div>
  )
}

/* ============= Content card (shared placeholder) ============= */
// Placeholder page-header actions (Figma 53:8072): primary azure buttons, right-aligned.
const HEADER_BUTTONS = ['Action 1', 'Action 2', 'Action 3']
function HeaderButtons() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
      {HEADER_BUTTONS.map((label) => (
        <button key={label} type="button" className="ob-hbtn"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, padding: '0 12px', borderRadius: 5, border: 0, background: C.selected, color: C.white, fontSize: 14, fontWeight: 500, lineHeight: 1, fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          {label}
        </button>
      ))}
    </div>
  )
}
function ContentCard({ page, style }) {
  const PageIcon = iconOf(page)
  const title = labelOf(page)
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--vds-ink) 7%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PageIcon size={18} style={{ color: 'var(--vds-ink-muted)' }} />
          </span>
          <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--vds-ink)' }}>{title}</span>
        </div>
        <HeaderButtons />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          <div style={cardStyle} /><div style={cardStyle} />
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          <div style={cardStyle} /><div style={cardStyle} /><div style={cardStyle} />
        </div>
      </div>
    </div>
  )
}
const cardStyle = { flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.line}`, borderRadius: 8 }

function labelOf(id) {
  const partner = PARTNERS.find((p) => p.id === id)
  if (partner) return partner.label
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.label
  for (const key in PORTALS) for (const s of PORTALS[key].sections) for (const it of s.items) if (it.id === id) return it.label
  return 'Overview'
}
function iconOf(id) {
  const partner = PARTNERS.find((p) => p.id === id)
  if (partner) return partner.icon
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.icon
  for (const key in PORTALS) for (const s of PORTALS[key].sections) for (const it of s.items) if (it.id === id) return it.icon
  return LayoutDashboard
}

/* One full-bleed stage — Symphony launcher or a product workspace. Rendered from
   explicit params so a snapshot can be frozen and held beneath the live one. */
function MainView({ params, h }) {
  const { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed, openProducts } = params
  if (openPortal) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', padding: 8, minWidth: 0, background: C.topbar }}>
        <WorkspaceNav
          product={openPortal} page={portalPage} collapsed={portalCollapsed}
          onToggleCollapse={h.onTogglePortal} onSelectPage={h.onSelectPortal} onSwitchProduct={h.onSwitchProduct}
          onHome={h.onHome} dark={h.dark} onToggleDark={h.onToggleDark}
          style={{ borderRadius: '16px 0 0 16px' }}
        />
        <ContentCard page={portalPage} style={{ borderRadius: '0 16px 16px 0' }} />
      </div>
    )
  }
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: C.topbar }}>
      <SymphonyMenu
        collapsed={symCollapsed} page={symphonyPage}
        openIds={openProducts} onToggleProduct={h.onToggleProduct}
        onSelectItem={h.onSelectSymphony} onOpenWorkspace={h.onOpenWorkspace} onToggleCollapse={h.onToggleSym}
        dark={h.dark} onToggleDark={h.onToggleDark} onAddCustomer={h.onAddCustomer}
      />
      <div style={{ flex: 1, minWidth: 0, background: C.topbar, display: 'flex' }}>
        {/* body panel: flush to the right/bottom edges, only the top-left corner is rounded (Figma 51:7368). */}
        <div style={{ flex: 1, display: 'flex', minWidth: 0, borderRadius: '32px 0 0 0', overflow: 'hidden' }}>
          {symphonyPage === 'customers' ? (
            /* Mirror ContentCard 1:1 (same canvas bg, padding 32, header, gap 24). The
               negative-margin wrapper cancels DashboardPageB's own mx-6 (24) / mb-5 (20)
               so its panel lands on the exact same x/y as the placeholder panels. */
            <div className="shell-customers" style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--vds-ink) 7%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={18} style={{ color: 'var(--vds-ink-muted)' }} />
                </span>
                <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--vds-ink)' }}>Customers</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 -24px -20px' }}>
                <CustomerManagementPageB openModal={h.onOpenModal} showFuture={false} />
              </div>
            </div>
          ) : (
            <ContentCard page={symphonyPage} />
          )}
        </div>
      </div>
    </div>
  )
}

function ShellInner() {
  const { path, navigate, teleportedSegments } = useScope()

  const [brand, setBrand] = useBrand()
  const [dark, setDark] = useState(false)
  const [provModal, setProvModal] = useState(null) // { type, availableTypes, contextEntity } | null
  const [toast, setToast] = useState(null)

  const [symCollapsed, setSymCollapsed] = useState(false)
  const [portalCollapsed, setPortalCollapsed] = useState(false)
  const [symphonyPage, setSymphonyPage] = useState('ies-logs')
  // Lifted so per-product open/closed survives nav collapse + workspace round-trips.
  const [openProducts, setOpenProducts] = useState(() => Object.fromEntries(PRODUCTS.filter((p) => !p.locked).map((p) => [p.id, true])))
  const toggleProduct = (id) => setOpenProducts((o) => ({ ...o, [id]: !o[id] }))
  const [portalPage, setPortalPage] = useState(null)
  const [openPortal, setOpenPortal] = useState(null) // null = Symphony shown; else workspace
  const [slide, setSlide] = useState(null)
  const slideTimer = useRef(0)

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  // Fade-and-glide transition. Snapshot the leaving view (held still beneath), apply
  // the state change, then flip `running` on the next frame so the incoming layer
  // fades + glides into place. Cleared on the incoming layer's *opacity* end so the
  // cover is never pulled while it's still translucent.
  const endSlide = () => { clearTimeout(slideTimer.current); setSlide(null) }
  const withSlide = (dir, action) => {
    const leaving = { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed, openProducts }
    action()
    setSlide({ leaving, dir, running: false })
    requestAnimationFrame(() => requestAnimationFrame(() => setSlide((s) => (s ? { ...s, running: true } : s))))
    clearTimeout(slideTimer.current)
    slideTimer.current = setTimeout(endSlide, SLIDE_MS + 250)
  }

  const drillIn = (pid) => withSlide('forward', () => {
    setOpenPortal(pid); setPortalPage(PORTALS[pid].defaultPage); setSymphonyPage(FIRST_SYM_ITEM[pid] || symphonyPage)
  })
  const switchTo = (pid) => withSlide('fade', () => {
    setOpenPortal(pid); setPortalPage(PORTALS[pid].defaultPage); setSymphonyPage(FIRST_SYM_ITEM[pid] || symphonyPage)
  })
  const goHome = () => withSlide('back', () => setOpenPortal(null))

  // Provisioning modal opener — same signature the MSP pages expect.
  const openModal = (type, contextEntity = null, availableTypes = null) => setProvModal({ type, contextEntity, availableTypes })

  const h = {
    onSelectSymphony: (id) => setSymphonyPage(id),
    onOpenWorkspace: drillIn,
    onToggleProduct: toggleProduct,
    onToggleSym: () => setSymCollapsed((c) => !c),
    onSelectPortal: setPortalPage,
    onTogglePortal: () => setPortalCollapsed((c) => !c),
    onSwitchProduct: switchTo,
    onHome: goHome,
    onToggleDark: () => setDark((d) => !d),
    onAddCustomer: () => openModal('addCustomer'),
    onOpenModal: openModal,
    dark,
  }
  const leavingH = { ...NOOP_H, dark }
  const params = { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed, openProducts }

  return (
    <div className="shell-root" style={{ ...brandStyleVars(brand), height: '100vh', display: 'flex', flexDirection: 'column', background: C.topbar, overflow: 'hidden', fontFamily: 'var(--vds-font-sans)' }}>
      {/* Global bar: VIPRE mark in the brand/home position (toy-box-1 treatment),
          then the real scope breadcrumb. One logo only — the breadcrumb root uses a
          neutral icon. The mark doubles as "back to Symphony" (home). The bar is
          scoped `.dark` so the DS ScopeNavigator renders its product-navy chrome in
          BOTH themes — matching the always-navy Symphony left nav (canvas under .dark
          = midnight-950 = the Symphony menu bg exactly). */}
      <div className="dark" style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, background: 'var(--vds-canvas)', borderBottom: '1px solid var(--vds-midnight-1000)' }}>
        <button type="button" onClick={goHome} title="Symphony home" aria-label="Symphony home"
          /* paddingLeft 19 aligns the logo mark to the Symphony nav icon column (Figma 48:6476). */
          style={{ display: 'flex', alignItems: 'center', paddingLeft: 19, paddingRight: 'var(--vds-space-3)', border: 0, background: 'transparent', cursor: 'pointer', color: C.white }}>
          <BrandLogo brand={brand} />
        </button>
        <ScopeNavigator
          path={path}
          onNavigate={navigate}
          rootItems={mockData}
          rootIcon={Boxes}
          typeConfig={SCOPE_TYPE_CONFIG}
          teleportedSegments={teleportedSegments}
          style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none', paddingLeft: 0 }}
        />
        {/* Reseller theme switcher — white-labels the portal chrome + logo. */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16, paddingLeft: 8 }}>
          <BrandPicker brand={brand} onPick={setBrand} />
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, background: C.topbar }}>
        {/* live (incoming) view */}
        <div
          style={layerStyle('incoming', slide)}
          onTransitionEnd={slide ? (e) => { if (e.target === e.currentTarget && e.propertyName === 'opacity') endSlide() } : undefined}
        >
          <MainView params={params} h={h} />
        </div>
        {/* outgoing snapshot — present only during a slide, inert */}
        {slide && (
          <div style={layerStyle('leaving', slide)}>
            <MainView params={slide.leaving} h={leavingH} />
          </div>
        )}
      </div>

      {provModal && (
        <ProvisioningModal
          type={provModal.type}
          contextEntity={provModal.contextEntity}
          availableTypes={provModal.availableTypes}
          onClose={() => setProvModal(null)}
          onSuccess={(m) => setToast(m)}
        />
      )}
      {toast && <SuccessToast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

export default function SymphonyShell() {
  return (
    <ScopeProvider>
      <ShellInner />
    </ScopeProvider>
  )
}
