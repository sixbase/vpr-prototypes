import { useState } from 'react'
import {
  Mail, Send, Laptop, GraduationCap, Database, ScrollText, Radar, Settings,
  FileText, ShieldCheck, Monitor, Bell, UserCog, User, ArrowUpRight,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Boxes, Building2,
  LayoutDashboard,
} from 'lucide-react'
import { PORTALS } from './portalData.js'

/* ============================================================================
   OPTION B — side-by-side navigation (Vipre-DS Figma 34:3979 / 34:4971).
   Symphony stays a full dark menu on the left; opening a product's "Full Portal"
   reveals that product's nav as a LIGHT panel inside the content card.

   Collapse rule: every icon sits centered in a FIXED-width gutter, so collapsing
   only hides labels + narrows the rail — icons never move. Self-contained so
   Build A is untouched.
   ========================================================================== */

const C = {
  topbar: '#0a192c',
  menu: '#0a192c',
  menuBorder: '#08121e',
  tile: 'rgba(255,255,255,0.24)',
  ink: '#ced0d2',
  inkDim: 'rgba(206,208,210,0.72)',
  selected: '#0068cb',
  portalBg: '#ffffff',
  portalInk: 'rgba(11,25,45,0.62)',
  portalEyebrow: 'rgba(11,25,45,0.5)',
  content: '#eeeeee',
}

// Fixed gutter widths — the constant icon column that keeps icons put on collapse.
// SYM_PAD keeps the product glyphs centered on x=24, aligned with the VIPRE mark.
const SYM_GUTTER = 32
const SYM_PAD = 8
const SYM_W_COLLAPSED = SYM_GUTTER + SYM_PAD * 2 // 48
const SYM_W_EXPANDED = 176

const POR_PAD = 32 // expanded panel inset (Figma 34:2079, p-32)
const POR_W_COLLAPSED = 56 // Figma 34:2344 (icons centered at x=28)
const POR_W_EXPANDED = 200

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

const OB_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

/* ---- Shared row ----
   The whole row is the (transparent) hit target; the SELECTION is a compact inner
   "pill" that hugs the icon + label. The label is always rendered but animates its
   width/opacity, and the pill padding eases — so collapse/expand is one smooth
   coordinated motion (labels slide out of the fixed icon gutter) instead of a snap.
   The icon gutter is fixed-width, so the icon never jumps; it ends up centered in
   the collapsed rail because the rail width === gutter + padding. */
function Row({ gutter, icon, label, labelSize = 12, labelWeight = 400, ink, selected, light, collapsed, onClick, ariaCurrent, title, nameHover, height = 30 }) {
  const Tag = onClick ? 'button' : 'div'
  const cls = onClick ? ['obrow', light && 'obrow--light', nameHover && 'obrow--name'].filter(Boolean).join(' ') : undefined
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={cls}
      aria-current={ariaCurrent}
      title={title}
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

/* ---- Portal-nav row (light, Figma 34:2079 / 34:2344) ----
   Expanded: icons left-aligned at the 32px panel inset. Collapsed: 56px rail with
   icons CENTERED at x=28. We animate `padding-left` between the two so the icon
   slides from left-aligned to centered (the per-state margin difference, shown). */
function PortalRow({ iconSize = 16, icon, label, labelSize = 12, labelWeight = 500, selected, collapsed, onClick, ariaLabel }) {
  const pillPad = collapsed ? 4 : 6
  const base = collapsed ? (POR_W_COLLAPSED - iconSize) / 2 : POR_PAD // icon-left target
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={onClick ? 'obrow obrow--light' : undefined}
      aria-current={selected ? 'page' : undefined}
      aria-label={ariaLabel}
      style={{
        display: 'flex', alignItems: 'center', width: '100%', minHeight: 24,
        paddingLeft: base - pillPad, paddingRight: base - pillPad, border: 0, background: 'transparent',
        cursor: onClick ? 'pointer' : 'default', color: selected ? '#fff' : C.portalInk,
        fontFamily: 'inherit', textAlign: 'left',
        transition: `padding 220ms ${OB_EASE}`,
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
function ScopeBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: C.topbar, flexShrink: 0 }}>
      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <VipreMark size={24} />
      </div>
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

/* ====================== Symphony menu (dark, flat) ====================== */
function SymphonyMenu({ collapsed, page, openPortal, onSelectItem, onFullPortal, onToggleCollapse }) {
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
                onClick={p.locked ? undefined : () => onFullPortal(p.id)} nameHover
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
                  selected={openPortal === p.id} ariaCurrent={openPortal === p.id ? 'true' : undefined}
                  onClick={() => onFullPortal(p.id)} icon={<ArrowUpRight size={16} />} />
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

/* ============= Content: light portal nav + content card ============= */
function ContentArea({ openPortal, page, collapsed, onToggleCollapse, onSelectPortalPage }) {
  const def = openPortal ? PORTALS[openPortal] : null
  const pageItem = def?.sections.flatMap((s) => s.items).find((i) => i.id === page)
  const title = pageItem?.label || labelOf(page)
  const ProductGlyph = (PRODUCTS.find((p) => p.id === openPortal) || {}).icon || Laptop
  const PageIcon = iconOf(page)

  return (
    <div style={{ flex: 1, minWidth: 0, padding: 8, background: C.topbar, display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', minWidth: 0, borderRadius: 16, overflow: 'hidden' }}>
        {def && (
          <div style={{
            width: collapsed ? POR_W_COLLAPSED : POR_W_EXPANDED, flexShrink: 0, background: C.portalBg,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
            transition: `width 220ms ${OB_EASE}`,
          }}>
            <div className="ob-scroll-light" style={{ padding: '32px 0 8px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PortalRow iconSize={24} collapsed={collapsed} labelSize={13} label={def.label}
                icon={<span style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(11,25,45,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ProductGlyph size={15} style={{ color: C.portalInk }} /></span>} />
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
                        selected={page === it.id} onClick={() => onSelectPortalPage(it.id)} icon={<Icon size={16} />} />
                    )
                  })}
                </div>
              ))}
            </div>
            {/* Portal nav's own collapse control — icon-only, per Figma */}
            <div style={{ flexShrink: 0, padding: '8px 0 32px' }}>
              <PortalRow iconSize={16} collapsed={collapsed} label=""
                onClick={onToggleCollapse} ariaLabel={collapsed ? 'Expand full portal menu' : 'Collapse full portal menu'}
                icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />} />
            </div>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, background: C.content, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
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
      </div>
    </div>
  )
}

const cardStyle = { flex: 1, minWidth: 0, background: '#fff', borderRadius: 8 }

function labelOf(id) {
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.label
  return 'Overview'
}

function iconOf(id) {
  for (const p of PRODUCTS) for (const it of p.items || []) if (it.id === id) return it.icon
  for (const key in PORTALS) for (const s of PORTALS[key].sections) for (const it of s.items) if (it.id === id) return it.icon
  return LayoutDashboard
}

export default function OptionB() {
  // The two menus collapse independently (each has its own control, per Figma).
  const [symCollapsed, setSymCollapsed] = useState(false)
  const [portalCollapsed, setPortalCollapsed] = useState(false)
  const [page, setPage] = useState('ies-logs')
  const [openPortal, setOpenPortal] = useState(null)

  const selectItem = (id) => { setOpenPortal(null); setPage(id) }
  const openFullPortal = (pid) => { setOpenPortal(pid); setPage(PORTALS[pid].defaultPage) }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.topbar, overflow: 'hidden' }}>
      <ScopeBar />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <SymphonyMenu
          collapsed={symCollapsed}
          page={page}
          openPortal={openPortal}
          onSelectItem={selectItem}
          onFullPortal={openFullPortal}
          onToggleCollapse={() => setSymCollapsed((c) => !c)}
        />
        <ContentArea
          openPortal={openPortal}
          page={page}
          collapsed={portalCollapsed}
          onToggleCollapse={() => setPortalCollapsed((c) => !c)}
          onSelectPortalPage={setPage}
        />
      </div>
    </div>
  )
}
