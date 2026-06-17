import { useCallback, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronDown, Check } from '@icons'
import { cx } from '../../lib/cx.js'
import { Icon } from '../Icon/Icon.jsx'
import { Input } from '../Input/Input.jsx'
import { Popover } from '../Popover/Popover.jsx'

/* ----------------------------------------------------------------------------
   Timeframe presets. A preset is { id, label }. The component derives the
   concrete { start, end } Date window from the id at selection time (relative
   to "now"), so consumers get real dates without hardcoding any. Override the
   list via `options`; unknown ids fall through with no computed range.
   -------------------------------------------------------------------------- */

/** The common rolling-window set most dashboards default to. */
export const DEFAULT_TIMEFRAMES = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12mo', label: 'Last 12 months' },
]

/** Calendar-relative presets (Today / This week / Month to date …). */
export const CALENDAR_TIMEFRAMES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'wtd', label: 'Week to date' },
  { id: 'mtd', label: 'Month to date' },
  { id: 'ytd', label: 'Year to date' },
]

const DAY = 86_400_000

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Resolve a preset id to a concrete { start, end } window, or null if unknown. */
export function resolveTimeframe(id, now = new Date()) {
  const end = now
  switch (id) {
    case '24h': return { start: new Date(+now - DAY), end }
    case '7d': return { start: new Date(+now - 7 * DAY), end }
    case '30d': return { start: new Date(+now - 30 * DAY), end }
    case '90d': return { start: new Date(+now - 90 * DAY), end }
    case '12mo': {
      const s = new Date(now)
      s.setFullYear(s.getFullYear() - 1)
      return { start: s, end }
    }
    case 'today': return { start: startOfDay(now), end }
    case 'yesterday': return { start: startOfDay(new Date(+now - DAY)), end: new Date(+startOfDay(now) - 1) }
    case 'wtd': {
      const s = startOfDay(now)
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7)) // Monday as week start
      return { start: s, end }
    }
    case 'mtd': {
      const s = startOfDay(now)
      s.setDate(1)
      return { start: s, end }
    }
    case 'ytd': {
      const s = startOfDay(now)
      s.setMonth(0, 1)
      return { start: s, end }
    }
    default: return null
  }
}

const fmtDay = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const toInputValue = (d) => {
  // yyyy-mm-dd in local time for <input type="date">
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

/* ---- The custom-range editor shown inside the dropdown (allowCustom). ---- */
function CustomRange({ value, onApply }) {
  const [start, setStart] = useState(value?.start ? toInputValue(value.start) : '')
  const [end, setEnd] = useState(value?.end ? toInputValue(value.end) : '')
  const valid = start && end && start <= end

  return (
    <div className="vds-timeframe__custom">
      <span className="vds-timeframe__custom-label">Custom range</span>
      <div className="vds-timeframe__custom-row">
        <Input
          type="date"
          size="sm"
          aria-label="Start date"
          value={start}
          max={end || undefined}
          onChange={(e) => setStart(e.target.value)}
        />
        <span className="vds-timeframe__custom-dash" aria-hidden="true">–</span>
        <Input
          type="date"
          size="sm"
          aria-label="End date"
          value={end}
          min={start || undefined}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="vds-timeframe__apply"
        disabled={!valid}
        onClick={() => valid && onApply({ start: new Date(start), end: new Date(end) })}
      >
        Apply
      </button>
    </div>
  )
}

/* ---- Arrow-key roving focus across the menu options. ---- */
function onMenuKeyDown(e) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const items = Array.from(e.currentTarget.querySelectorAll('[role="menuitemradio"]'))
  if (!items.length) return
  e.preventDefault()
  const i = items.indexOf(document.activeElement)
  const next =
    e.key === 'ArrowDown' ? (i + 1) % items.length
    : e.key === 'ArrowUp' ? (i - 1 + items.length) % items.length
    : e.key === 'Home' ? 0
    : items.length - 1
  items[next]?.focus()
}

/**
 * TimeframeSelect
 *
 * The time-window control for dashboards and reports. Two patterns from one
 * component:
 * - variant="dropdown" (default): a compact pill that opens a menu of preset
 *   ranges, with an optional custom start/end range. Best for toolbars and
 *   page headers; built on the Popover primitive, so it flips and stays
 *   on-screen wherever it sits.
 * - variant="segmented": an inline row of quick-toggle buttons, all visible at
 *   once. Best for wide dashboards where the common ranges should be one click.
 *
 * Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). `onChange`
 * receives the chosen option augmented with the resolved `{ start, end }` Dates:
 * `{ id, label, start, end }`. Custom ranges arrive as `{ id: 'custom', … }`.
 *
 * Props:
 * - variant:      'dropdown' | 'segmented'            (default 'dropdown')
 * - options:      preset list [{ id, label }]         (default DEFAULT_TIMEFRAMES)
 * - value:        controlled selected id
 * - defaultValue: uncontrolled initial id             (default first option)
 * - onChange:     (selection) => void
 * - allowCustom:  show a custom start/end range (dropdown only)  (default false)
 * - size:         'sm' | 'md'                          (default 'md')
 * - placement:    Popover placement (dropdown only)    (default 'bottom-start')
 * - label:        accessible name                      (default 'Timeframe')
 *
 * @example
 * <TimeframeSelect defaultValue="30d" onChange={(tf) => refetch(tf.start, tf.end)} />
 * <TimeframeSelect variant="segmented" options={DEFAULT_TIMEFRAMES} />
 * <TimeframeSelect allowCustom value={tf} onChange={setTf} />
 */
export function TimeframeSelect({
  variant = 'dropdown',
  options = DEFAULT_TIMEFRAMES,
  value,
  defaultValue,
  onChange,
  allowCustom = false,
  size = 'md',
  placement = 'bottom-start',
  label = 'Timeframe',
  className,
  ...props
}) {
  const isControlled = value !== undefined
  const [internalId, setInternalId] = useState(defaultValue ?? options[0]?.id)
  const [customRange, setCustomRange] = useState(null) // { start, end } when a custom range is active
  const selectedId = isControlled ? value : internalId

  const selectPreset = useCallback(
    (opt) => {
      setCustomRange(null)
      if (!isControlled) setInternalId(opt.id)
      onChange?.({ ...opt, ...resolveTimeframe(opt.id) })
    },
    [isControlled, onChange],
  )

  const selectCustom = useCallback(
    ({ start, end }) => {
      const label = `${fmtDay(start)} – ${fmtDay(end)}`
      setCustomRange({ start, end })
      if (!isControlled) setInternalId('custom')
      onChange?.({ id: 'custom', label, start, end })
    },
    [isControlled, onChange],
  )

  // The label shown on the trigger / which option reads as selected.
  const current = useMemo(() => {
    if (selectedId === 'custom' && customRange) {
      return { id: 'custom', label: `${fmtDay(customRange.start)} – ${fmtDay(customRange.end)}` }
    }
    return options.find((o) => o.id === selectedId) ?? options[0]
  }, [selectedId, customRange, options])

  // ---- Segmented variant: inline quick-toggle buttons. ----
  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label={label}
        className={cx('vds-timeframe', 'vds-timeframe--segmented', `vds-timeframe--${size}`, className)}
        {...props}
      >
        {options.map((opt) => {
          const active = opt.id === selectedId
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              className={cx('vds-timeframe__seg', active && 'vds-timeframe__seg--active')}
              onClick={() => selectPreset(opt)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  // ---- Dropdown variant: pill trigger + preset menu (+ optional custom range). ----
  const trigger = (
    <button
      type="button"
      className={cx('vds-timeframe__trigger', `vds-timeframe--${size}`, className)}
    >
      <Icon as={Calendar} size="sm" className="vds-timeframe__lead" />
      <span className="vds-timeframe__value">{current?.label}</span>
      <Icon as={ChevronDown} size="sm" className="vds-timeframe__caret" />
    </button>
  )

  return (
    <Popover
      role="menu"
      aria-label={label}
      placement={placement}
      trigger={trigger}
      panelClassName="vds-timeframe__pop"
      {...props}
    >
      {({ close }) => (
        <div className="vds-timeframe__menu" onKeyDown={onMenuKeyDown}>
          {options.map((opt) => {
            const active = opt.id === selectedId
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cx('vds-timeframe__option', active && 'vds-timeframe__option--active')}
                onClick={() => {
                  selectPreset(opt)
                  close()
                }}
              >
                <span className="vds-timeframe__option-label">{opt.label}</span>
                {active && <Icon as={Check} size="sm" className="vds-timeframe__option-check" />}
              </button>
            )
          })}

          {allowCustom && (
            <>
              <div className="vds-timeframe__sep" role="separator" />
              <CustomRange
                value={customRange}
                onApply={(range) => {
                  selectCustom(range)
                  close()
                }}
              />
            </>
          )}
        </div>
      )}
    </Popover>
  )
}

TimeframeSelect.displayName = 'TimeframeSelect'
