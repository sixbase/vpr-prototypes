import { forwardRef } from 'react'
import { cx } from '../../lib/cx.js'
import { Icon } from '../Icon/Icon.jsx'

/**
 * PageHeader
 *
 * The header band that opens a page inside an app shell — title, context, and
 * controls. Every part below the title is an optional SLOT, so one component
 * spans the range from a bare title to a rich header with an icon medallion,
 * status badges, a description, right-aligned actions, an in-page tab strip, and
 * a filter row. Pass only what a page needs. Composes Icon.
 *
 * Anatomy (top to bottom):
 *   [icon]  eyebrow                              [ actions ]
 *           Title  meta            ← one row
 *           subtitle
 *   ─ tabs ─────────────────────────────────────────────
 *   filters
 *
 * Props:
 * - eyebrow:  small context line above the title (e.g. a breadcrumb tail)
 * - icon:     leading icon component, shown in a soft medallion
 * - iconTone: medallion color — 'primary' (default) | 'success' | 'warning' | 'danger' | 'info'
 * - title:    the heading — string or node (required for a meaningful header)
 * - as:       element/tag for the title         (default 'h1')
 * - subtitle: a description line under the title
 * - meta:     node beside the title (status badges, counts)
 * - actions:  right-aligned controls (buttons, TimeframeSelect, …)
 * - tabs:     a node rendered as an in-page tab strip below the title block
 * - filters:  a node rendered as a filter row below the tabs
 * - className / children / native attributes
 *
 * @example
 * // Minimal — the Overview case
 * <PageHeader title="Overview" actions={<TimeframeSelect />} />
 *
 * @example
 * // Rich — every slot
 * <PageHeader
 *   icon={Mail}
 *   eyebrow="Integrated Email Security"
 *   title="Overview"
 *   meta={<Badge tone="success">Live</Badge>}
 *   subtitle="Threat activity across this account for the selected window."
 *   actions={<><Button variant="secondary">Export</Button><TimeframeSelect /></>}
 *   tabs={<><a className="is-active">Summary</a><a>Detections</a></>}
 *   filters={<Select …/>}
 * />
 */
export const PageHeader = forwardRef(function PageHeader(
  {
    eyebrow,
    icon,
    iconTone = 'primary',
    title,
    as: TitleTag = 'h1',
    subtitle,
    meta,
    actions,
    tabs,
    filters,
    className,
    children,
    ...props
  },
  ref,
) {
  const hasLead = icon || eyebrow || title || meta || subtitle
  return (
    <div ref={ref} className={cx('vds-page-header', className)} {...props}>
      <div className="vds-page-header__bar">
        {hasLead && (
          <div className="vds-page-header__lead">
            {icon && (
              <span
                className={cx('vds-page-header__icon', `vds-page-header__icon--${iconTone}`)}
                aria-hidden="true"
              >
                <Icon as={icon} size="md" />
              </span>
            )}
            <div className="vds-page-header__heading">
              {eyebrow && <div className="vds-page-header__eyebrow">{eyebrow}</div>}
              {(title || meta) && (
                <div className="vds-page-header__titlerow">
                  {title && <TitleTag className="vds-page-header__title">{title}</TitleTag>}
                  {meta && <div className="vds-page-header__meta">{meta}</div>}
                </div>
              )}
              {subtitle && <p className="vds-page-header__subtitle">{subtitle}</p>}
            </div>
          </div>
        )}
        {actions && <div className="vds-page-header__actions">{actions}</div>}
      </div>

      {tabs && <div className="vds-page-header__tabs">{tabs}</div>}
      {filters && <div className="vds-page-header__filters">{filters}</div>}
      {children}
    </div>
  )
})

PageHeader.displayName = 'PageHeader'
