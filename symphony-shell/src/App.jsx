import { useMemo, useState } from 'react'
import {
  LayoutGrid, Mail, ScrollText, Radar, Settings, Send, FileText, ShieldCheck,
  Laptop, Monitor, Bell, GraduationCap, Database, UserCog, User, ArrowRight, LogOut,
  Shield, AlertTriangle, Moon, Sun, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import {
  CurrentLeftNav, ScopeNavigator, PageHeader, TimeframeSelect, StatTile, Card, Table, Badge,
} from './vds/components/index.js'
import PortalNav from './PortalNav.jsx'
import { PORTALS } from './portalData.js'

/* VIPRE wordmark (currentColor) + Symphony sub-label — the rail header forces
   white, so the mark renders white for free. */
function VipreWordmark(props) {
  return (
    <svg viewBox="0 0 220 40" width={118} height={21} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.4474 10.6562C13.149 9.44293 14.283 9.44293 14.9845 10.6562L26.6408 30.8076C27.3424 32.0209 27.3424 34.0259 26.6408 35.2393L24.4826 39.0898C23.781 40.3031 22.648 40.3031 21.9465 39.0898L10.2892 18.9385C9.58766 17.7252 9.58766 15.7202 10.2892 14.4541L12.4474 10.6562Z" fill="currentColor" />
      <path d="M45.4758 0C46.9329 0 47.4723 1.0025 46.7707 2.21582L34.5744 22.209C33.8189 23.4222 32.0383 24.4246 30.5812 24.4248H26.1017C24.6447 24.4248 24.1044 23.4222 24.8058 22.209L37.0031 2.21582C37.7586 1.00258 39.5392 0.000127689 40.9963 0H45.4758Z" fill="currentColor" />
      <path d="M25.2638 0.0527344C26.7209 0.0529233 28.5015 1.05535 29.257 2.26855L31.5773 6.06641C32.3329 7.27973 31.7393 8.28223 30.3361 8.28223H6.64471C5.18761 8.28223 3.40711 7.2797 2.65154 6.06641L0.330252 2.26855C-0.425245 1.05531 0.168497 0.0528588 1.57146 0.0527344H25.2638Z" fill="currentColor" />
      <path d="M106.538 31.2637H96.6086L99.7385 15.3857C100.332 12.2733 103.084 10.0577 106.322 10.0576H110.748L106.538 31.2637Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M139.862 10.1104C144.341 10.1104 146.878 11.429 147.957 13.2754C148.443 14.0666 148.605 14.9636 148.605 15.8604C148.605 17.0208 148.335 18.0759 147.741 19.1309C146.176 21.7685 142.56 23.7207 136.947 23.7207H123.671L122.16 31.2637H112.176L116.386 10.1104H139.862ZM124.535 19.2363V19.2891H134.411C136.246 19.289 137.542 18.7092 138.081 17.7598C138.297 17.3905 138.404 16.9679 138.404 16.4932C138.404 16.124 138.35 15.8077 138.189 15.5439C137.865 14.9637 137.055 14.5938 135.814 14.5938H125.452L124.535 19.2363Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M176.855 10.1104C180.902 10.1104 183.384 11.2181 184.518 13.0645C185.003 13.8557 185.166 14.6999 185.166 15.5967C185.166 16.6516 184.896 17.5486 184.41 18.3926C183.115 20.5553 180.039 21.663 175.56 21.9268L177.773 24.9863L182.467 31.2637H171.189L164.874 22.9814H160.395L158.776 31.2637H148.792L153.001 10.1104H176.855ZM161.204 19.0254H171.512C173.131 19.0254 174.264 18.4981 174.804 17.6543C175.02 17.285 175.128 16.9152 175.128 16.4404C175.128 16.0713 175.074 15.8076 174.912 15.5439C174.535 14.911 173.779 14.5938 172.646 14.5938H162.121L161.204 19.0254Z" fill="currentColor" />
      <path d="M219.083 14.6992H199.762L199.007 18.4453H217.896L217.032 22.876H198.144L197.388 26.6221H216.708L215.791 31.2637H186.594L189.725 15.3857C190.318 12.3261 193.071 10.0576 196.309 10.0576H220L219.083 14.6992Z" fill="currentColor" />
      <path d="M72.8088 25.1973L73.4025 26.833L74.59 25.25L74.6437 25.1445L83.8185 12.8008C85.1137 11.1127 87.1101 10.1104 89.2687 10.1104V10.0576H96.9318L80.0402 31.2109H65.6848L57.2121 10.0576H67.4123L72.8088 25.1973Z" fill="currentColor" />
    </svg>
  )
}

function SymphonyLockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <VipreWordmark />
      <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
        Symphony
      </span>
    </div>
  )
}

/* Just the VIPRE triangle mark — the compact brand for the collapsed rail. */
function VipreMark(props) {
  return (
    <svg viewBox="0 0 47 40" width={26} height={22} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.4474 10.6562C13.149 9.44293 14.283 9.44293 14.9845 10.6562L26.6408 30.8076C27.3424 32.0209 27.3424 34.0259 26.6408 35.2393L24.4826 39.0898C23.781 40.3031 22.648 40.3031 21.9465 39.0898L10.2892 18.9385C9.58766 17.7252 9.58766 15.7202 10.2892 14.4541L12.4474 10.6562Z" fill="currentColor" />
      <path d="M45.4758 0C46.9329 0 47.4723 1.0025 46.7707 2.21582L34.5744 22.209C33.8189 23.4222 32.0383 24.4246 30.5812 24.4248H26.1017C24.6447 24.4248 24.1044 23.4222 24.8058 22.209L37.0031 2.21582C37.7586 1.00258 39.5392 0.000127689 40.9963 0H45.4758Z" fill="currentColor" />
      <path d="M25.2638 0.0527344C26.7209 0.0529233 28.5015 1.05535 29.257 2.26855L31.5773 6.06641C32.3329 7.27973 31.7393 8.28223 30.3361 8.28223H6.64471C5.18761 8.28223 3.40711 7.2797 2.65154 6.06641L0.330252 2.26855C-0.425245 1.05531 0.168497 0.0528588 1.57146 0.0527344H25.2638Z" fill="currentColor" />
    </svg>
  )
}

/* ---- Nav model -------------------------------------------------------------
   Each product owns a set of pages; OWNER maps page -> product so the rail can
   light the product the active page lives inside. */
const OVERVIEW = { id: 'overview', label: 'Overview', icon: LayoutGrid }

const PRODUCTS = [
  {
    id: 'ies', label: 'IES', icon: Mail,
    items: [
      { id: 'ies-logs', label: 'Message Logs', icon: ScrollText },
      { id: 'ies-threat', label: 'Threat Explorer', icon: Radar },
      { id: 'ies-config', label: 'Email Config.', icon: Settings },
    ],
    escape: { id: 'ies-portal', label: 'full portal', icon: ArrowRight },
  },
  {
    id: 'safesend', label: 'SafeSend', icon: Send, defaultOpen: false,
    items: [
      { id: 'ss-reports', label: 'Reports', icon: FileText },
      { id: 'ss-policies', label: 'Policies', icon: ShieldCheck },
      { id: 'ss-settings', label: 'Settings', icon: Settings },
    ],
    escape: { id: 'ss-portal', label: 'full portal', icon: ArrowRight },
  },
  {
    id: 'edr', label: 'EDR', icon: Laptop,
    items: [
      { id: 'edr-devices', label: 'Devices', icon: Monitor },
      { id: 'edr-incidents', label: 'Incidents', icon: Bell },
      { id: 'edr-settings', label: 'Settings', icon: Settings },
    ],
    escape: { id: 'edr-portal', label: 'full portal', icon: ArrowRight },
  },
  { id: 'sat', label: 'SAT', icon: GraduationCap, locked: true, lockHint: 'Not in your plan — contact sales to enable' },
  { id: 'archive', label: 'Archive', icon: Database, locked: true, lockHint: 'Not in your plan — contact sales to enable' },
]

const FOOTER_ITEMS = [
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'admins', label: 'Admins', icon: UserCog },
  { id: 'profile', label: 'Profile', icon: User, trailingIcon: LogOut, trailingLabel: 'Sign out', onTrailingClick: () => {} },
]

const OWNER = Object.fromEntries(
  PRODUCTS.flatMap((p) => (p.items || []).map((it) => [it.id, p.id])),
)
const LOOKUP = Object.fromEntries(
  [OVERVIEW, ...PRODUCTS.flatMap((p) => p.items || []), ...FOOTER_ITEMS,
   ...PRODUCTS.filter((p) => p.escape).map((p) => p.escape)].map((it) => [it.id, it]),
)

/* "full portal" escape id -> product id, and product id -> its first sub-page.
   Entering a portal is triggered by an escape link; leaving returns to the
   Symphony view with that product active (its first sub-page selected). */
const ESCAPE_TO_PRODUCT = Object.fromEntries(
  PRODUCTS.filter((p) => p.escape).map((p) => [p.escape.id, p.id]),
)
const FIRST_ITEM = Object.fromEntries(
  PRODUCTS.filter((p) => p.items?.length).map((p) => [p.id, p.items[0].id]),
)

/* The MSP account tree the operator manages — reseller → customer. Drives the
   persistent scope bar ("which customer am I acting on"). */
const ACCOUNTS = [
  {
    id: 'r1', name: 'Northwind MSP', type: 'reseller', status: 'active',
    children: [
      { id: 'c1', name: 'Acme Corp', type: 'customer', status: 'active' },
      { id: 'c2', name: 'Globex', type: 'customer', status: 'active' },
      { id: 'c3', name: 'Initech', type: 'customer', status: 'trial' },
      { id: 'c4', name: 'Hooli', type: 'customer', status: 'active' },
    ],
  },
  {
    id: 'r2', name: 'Contoso Partners', type: 'reseller', status: 'active',
    children: [
      { id: 'c5', name: 'Umbrella Inc', type: 'customer', status: 'active' },
      { id: 'c6', name: 'Soylent', type: 'customer', status: 'suspended' },
    ],
  },
]

// Shared icon-button chrome used in the page-header actions cluster.
const iconBtnStyle = {
  appearance: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', width: 32, height: 32, borderRadius: 8,
  border: '1px solid var(--vds-line)', background: 'var(--vds-surface)', color: 'var(--vds-ink-muted)',
}

/* ---- Page bodies ---------------------------------------------------------- */
const grid = (cols = 12) => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem' })
const cell = (span, extra = {}) => ({ gridColumn: `span ${span}`, ...extra })

function Panel({ span = 6, h = 180, label }) {
  return (
    <div style={cell(span, {
      height: h, borderRadius: 'var(--vds-radius-lg)', border: '1px dashed var(--vds-line-strong)',
      background: 'var(--vds-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--vds-ink-subtle)', fontSize: '0.8125rem', fontWeight: 500,
    })}>{label}</div>
  )
}

function OverviewBody() {
  return (
    <div style={grid()}>
      <div style={cell(3)}><StatTile value="128,402" label="Total Emails" icon={Mail} delta="+4%" trend={[8, 9, 7, 11, 10, 13, 12]} /></div>
      <div style={cell(3)}><StatTile value="1,284" label="Detected Threats" icon={Shield} tone="warning" delta="-6%" invertDelta trend={[14, 12, 13, 9, 10, 8, 7]} /></div>
      <div style={cell(3)}><StatTile value="312" label="Devices Online" icon={Monitor} tone="success" delta="+2%" /></div>
      <div style={cell(3)}><StatTile value="7" label="Open Incidents" icon={AlertTriangle} tone="danger" delta="+3" invertDelta /></div>
      <Panel span={8} h={260} label="Email Threat Journey" />
      <div style={cell(4)}>
        <Card title="Recent activity" padding={5}>
          <ul style={{ margin: 0, paddingLeft: '1rem', display: 'grid', gap: '0.5rem', color: 'var(--vds-ink-muted)', fontSize: '0.8125rem' }}>
            <li>Quarantined phishing → 3 recipients</li>
            <li>New device enrolled — <em>WS-4471</em></li>
            <li>Policy “Exec Protection” updated</li>
            <li>Incident #4471 escalated</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function MessageLogsBody() {
  const data = [
    { id: 1, subject: 'Q3 invoice — action required', from: 'billing@acme-supply.co', verdict: 'Quarantined', tone: 'danger', time: '2m ago' },
    { id: 2, subject: 'Your package is on the way', from: 'noreply@parcel.com', verdict: 'Delivered', tone: 'success', time: '14m ago' },
    { id: 3, subject: 'Shared document: Roadmap', from: 'no-reply@docs.io', verdict: 'Suspicious', tone: 'warning', time: '38m ago' },
    { id: 4, subject: 'Password reset', from: 'security@vendor.net', verdict: 'Delivered', tone: 'success', time: '1h ago' },
    { id: 5, subject: 'RE: wire transfer confirmation', from: 'cfo@acrne-supply.co', verdict: 'Quarantined', tone: 'danger', time: '2h ago' },
  ]
  return (
    <Card padding={0}>
      <Table
        columns={[
          { key: 'subject', header: 'Subject' },
          { key: 'from', header: 'Sender' },
          { key: 'verdict', header: 'Verdict', render: (r) => <Badge tone={r.tone} dot>{r.verdict}</Badge> },
          { key: 'time', header: 'Received', align: 'right' },
        ]}
        data={data}
        zebra
      />
    </Card>
  )
}

function DevicesBody() {
  const data = [
    { id: 1, name: 'WS-4471', os: 'Windows 11', status: 'Protected', tone: 'success', seen: '1m ago' },
    { id: 2, name: 'MBP-Ortega', os: 'macOS 15.3', status: 'Protected', tone: 'success', seen: '4m ago' },
    { id: 3, name: 'WS-2210', os: 'Windows 10', status: 'At risk', tone: 'warning', seen: '22m ago' },
    { id: 4, name: 'SRV-DC01', os: 'Windows Server', status: 'Offline', tone: 'danger', seen: '3h ago' },
  ]
  return (
    <div style={grid()}>
      <div style={cell(4)}><StatTile value="312" label="Protected" icon={ShieldCheck} tone="success" /></div>
      <div style={cell(4)}><StatTile value="6" label="At risk" icon={AlertTriangle} tone="warning" /></div>
      <div style={cell(4)}><StatTile value="3" label="Offline" icon={Monitor} tone="danger" /></div>
      <div style={cell(12)}>
        <Card padding={0}>
          <Table
            columns={[
              { key: 'name', header: 'Device' },
              { key: 'os', header: 'OS' },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
              { key: 'seen', header: 'Last seen', align: 'right' },
            ]}
            data={data}
          />
        </Card>
      </div>
    </div>
  )
}

function GenericBody({ title }) {
  return (
    <div style={grid()}>
      <div style={cell(12)}>
        <Card title={title} padding={5}>
          <p style={{ margin: 0, color: 'var(--vds-ink-muted)', fontSize: '0.875rem' }}>
            This page is a stub in the prototype — the frame is identical across every destination, so
            wiring a real screen here means swapping only this body. Use the rail to feel the navigation
            between products and pages.
          </p>
        </Card>
      </div>
      <Panel span={6} h={150} label="Widget" />
      <Panel span={6} h={150} label="Widget" />
    </div>
  )
}

/* A swappable stub body for full-portal pages. The frame (dual rail + header)
   is what we're prototyping; every destination shares this placeholder. */
function PortalStub({ label, product }) {
  return (
    <div style={grid()}>
      <div style={cell(12)}>
        <Card title={label} padding={5}>
          <p style={{ margin: 0, color: 'var(--vds-ink-muted)', fontSize: '0.875rem' }}>
            {product} full portal — “{label}”. Stub page in the prototype. The strip on the left
            switches products; the VIPRE mark at its top returns to Symphony.
          </p>
        </Card>
      </div>
      <Panel span={6} h={150} label="Widget" />
      <Panel span={6} h={150} label="Widget" />
    </div>
  )
}

const PAGE_META = {
  overview: { icon: LayoutGrid, iconTone: 'primary', eyebrow: 'VIPRE Symphony', title: 'Overview' },
  'ies-logs': { icon: ScrollText, iconTone: 'primary', eyebrow: 'Integrated Email Security', title: 'Message Logs' },
  'ies-threat': { icon: Radar, iconTone: 'info', eyebrow: 'Integrated Email Security', title: 'Threat Explorer' },
  'edr-devices': { icon: Monitor, iconTone: 'success', eyebrow: 'Endpoint Detection & Response', title: 'Devices' },
  'edr-incidents': { icon: Bell, iconTone: 'danger', eyebrow: 'Endpoint Detection & Response', title: 'Incidents' },
}

function renderBody(id) {
  if (id === 'overview') return <OverviewBody />
  if (id === 'ies-logs') return <MessageLogsBody />
  if (id === 'edr-devices') return <DevicesBody />
  return <GenericBody title={LOOKUP[id]?.label || 'Page'} />
}

export default function App() {
  const [page, setPage] = useState('overview')
  const [dark, setDark] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  // Which product's full portal we're in (null = the Symphony launcher view).
  const [portal, setPortal] = useState(null)
  const [portalPage, setPortalPage] = useState(null)
  // MSP scope: root → current customer. Starts on Northwind MSP › Acme Corp.
  const [scopePath, setScopePath] = useState([ACCOUNTS[0], ACCOUNTS[0].children[0]])

  // Symphony rail clicks: a "full portal" escape enters that product's portal;
  // everything else is a normal page select.
  function handleSymphonySelect(id) {
    const prod = ESCAPE_TO_PRODUCT[id]
    if (prod) {
      setPortal(prod)
      setPortalPage(PORTALS[prod].defaultPage)
      return
    }
    setPage(id)
  }
  // Strip logo → home: back to Symphony with the originating product active.
  function exitToSymphony() {
    const prod = portal
    setPortal(null)
    if (prod && FIRST_ITEM[prod]) setPage(FIRST_ITEM[prod])
  }
  // Strip product icon → switch straight into that peer product's portal.
  function switchPortal(pid) {
    setPortal(pid)
    setPortalPage(PORTALS[pid].defaultPage)
  }

  const groups = useMemo(() => {
    const ownerId = OWNER[page]
    return PRODUCTS.map((p) =>
      p.locked ? p : { ...p, active: p.id === ownerId, defaultOpen: p.id === ownerId ? true : p.defaultOpen },
    )
  }, [page])

  const meta = PAGE_META[page] || {
    icon: LOOKUP[page]?.icon || LayoutGrid, iconTone: 'primary', eyebrow: 'VIPRE Symphony', title: LOOKUP[page]?.label || 'Page',
  }

  // Shared content-area chrome.
  const mainStyle = {
    flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--vds-canvas)',
    padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
  }

  // ---- Build the nav + content for the current mode ----
  let nav, main
  if (portal) {
    const def = PORTALS[portal]
    const pageItem = def.sections.flatMap((s) => s.items).find((i) => i.id === portalPage)
    nav = (
      <PortalNav
        product={portal}
        products={PRODUCTS}
        currentPage={portalPage}
        onHome={exitToSymphony}
        onSwitchProduct={switchPortal}
        onSelectPage={setPortalPage}
        homeMark={<VipreMark />}
      />
    )
    main = (
      <main className={dark ? 'dark' : undefined} style={mainStyle}>
        <PageHeader
          icon={pageItem?.icon || LayoutGrid}
          eyebrow={`${def.label} · Full portal`}
          title={pageItem?.label || 'Page'}
          actions={<TimeframeSelect size="sm" />}
        />
        <PortalStub label={pageItem?.label || 'Page'} product={def.label} />
      </main>
    )
  } else {
    nav = (
      <CurrentLeftNav
        collapsed={collapsed}
        brand={collapsed ? <VipreMark /> : <SymphonyLockup />}
        overview={OVERVIEW}
        groups={groups}
        footerItems={FOOTER_ITEMS}
        activeId={page}
        onSelect={handleSymphonySelect}
      />
    )
    main = (
      <main className={dark ? 'dark' : undefined} style={mainStyle}>
        <PageHeader
          icon={meta.icon}
          iconTone={meta.iconTone}
          eyebrow={meta.eyebrow}
          title={meta.title}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} style={iconBtnStyle}>
                {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
              <TimeframeSelect size="sm" />
              <button type="button" onClick={() => setDark((d) => !d)} aria-label={dark ? 'Switch to light workspace' : 'Switch to dark workspace'} style={iconBtnStyle}>
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          }
        />
        {renderBody(page)}
      </main>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Persistent MSP scope — which customer am I acting on, across every product */}
      <ScopeNavigator
        variant="basic"
        className="dark"
        path={scopePath}
        onNavigate={setScopePath}
        rootItems={ACCOUNTS}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {nav}
        {main}
      </div>
    </div>
  )
}
