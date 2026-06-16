import { useState, useRef } from 'react'
import {
  Mail, Send, Laptop, GraduationCap, Database, ScrollText, Radar, Settings,
  FileText, ShieldCheck, Monitor, Bell, UserCog, User, ArrowUpRight,
  ChevronDown, ChevronRight, ChevronLeft, Check, PanelLeftClose, PanelLeftOpen, Boxes, Building2,
  LayoutDashboard,
} from 'lucide-react'
import { PORTALS } from './portalData.js'

/* ============================================================================
   OPTION C — focus mode. Same building blocks as Option B, but the Symphony menu
   HIDES once you open a product workspace. Return via the VIPRE mark (home); hop
   between products via the workspace header's switcher dropdown. The customer
   scope bar persists, so global context is never lost.
   Self-contained so Builds A/B are untouched.
   ========================================================================== */

const C = {
  topbar: '#0a192c', menu: '#0a192c', menuBorder: '#08121e',
  tile: 'rgba(255,255,255,0.24)', ink: '#ced0d2', inkDim: 'rgba(206,208,210,0.72)',
  selected: '#0068cb', portalBg: '#ffffff', portalInk: 'rgba(11,25,45,0.62)',
  portalEyebrow: 'rgba(11,25,45,0.5)', content: '#eeeeee',
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
const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)' // smooth decelerate (easeOutQuint-ish settle)
const SLIDE_OFFSET = 10 // px the incoming view glides as it fades in (just a whisper of direction)

// Inert handler bag for the outgoing (snapshot) layer during a slide.
const NOOP_H = { onSelectSymphony() {}, onOpenWorkspace() {}, onToggleSym() {}, onSelectPortal() {}, onTogglePortal() {}, onSwitchProduct() {} }

/* Position one of the two transition layers. Deliberately quiet: the incoming view
   fades in over a short directional glide (forward → from the right, back → from the
   left) while the outgoing view simply holds still beneath it, fully covering — so
   there's no whoosh and no background bleed, just the new view settling into place. */
function layerStyle(role, slide) {
  if (!slide) return { position: 'absolute', inset: 0, opacity: 1, transition: 'none' } // at rest: one fully-opaque layer (snap, never caught mid-fade)
  const { dir, running } = slide
  if (role === 'leaving') {
    // hold still beneath, opaque, until the incoming has fully faded over it
    return { position: 'absolute', inset: 0, zIndex: 1 }
  }
  const from = dir === 'forward' ? SLIDE_OFFSET : dir === 'back' ? -SLIDE_OFFSET : 0 // 'fade' = pure dissolve
  return {
    position: 'absolute', inset: 0, zIndex: 2, willChange: 'transform, opacity',
    transform: `translate3d(${running ? 0 : from}px, 0, 0)`,
    opacity: running ? 1 : 0,
    transition: running ? `transform ${SLIDE_MS}ms ${SLIDE_EASE}, opacity ${SLIDE_MS}ms ${SLIDE_EASE}` : 'none',
  }
}

function VipreMark({ size = 24 }) {
  return (
    <svg viewBox="0 0 47 40" width={size} height={(size * 40) / 47} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.4474 10.6562C13.149 9.44293 14.283 9.44293 14.9845 10.6562L26.6408 30.8076C27.3424 32.0209 27.3424 34.0259 26.6408 35.2393L24.4826 39.0898C23.781 40.3031 22.648 40.3031 21.9465 39.0898L10.2892 18.9385C9.58766 17.7252 9.58766 15.7202 10.2892 14.4541L12.4474 10.6562Z" fill="#fff" />
      <path d="M45.4758 0C46.9329 0 47.4723 1.0025 46.7707 2.21582L34.5744 22.209C33.8189 23.4222 32.0383 24.4246 30.5812 24.4248H26.1017C24.6447 24.4248 24.1044 23.4222 24.8058 22.209L37.0031 2.21582C37.7586 1.00258 39.5392 0.000127689 40.9963 0H45.4758Z" fill="#fff" />
      <path d="M25.2638 0.0527344C26.7209 0.0529233 28.5015 1.05535 29.257 2.26855L31.5773 6.06641C32.3329 7.27973 31.7393 8.28223 30.3361 8.28223H6.64471C5.18761 8.28223 3.40711 7.2797 2.65154 6.06641L0.330252 2.26855C-0.425245 1.05531 0.168497 0.0528588 1.57146 0.0527344H25.2638Z" fill="#fff" />
    </svg>
  )
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
const SCOPE = [
  { label: 'Pax8 Distribution', icon: Boxes, tile: 'rgba(147,119,214,0.32)', caret: true },
  { label: 'Northwind MSP', icon: Building2, tile: 'rgba(5,150,210,0.32)', caret: true },
  { label: 'Acme IT Partners', icon: Building2, tile: 'rgba(5,150,210,0.32)', caret: true },
  { label: 'Acme Corp', icon: Building2, customer: true },
]
const FIRST_SYM_ITEM = Object.fromEntries(PRODUCTS.filter((p) => p.items?.length).map((p) => [p.id, p.items[0].id]))

/* ---- Shared Symphony row (dark) ---- */
function Row({ gutter, icon, label, labelSize = 12, labelWeight = 400, ink, selected, collapsed, onClick, ariaCurrent, title, nameHover, height = 30 }) {
  const Tag = onClick ? 'button' : 'div'
  const cls = onClick ? ['obrow', nameHover && 'obrow--name'].filter(Boolean).join(' ') : undefined
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={cls} aria-current={ariaCurrent} title={title}
      style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: `1px ${SYM_PAD}px`, border: 0, background: 'transparent', textAlign: 'left', fontFamily: 'inherit',
        cursor: onClick ? 'pointer' : 'default', color: selected ? '#fff' : ink,
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
        cursor: onClick ? 'pointer' : 'default', color: selected ? '#fff' : C.portalInk,
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

/* ============================ Scope bar ============================ */
export function ScopeBar({ onHome }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: C.topbar, flexShrink: 0 }}>
      {onHome ? (
        <button type="button" onClick={onHome} className="ob-home" title="Back to Symphony"
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 48, padding: '0 14px 0 8px', border: 0, background: 'transparent', cursor: 'pointer' }}>
          <ChevronLeft size={16} style={{ color: 'rgba(147,164,185,0.9)' }} />
          <VipreMark size={22} />
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(233,236,239,0.92)', whiteSpace: 'nowrap' }}>Symphony</span>
        </button>
      ) : (
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <VipreMark size={24} />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: 8, minWidth: 0 }}>
        {SCOPE.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {i > 0 && <ChevronRight size={15} style={{ color: 'rgba(147,164,185,0.65)' }} />}
              <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 4, overflow: 'hidden', border: s.customer ? 'none' : '1px solid rgba(97,139,194,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px', background: s.customer ? '#01a094' : s.tile }}>
                  <Icon size={14} style={{ color: '#fff' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: s.customer ? '4px 8px 4px 6px' : '4px 6px', background: s.customer ? '#283546' : '#0b192d' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#fff', opacity: s.customer ? 1 : 0.8, whiteSpace: 'nowrap' }}>{s.label}</span>
                  {s.caret && <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ====================== Symphony menu (dark) ====================== */
function SymphonyMenu({ collapsed, page, onSelectItem, onOpenWorkspace, onToggleCollapse }) {
  return (
    <nav style={{
      width: collapsed ? SYM_W_COLLAPSED : SYM_W_EXPANDED, flexShrink: 0, background: C.menu,
      borderRight: `1px solid ${C.menuBorder}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      fontFamily: 'var(--vds-font-sans)', transition: `width 220ms ${OB_EASE}`,
    }}>
      <div className="ob-scroll-dark" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {PRODUCTS.map((p) => {
          const Glyph = p.icon
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
              <Row
                gutter={SYM_GUTTER} height={40} ink="#fff" labelSize={14} labelWeight={500} collapsed={collapsed} label={p.label}
                onClick={p.locked ? undefined : () => onOpenWorkspace(p.id)} nameHover
                title={p.locked ? undefined : `Open ${p.label} workspace`}
                icon={<span style={{ width: 32, height: 32, borderRadius: 8, background: C.tile, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Glyph size={18} style={{ color: '#fff' }} /></span>}
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
          {FOOTER.map((f) => {
            const Icon = f.icon
            return <Row key={f.id} gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label={f.label} icon={<Icon size={16} />} />
          })}
        </div>
        <Row gutter={SYM_GUTTER} ink={C.ink} collapsed={collapsed} label="Collapse" onClick={onToggleCollapse}
          icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} />
      </div>
    </nav>
  )
}

/* ============= Workspace nav (light) — header is a product switcher ============= */
export function WorkspaceNav({ product, page, collapsed, onToggleCollapse, onSelectPage, onSwitchProduct, style }) {
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
      <div className="ob-scroll-light" style={{ padding: '32px 0 8px', overflowY: 'auto', overflowX: 'visible', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* product switcher header */}
        <div style={{ position: 'relative' }}>
          <button type="button" className="obrow obrow--light" onClick={() => setSwitcherOpen((o) => !o)}
            aria-label="Switch product" aria-expanded={switcherOpen}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', minHeight: 24, textAlign: 'left',
              paddingLeft: (collapsed ? (POR_W_COLLAPSED - 24) / 2 : POR_PAD) - 6, paddingRight: collapsed ? 6 : 8,
              border: 0, background: 'transparent', cursor: 'pointer', color: C.portalInk, fontFamily: 'inherit',
              transition: `padding 220ms ${OB_EASE}`,
            }}>
            <span className="obrow-pill" style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 6, padding: '4px 6px' }}>
              <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ProductGlyph size={16} style={{ color: C.portalInk }} />
              </span>
              {!collapsed && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</span>}
              {!collapsed && <ChevronDown size={14} style={{ opacity: 0.55, flexShrink: 0, transform: switcherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />}
            </span>
          </button>
          {switcherOpen && (
            <>
              <div onClick={() => setSwitcherOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 17, zIndex: 31, minWidth: 174,
                background: '#fff', borderRadius: 10, border: '1px solid rgba(11,25,45,0.08)', boxShadow: '0 10px 28px rgba(11,25,45,0.18)', padding: 5,
              }}>
                {PRODUCTS.filter((p) => !p.locked).map((p) => {
                  const G = p.icon
                  const cur = p.id === product
                  return (
                    <button key={p.id} type="button" onClick={() => { setSwitcherOpen(false); if (!cur) onSwitchProduct(p.id) }}
                      className="ob-switch-item"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 0, borderRadius: 6,
                        background: cur ? 'rgba(0,104,203,0.08)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                        color: C.portalInk, textAlign: 'left',
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
      <div style={{ flexShrink: 0, padding: '8px 0 32px' }}>
        <PortalRow iconSize={16} collapsed={collapsed} label=""
          onClick={onToggleCollapse} ariaLabel={collapsed ? 'Expand menu' : 'Collapse menu'}
          icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} />
      </div>
    </div>
  )
}

/* ============= Content card (shared) ============= */
export function ContentCard({ page, style }) {
  const PageIcon = iconOf(page)
  const title = labelOf(page)
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(11,25,45,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PageIcon size={18} style={{ color: '#3a424f' }} />
        </span>
        <span style={{ fontSize: 18, fontWeight: 500, color: '#3a424f' }}>{title}</span>
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

const cardStyle = { flex: 1, minWidth: 0, background: '#fff', borderRadius: 8 }

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

/* One full-bleed "stage" — either the Symphony launcher (dark menu + content) or a
   product workspace (light nav + content). Rendered as a function of explicit params
   so a snapshot can be frozen and slid off-screen while the live one slides in. */
function MainView({ params, h }) {
  const { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed } = params
  if (openPortal) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', padding: 8, minWidth: 0, background: C.topbar }}>
        <WorkspaceNav
          product={openPortal} page={portalPage} collapsed={portalCollapsed}
          onToggleCollapse={h.onTogglePortal} onSelectPage={h.onSelectPortal} onSwitchProduct={h.onSwitchProduct}
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
      />
      <div style={{ flex: 1, minWidth: 0, padding: 8, background: C.topbar, display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', minWidth: 0, borderRadius: 16, overflow: 'hidden' }}>
          <ContentCard page={symphonyPage} />
        </div>
      </div>
    </div>
  )
}

export default function OptionC() {
  const [symCollapsed, setSymCollapsed] = useState(false)
  const [portalCollapsed, setPortalCollapsed] = useState(false)
  const [symphonyPage, setSymphonyPage] = useState('ies-logs')
  const [portalPage, setPortalPage] = useState(null)
  const [openPortal, setOpenPortal] = useState(null) // null = Symphony shown; else workspace
  const [slide, setSlide] = useState(null)            // { leaving, dir, running } during a transition
  const slideTimer = useRef(0)

  // Fade-and-glide transition between Symphony and a workspace. Snapshot the view
  // we're leaving (it holds still beneath, fully covering), apply the state change so
  // the live view becomes the new one, then on the next painted frame flip `running`
  // true so the incoming layer fades + glides into place over it. The slide is cleared
  // by the incoming layer's *opacity* transition-end — i.e. only once it's fully opaque,
  // so the cover beneath is never pulled while the new view is still translucent (which
  // would let the dark canvas show through and dim the screen). The timer is a pure
  // failsafe for tabs where transitionend is dropped. Big moves only; browsing is instant.
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
  // Switching products from the dropdown is lateral, not deeper — a calm cross-fade
  // (no directional glide) so the nav + content dissolve in place instead of lurching.
  const switchTo = (pid) => withSlide('fade', () => {
    setOpenPortal(pid); setPortalPage(PORTALS[pid].defaultPage); setSymphonyPage(FIRST_SYM_ITEM[pid] || symphonyPage)
  })
  const h = {
    onSelectSymphony: (id) => setSymphonyPage(id),
    onOpenWorkspace: drillIn,
    onToggleSym: () => setSymCollapsed((c) => !c),
    onSelectPortal: setPortalPage,
    onTogglePortal: () => setPortalCollapsed((c) => !c),
    onSwitchProduct: switchTo,
  }
  const goHome = () => withSlide('back', () => setOpenPortal(null))

  const params = { openPortal, symphonyPage, portalPage, symCollapsed, portalCollapsed }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.topbar, overflow: 'hidden' }}>
      <ScopeBar onHome={openPortal ? goHome : undefined} />
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
            <MainView params={slide.leaving} h={NOOP_H} />
          </div>
        )}
      </div>
    </div>
  )
}
