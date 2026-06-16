import { PORTALS } from './portalData.js'

/* The full-portal dual rail:
   - a thin Symphony "strip" on the far left — the VIPRE mark at top is HOME
     (back to the curated Symphony view), the product icons below switch laterally
     straight into a peer product's portal.
   - the wide "Site Manager" sectioned nav for the current product.
   Symphony's brand lives only as the strip mark, so the wide nav belongs entirely
   to Site Manager — no competing wordmarks. */

const NAVY = '#0b192d'
const STRIP_BG = '#081320'
const SELECTED = '#0068cb'
const EYEBROW = '#6b7d8f'
const ITEM_INK = '#cfd4d8'

export default function PortalNav({
  product, products, currentPage, onHome, onSwitchProduct, onSelectPage, homeMark,
}) {
  const def = PORTALS[product]

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      {/* ---- Symphony strip: home + lateral product switch ---- */}
      <div style={{
        width: 54, background: STRIP_BG, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 0',
      }}>
        <button
          type="button" className="pnav-strip-btn" onClick={onHome}
          aria-label="Back to Symphony home" title="Symphony home"
          style={{ color: '#fff' }}
        >
          {homeMark}
        </button>
        <div style={{ width: 26, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        {products.map((p) => {
          const Icon = p.icon
          const active = p.id === product
          return (
            <button
              key={p.id} type="button" className="pnav-strip-btn"
              disabled={p.locked}
              onClick={p.locked ? undefined : () => onSwitchProduct(p.id)}
              aria-label={p.label} aria-current={active ? 'true' : undefined}
              title={p.locked ? `${p.label} — not in your plan` : p.label}
              style={{
                background: active ? 'rgba(0,104,203,0.28)' : undefined,
                color: p.locked ? 'rgba(255,255,255,0.28)' : active ? '#dbe8f7' : '#8fa0b0',
                cursor: p.locked ? 'default' : 'pointer',
              }}
            >
              <Icon size={18} />
            </button>
          )
        })}
      </div>

      {/* ---- Site Manager sectioned nav ---- */}
      <nav
        aria-label={`${def.label} full portal`}
        style={{
          width: 212, background: NAVY, flexShrink: 0, height: '100%',
          display: 'flex', flexDirection: 'column', fontFamily: 'var(--vds-font-sans)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '20px 14px 14px', color: '#fff' }}>
          <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.15 }}>{def.label}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: EYEBROW }}>
            Site Manager
          </span>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '4px 8px 16px' }}>
          {def.sections.map((sec) => (
            <div key={sec.label} style={{ marginBottom: 6 }}>
              <div style={{ color: EYEBROW, fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '14px 10px 6px' }}>
                {sec.label}
              </div>
              {sec.items.map((it) => {
                const Icon = it.icon
                const sel = it.id === currentPage
                return (
                  <button
                    key={it.id} type="button" className="pnav-item"
                    onClick={() => onSelectPage(it.id)}
                    aria-current={sel ? 'page' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                      padding: '8px 10px', border: 0, borderRadius: 7, cursor: 'pointer',
                      background: sel ? SELECTED : 'transparent',
                      color: sel ? '#fff' : ITEM_INK, fontSize: 13, fontWeight: sel ? 500 : 400,
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0, color: sel ? undefined : '#8d99a6' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ flexShrink: 0, padding: '12px 16px', color: EYEBROW, fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {def.footer}
        </div>
      </nav>
    </div>
  )
}
