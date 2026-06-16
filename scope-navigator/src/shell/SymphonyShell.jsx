import { useState, useRef, useEffect } from 'react'
import {
  Mail, Send, Laptop, GraduationCap, Database, ScrollText, Radar, Settings,
  FileText, ShieldCheck, Monitor, Bell, UserCog, User, ArrowUpRight,
  ChevronDown, ChevronLeft, Check, PanelLeftClose, PanelLeftOpen,
  LayoutDashboard, Plus, Moon, Sun, Building2, Network, Briefcase, Boxes,
} from 'lucide-react'
import { ScopeProvider, useScope } from '../ScopeContext'
import { ScopeNavigator } from '../vds/components/index.js'
import { VipreMark } from '../config'
import { mockData } from '../data'
import { ProvisioningModal, SuccessToast } from '../ProvisioningModal'
import CustomerManagementPageB from '../CustomerManagementPageB'
import { PORTALS } from './portalData.js'
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
  tile: 'var(--vds-midnight-700)',       // product icon tile — tonal lift off the 950 bar
  white: 'var(--vds-white)',
  ink: 'var(--vds-graphite-300)',          // light text on navy
  inkDim: 'var(--vds-graphite-400)',
  selected: 'var(--vds-azure-500)',  // active pill — vivid DS blue that pops on the navy
  onSelected: 'var(--vds-white)',    // white reads on azure-500 in both themes (fixed ramp)
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
const SYM_W_EXPANDED = 176

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
  { id: 'sat', label: 'SAT', icon: GraduationCap, locked: true },
  { id: 'archive', label: 'Archive', icon: Database, locked: true },
]
const FOOTER = [
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'admins', label: 'Admins', icon: UserCog },
  { id: 'profile', label: 'Profile', icon: User },
]
const FIRST_SYM_ITEM = Object.fromEntries(PRODUCTS.filter((p) => p.items?.length).map((p) => [p.id, p.items[0].id]))

/* ---- Shared Symphony row (dark) ---- */
function Row({ gutter, icon, label, labelSize = 12, labelWeight = 500, ink, selected, collapsed, onClick, ariaCurrent, title, nameHover, height = 30 }) {
  const Tag = onClick ? 'button' : 'div'
  const cls = onClick ? ['obrow', nameHover && 'obrow--name'].filter(Boolean).join(' ') : undefined
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={cls} aria-current={ariaCurrent} title={title}
      style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: `1px ${SYM_PAD}px`, border: 0, background: 'transparent', textAlign: 'left', fontFamily: 'inherit',
        cursor: onClick ? 'pointer' : 'default', color: selected ? C.onSelected : ink,
      }}
    >
      <span className="obrow-pill" style={{
        display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', height, borderRadius: 6,
        paddingRight: collapsed ? 0 : 10,
        transition: `padding 220ms ${OB_EASE}, background-color 120ms ease`,
        ...(selected ? { background: C.selected } : {}),
      }}>
        <span style={{ width: gutter, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        <span className="obrow-label" style={{
          maxWidth: collapsed ? 0 : 160, marginLeft: collapsed ? 0 : 8, opacity: collapsed ? 0 : 1, minWidth: 0,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: labelSize, fontWeight: labelWeight,
          transition: `max-width 220ms ${OB_EASE}, margin-left 220ms ${OB_EASE}, opacity 150ms ease`,
        }}>{label}</span>
      </span>
    </Tag>
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

/* ====================== Symphony menu (dark) ====================== */
function SymphonyMenu({ collapsed, page, onSelectItem, onOpenWorkspace, onToggleCollapse, dark, onToggleDark, onAddCustomer }) {
  return (
    <nav style={{
      width: collapsed ? SYM_W_COLLAPSED : SYM_W_EXPANDED, flexShrink: 0, background: C.menu,
      borderRight: `1px solid ${C.menuBorder}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      fontFamily: 'var(--vds-font-sans)', transition: `width 220ms ${OB_EASE}`,
    }}>
      <div className="ob-scroll-dark" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        <Row gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label="Customers"
          selected={page === 'customers'} ariaCurrent={page === 'customers' ? 'page' : undefined}
          onClick={() => onSelectItem('customers')} icon={<Building2 size={16} />} />
        {PRODUCTS.map((p) => {
          const Glyph = p.icon
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
              <Row
                gutter={SYM_GUTTER} height={40} ink={C.white} labelSize={14} labelWeight={500} collapsed={collapsed} label={p.label}
                onClick={p.locked ? undefined : () => onOpenWorkspace(p.id)} nameHover
                title={p.locked ? undefined : `Open ${p.label} workspace`}
                icon={<span style={{ width: 32, height: 32, borderRadius: 8, background: C.tile, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Glyph size={18} style={{ color: C.white }} /></span>}
              />
              {!p.locked && p.items.map((it) => {
                const Icon = it.icon
                return (
                  <Row key={it.id} gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label={it.label}
                    selected={page === it.id} ariaCurrent={page === it.id ? 'page' : undefined}
                    onClick={() => onSelectItem(it.id)} icon={<Icon size={16} />} />
                )
              })}
              {!p.locked && (
                <Row gutter={SYM_GUTTER} ink={C.inkDim} collapsed={collapsed} label="Open Workspace"
                  onClick={() => onOpenWorkspace(p.id)} icon={<ArrowUpRight size={16} />} />
              )}
            </div>
          )
        })}
      </div>
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 0' }}>
          <Row gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label="Add Customer" onClick={onAddCustomer} icon={<Plus size={16} />} />
          {FOOTER.map((f) => {
            const Icon = f.icon
            return <Row key={f.id} gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label={f.label} icon={<Icon size={16} />} />
          })}
          <Row gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label={dark ? 'Light mode' : 'Dark mode'}
            onClick={onToggleDark} icon={dark ? <Sun size={16} /> : <Moon size={16} />} />
        </div>
        <Row gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label="Collapse" onClick={onToggleCollapse}
          icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} />
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
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.label
  for (const key in PORTALS) for (const s of PORTALS[key].sections) for (const it of s.items) if (it.id === id) return it.label
  return 'Overview'
}
function iconOf(id) {
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
          style={{ display: 'flex', alignItems: 'center', paddingLeft: 11, paddingRight: 'var(--vds-space-3)', border: 0, background: 'transparent', cursor: 'pointer', color: C.white }}>
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
