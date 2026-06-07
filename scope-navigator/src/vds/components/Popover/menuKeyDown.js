/* ----------------------------------------------------------------------------
   menuKeyDown — roving arrow-key focus for a popover menu / listbox.

   Attach to the list container (onKeyDown). ArrowUp/Down move focus between
   the enabled items, wrapping at the ends; Home/End jump to the first/last.
   Works for any item role the menu pattern uses (option, menuitem, …) and
   skips disabled items, so Select, TimeframeSelect, and ad-hoc Popover menus
   all share one keyboard model instead of each re-implementing it.
   -------------------------------------------------------------------------- */
const ITEM_SELECTOR = [
  '[role="option"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
]
  .map((s) => `${s}:not([disabled]):not([aria-disabled="true"])`)
  .join(',')

export function menuKeyDown(e) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const items = Array.from(e.currentTarget.querySelectorAll(ITEM_SELECTOR))
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
