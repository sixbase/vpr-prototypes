import { Children, Fragment, isValidElement, useCallback, useMemo, useState } from 'react'
import { ChevronDown, Check } from '@icons'
import { cx } from '../../lib/cx.js'
import { Icon } from '../Icon/Icon.jsx'
import { Popover } from '../Popover/Popover.jsx'
import { menuKeyDown } from '../Popover/menuKeyDown.js'

/* ----------------------------------------------------------------------------
   Normalise the option source. Accepts either an `options` prop
   ([{ value, label, disabled }]) or <option> children — so existing
   <Select><option>…</option></Select> call sites keep working — and returns a
   single flat list the listbox renders.
   -------------------------------------------------------------------------- */
function collectOptions(children, out) {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    if (c.type === Fragment) {
      collectOptions(c.props.children, out) // descend into <>…</> wrappers
    } else if (c.type === 'option') {
      out.push({
        value: c.props.value ?? c.props.children,
        label: c.props.children,
        disabled: c.props.disabled,
      })
    }
  })
  return out
}

function useOptions(options, children) {
  return useMemo(() => {
    if (options) return options
    return collectOptions(children, [])
  }, [options, children])
}

/**
 * Select
 *
 * A single-choice dropdown. Rather than a native <select>, it opens the same
 * floating menu that TimeframeSelect uses — built on the Popover primitive — so
 * the open list flips, clamps, and dismisses identically to every other
 * dropdown in the system, and its options share one look (hover, active fill,
 * check affix). The trigger keeps Input's neutral-graphite chrome so it still
 * reads as a form control.
 *
 * Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 * `onChange` receives the chosen option's `value` directly.
 *
 * Props:
 * - options:      [{ value, label, disabled }] — or pass <option> children
 * - value:        controlled selected value
 * - defaultValue: uncontrolled initial value
 * - onChange:     (value) => void
 * - placeholder:  shown on the trigger when nothing is selected
 * - size:         'sm' | 'md' | 'lg'   (default 'md')
 * - invalid:      boolean — danger border + aria-invalid   (default false)
 * - placement:    Popover placement    (default 'bottom-start')
 * - disabled:     boolean
 *
 * Accessibility:
 * - Trigger is a button with aria-haspopup="listbox"; the panel is role=listbox
 *   with role=option items. Pair with a <label> / Field for a visible name.
 *
 * @example
 * <Select defaultValue="active" onChange={setStatus}>
 *   <option value="active">Active</option>
 *   <option value="suspended">Suspended</option>
 * </Select>
 */
export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  size = 'md',
  invalid = false,
  disabled = false,
  placement = 'bottom-start',
  'aria-label': ariaLabel,
  className,
  children,
  ...props
}) {
  const items = useOptions(options, children)
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = isControlled ? value : internalValue

  const current = useMemo(
    () => items.find((o) => o.value === selectedValue),
    [items, selectedValue],
  )

  const select = useCallback(
    (opt) => {
      if (!isControlled) setInternalValue(opt.value)
      onChange?.(opt.value)
    },
    [isControlled, onChange],
  )

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={cx(
        'vds-select__trigger',
        `vds-select--${size}`,
        invalid && 'vds-select--invalid',
        !current && 'vds-select--placeholder',
        className,
      )}
    >
      <span className="vds-select__value">{current ? current.label : placeholder}</span>
      <Icon as={ChevronDown} size="sm" className="vds-select__caret" />
    </button>
  )

  return (
    <Popover
      role="listbox"
      aria-label={ariaLabel}
      placement={placement}
      matchWidth
      trigger={trigger}
      className={cx('vds-select', disabled && 'vds-select--disabled')}
      panelClassName="vds-select__pop"
      {...props}
    >
      {({ close }) => (
        <div className="vds-popover__menu" onKeyDown={menuKeyDown}>
          {items.map((opt) => {
            const active = opt.value === selectedValue
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={active}
                aria-disabled={opt.disabled || undefined}
                disabled={opt.disabled}
                className={cx('vds-popover__item', active && 'vds-popover__item--active')}
                onClick={() => {
                  select(opt)
                  close()
                }}
              >
                <span className="vds-popover__item-label">{opt.label}</span>
                {active && <Icon as={Check} size="sm" className="vds-popover__item-check" />}
              </button>
            )
          })}
        </div>
      )}
    </Popover>
  )
}

Select.displayName = 'Select'
