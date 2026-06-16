// Public component API — the entry consumers import.
//   import { Surface, Stack, Inline, Divider, Button, Badge, Text, Heading } from 'vipre-design-system'

// Layout primitives
export { Surface } from './Surface/index.js'
export { Card } from './Card/index.js'
export { StatTile } from './StatTile/index.js'
export { MetricCard } from './MetricCard/index.js'
export { Sparkline } from './Sparkline/index.js'
export { Table } from './Table/index.js'
export { Stack } from './Stack/index.js'
export { Inline } from './Inline/index.js'
export { Grid } from './Grid/index.js'
export { Divider } from './Divider/index.js'

// Controls & content
export { Icon } from './Icon/index.js'
export { Field } from './Field/index.js'
export { Input } from './Input/index.js'
export { Textarea } from './Textarea/index.js'
export { Checkbox } from './Checkbox/index.js'
export { Switch } from './Switch/index.js'
export { Select } from './Select/index.js'
export { Popover, menuKeyDown } from './Popover/index.js'
export { Spinner } from './Spinner/index.js'
export { Button } from './Button/index.js'
export { Badge } from './Badge/index.js'
export { Text, Heading } from './Text/index.js'

// Composites — domain components assembled from the primitives above.
export { SideNav } from './SideNav/index.js'
export { CurrentLeftNav, CurrentLeftNavLogOutIcon } from './CurrentLeftNav/index.js'
export { PageHeader } from './PageHeader/index.js'
export {
  ScopeNavigator,
  defaultTypeConfig,
  defaultStatusConfig,
  defaultSortOptions,
} from './ScopeNavigator/index.js'
export {
  TimeframeSelect,
  DEFAULT_TIMEFRAMES,
  CALENDAR_TIMEFRAMES,
  resolveTimeframe,
} from './TimeframeSelect/index.js'
