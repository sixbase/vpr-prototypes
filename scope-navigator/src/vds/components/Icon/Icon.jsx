import { forwardRef } from 'react'
import { cx } from '../../lib/cx.js'

/**
 * Icon
 *
 * A presentation wrapper that gives any SVG icon a consistent size and tone.
 * It does NOT ship its own icon set — pass a lucide-react icon (or any SVG
 * component) via `as`, or raw <svg> as children. Color inherits from the
 * surrounding text by default (currentColor); `tone` overrides it.
 *
 * Props:
 * - as:    an icon component (e.g. a lucide icon). Omit to use children.
 * - size:  'xs' | 'sm' | 'md' | 'lg'  → 14 / 16 / 20 / 24px   (default 'md')
 * - tone:  'current' | 'muted' | 'subtle' | 'primary' | 'success' | 'warning'
 *          | 'danger' | 'info'   (default 'current' — inherits text color)
 * - label: accessible name. If given, the icon is exposed as role="img";
 *          otherwise it is aria-hidden (decorative).
 *
 * @example
 * import { Shield } from '@icons'
 * <Icon as={Shield} size="sm" tone="success" label="Protected" />
 * <Icon as={ChevronRight} />            // decorative, inherits color
 */
const SIZES = { xs: 14, sm: 16, md: 20, lg: 24 }

export const Icon = forwardRef(function Icon(
  { as: Comp, size = 'md', tone = 'current', label, className, children, ...props },
  ref,
) {
  const px = SIZES[size] ?? SIZES.md
  const classes = cx('vds-icon', tone !== 'current' && `vds-icon--${tone}`, className)
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }

  if (Comp) {
    return <Comp ref={ref} className={classes} width={px} height={px} {...a11y} {...props} />
  }

  return (
    <span
      ref={ref}
      className={classes}
      style={{ display: 'inline-flex', width: px, height: px }}
      {...a11y}
      {...props}
    >
      {children}
    </span>
  )
})

Icon.displayName = 'Icon'
