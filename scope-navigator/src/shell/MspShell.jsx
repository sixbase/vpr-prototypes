import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  Mail, Send, Laptop, GraduationCap, Database, ScrollText, Radar, Settings,
  FileText, ShieldCheck, Monitor, Bell, UserCog, User, ArrowUpRight,
  PanelLeftClose, PanelLeftOpen, LayoutDashboard, Moon, Sun,
  Building2, Boxes, ChevronLeft, ChevronDown, Check,
} from '@icons'
import { ScopeProvider, useScope } from '../ScopeContext'
import { ScopeTree } from '../vds/components/index.js'
import { DistributorIcon, ResellerIcon, CustomerIcon } from '../entityIcons.jsx'
import distributorTile from '../assets/entity/distributor.svg'
import resellerTile from '../assets/entity/reseller.svg'
import customerTile from '../assets/entity/customer.svg'
import { useBrand, brandStyleVars, BrandLogo, BrandPicker } from './branding.jsx'
import { mockData } from '../data'
import { ProvisioningModal, SuccessToast } from '../ProvisioningModal'
import CustomerManagementPageB from '../CustomerManagementPageB'
import { PORTALS } from './portalData.js'
import lockBadge from './assets/lock-badge.svg'
import { PRODUCT_GLYPHS } from './productGlyphs.js'
import { ProductTile, OverviewTile, CustomersTile } from './ProductTile.jsx'
import './shell.css'

/* ============================================================================
   MSP SHELL  (Figma 73:310)
   The scope navigator lives in the LEFT NAV as a vertical breadcrumb (ScopeTree)
   instead of a horizontal bar in the top chrome. One persistent nav — PARTNERS
   (the scope trail) + PRODUCTS (accordions) + OTHER — stays put across every page,
   so scope is always-visible global context. The top chrome is just the VIPRE
   logo strip; the current scope name renders in the content header.

   Coexists with SymphonyShell (?view=shell). Reached at ?view=msp (or /msp).
   ========================================================================== */

// Navy chrome = fixed midnight ramp (same in light/dark); content surfaces = semantic.
const C = {
  topbar: 'var(--vds-midnight-950)',
  menu: 'var(--vds-midnight-950)',
  menuBorder: 'var(--vds-midnight-1000)',
  white: 'var(--vds-white)',
  ink: 'var(--vds-midnight-200)',
  inkDim: 'var(--vds-midnight-300)',
  icon: 'var(--vds-midnight-400)',
  selected: 'var(--nav-accent)',     // follows the reseller brand (default = cobalt #0068cb)
  onSelected: 'var(--vds-white)',
  content: 'var(--shell-canvas)',
  card: 'var(--vds-surface)',
  line: 'var(--vds-line)',
  // Full-portal (focus mode) — a LIGHT product nav that flips with the theme.
  portalBg: 'var(--vds-surface)',
  portalInk: 'var(--vds-ink-muted)',
  portalEyebrow: 'var(--vds-ink-subtle)',
}

const NAV_PAD_X = 16
const SYM_W_COLLAPSED = 80
const SYM_W_EXPANDED = 242
const OB_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const PRODUCT_CARD = { background: 'var(--vds-midnight-1000)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }
// Full-portal nav widths (match the original Symphony workspace nav).
const POR_PAD = 32
const POR_W_COLLAPSED = 80
const POR_W_EXPANDED = 200

// How ScopeTree renders each tenancy type (mirrors the main app + the mock data types).
const SCOPE_TYPE_CONFIG = {
  distributor: { label: 'Distributor', icon: DistributorIcon, tile: distributorTile, tone: 'azure' },
  partner: { label: 'Reseller', icon: ResellerIcon, tile: resellerTile, tone: 'rose' },
  customer: { label: 'Customer', icon: CustomerIcon, tile: customerTile, tone: 'emerald' },
}

/* ---- Data (same product taxonomy as SymphonyShell) ---- */
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
  { id: 'sat', label: 'SAT', icon: GraduationCap, glyph: PRODUCT_GLYPHS.sat, items: [
    { id: 'sat-campaigns', label: 'Campaigns', icon: Send },
    { id: 'sat-courses', label: 'Courses', icon: GraduationCap },
    { id: 'sat-reports', label: 'Reports', icon: FileText },
  ] },
  { id: 'archive', label: 'Archive', icon: Database, glyph: PRODUCT_GLYPHS.archive, items: [
    { id: 'arch-search', label: 'Message Search', icon: ScrollText },
    { id: 'arch-retention', label: 'Retention', icon: ShieldCheck },
    { id: 'arch-exports', label: 'Exports', icon: FileText },
  ] },
]
const FOOTER = [
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'admins', label: 'Admins', icon: UserCog },
  { id: 'profile', label: 'Profile', icon: User },
]
const PRODUCTS_OVERVIEW = { id: 'products-overview', label: 'Overview', icon: Boxes, Tile: OverviewTile }

// ---- Faked per-customer subscriptions ----
// We don't have real entitlement data, so the Symphony nav's PRODUCTS section is
// driven by a deterministic hash of the scoped entity → one of these profiles. Each
// profile is the SET of products that customer subscribes to; everything else renders
// locked. Scoping into different customers therefore flips the nav between states.
const SUB_PROFILES = [
  ['ies', 'safesend', 'edr'],                      // Core security (the default)
  ['ies', 'safesend'],                             // Email only
  ['edr', 'sat'],                                  // Endpoint + training
  ['ies', 'safesend', 'edr', 'sat', 'archive'],    // Full suite
  ['safesend', 'sat', 'archive'],                  // Compliance-led
  ['ies'],                                         // Starter
  ['ies', 'edr', 'archive'],                       // Endpoint + archiving
]
function subscriptionFor(scopeKey) {
  if (!scopeKey || scopeKey === 'root') return new Set(SUB_PROFILES[0])
  let h = 0
  for (let i = 0; i < scopeKey.length; i++) h = (h * 31 + scopeKey.charCodeAt(i)) >>> 0
  return new Set(SUB_PROFILES[h % SUB_PROFILES.length])
}
// Which product owns a given sub-page id (null if it's not a product page).
function productOfPage(id) {
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return p.id
  return null
}

/* ---- nav rows (dark) ---- */
function MenuItem({ icon, label, labelSize = 12, labelWeight = 500, color, iconColor = C.icon, fp, selected, onClick, collapsed, centerCollapsed, ariaCurrent, title }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      aria-current={ariaCurrent} title={title}
      className={['ob-mrow', selected && 'ob-mrow--sel'].filter(Boolean).join(' ')}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', borderRadius: 5, border: 0,
        padding: centerCollapsed && collapsed ? '8px 16px' : '8px 12px 8px 8px',
        background: selected ? C.selected : undefined,
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left', transition: `background-color 120ms ease, padding 220ms ${OB_EASE}`,
      }}
    >
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
  return <p style={{ margin: 0, fontSize: 10, fontWeight: 400, letterSpacing: '1px', color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}>{children}</p>
}

function MenuDivider() {
  return <div style={{ height: 2, width: '100%', background: 'var(--vds-midnight-1000)', flexShrink: 0 }} />
}

// Shimmer placeholder card shown while a scoped customer's subscriptions "load".
function ProductSkeleton({ collapsed, labelWidth = 80 }) {
  return (
    <div style={PRODUCT_CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
        <span className="nav-skel" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
        {!collapsed && <span className="nav-skel" style={{ height: 12, borderRadius: 4, flex: 1, maxWidth: labelWidth }} />}
      </div>
    </div>
  )
}

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
        <span className="ob-chevc" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 12, flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'block', transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 150ms ease' }}>
            <path d="M8 14L12 10L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </Tag>
  )
}

/* ====================== The persistent left nav (dark) ====================== */
function ShellNav({
  collapsed, page, openIds, onToggleProduct, onSelectItem, onOpenPortal, onToggleCollapse, dark, onToggleDark,
  path, onNavigate, onSelectRoot, subscribed, loading,
}) {
  const px = NAV_PAD_X
  // Subscribed products keep their order at the top; unsubscribed sink to the bottom
  // (rendered locked, like SAT/Archive in the original nav). The key replays the
  // re-enter animation only when the resulting set/order actually changes.
  const orderedProducts = [
    ...PRODUCTS.filter((p) => subscribed.has(p.id)),
    ...PRODUCTS.filter((p) => !subscribed.has(p.id)),
  ]
  const subKey = orderedProducts.map((p) => p.id + (subscribed.has(p.id) ? '1' : '0')).join('|')
  return (
    <nav style={{
      width: collapsed ? SYM_W_COLLAPSED : SYM_W_EXPANDED, flexShrink: 0, background: C.menu,
      borderRight: `1px solid ${C.menuBorder}`, display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--vds-font-sans)', transition: `width 220ms ${OB_EASE}`,
    }}>
      <div className="ob-scroll-dark" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* PARTNERS — the scope navigator as a vertical breadcrumb */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `16px ${px}px` }}>
          <Eyebrow collapsed={collapsed}>PARTNERS</Eyebrow>
          <ScopeTree
            path={path}
            onNavigate={onNavigate}
            rootItems={mockData}
            rootLabel="Customers"
            rootTileNode={<CustomersTile className="stree-tile" />}
            rootSelected={page === 'customers'}
            onSelectRoot={onSelectRoot}
            collapsed={collapsed}
            typeConfig={SCOPE_TYPE_CONFIG}
          />
        </div>

        <MenuDivider />

        {/* PRODUCTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
          <Eyebrow collapsed={collapsed}>PRODUCTS</Eyebrow>
          <ProductHeader product={PRODUCTS_OVERVIEW} collapsed={collapsed} bare
            selected={page === PRODUCTS_OVERVIEW.id}
            onOpen={() => onSelectItem(PRODUCTS_OVERVIEW.id)} />
          {loading ? (
            <div key="skel" className="nav-products-anim" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[80, 96, 64, 84, 72].map((w, i) => (
                <ProductSkeleton key={i} collapsed={collapsed} labelWidth={w} />
              ))}
            </div>
          ) : (
          <div key={subKey} className="nav-products-anim" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orderedProducts.map((p) => {
              // Subscription is faked off the scoped entity — locked = not in the set.
              const locked = !subscribed.has(p.id)
              const prod = { ...p, locked }
              if (locked) {
                return (
                  <div key={p.id} style={PRODUCT_CARD}>
                    <ProductHeader product={prod} collapsed={collapsed} />
                  </div>
                )
              }
              const open = openIds[p.id] ?? true
              return (
                <div key={p.id} style={{ ...PRODUCT_CARD, gap: 0 }}>
                  <ProductHeader product={prod} collapsed={collapsed} open={open}
                    onToggle={() => onToggleProduct(p.id)} />
                  <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 220ms ${OB_EASE}` }}>
                    <div style={{ overflow: 'hidden', minHeight: 0 }} aria-hidden={!open}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8, opacity: open ? 1 : 0, transition: 'opacity 180ms ease' }}>
                        {p.items.map((it) => (
                          <MenuItem key={it.id} collapsed={collapsed} icon={<it.icon size={16} />} label={it.label} labelSize={13} color={C.ink}
                            selected={page === it.id} ariaCurrent={page === it.id ? 'page' : undefined} onClick={() => onSelectItem(it.id)} />
                        ))}
                        <MenuItem collapsed={collapsed} icon={<ArrowUpRight size={16} />} label="Full Portal" labelSize={11} labelWeight={400} color={C.inkDim} fp
                          onClick={() => onOpenPortal(p.id)} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      </div>

      {/* pinned bottom: OTHER + dark-mode toggle + collapse */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <MenuDivider />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: `16px ${px}px` }}>
          <Eyebrow collapsed={collapsed}>OTHER</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FOOTER.map((f) => (
              <MenuItem key={f.id} collapsed={collapsed} centerCollapsed icon={<f.icon size={16} />} label={f.label} color={C.ink}
                selected={page === f.id} onClick={() => onSelectItem(f.id)} />
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

/* ---- content header actions ---- */
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

// Figma 73:1272-1277: borderless white cards on the grey body.
const cardStyle = { flex: 1, minWidth: 0, background: C.card, borderRadius: 8 }
function ContentCard({ page }) {
  const PageIcon = iconOf(page)
  const title = labelOf(page)
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
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

function labelOf(id) {
  if (id === 'customers') return 'Customers'
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.label
  for (const key in PORTALS) for (const s of PORTALS[key].sections) for (const it of s.items) if (it.id === id) return it.label
  for (const f of FOOTER) if (f.id === id) return f.label
  return 'Overview'
}
function iconOf(id) {
  if (id === 'customers') return Building2
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.icon
  for (const key in PORTALS) for (const s of PORTALS[key].sections) for (const it of s.items) if (it.id === id) return it.icon
  for (const f of FOOTER) if (f.id === id) return f.icon
  return LayoutDashboard
}

// Resolve the current scope into the bits the entity bar renders.
function toScope(path) {
  const leaf = path.at(-1)
  const cfg = leaf ? SCOPE_TYPE_CONFIG[leaf.type] : null
  return {
    key: leaf ? leaf.id : 'root',
    name: leaf ? leaf.name : 'All Customers',
    tile: cfg ? cfg.tile : null,
    icon: cfg ? cfg.icon : Boxes,
    depth: path.length,
  }
}

// One chip + name unit, absolutely filling the stage so two can crossfade in place.
// The chip is the Figma gradient tile (node 78:531); root falls back to a neutral glyph.
function EntityBlock({ scope, chipRef }) {
  const Glyph = scope.icon
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 8, willChange: 'transform, opacity' }}>
      {scope.tile ? (
        <img ref={chipRef} src={scope.tile} alt="" style={{ width: 24, height: 24, display: 'block', flexShrink: 0 }} />
      ) : (
        <span ref={chipRef} style={{ width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--vds-ink) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--vds-ink-muted)' }}>
          <Glyph size={15} />
        </span>
      )}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--vds-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scope.name}</span>
    </div>
  )
}

const SCOPE_SLIDE_MS = 290
const SCOPE_SLIDE_D = 10

/* The entity bar — the current-scope context header (Figma 73:506). A WHITE surface
   with the rounded top-left corner; the grey body carries the inset top shadow.
   The scope name transitions with a DIRECTIONAL slide: drilling deeper, the new name
   rises in from below; going up the tree, it drops in from above; a sibling switch is
   a pure crossfade (no depth change). The type chip gives a small scale-pop on any
   level change. Honors prefers-reduced-motion. */
function ScopeHeader({ path }) {
  const scope = toScope(path)
  const prevRef = useRef(scope)
  const [trans, setTrans] = useState(null) // { from, dir } during a transition
  const inRef = useRef(null)
  const outRef = useRef(null)
  const chipRef = useRef(null)

  // Detect a scope change and stage the transition (from = the previous scope).
  useLayoutEffect(() => {
    const prev = prevRef.current
    if (prev.key === scope.key) return
    const dir = scope.depth > prev.depth ? 'deeper' : scope.depth < prev.depth ? 'up' : 'fade'
    prevRef.current = scope
    setTrans({ from: prev, dir })
  }, [scope.key, scope.depth])

  // Run the slide once the transition layers are in the DOM.
  useLayoutEffect(() => {
    if (!trans) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setTrans(null); return }
    const sgn = trans.dir === 'deeper' ? 1 : trans.dir === 'up' ? -1 : 0
    const easeOut = 'cubic-bezier(0.4, 0, 0.2, 1)'
    const easeSpring = 'cubic-bezier(0.22, 1, 0.36, 1)'
    outRef.current?.animate(
      [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-sgn * SCOPE_SLIDE_D}px)`, opacity: 0 }],
      { duration: SCOPE_SLIDE_MS, easing: easeOut, fill: 'forwards' },
    )
    inRef.current?.animate(
      [{ transform: `translateY(${sgn * SCOPE_SLIDE_D}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: SCOPE_SLIDE_MS, easing: easeSpring, fill: 'forwards' },
    )
    if (trans.dir !== 'fade') {
      chipRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
        { duration: SCOPE_SLIDE_MS + 70, easing: 'ease-out' },
      )
    }
    const t = setTimeout(() => setTrans(null), SCOPE_SLIDE_MS + 40)
    return () => clearTimeout(t)
  }, [trans])

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: 32, flexShrink: 0, background: 'var(--vds-surface)', borderRadius: '32px 0 0 0' }}>
      <div style={{ position: 'relative', height: 24, flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {trans && <div ref={outRef} style={{ position: 'absolute', inset: 0 }}><EntityBlock scope={trans.from} /></div>}
        <div ref={inRef} style={{ position: 'absolute', inset: 0 }}><EntityBlock scope={scope} chipRef={chipRef} /></div>
      </div>
    </div>
  )
}

/* ============================ Full portal (focus mode) ============================ */
// A product's portal def. Products without a PORTALS entry fall back to a single
// section built from their nav items so "Full Portal" still opens something.
function portalDef(pid) {
  if (PORTALS[pid]) return PORTALS[pid]
  const p = PRODUCTS.find((x) => x.id === pid)
  return { label: p?.label || 'Portal', defaultPage: p?.items?.[0]?.id, sections: [{ label: 'Pages', items: p?.items || [] }] }
}

/* One light portal-nav row. */
function PortalRow({ icon, label, labelSize = 12, labelWeight = 500, selected, collapsed, onClick, ariaLabel }) {
  const pillPad = 8
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
        <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{
          maxWidth: collapsed ? 0 : 150, marginLeft: collapsed ? 0 : 8, opacity: collapsed ? 0 : 1, minWidth: 0,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: labelSize, fontWeight: labelWeight,
          transition: `max-width 220ms ${OB_EASE}, margin-left 220ms ${OB_EASE}, opacity 150ms ease`,
        }}>{label}</span>
      </span>
    </Tag>
  )
}

/* The full-portal left nav (light): exit-to-shell, a WORKING-IN customer banner (the
   reference point), a product switcher, and the product's deep sections. */
function WorkspaceNav({ product, page, collapsed, scope, products, onExit, onSelectPage, onSwitchProduct, onToggleCollapse, dark, onToggleDark, style }) {
  const def = portalDef(product)
  const ProductGlyph = (PRODUCTS.find((p) => p.id === product) || {}).icon || Laptop
  const [switcherOpen, setSwitcherOpen] = useState(false)
  return (
    <div style={{
      width: collapsed ? POR_W_COLLAPSED : POR_W_EXPANDED, flexShrink: 0, background: C.portalBg,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'visible',
      transition: `width 220ms ${OB_EASE}`, ...style,
    }}>
      <div className="ob-scroll-light" style={{ padding: '12px 0 8px', overflowY: 'auto', overflowX: 'visible', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PortalRow collapsed={collapsed} label="Exit portal" labelWeight={500}
          onClick={onExit} ariaLabel="Exit portal" icon={<ChevronLeft size={16} />} />

        {/* WORKING IN — the customer reference point, always visible in the portal */}
        {!collapsed && (
          <div style={{ padding: `0 ${POR_PAD - 8}px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, background: 'color-mix(in srgb, var(--vds-ink) 5%, transparent)', border: `1px solid ${C.line}` }}>
              {scope.tile ? <img src={scope.tile} alt="" style={{ width: 28, height: 28, display: 'block', flexShrink: 0 }} />
                : <span style={{ width: 28, height: 28, borderRadius: 6, background: 'color-mix(in srgb, var(--vds-ink) 10%, transparent)', flexShrink: 0 }} />}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.portalEyebrow, lineHeight: 1.5 }}>Working in</span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--vds-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scope.name}</span>
              </span>
            </div>
          </div>
        )}

        {/* product switcher */}
        <div style={{ position: 'relative' }}>
          <button type="button" className="obrow obrow--light ob-switcher" onClick={() => setSwitcherOpen((o) => !o)}
            aria-label="Switch product" aria-expanded={switcherOpen}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', minHeight: 24, textAlign: 'left',
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
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 17, zIndex: 31, minWidth: 174, background: C.portalBg, borderRadius: 10, border: `1px solid ${C.line}`, boxShadow: 'var(--vds-shadow-lg)', padding: 5 }}>
                {products.map((p) => {
                  const G = p.icon
                  const cur = p.id === product
                  return (
                    <button key={p.id} type="button" onClick={() => { setSwitcherOpen(false); if (!cur) onSwitchProduct(p.id) }}
                      className="ob-switch-item"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 0, borderRadius: 6, background: cur ? 'color-mix(in srgb, var(--nav-accent) 12%, transparent)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: cur ? 'var(--vds-ink)' : C.portalInk, textAlign: 'left' }}>
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
            <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: C.portalEyebrow, overflow: 'hidden', whiteSpace: 'nowrap', paddingLeft: POR_PAD, marginBottom: 8, opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}>{sec.label}</div>
            {sec.items.map((it) => {
              const ItemIcon = it.icon
              return (
                <PortalRow key={it.id} collapsed={collapsed} label={it.label}
                  selected={page === it.id} onClick={() => onSelectPage(it.id)} icon={<ItemIcon size={16} />} />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, padding: '8px 0 24px' }}>
        <PortalRow collapsed={collapsed} label={dark ? 'Light mode' : 'Dark mode'}
          onClick={onToggleDark} icon={dark ? <Sun size={16} /> : <Moon size={16} />} />
        <PortalRow collapsed={collapsed} label="" onClick={onToggleCollapse} ariaLabel={collapsed ? 'Expand menu' : 'Collapse menu'}
          icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} />
      </div>
    </div>
  )
}

/* The focus-mode portal: the product's deep nav + content, scoped to the current
   customer (shown in the nav banner AND the content reference header). */
function PortalView({ product, page, collapsed, scope, products, onExit, onSelectPage, onSwitchProduct, onToggleCollapse, dark, onToggleDark }) {
  const def = portalDef(product)
  const ProductGlyph = (PRODUCTS.find((p) => p.id === product) || {}).icon || Laptop
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', background: C.topbar, padding: 8 }}>
      <WorkspaceNav
        product={product} page={page} collapsed={collapsed} scope={scope} products={products}
        onExit={onExit} onSelectPage={onSelectPage} onSwitchProduct={onSwitchProduct}
        onToggleCollapse={onToggleCollapse} dark={dark} onToggleDark={onToggleDark}
        style={{ borderRadius: '16px 0 0 16px' }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.content, borderRadius: '0 16px 16px 0', overflow: 'hidden' }}>
        {/* customer + product reference header — the "which customer am I working for" cue */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 32px', flexShrink: 0, background: 'var(--vds-surface)', borderBottom: `1px solid ${C.line}` }}>
          {scope.tile ? <img src={scope.tile} alt="" style={{ width: 24, height: 24, display: 'block', flexShrink: 0 }} />
            : <span style={{ width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--vds-ink) 10%, transparent)', flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vds-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scope.name}</span>
          <span style={{ color: C.portalEyebrow, fontSize: 14 }}>›</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.portalInk, flexShrink: 0 }}>
            <ProductGlyph size={15} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{def.label} Full Portal</span>
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <ContentCard page={page} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} />
        </div>
      </div>
    </div>
  )
}

function ShellInner() {
  const { path, navigate } = useScope()

  const [brand, setBrand] = useBrand()
  const [dark, setDark] = useState(false)
  const [provModal, setProvModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [page, setPage] = useState('customers')
  const [openProducts, setOpenProducts] = useState(() => Object.fromEntries(PRODUCTS.map((p) => [p.id, true])))

  // The scoped entity drives the faked product subscriptions shown in the nav.
  const leafId = path.at(-1)?.id ?? 'root'
  const subscribed = subscriptionFor(leafId)

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  // If scoping into a customer that doesn't subscribe to the product you're viewing,
  // fall back to that customer's dashboard so you never sit on a locked product.
  useEffect(() => {
    const owner = productOfPage(page)
    if (owner && !subscriptionFor(leafId).has(owner)) setPage('customers')
  }, [leafId, page])

  // Simulated "loading this customer's subscriptions": on a scope change, show the nav
  // skeleton briefly so the menu change reads as a fetch (not an instant swap).
  const [navLoading, setNavLoading] = useState(false)
  const navFirst = useRef(true)
  const navTimer = useRef(0)
  useEffect(() => {
    if (navFirst.current) { navFirst.current = false; return }
    setNavLoading(true)
    clearTimeout(navTimer.current)
    navTimer.current = setTimeout(() => setNavLoading(false), 700)
    return () => clearTimeout(navTimer.current)
  }, [leafId])

  // Full portal (focus mode): which product's deep portal is open, scoped to the
  // current customer. null = the normal MSP shell.
  const [openPortal, setOpenPortal] = useState(null)
  const [portalPage, setPortalPage] = useState(null)
  const [portalCollapsed, setPortalCollapsed] = useState(false)
  const openPortalFor = (pid) => { setOpenPortal(pid); setPortalPage(portalDef(pid).defaultPage) }
  const scope = toScope(path)
  const portalProducts = PRODUCTS.filter((p) => subscribed.has(p.id))

  const openModal = (type, contextEntity = null, availableTypes = null) => setProvModal({ type, contextEntity, availableTypes })

  return (
    <div className="shell-root" style={{ ...brandStyleVars(brand), height: '100vh', display: 'flex', flexDirection: 'column', background: C.topbar, overflow: 'hidden', fontFamily: 'var(--vds-font-sans)' }}>
      {/* Top chrome: the brand logo strip + reseller theme switcher — the scope navigator lives in the nav. */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, height: 48, background: 'var(--vds-canvas)', borderBottom: '1px solid var(--vds-midnight-1000)' }} className="dark">
        <span style={{ display: 'flex', alignItems: 'center', paddingLeft: 19, color: C.white }}>
          <BrandLogo brand={brand} />
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 16 }}>
          <BrandPicker brand={brand} onPick={setBrand} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: C.topbar }}>
        {openPortal ? (
          <PortalView
            product={openPortal} page={portalPage} collapsed={portalCollapsed}
            scope={scope} products={portalProducts}
            onExit={() => setOpenPortal(null)}
            onSelectPage={setPortalPage}
            onSwitchProduct={openPortalFor}
            onToggleCollapse={() => setPortalCollapsed((c) => !c)}
            dark={dark} onToggleDark={() => setDark((d) => !d)}
          />
        ) : (
        <>
        <ShellNav
          collapsed={collapsed} page={page} openIds={openProducts}
          onToggleProduct={(id) => setOpenProducts((o) => ({ ...o, [id]: !o[id] }))}
          onSelectItem={setPage}
          onOpenPortal={openPortalFor}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          dark={dark} onToggleDark={() => setDark((d) => !d)}
          path={path} onNavigate={navigate}
          onSelectRoot={() => setPage('customers')}
          subscribed={subscribed} loading={navLoading}
        />

        {/* content column (Figma 73:1278): an 8px navy frame, the white entity bar with
            the rounded top-left corner, then the grey body carrying the inset top shadow. */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', background: 'var(--vds-midnight-1000)', paddingLeft: 8, paddingTop: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <ScopeHeader path={path} />
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', background: C.content }}>
              {page === 'customers' ? (
                <div className="shell-customers" style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--vds-ink) 7%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={18} style={{ color: 'var(--vds-ink-muted)' }} />
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--vds-ink)' }}>Customers</span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 -24px -20px' }}>
                    <CustomerManagementPageB openModal={openModal} showFuture={false} />
                  </div>
                </div>
              ) : (
                <ContentCard page={page} />
              )}
              {/* subtle inner shadow just below the entity bar (Figma 73:1251). */}
              <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} />
            </div>
          </div>
        </div>
        </>
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

export default function MspShell() {
  return (
    <ScopeProvider>
      <ShellInner />
    </ScopeProvider>
  )
}
