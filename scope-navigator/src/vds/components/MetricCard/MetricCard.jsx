import { forwardRef, isValidElement, useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from '@icons'
import { cx } from '../../lib/cx.js'
import { Surface } from '../Surface/Surface.jsx'
import { Icon } from '../Icon/Icon.jsx'
import { Badge } from '../Badge/Badge.jsx'
import { Divider } from '../Divider/Divider.jsx'

/* Number → locale string, wrapped by prefix/suffix. Strings pass through. */
function formatValue(value, prefix, suffix) {
  if (value == null || value === '') return '—'
  const core = typeof value === 'number' ? value.toLocaleString() : value
  return `${prefix ?? ''}${core}${suffix ?? ''}`
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/* Fire once when `el` first scrolls into view (threshold 30%). SSR / no-IO
   environments resolve to true immediately so the value is never stuck at 0. */
function useInView(ref, threshold = 0.3) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    // Already on screen at mount → reveal immediately. Covers above-the-fold
    // cards and environments where IntersectionObserver never fires.
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    if (r.height > 0 && r.top < vh && r.bottom > 0) {
      setInView(true)
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, inView, threshold])
  return inView
}

/* Ease 0 → target once `active` flips true (easeOutCubic). Reduced-motion or a
   non-finite target snaps straight to the final value. */
function useCountUp(target, active, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setValue(target)
      return
    }
    let raf
    let start
    const tick = (t) => {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    // Safety net: if rAF is starved (background tab / offscreen render) the
    // count never advances — guarantee the final value lands regardless.
    const safety = setTimeout(() => setValue(target), duration + 200)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(safety)
    }
  }, [target, active, duration])
  return value
}

/* Split a display string into { prefix, num, suffix } so the numeric part can
   animate while currency symbols / unit suffixes (M, K, %) stay put. Preserves
   decimal places and thousands grouping. Returns null when there's no number. */
function parseNumeric(input) {
  if (input == null) return null
  const str = String(input)
  const m = str.match(/^(\D*?)([\d,]*\.?\d+)(\D*)$/)
  if (!m) return null
  const [, prefix, numStr, suffix] = m
  const num = parseFloat(numStr.replace(/,/g, ''))
  if (!Number.isFinite(num)) return null
  return {
    prefix,
    suffix,
    num,
    decimals: numStr.includes('.') ? numStr.split('.')[1].length : 0,
    grouped: numStr.includes(','),
  }
}

function formatNum(n, { decimals, grouped }) {
  return grouped
    ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : n.toFixed(decimals)
}

/* Renders a value, counting its numeric part up from 0 when `active`. The live
   text is aria-hidden and the final value is exposed via aria-label, so assistive
   tech reads the real number, never the ticking intermediate frames. */
function AnimatedValue({ value, active, className }) {
  const parsed = parseNumeric(value)
  const animated = useCountUp(parsed ? parsed.num : 0, active && !!parsed)
  if (!parsed) return <span className={className}>{value}</span>
  return (
    <span className={className} aria-label={String(value)}>
      <span aria-hidden="true">
        {parsed.prefix}
        {formatNum(animated, parsed)}
        {parsed.suffix}
      </span>
    </span>
  )
}

/* Normalize delta: a node (render as-is), or value / { value, direction }.
   Derives direction from the sign, and whether it reads as "good". */
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
 * MetricCard
 *
 * A flagship KPI card — the rich counterpart to StatTile. It stacks a header
 * (soft icon chip + title + period), a hero value with a signed delta badge,
 * an optional target progress bar, and an optional breakdown list. Composes
 * Surface + Icon + Badge + Divider.
 *
 * For a dense one-line KPI use StatTile; reach for MetricCard when a single
 * metric is the hero of a panel and deserves context (target, breakdown).
 *
 * Props:
 * - icon:        leading icon component (rendered in a soft chip)
 * - iconTone:    chip color — 'primary'|'success'|'warning'|'danger' or a
 *                chromatic family 'azure'|'harbor'|'emerald'|'amber'|'rose'|
 *                'orchid'|'clay'   (default 'primary')
 * - title:       metric name (e.g. "Total Revenue")
 * - period:      sub-line under the title (e.g. "Q1 2026 (Jan – Mar)")
 * - value:       string | number (numbers are locale-formatted). Empty → "—".
 * - prefix/suffix: wrap the value (e.g. prefix="£", suffix="%")
 * - delta:       '+12.5%' | -8 | { value, direction } | a node. Auto arrow + color.
 * - invertDelta: treat "down" as good (e.g. error counts)   (default false)
 * - deltaCaption: muted text after the delta badge (e.g. "vs last quarter")
 * - progress:    { value: 0–100, label?, caption? } → target bar
 * - progressTone: bar fill — 'azure' (default) | 'primary' | 'success' |
 *                'danger' | 'match' (follow the delta's good/bad color)
 * - breakdown:   [{ label, value }] → divided footer list
 * - onClick:     makes the whole card a button (drill-in) with a hover lift
 * - interactive: force the interactive hover/focus affordance without onClick
 * - all native attributes (role, aria-*, …)
 *
 * @example
 * <MetricCard
 *   icon={DollarSign} iconTone="orchid"
 *   title="Total Revenue" period="Q1 2026 (Jan – Mar)"
 *   value="$2.45M" delta="+12.5%" deltaCaption="vs last quarter"
 *   progress={{ value: 87, label: 'Quarterly target: $2.8M' }}
 *   breakdown={[
 *     { label: 'Gross margin', value: '42.8%' },
 *     { label: 'Recurring revenue', value: '$1.62M' },
 *     { label: 'Average deal size', value: '$34.2K' },
 *   ]}
 * />
 */
export const MetricCard = forwardRef(function MetricCard(
  {
    icon,
    iconTone = 'primary',
    title,
    period,
    value,
    prefix,
    suffix,
    delta,
    invertDelta = false,
    deltaCaption,
    progress,
    progressTone = 'azure',
    breakdown,
    onClick,
    interactive = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const isInteractive = interactive || typeof onClick === 'function'
  const d = resolveDelta(delta, invertDelta)

  // Observe the card; numbers count up + the bar grows the first time it shows.
  const innerRef = useRef(null)
  const setRefs = (node) => {
    innerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  const inView = useInView(innerRef)
  const barTone =
    progressTone === 'match' ? (d && !d.node ? (d.good ? 'success' : 'danger') : 'azure') : progressTone

  const deltaEl =
    d &&
    (d.node ? (
      d.node
    ) : (
      <Badge tone={d.good ? 'success' : 'danger'}>
        <span className="vds-metric__delta-inner">
          {/* arrow follows DIRECTION (up/down); the badge COLOR follows good/bad,
              so a rising "bad" metric reads as an up-arrow in red. */}
          <Icon as={d.direction === 'down' ? TrendingDown : TrendingUp} size="xs" />
          <AnimatedValue value={d.value} active={inView} />
        </span>
      </Badge>
    ))

  const hasHeader = icon || title || period
  const hasProgress = progress && progress.value != null
  const pct = hasProgress ? Math.max(0, Math.min(100, progress.value)) : 0
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0

  return (
    <Surface
      ref={setRefs}
      as={isInteractive ? 'button' : 'div'}
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      elevation="resting"
      padding={6}
      className={cx(
        'vds-metric',
        `vds-metric--icon-${iconTone}`,
        isInteractive && 'vds-metric--interactive',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="vds-metric__header">
          {icon && (
            <span className="vds-metric__icon" aria-hidden="true">
              <Icon as={icon} size="md" />
            </span>
          )}
          <div className="vds-metric__heading">
            {title && <h3 className="vds-metric__title">{title}</h3>}
            {period && <span className="vds-metric__period">{period}</span>}
          </div>
        </div>
      )}

      <div className="vds-metric__figure">
        <AnimatedValue className="vds-metric__value" value={formatValue(value, prefix, suffix)} active={inView} />
        {(deltaEl || deltaCaption) && (
          <div className="vds-metric__delta">
            {deltaEl}
            {deltaCaption && <span className="vds-metric__delta-caption">{deltaCaption}</span>}
          </div>
        )}
      </div>

      {hasProgress && (
        <div className="vds-metric__progress">
          {(progress.label != null || progress.value != null) && (
            <div className="vds-metric__progress-head">
              {progress.label != null && <span className="vds-metric__progress-label">{progress.label}</span>}
              <AnimatedValue className="vds-metric__progress-pct" value={`${progress.value}%`} active={inView} />
            </div>
          )}
          <div
            className="vds-metric__bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progress.caption || progress.label || 'Progress'}
          >
            <div
              className={cx('vds-metric__bar-fill', `vds-metric__bar-fill--${barTone}`)}
              style={{ width: inView ? `${pct}%` : '0%' }}
            />
          </div>
          {progress.caption && <span className="vds-metric__progress-caption">{progress.caption}</span>}
        </div>
      )}

      {hasBreakdown && (
        <>
          <Divider />
          <dl className="vds-metric__breakdown">
            {breakdown.map((row, i) => (
              <div className="vds-metric__breakdown-row" key={i}>
                <dt className="vds-metric__breakdown-label">{row.label}</dt>
                <dd className="vds-metric__breakdown-value">
                  <AnimatedValue value={row.value} active={inView} />
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {children}
    </Surface>
  )
})

MetricCard.displayName = 'MetricCard'
