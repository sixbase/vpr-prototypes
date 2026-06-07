import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cx } from '../../lib/cx.js'
import { Surface } from '../Surface/Surface.jsx'

/* Merge a forwarded ref with local refs so a node is reachable by all of them. */
function mergeRefs(...refs) {
  return (node) => {
    for (const r of refs) {
      if (!r) continue
      if (typeof r === 'function') r(node)
      else r.current = node
    }
  }
}

/* The focusable descendants of a node, in DOM order. */
function getFocusable(root) {
  if (!root) return []
  return Array.from(
    root.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  )
}

const HASPOPUP = { menu: 'menu', listbox: 'listbox', dialog: 'dialog' }

/**
 * Popover
 *
 * The anchored-overlay primitive. A trigger element opens a floating Surface
 * panel positioned next to it — and, crucially, kept on-screen: it flips above
 * the trigger when there isn't room below, and clamps horizontally so it never
 * hangs off the viewport edge. This is the best-practice base every dropdown,
 * menu, combobox, and timeframe picker in the system should compose, instead of
 * each re-implementing (and getting wrong) placement, dismissal, and focus.
 *
 * Behaviour (all handled here, once):
 * - Placement: opens on the `placement` side, flips to the opposite side when
 *   space is tight, clamps left/right into the viewport, and caps its height to
 *   the available space (the panel scrolls rather than overflowing).
 * - Reposition: recomputes on scroll + resize while open.
 * - Dismissal: outside click (mousedown) and Escape both close it; Escape (and
 *   programmatic close via the render-prop) returns focus to the trigger.
 * - Focus: moves into the panel's first focusable element on open.
 * - ARIA: wires the trigger's aria-haspopup / aria-expanded / aria-controls to
 *   the panel's id + role.
 *
 * Controlled (`open` + `onOpenChange`) or uncontrolled (`defaultOpen`).
 *
 * Props:
 * - trigger:      a single focusable element. Cloned to attach the ref, toggle
 *                 handler, and ARIA — keep its own onClick, it still fires.
 * - children:     the panel content, or a render-prop `({ close }) => node`.
 * - placement:    'bottom-start'|'bottom-end'|'top-start'|'top-end' (default 'bottom-start').
 *                 The side flips automatically; the -start/-end edge is preferred.
 * - gap:          px between trigger and panel        (default 6)
 * - matchWidth:   panel min-width = trigger width     (default false)
 * - role:         'dialog' | 'menu' | 'listbox'       (default 'dialog')
 * - open / defaultOpen / onOpenChange: controlled / uncontrolled state.
 * - surfaceProps: extra props forwarded to the panel <Surface>.
 *
 * @example
 * <Popover role="menu" trigger={<Button>Options</Button>}>
 *   {({ close }) => <MenuList onPick={close} />}
 * </Popover>
 */
export const Popover = forwardRef(function Popover(
  {
    trigger,
    children,
    placement = 'bottom-start',
    gap = 6,
    matchWidth = false,
    role = 'dialog',
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    surfaceProps = {},
    className,
    panelClassName,
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const isControlled = openProp != null
  const [openState, setOpenState] = useState(defaultOpen)
  const open = isControlled ? openProp : openState
  const panelId = useId()

  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [pos, setPos] = useState(null)

  const setOpen = useCallback(
    (next) => {
      if (!isControlled) setOpenState(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }, [setOpen])

  // ---- Placement: flip vertically, clamp horizontally, cap height. ----
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const compute = () => {
      const wrap = wrapRef.current
      const panel = panelRef.current
      const trig = triggerRef.current
      if (!wrap || !panel || !trig) return
      const t = trig.getBoundingClientRect()
      const p = panel.getBoundingClientRect()
      const w = wrap.getBoundingClientRect()
      const m = 8 // viewport margin
      const vw = window.innerWidth
      const vh = window.innerHeight
      const [side, align = 'start'] = placement.split('-')

      const below = vh - t.bottom - gap
      const above = t.top - gap
      let up = side === 'top'
      if (!up && p.height > below && above > below) up = true
      if (up && p.height > above && below >= above) up = false

      const maxHeight = Math.max(120, (up ? above : below) - m)
      const top = up ? t.top - gap - Math.min(p.height, maxHeight) : t.bottom + gap
      let left = align === 'end' ? t.right - p.width : t.left
      left = Math.min(Math.max(left, m), Math.max(m, vw - m - p.width))

      setPos({ top: top - w.top, left: left - w.left, up, maxHeight })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true) // capture: catch scrolling ancestors
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [open, placement, gap])

  // ---- Focus into panel + Escape + outside-click dismissal. ----
  useEffect(() => {
    if (!open) return
    const focusables = getFocusable(panelRef.current)
    ;(focusables[0] ?? panelRef.current)?.focus({ preventScroll: true })

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeAndReturnFocus()
      }
    }
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open, setOpen, closeAndReturnFocus])

  const triggerEl = cloneElement(trigger, {
    ref: triggerRef,
    onClick: (e) => {
      trigger.props.onClick?.(e)
      setOpen(!open)
    },
    'aria-haspopup': HASPOPUP[role] ?? 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
  })

  return (
    <div ref={mergeRefs(ref, wrapRef)} className={cx('vds-popover', className)} {...props}>
      {triggerEl}
      {open && (
        <Surface
          ref={panelRef}
          id={panelId}
          role={role}
          aria-label={ariaLabel}
          tabIndex={-1}
          elevation="overlay"
          padding={null}
          radius="md"
          {...surfaceProps}
          className={cx(
            'vds-popover__panel',
            pos?.up && 'vds-popover__panel--up',
            panelClassName,
            surfaceProps.className,
          )}
          style={{
            position: 'absolute',
            top: pos ? pos.top : 0,
            left: pos ? pos.left : 0,
            maxHeight: pos?.maxHeight,
            minWidth: matchWidth ? triggerRef.current?.offsetWidth : undefined,
            visibility: pos ? 'visible' : 'hidden',
            ...surfaceProps.style,
          }}
        >
          {typeof children === 'function' ? children({ close: closeAndReturnFocus }) : children}
        </Surface>
      )}
    </div>
  )
})

Popover.displayName = 'Popover'
