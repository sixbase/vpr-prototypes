import { forwardRef, isValidElement } from 'react'
import { cx } from '../../lib/cx.js'
import { Surface } from '../Surface/Surface.jsx'
import { Icon } from '../Icon/Icon.jsx'
import { Sparkline } from '../Sparkline/Sparkline.jsx'

/* Format a value: numbers get locale separators; prefix/suffix wrap it. */
function formatValue(value, prefix, suffix) {
  if (value == null || value === '') return null // → empty state
  const core = typeof value === 'number' ? value.toLocaleString() : value
  return `${prefix ?? ''}${core}${suffix ?? ''}`
}

/* Normalize delta: a node (render as-is), or a value/{value,direction}. Derives
   direction from the sign when not given, and whether it reads as "good". */
function resolveDelta(delta, invert) {
  if (delta == null) return null
  if (isValidElement(delta)) return { node: delta }
  let value
  let direction
  if (typeof delta === 'object') {
    value = delta.value
    direction = delta.direction
  } else {
    value = delta
  }
  if (!direction) {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.eE+-]/g, ''))
    direction = Number.isFinite(num) && num < 0 ? 'down' : 'up'
  }
  const good = invert ? direction === 'down' : direction === 'up'
  return { value, direction, good }
}

/**
 * StatTile
 *
 * A KPI tile: a prominent value + label, optional icon, structured delta
 * (signed value, auto-colored), caption, trend sparkline, and loading/empty states.
 * Composes Surface + Icon + Sparkline.
 *
 * Props:
 * - value:       string | number (numbers are locale-formatted). Empty → "—".
 * - prefix/suffix: wrap the value (e.g. prefix="$", suffix="%")
 * - label:       the metric name
 * - caption:     small secondary line (e.g. "of 1,400 total")
 * - icon:        optional leading icon component
 * - iconVariant: 'soft' (filled tinted circle — default, the metrics-family
 *                standard) | 'outline' (ringed, transparent)
 * - tone:        'default' | 'primary' | 'success' | 'warning' | 'danger', or a
 *                chromatic family for a categorical (no good/bad) accent:
 *                'azure'|'harbor'|'emerald'|'amber'|'rose'|'orchid'|'clay'.
 *                Colors the icon glyph + soft chip; the sparkline follows.
 * - size:        'sm' | 'md' | 'lg'   (value size)
 * - layout:      'row' (default, Vipre's most-used) | 'stacked' (card)
 * - delta:       '+3%' | -8 | { value, direction } | a node. Auto arrow + color.
 * - invertDelta: treat "down" as good (e.g. error counts)   (default false)
 * - trend:       number[] → Sparkline (colored by the delta when present)
 * - trendTone:   override the sparkline color for a categorical series with no
 *                good/bad meaning — any Sparkline tone, incl. chromatic families
 *                ('azure'|'harbor'|'emerald'|'amber'|'rose'|'orchid'|'clay').
 * - loading:     show a skeleton    (default false)
 * - onClick:     makes the tile a button (drill-in) with hover lift + focus ring
 * - interactive: force the interactive hover/focus affordance without onClick
 *
 * @example
 * <StatTile icon={Shield} value={1192} label="Protected" tone="success"
 *           delta="+3%" trend={[4,6,5,8,7,9]} />
 * <StatTile value={17} label="At risk" tone="danger" delta="+5" invertDelta />
 * <StatTile value={92} suffix="%" label="Uptime" caption="last 30 days" loading />
 */
export const StatTile = forwardRef(function StatTile(
  {
    value,
    prefix,
    suffix,
    label,
    caption,
    icon,
    iconVariant = 'soft',
    tone = 'default',
    size = 'md',
    layout = 'row',
    delta,
    invertDelta = false,
    trend,
    trendTone,
    loading = false,
    onClick,
    interactive = false,
    className,
    ...props
  },
  ref,
) {
  const isInteractive = interactive || typeof onClick === 'function'
  const d = resolveDelta(delta, invertDelta)
  const formatted = formatValue(value, prefix, suffix)
  const hasTrend = !loading && Array.isArray(trend) && trend.length >= 2
  const sparkTone = trendTone ?? (d && !d.node ? (d.good ? 'success' : 'danger') : tone === 'default' ? 'muted' : tone)
  const iconGlyph = { sm: 'md', md: 'lg', lg: 'lg' }[size] ?? 'lg'

  const iconEl = icon && (
    <span className="vds-stat__icon" aria-hidden="true">
      <Icon as={icon} size={iconGlyph} />
    </span>
  )

  const deltaEl =
    d &&
    (d.node ? (
      <span className="vds-stat__delta">{d.node}</span>
    ) : (
      <span className={cx('vds-stat__delta', 'vds-stat__delta--chip', d.good ? 'vds-stat__delta--good' : 'vds-stat__delta--bad')}>
        {d.value}
      </span>
    ))

  const valueEl = loading ? (
    <span className="vds-stat__skeleton vds-stat__skeleton--value" aria-hidden="true" />
  ) : (
    <span className="vds-stat__value">{formatted ?? '—'}</span>
  )
  const labelEl = loading ? (
    <span className="vds-stat__skeleton vds-stat__skeleton--label" aria-hidden="true" />
  ) : (
    <span className="vds-stat__label">{label}</span>
  )
  const captionEl = !loading && caption != null && <span className="vds-stat__caption">{caption}</span>
  const trendEl = hasTrend && (
    <Sparkline className="vds-stat__spark" data={trend} tone={sparkTone} width={layout === 'row' ? 72 : 120} height={layout === 'row' ? 28 : 32} />
  )

  return (
    <Surface
      ref={ref}
      as={isInteractive ? 'button' : 'div'}
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      aria-busy={loading || undefined}
      padding={size === 'lg' ? 5 : 4}
      elevation="resting"
      className={cx(
        'vds-stat',
        `vds-stat--${layout}`,
        `vds-stat--size-${size}`,
        `vds-stat--icon-${iconVariant}`,
        `vds-stat--${tone}`,
        isInteractive && 'vds-stat--interactive',
        className,
      )}
      {...props}
    >
      {layout === 'row' ? (
        <>
          {iconEl}
          <span className="vds-stat__body">
            {labelEl}
            {valueEl}
            {captionEl}
          </span>
          {trendEl}
          {deltaEl}
        </>
      ) : (
        <>
          {(iconEl || deltaEl) && (
            <span className="vds-stat__top">
              {iconEl}
              {deltaEl}
            </span>
          )}
          {labelEl}
          {valueEl}
          {captionEl}
          {trendEl}
        </>
      )}
    </Surface>
  )
})

StatTile.displayName = 'StatTile'
