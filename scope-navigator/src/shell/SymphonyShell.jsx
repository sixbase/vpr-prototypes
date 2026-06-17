import { useState, useRef, useEffect } from 'react'
import {
  Mail, Send, Laptop, GraduationCap, Database, ScrollText, Radar, Settings,
  FileText, ShieldCheck, Monitor, Bell, UserCog, User, ArrowUpRight,
  ChevronDown, ChevronUp, ChevronLeft, Check, PanelLeftClose, PanelLeftOpen,
  LayoutDashboard, Plus, Moon, Sun, Building2, Network, Briefcase, Boxes, Lock,
} from '@icons'
import { ScopeProvider, useScope } from '../ScopeContext'
import { ScopeNavigator } from '../vds/components/index.js'
import { VipreMark } from '../config'
import { mockData } from '../data'
import { ProvisioningModal, SuccessToast } from '../ProvisioningModal'
import CustomerManagementPageB from '../CustomerManagementPageB'
import { PORTALS } from './portalData.js'
// Exact locked-product tile illustrations + lock badge, pulled from Figma 48:6476.
import satTile from './assets/sat-tile.svg'
import archiveTile from './assets/archive-tile.svg'
import lockBadge from './assets/lock-badge.svg'
import chevronAsset from './assets/chevron.svg' // white chevron in a #0A192C circle (shows on hover)
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
  menuBorder: 'var(--vds-midnight-900)',
  tile: 'var(--vds-midnight-700)',       // product icon tile (Figma #1e3e6b)
  tileMuted: 'var(--vds-midnight-900)',  // Overview tile — darker (Figma #0f223d)
  white: 'var(--vds-white)',
  ink: 'var(--vds-midnight-200)',          // nav text on navy (Figma #c4d6ed)
  inkDim: 'var(--vds-midnight-300)',       // dim / Full-Portal text (Figma #98b6dd)
  icon: 'var(--vds-midnight-400)',         // nav icon glyphs (Figma #618bc2)
  iconDim: 'var(--vds-midnight-600)',      // dim / Full-Portal icon (Figma #2b5288)
  navHover: 'var(--vds-midnight-900)',     // row hover lift (Figma #0f223d)
  divider: 'var(--vds-midnight-800)',      // section divider (Figma #152e51)
  selected: '#0068cb',               // ACTIVE state — exact Figma blue; NOT a DS palette token (flagged)
  onSelected: 'var(--vds-white)',    // white icon + text on the active blue
  portalBg: 'var(--vds-surface)',          // flips in dark mode
  portalInk: 'var(--vds-ink-muted)',
  portalEyebrow: 'var(--vds-ink-subtle)',
  content: 'var(--vds-canvas)',            // recessed page bg, flips
  card: 'var(--vds-surface)',
  line: 'var(--vds-line)',
}

const SYM_GUTTER = 32
const SYM_PAD = 8
const SYM_W_COLLAPSED = SYM_GUTTER + SYM_PAD * 2
const SYM_W_EXPANDED = 210
const NAV_PAD_X = 16   // section horizontal padding (Figma px-16)

const POR_PAD = 32
const POR_W_COLLAPSED = 56
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
  onSelectSymphony() {}, onOpenWorkspace() {}, onToggleSym() {}, onSelectPortal() {},
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
  { id: 'ies', label: 'IES', icon: Mail, items: [
    { id: 'ies-logs', label: 'Message Logs', icon: ScrollText },
    { id: 'ies-threat', label: 'Threat Explorer', icon: Radar },
    { id: 'ies-config', label: 'Email Config', icon: Settings },
  ] },
  { id: 'safesend', label: 'SafeSend', icon: Send, items: [
    { id: 'ss-reports', label: 'Reports', icon: FileText },
    { id: 'ss-policies', label: 'Policies', icon: ShieldCheck },
    { id: 'ss-settings', label: 'Settings', icon: Settings },
  ] },
  { id: 'edr', label: 'EDR', icon: Laptop, items: [
    { id: 'edr-devices-s', label: 'Devices', icon: Monitor },
    { id: 'edr-incidents-s', label: 'Incidents', icon: Bell },
    { id: 'edr-settings-s', label: 'Settings', icon: Settings },
  ] },
  { id: 'sat', label: 'SAT', icon: GraduationCap, locked: true, tileAsset: satTile },
  { id: 'archive', label: 'Archive', icon: Database, locked: true, tileAsset: archiveTile },
]
const FOOTER = [
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'admins', label: 'Admins', icon: UserCog },
  { id: 'profile', label: 'Profile', icon: User },
]
// PARTNERS group at the top of the nav (Figma 48:6476). Each opens a Symphony page.
const PARTNERS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Building2 },
]
// Standalone "Overview" tile that opens the PRODUCTS group (no sub-pages, muted tile).
const PRODUCTS_OVERVIEW = { id: 'products-overview', label: 'Overview', icon: Boxes }
const FIRST_SYM_ITEM = Object.fromEntries(PRODUCTS.filter((p) => p.items?.length).map((p) => [p.id, p.items[0].id]))

/* ---- Symphony nav rows (dark) — Figma 48:6476 ---- */
// Generic row: 16px icon + label in a full-width rounded pill. Transparent at rest,
// midnight-900 on hover, azure when selected. Collapses to a centered icon.
function MenuItem({ icon, label, labelSize = 12, labelWeight = 500, color, iconColor = C.icon, fp, selected, onClick, collapsed, ariaCurrent, title }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      aria-current={ariaCurrent} title={title}
      className={['ob-mrow', selected && 'ob-mrow--sel'].filter(Boolean).join(' ')}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', borderRadius: 5, border: 0,
        padding: collapsed ? `8px ${(SYM_W_COLLAPSED - 16) / 2}px` : '8px 12px 8px 8px',
        background: selected ? C.selected : undefined,   // NOT 'transparent' — inline would override :hover
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left', transition: 'background-color 120ms ease',
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
  if (collapsed) return null
  return <p style={{ margin: 0, fontSize: 10, fontWeight: 400, letterSpacing: '1px', color: C.ink, whiteSpace: 'nowrap' }}>{children}</p>
}

function MenuDivider() {
  return <div style={{ height: 1, width: '100%', background: C.divider, flexShrink: 0 }} />
}

// Product header: 32px brand tile + name + collapse chevron. Click the tile/name to
// open the workspace; the chevron toggles the product's sub-pages. Locked products
// show a lock badge and no chevron.
function ProductHeader({ product, Glyph, collapsed, open, onToggle, onOpen, tileBg = C.tile }) {
  const locked = product.locked
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: collapsed ? 0 : '0 8px', width: '100%' }}>
      <div className={locked ? undefined : 'ob-phead'}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 5, width: collapsed ? 'auto' : SYM_W_EXPANDED - 16, transition: 'background-color 120ms ease' }}>
        {/* clicking the name toggles collapse when the product is collapsible (onToggle);
            otherwise it opens the item (Overview tile). Locked = no action. */}
        <button type="button" onClick={locked ? undefined : (onToggle || onOpen)} className={locked ? undefined : 'ob-mrow--name'}
          title={locked ? `${product.label} — not subscribed` : onToggle ? `${open ? 'Collapse' : 'Expand'} ${product.label}` : `Open ${product.label}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, border: 0, background: 'transparent', padding: 0, cursor: locked ? 'default' : 'pointer' }}>
          {product.tileAsset ? (
            // locked: exact Figma tile illustration (muted #152E51 fill) + lock badge overlay
            <span style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              <img src={product.tileAsset} alt="" style={{ width: 32, height: 32, display: 'block' }} />
              <img src={lockBadge} alt="" style={{ position: 'absolute', left: 20, top: 24, width: 16, height: 16 }} />
            </span>
          ) : (
            <span style={{ width: 32, height: 32, borderRadius: 8, background: tileBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0px 0.5px 0.5px 0.5px rgba(0,0,0,0.05)' }}>
              <Glyph size={18} style={{ color: C.white }} />
            </span>
          )}
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 600, color: locked ? C.ink : C.white, whiteSpace: 'nowrap' }}>{product.label}</span>}
        </button>
        {!collapsed && !locked && onToggle && (
          <button type="button" onClick={onToggle} aria-label={open ? `Collapse ${product.label}` : `Expand ${product.label}`}
            className="ob-chev" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
            {/* exact Figma chevron — white glyph in a #0A192C circle that only reads on the hover pill */}
            <img src={chevronAsset} alt="" style={{ width: 24, height: 24, display: 'block', transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 150ms ease' }} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ---- Workspace-nav row (light) ---- */
function PortalRow({ iconSize = 16, icon, label, labelSize = 12, labelWeight = 500, selected, collapsed, onClick, ariaLabel }) {
  const pillPad = collapsed ? 4 : 6
  const base = collapsed ? (POR_W_COLLAPSED - iconSize) / 2 : POR_PAD
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
        display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 6,
        paddingTop: 4, paddingBottom: 4, paddingLeft: pillPad, paddingRight: collapsed ? pillPad : 8,
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
function SymphonyMenu({ collapsed, page, onSelectItem, onOpenWorkspace, onToggleCollapse, dark, onToggleDark }) {
  // Per-product section collapse — products start expanded.
  const [openIds, setOpenIds] = useState(() => Object.fromEntries(PRODUCTS.filter((p) => !p.locked).map((p) => [p.id, true])))
  const toggle = (id) => setOpenIds((o) => ({ ...o, [id]: !o[id] }))
  const px = collapsed ? 0 : NAV_PAD_X

  return (
    <nav style={{
      width: collapsed ? SYM_W_COLLAPSED : SYM_W_EXPANDED, flexShrink: 0, background: C.menu,
      borderRight: `1px solid ${C.menuBorder}`, display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--vds-font-sans)', transition: `width 220ms ${OB_EASE}`,
    }}>
      <div className="ob-scroll-dark" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* PARTNERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `8px ${px}px` }}>
          <Eyebrow collapsed={collapsed}>PARTNERS</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {PARTNERS.map((it) => (
              <MenuItem key={it.id} collapsed={collapsed} icon={<it.icon size={16} />} label={it.label} color={C.ink}
                selected={page === it.id} ariaCurrent={page === it.id ? 'page' : undefined} onClick={() => onSelectItem(it.id)} />
            ))}
          </div>
        </div>

        <MenuDivider />

        {/* PRODUCTS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {!collapsed && <div style={{ padding: `16px ${NAV_PAD_X}px 0` }}><Eyebrow collapsed={collapsed}>PRODUCTS</Eyebrow></div>}
          {/* standalone Overview tile (muted tile, no sub-pages) */}
          <div style={{ padding: '4px 0' }}>
            <ProductHeader product={PRODUCTS_OVERVIEW} Glyph={PRODUCTS_OVERVIEW.icon} collapsed={collapsed}
              tileBg={C.tileMuted} onOpen={() => onSelectItem(PRODUCTS_OVERVIEW.id)} />
          </div>
          {PRODUCTS.map((p) => {
            const Glyph = p.icon
            if (p.locked) {
              return <ProductHeader key={p.id} product={p} Glyph={Glyph} collapsed={collapsed} />
            }
            const open = openIds[p.id]
            return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <ProductHeader product={p} Glyph={Glyph} collapsed={collapsed} open={open}
                  onToggle={() => toggle(p.id)} onOpen={() => onOpenWorkspace(p.id)} />
                {open && !collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: `0 ${NAV_PAD_X}px` }}>
                    {p.items.map((it) => (
                      <MenuItem key={it.id} collapsed={collapsed} icon={<it.icon size={16} />} label={it.label} labelSize={13} color={C.ink}
                        selected={page === it.id} ariaCurrent={page === it.id ? 'page' : undefined} onClick={() => onSelectItem(it.id)} />
                    ))}
                    <MenuItem collapsed={collapsed} icon={<ArrowUpRight size={16} />} label="Full Portal" labelSize={11} labelWeight={400} color={C.inkDim} fp onClick={() => onOpenWorkspace(p.id)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <MenuDivider />

        {/* OTHER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `8px ${px}px` }}>
          <Eyebrow collapsed={collapsed}>OTHER</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FOOTER.map((f) => (
              <MenuItem key={f.id} collapsed={collapsed} icon={<f.icon size={16} />} label={f.label} color={C.ink} />
            ))}
          </div>
        </div>
      </div>

      {/* pinned bottom: dark-mode toggle (functional, not in Figma) + collapse */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', padding: `8px ${px}px` }}>
        <MenuItem collapsed={collapsed} icon={dark ? <Sun size={16} /> : <Moon size={16} />} label={dark ? 'Light mode' : 'Dark mode'} color={C.ink} onClick={onToggleDark} />
        <MenuItem collapsed={collapsed} icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} label="Collapse" color={C.ink} onClick={onToggleCollapse} />
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
      <div className="ob-scroll-light" style={{ padding: '12px 0 8px', overflowY: 'auto', overflowX: 'visible', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            <span className="obrow-pill" style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 6, padding: collapsed ? '4px' : '4px 8px 4px 6px' }}>
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
              fontSize: 10, letterSpacing: '0.3px', textTransform: 'uppercase', color: C.portalEyebrow,
              overflow: 'hidden', whiteSpace: 'nowrap', paddingLeft: POR_PAD, marginBottom: 4,
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
function ContentCard({ page, style }) {
  const PageIcon = iconOf(page)
  const title = labelOf(page)
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--vds-ink) 7%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PageIcon size={18} style={{ color: 'var(--vds-ink-muted)' }} />
        </span>
        <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--vds-ink)' }}>{title}</span>
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
  const { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed } = params
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
        onSelectItem={h.onSelectSymphony} onOpenWorkspace={h.onOpenWorkspace} onToggleCollapse={h.onToggleSym}
        dark={h.dark} onToggleDark={h.onToggleDark} onAddCustomer={h.onAddCustomer}
      />
      <div style={{ flex: 1, minWidth: 0, padding: 8, background: C.topbar, display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', minWidth: 0, borderRadius: 16, overflow: 'hidden' }}>
          {symphonyPage === 'customers' ? (
            /* Mirror ContentCard 1:1 (same canvas bg, padding 32, header, gap 24). The
               negative-margin wrapper cancels DashboardPageB's own mx-6 (24) / mb-5 (20)
               so its panel lands on the exact same x/y as the placeholder panels. */
            <div className="shell-customers" style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--vds-ink) 7%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={18} style={{ color: 'var(--vds-ink-muted)' }} />
                </span>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--vds-ink)' }}>Customers</span>
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

  const [dark, setDark] = useState(false)
  const [provModal, setProvModal] = useState(null) // { type, availableTypes, contextEntity } | null
  const [toast, setToast] = useState(null)

  const [symCollapsed, setSymCollapsed] = useState(false)
  const [portalCollapsed, setPortalCollapsed] = useState(false)
  const [symphonyPage, setSymphonyPage] = useState('ies-logs')
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
    const leaving = { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed }
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
  const params = { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.topbar, overflow: 'hidden', fontFamily: 'var(--vds-font-sans)' }}>
      {/* Global bar: VIPRE mark in the brand/home position (toy-box-1 treatment),
          then the real scope breadcrumb. One logo only — the breadcrumb root uses a
          neutral icon. The mark doubles as "back to Symphony" (home). The bar is
          scoped `.dark` so the DS ScopeNavigator renders its product-navy chrome in
          BOTH themes — matching the always-navy Symphony left nav (canvas under .dark
          = midnight-950 = the Symphony menu bg exactly). */}
      <div className="dark" style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, background: 'var(--vds-canvas)', borderBottom: '1px solid var(--vds-line)' }}>
        <button type="button" onClick={goHome} title="Symphony home" aria-label="Symphony home"
          /* paddingLeft 11px centers the 26px mark on x=24 — the same axis as the
             Symphony left-nav icons (SYM_PAD 8 + SYM_GUTTER 32 / 2). */
          /* paddingLeft 19 centers the 26px mark on x=32 — the Symphony nav icon column (Figma 48:6476). */
          style={{ display: 'flex', alignItems: 'center', paddingLeft: 19, paddingRight: 'var(--vds-space-3)', border: 0, background: 'transparent', cursor: 'pointer', color: C.white }}>
          <VipreMark width={26} style={{ display: 'block' }} />
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
