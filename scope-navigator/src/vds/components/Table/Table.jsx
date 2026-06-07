import { forwardRef, useId } from 'react'
import { cx } from '../../lib/cx.js'
import { Surface } from '../Surface/Surface.jsx'
import { Checkbox } from '../Checkbox/Checkbox.jsx'

/* Read a row's stable key. `getRowKey` wins; otherwise fall back to row.id,
   then the index (last resort — fine for static data). */
function rowKeyOf(row, index, getRowKey) {
  if (typeof getRowKey === 'function') return getRowKey(row, index)
  if (row != null && row.id != null) return row.id
  return index
}

/* Read a cell's value: a column `render` wins, else the row's value at `key`. */
function cellOf(col, row, index) {
  if (typeof col.render === 'function') return col.render(row, index)
  return row?.[col.key]
}

/* The sort glyph — a self-contained caret pair (DS ships no icons). The active
   direction is conveyed by the `--asc`/`--desc` modifier (CSS dims the other). */
function SortGlyph({ direction }) {
  return (
    <span
      className={cx('vds-table__sort', direction && `vds-table__sort--${direction}`)}
      aria-hidden="true"
    >
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
        <path className="vds-table__sort-up" d="M4 0L7 4H1L4 0Z" fill="currentColor" />
        <path className="vds-table__sort-down" d="M4 12L1 8H7L4 12Z" fill="currentColor" />
      </svg>
    </span>
  )
}

/**
 * Table
 *
 * A data-driven table: declare `columns`, hand it `data`, and it renders the
 * head + body, owning alignment, density, zebra striping, a sticky header,
 * sortable headers, row selection (composing Checkbox), row-click drill-in, and
 * loading / empty states. Composes Surface for the bordered, rounded shell.
 *
 * Column shape: { key, header, align?, width?, render?, sortable?, className?, headerClassName? }
 * - key:    row property to read (and the sort key)
 * - header: column label (defaults to the key)
 * - align:  'left' (default) | 'center' | 'right'  — right for numerics
 * - width:  any CSS width (e.g. '120px', '20%')
 * - render: (row, index) => node  — custom cell (badges, links, actions…)
 * - sortable: mark the header clickable (sorting itself is controlled — see below)
 *
 * Sorting is controlled: pass `sort={{ key, direction }}` for the indicator and
 * `onSortChange` to react. Clicking a sortable header toggles its direction (or
 * starts at 'asc' on a new column); you sort `data` yourself in response.
 *
 * Selection is controlled: pass `selectedKeys` + `onSelectionChange`. The header
 * checkbox toggles the whole page (indeterminate when partial).
 *
 * Props:
 * - columns:     column[]  (required)
 * - data:        row[]     (required)
 * - getRowKey:   (row, i) => key   — defaults to row.id, then the index
 * - density:     'comfortable' (default) | 'compact'
 * - zebra:       striped rows                    (default false)
 * - stickyHeader: header stays put while the body scrolls (pair with `maxHeight`)
 * - maxHeight:   CSS max-height for the scroll body (enables vertical scroll)
 * - minWidth:    CSS min-width for the table — below it the shell scrolls
 *                horizontally instead of crushing columns (responsive default)
 * - sort:        { key, direction: 'asc' | 'desc' }   — controlled sort indicator
 * - onSortChange: (next: { key, direction }) => void
 * - selectable:  show the selection column          (default false)
 * - selectedKeys: array | Set of selected row keys
 * - onSelectionChange: (keys[]) => void
 * - onRowClick:  (row, index) => void  — makes rows interactive (hover + keyboard)
 * - loading:     show skeleton rows                 (default false)
 * - skeletonRows: how many while loading            (default 5)
 * - empty:       node shown when data is empty      (default 'No data')
 * - caption:     accessible <caption> (visually hidden) describing the table
 * - all Surface props pass through (radius, elevation, bordered, raised, as…)
 *
 * @example
 * <Table
 *   columns={[
 *     { key: 'name', header: 'Device' },
 *     { key: 'status', header: 'Status', render: (r) => <Badge tone={r.tone} dot>{r.status}</Badge> },
 *     { key: 'seen', header: 'Last seen', align: 'right', sortable: true },
 *   ]}
 *   data={devices}
 *   sort={sort}
 *   onSortChange={setSort}
 * />
 */
export const Table = forwardRef(function Table(
  {
    columns = [],
    data = [],
    getRowKey,
    density = 'comfortable',
    zebra = false,
    stickyHeader = false,
    maxHeight,
    minWidth,
    sort,
    onSortChange,
    selectable = false,
    selectedKeys,
    onSelectionChange,
    onRowClick,
    loading = false,
    skeletonRows = 5,
    empty = 'No data',
    caption,
    radius,
    className,
    ...props
  },
  ref,
) {
  const captionId = useId()
  const interactiveRows = typeof onRowClick === 'function'
  const totalCols = columns.length + (selectable ? 1 : 0)

  // Selection set (accepts an array or a Set). Plain code — no per-row state.
  const selected = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys ?? [])
  const allKeys = data.map((row, i) => rowKeyOf(row, i, getRowKey))
  const selectedCount = allKeys.filter((k) => selected.has(k)).length
  const allSelected = data.length > 0 && selectedCount === data.length
  const someSelected = selectedCount > 0 && !allSelected

  const emitSelection = (next) => onSelectionChange?.([...next])

  const toggleAll = () => {
    if (!onSelectionChange) return
    emitSelection(allSelected ? new Set() : new Set(allKeys))
  }

  const toggleRow = (key) => {
    if (!onSelectionChange) return
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    emitSelection(next)
  }

  const handleSort = (col) => {
    if (!col.sortable || !onSortChange) return
    const isActive = sort?.key === col.key
    const direction = isActive && sort?.direction === 'asc' ? 'desc' : 'asc'
    onSortChange({ key: col.key, direction })
  }

  const headerCell = (col) => {
    const active = sort?.key === col.key
    const dir = active ? sort.direction : undefined
    const content = col.header ?? col.key
    return (
      <th
        key={col.key}
        scope="col"
        style={col.width ? { width: col.width } : undefined}
        aria-sort={col.sortable ? (active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
        className={cx(
          'vds-table__th',
          `vds-table__cell--${col.align ?? 'left'}`,
          col.sortable && 'vds-table__th--sortable',
          active && 'vds-table__th--active',
          col.headerClassName,
        )}
      >
        {col.sortable && onSortChange ? (
          <button type="button" className="vds-table__sort-btn" onClick={() => handleSort(col)}>
            <span>{content}</span>
            <SortGlyph direction={dir} />
          </button>
        ) : (
          content
        )}
      </th>
    )
  }

  const bodyRows = () => {
    if (loading) {
      return Array.from({ length: skeletonRows }).map((_, i) => (
        <tr key={`sk-${i}`} className="vds-table__row vds-table__row--skeleton">
          {selectable && (
            <td className="vds-table__td vds-table__cell--select">
              <span className="vds-table__skeleton" style={{ width: '1rem' }} aria-hidden="true" />
            </td>
          )}
          {columns.map((col) => (
            <td key={col.key} className={cx('vds-table__td', `vds-table__cell--${col.align ?? 'left'}`)}>
              <span className="vds-table__skeleton" aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))
    }

    if (data.length === 0) {
      return (
        <tr className="vds-table__row vds-table__row--empty">
          <td className="vds-table__td vds-table__empty" colSpan={totalCols}>
            {empty}
          </td>
        </tr>
      )
    }

    return data.map((row, i) => {
      const key = rowKeyOf(row, i, getRowKey)
      const isSelected = selected.has(key)
      return (
        <tr
          key={key}
          className={cx(
            'vds-table__row',
            interactiveRows && 'vds-table__row--interactive',
            isSelected && 'vds-table__row--selected',
          )}
          aria-selected={selectable ? isSelected : undefined}
          onClick={interactiveRows ? () => onRowClick(row, i) : undefined}
          onKeyDown={
            interactiveRows
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(row, i)
                  }
                }
              : undefined
          }
          tabIndex={interactiveRows ? 0 : undefined}
          role={interactiveRows ? 'button' : undefined}
        >
          {selectable && (
            // Stop propagation so toggling the box never fires the row's onClick.
            <td
              className="vds-table__td vds-table__cell--select"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => toggleRow(key)}
                aria-label={`Select row ${i + 1}`}
              />
            </td>
          )}
          {columns.map((col) => (
            <td
              key={col.key}
              className={cx('vds-table__td', `vds-table__cell--${col.align ?? 'left'}`, col.className)}
            >
              {cellOf(col, row, i)}
            </td>
          ))}
        </tr>
      )
    })
  }

  return (
    <Surface
      ref={ref}
      padding={null}
      // Default: let the table's own 6px corner apply (no Surface radius class).
      // Pass `radius` to opt into a token step instead.
      radius={radius ?? null}
      className={cx(
        'vds-table',
        `vds-table--${density}`,
        zebra && 'vds-table--zebra',
        stickyHeader && 'vds-table--sticky',
        interactiveRows && 'vds-table--row-interactive',
        className,
      )}
      {...props}
    >
      <div
        className="vds-table__scroll"
        style={maxHeight != null ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table
          className="vds-table__el"
          style={minWidth != null ? { minWidth } : undefined}
          aria-describedby={caption ? captionId : undefined}
        >
          {caption && (
            <caption id={captionId} className="vds-table__caption">
              {caption}
            </caption>
          )}
          <thead className="vds-table__head">
            <tr>
              {selectable && (
                <th scope="col" className="vds-table__th vds-table__cell--select">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map(headerCell)}
            </tr>
          </thead>
          <tbody className="vds-table__body">{bodyRows()}</tbody>
        </table>
      </div>
    </Surface>
  )
})

Table.displayName = 'Table'
