# Scope Navigator — Structural Snapshot

> Snapshot of the `scope-navigator` prototype (the only one of the five sibling prototypes that uses partner/reseller/distributor concepts; chosen as the target of the partner taxonomy revision). Captured 2026-05-04.
>
> Stack: React 19 + Vite 8 + Tailwind 4 (`@tailwindcss/vite`) + recharts + lucide-react. **No TypeScript** — all source is `.jsx`/`.js`. Entry point is `src/main.jsx` → `src/App.jsx`.

---

## 1. Component & Screen Inventory

All files live in `src/`. "Used" means reachable from `App.jsx` through the live nav (or transitively reachable from a reachable file). The default landing nav item is **Customer Management B**.

| File | Purpose | Used? |
|---|---|---|
| `main.jsx` | React root; renders `<App />` in `<StrictMode>`. | Yes (entry) |
| `App.jsx` | Top-level shell: left sidebar nav, edge-to-edge breadcrumb, dark-mode toggle, page router (switches on `activePage` string). Owns `provisioningModal` and toast state. Wraps everything in `ScopeProvider`. | Yes |
| `ScopeContext.jsx` | `ScopeProvider` + `useScope` hook. Stores `path` (array of entities from root to current), exposes `navigate`, `drillDown`, `teleport`, plus derived `currentEntity`, `currentLevel`, `childEntities`, `teleportedSegments`. | Yes |
| `ScopeNavigator.jsx` | The breadcrumb across the top of the app — root pill ("All Accounts") + one segment per path entry, each with a child dropdown popover, plus an overflow ellipsis menu, a "Future State" toggle, and the search trigger. | Yes |
| `ScopeSummaryStrip.jsx` | Inline summary bar shown above the legacy "Customer Management" page: descendant counts (with All vs. Direct toggle), package KPIs with popover, device stats. | Yes (legacy CM page) |
| `EntityList.jsx` | Left-pane list of children at the current scope. Search (with "Include all descendants" deep-search), sort, status filter, type-grouped headers, scope-aware "Add" button. | Yes |
| `EntityDetail.jsx` | Right-pane detail view for a selected entity. ~1,445 lines: header, contact card, business-health section (`showFuture`), period selector, package adoption table, device/operations cards, expandable children section, embedded `ChildrenListView` panel, embedded `AddProductModal`. Exports `default EntityDetail` and named `ChildrenListView`. | Yes |
| `CustomerManagementPageB.jsx` | The default "Customer Management B" page. When no entity is scoped → shows `DashboardPage`. When scoped → shows `EntityDetail`; can flip into a "Browse all" pane that mounts `EntityList` + `EntityDetail` side-by-side. | Yes (default landing) |
| `DashboardPage.jsx` | Scope-aware dashboard: scope card, descendant-count tiles (clickable → `ChildrenListView`), package adoption block, device overview. Embedded inside Customer Management B when no entity is scoped, and rendered standalone for the "Dashboard" nav item. | Yes |
| `DevicesPage.jsx` | "Devices" nav item. Devices list with hierarchy-filter side panel (`HierarchyFilterPanel`) for selecting which descendant customers to include, plus local facet filters. | Yes |
| `DevicesPageB.jsx` | "Devices B" alternate. Same shape as `DevicesPage` but inlines its own hierarchy filter panel rather than importing `HierarchyFilterPanel`. | Yes |
| `HierarchyFilterPanel.jsx` | Tree/search picker for selecting customer subsets within the current scope. Used by `DevicesPage` only. | Yes (via `DevicesPage`) |
| `PoliciesPage.jsx` | "Policies" nav item — variant `"ep"` or `"es"`. Hard-coded EP_POLICIES / ES_POLICIES arrays; filter by status/type. Imports `useScope` and `typeConfig` but does **not** use scope (no scope-derived data). | Yes |
| `CommandPalette.jsx` | Global ⌘K / Ctrl+K palette: searches the flat entity list, optionally scoped by category (mirrors left-nav). | Yes |
| `ProvisioningModal.jsx` | Multi-flow modal: type-selection step, Add Customer flow, Add Reseller flow (delegates to `AddPartnerFlow`), Add Distributor flow (same), Add Product flow. Also exports `SuccessToast`. | Yes |
| `config.jsx` | `typeOrder = ['distributor','reseller','customer']`, `typeConfig` (per-type icon/colors), `statusConfig`, `pkgIconMap` + `defaultPkgIcon`, `sortOptions`, `applySorting`, `<StatusBadge>`, `<TypeBadge>`. | Yes |
| `data.js` | Mock-data generator (deterministic mulberry32 PRNG), root export `mockData`, plus utilities: `findEntityById`, `getSiblingsAtLevel`, `flattenEntities`, `flatEntityList`, `flattenFrom`, `countDescendantsByType`, `generateDevicesForCustomer`, `collectDevicesInScope`, `computeDeviceStats`, `VIPRE_PACKAGES`, `VIPRE_ADD_ONS`, `genPartnerPackages`, `genCustomerPackages`, `collectPackageAdoption`, `hash`. | Yes |
| `useClickOutside.js` | One-line dismiss hook used by every popover/menu. | Yes |
| `index.css` | Tailwind v4 entry, `@custom-variant dark`, `@theme { --font-sans }`, custom keyframes (`palette-in`, `teleport-highlight`), scrollbar styling. | Yes |
| `MetadataBar.jsx` | Renders type-count chips for an entity list. **Imported by no other file.** | **Orphaned** |
| `assets/` | Static SVGs + `hero.png`. | Mixed (logo SVG inlined in `App.jsx`; `vipre-logo.svg` exists but isn't imported) |

**Page routing** (in `App.jsx`, on `activePage` string): `Dashboard`, `Customer Management`, `Customer Management B` (default), `Devices`, `Devices B`, `EP Policies`, `ES Policies`. Every other left-nav item (`Threats & Incidents`, `EP Configurations`, `Message Logs`, `Analytics`, `Allow & Deny`, `Service Settings`, `Domains`, `Reporting`, `Users & Roles`, `Settings`) renders a literal `Placeholder` div.

---

## 2. Entity & Data Model

There are **no TypeScript types**. Below is the shape every entity actually has, transcribed from the `makeEntity` factory in `src/data.js` (with a couple of children variants observed). Every node — distributor, reseller, customer — uses **the same shape**; only the `type` discriminator and a few branches inside `business.productAdoption` differ.

### Entity (Distributor | Reseller | Customer)

```ts
interface Entity {
  id: string;                          // deterministic v4-format UUID
  name: string;
  type: 'distributor' | 'reseller' | 'customer';
  status: 'active' | 'trial' | 'suspended';
  children: Entity[];                  // empty array for customers (always leaves)
                                       // resellers can hold reseller + customer children
                                       // distributors can hold distributor + reseller + customer children

  devices: number;                     // top-level scalar (separate from products.endpoint.devicesProtected)
  licenses: number;
  threatsBlocked: number;
  lastActive: string;                  // ISO timestamp
  region: 'North America' | 'Europe' | 'Asia Pacific' | 'Latin America' | 'Middle East';

  address: {
    street: string;
    city: string;
    state: string;                     // possibly ''
    zip: string;
    country: string;
    tz: string;                        // IANA TZ
    lang: string;                      // human-readable language name
  };

  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;                     // formatted "+1 (NNN) NNN-NNNN"
  };

  products: {
    endpoint: {
      devicesProtected: number;
      threatsBlocked: number;
      scansCompleted: number;
      complianceRate: number;          // 0-100
    };
    emailSecurity: {
      emailsScanned: number;
      threatsCaught: number;
      phishingBlocked: number;
      spamFiltered: number;
    };
    safeSend: {
      emailsSent: number;
      attachmentsScanned: number;
      dlpTriggers: number;
      recipientsVerified: number;
    };
  };

  business: {
    mrr: number;
    seatsLicensed: number;
    seatsConsumed: number;
    utilizationRate: number;           // 0-10 (note: not 0-100)
    opportunityScore: number;          // 10-100
    renewals: { d30: number; d60: number };
    churnRisk: number;
    netNew: number;
    churned: number;
    activeTrials: number;              // children.filter(c => c.status === 'trial').length

    productAdoption: {
      endpoint: ProductAdoption;
      emailSecurity: ProductAdoptionWithBundle;
      safeSend: ProductAdoptionWithBundle;
      bundles: Bundle[];               // empty if customer without TEP; otherwise [TEP]
    };
  };

  operations: {
    criticalIssues: number;            // 0 most of the time
    complianceScore: number;           // 70-98
    configDrift: number;
    agentVersions: { 'v4.2': number; 'v4.1': number; 'v3.x': number };  // percentages summing ~100
    domainHealth: { total: number; healthy: number; issues: number };
    quarantineDepth: number;
  };
}

interface ProductAdoption {
  subscribers: number;
  pctOfBook: number;
  avgSeats: number;
  avgUtilization: number;
  tiers: Tier[];
  addOns: AddOn[];
}

interface ProductAdoptionWithBundle extends ProductAdoption {
  bundleContributionPct: number;
  hasTEP: boolean | null;              // null for partners (distributor/reseller); boolean for customers
}

interface Tier {
  name: string;
  count: number;
  monthly: number;
  annual: number;
  sourceType?: 'standalone' | 'bundle';
  bundleName?: string;
  bundleId?: string;
}

interface AddOn {
  name: string;
  subscribers: number;
  total: number;
}

interface Bundle {
  id: 'total-email-protection';        // only one bundle ID is generated
  name: string;
  includedProductIds: string[];        // e.g. ['emailSecurity', 'safeSend']
  subscribedPct: number;
  seats: number;
  utilization: number;
  productBreakdown: { productId: string; productName: string; seats: number; utilization: number }[];
}

interface Device {                     // generated per-customer by generateDevicesForCustomer
  id: string;                          // `${customer.id}-dev-${i}`
  hostname: string;                    // DESKTOP-/LAPTOP-/SERVER- prefix
  customerId: string;
  customer: string;                    // customer name
  os: 'Windows 11' | 'Windows 10' | 'macOS 14' | 'macOS 13' | 'Ubuntu 22.04' | 'Windows Server 2022';
  agentVersion: '4.2.1' | '4.1.8' | '3.9.2';
  compliance: 'compliant' | 'non-compliant' | 'pending-scan';
  lastSeen: string;                    // ISO
}

interface PartnerPackage {             // returned by genPartnerPackages — for distributor + reseller
  id: string;                          // VIPRE_PACKAGES id, e.g. 'tep'
  name: string;                        // "VIPRE Total Email Protection"
  customers: number;                   // # of subordinate customers using this package
  seats: number;
  util: number;                        // 30-95
}

interface CustomerPackage {            // returned by genCustomerPackages — for type === 'customer'
  id: string;
  name: string;
  status: 'active' | 'trial';
  declared: number;                    // licensed seats
  actual: number;                      // consumed; can exceed declared
  util: number;                        // round(actual/declared * 100), capped at 200
  addOns: string[];                    // subset of VIPRE_ADD_ONS
}
```

### Hierarchy edge model

There is **no edge object**. The hierarchy is encoded purely by `Entity.children: Entity[]` — i.e. parent owns children by reference inclusion. There is no `parentId`, no `path`, no edge metadata (e.g. relationship type, contract, ownership share). Every edge is a containment edge of the same kind.

The "current path" used for navigation is **derived at runtime** by `flattenEntities` (which records `path: Entity[]` for each node) or by `findEntityById` (which walks back up while searching).

### "Root" as a synthetic entity

There is no real root node. When the scope is at the top, code constructs a synthetic placeholder:

```js
// DashboardPage.jsx
const rootSynthetic = { type: 'root', name: 'All Accounts', children: mockData };
```

`'root'` is **not** in `typeOrder` and **not** a key in `typeConfig`, so anything that does `typeConfig[entity.type]` on the synthetic must guard for it (most code does `currentEntity?.type` and falls through; `DashboardPage` has explicit logic).

---

## 3. Mock / Seed Data Shape

`mockData` is generated once by `generateData()` in `src/data.js` and frozen at module load. Volume: 2 large named distributors (CyberShield Partners, TrustPoint Solutions) + 41 additional named distributors + 5 top-level resellers + 3 top-level customers — roughly 50 root entities and a few thousand descendants total (the comment in `data.js` says "21,000+ entities").

Below is one full example of each entity type at the moment they're created. (Numbers vary across seeds; the *shape* is identical.)

### Distributor

```js
{
  id: '8f2a1e9c-7b6d-4f0a-9c3e-1a4b2c5d6e7f',
  name: 'CyberShield Partners',
  type: 'distributor',
  status: 'active',
  children: [ /* sub-distributor, 8 direct resellers, 8 direct customers */ ],

  devices: 1432,
  licenses: 2100,
  threatsBlocked: 847,
  lastActive: '2026-04-30T14:22:00.000Z',
  region: 'North America',

  address: {
    street: '350 Fifth Avenue',
    city: 'New York',
    state: 'NY',
    zip: '10118',
    country: 'United States',
    tz: 'America/New_York',
    lang: 'English',
  },

  contact: {
    firstName: 'James',
    lastName: 'Anderson',
    email: 'james.anderson@cybershieldpartners.com',
    phone: '+1 (415) 234-5678',
  },

  products: {
    endpoint:      { devicesProtected: 1820, threatsBlocked: 1245, scansCompleted: 9870, complianceRate: 94 },
    emailSecurity: { emailsScanned: 56000, threatsCaught: 540, phishingBlocked: 320, spamFiltered: 4200 },
    safeSend:      { emailsSent: 18000, attachmentsScanned: 5400, dlpTriggers: 75, recipientsVerified: 12000 },
  },

  business: {
    mrr: 18500, seatsLicensed: 2100, seatsConsumed: 1638, utilizationRate: 7.8,
    opportunityScore: 62,
    renewals: { d30: 4, d60: 6 },
    churnRisk: 2, netNew: 5, churned: 1,
    activeTrials: 3,
    productAdoption: {
      endpoint: {
        subscribers: 2400, pctOfBook: 92, avgSeats: 130, avgUtilization: 82,
        tiers: [
          { name: 'Endpoint Essentials',   count: 192,  monthly:  62,  annual: 130 },
          { name: 'Endpoint Standard',     count: 528,  monthly: 198,  annual: 330 },
          { name: 'Endpoint Professional', count: 600,  monthly: 240,  annual: 360 },
          { name: 'Endpoint Advanced',     count: 432,  monthly: 173,  annual: 259 },
          { name: 'Endpoint Enterprise',   count: 288,  monthly: 115,  annual: 173 },
          { name: 'Endpoint Premium',      count: 240,  monthly:  96,  annual: 144 },
          { name: 'Endpoint Elite',        count: 120,  monthly:  60,  annual:  60 },
        ],
        addOns: [
          { name: 'Patch Management',       subscribers: 1320, total: 2400 },
          { name: 'EDR',                    subscribers:  672, total: 2400 },
          { name: 'Vulnerability Scanning', subscribers:  336, total: 2400 },
        ],
      },
      emailSecurity: {
        subscribers: 1800, pctOfBook: 78, avgSeats: 220, avgUtilization: 86,
        bundleContributionPct: 42, hasTEP: null,         // null because not a customer
        tiers: [ /* 8 SEG tiers + 1 'via Total Email Protection' bundle row */ ],
        addOns: [ /* 3 SEG add-ons */ ],
      },
      safeSend: {
        subscribers: 700, pctOfBook: 32, avgSeats: 60, avgUtilization: 48,
        bundleContributionPct: 14, hasTEP: null,
        tiers: [ /* 6 SafeSend tiers + bundle row */ ],
        addOns: [ /* 2 SafeSend add-ons */ ],
      },
      bundles: [{
        id: 'total-email-protection',
        name: 'Total Email Protection',
        includedProductIds: ['emailSecurity', 'safeSend'],
        subscribedPct: 42, seats: 540, utilization: 76,
        productBreakdown: [
          { productId: 'emailSecurity', productName: 'Email Security', seats: 540, utilization: 80 },
          { productId: 'safeSend',      productName: 'SafeSend',       seats: 540, utilization: 62 },
        ],
      }],
    },
  },

  operations: {
    criticalIssues: 0, complianceScore: 89, configDrift: 7,
    agentVersions: { 'v4.2': 68, 'v4.1': 24, 'v3.x': 8 },
    domainHealth: { total: 28, healthy: 25, issues: 3 },
    quarantineDepth: 87,
  },
}
```

### Reseller

```js
{
  id: 'a3c2f8b1-...-...',
  name: 'Apex Security Solutions',
  type: 'reseller',
  status: 'active',
  children: [ /* 35 customers — leaves */ ],

  devices: 312,
  licenses: 540,
  threatsBlocked: 412,
  lastActive: '2026-05-01T09:15:00.000Z',
  region: 'Europe',

  address: { /* same shape as above */ },
  contact: { /* same shape as above */ },
  products: { /* same shape as above */ },

  business: {
    mrr: 4200, seatsLicensed: 540, seatsConsumed: 412, utilizationRate: 7.6,
    opportunityScore: 71,
    renewals: { d30: 3, d60: 5 },
    churnRisk: 2, netNew: 4, churned: 1,
    activeTrials: 2,
    productAdoption: {
      endpoint:      { /* subscribers ~600-1200 */ },
      emailSecurity: { /* hasTEP: null, bundleContributionPct: ~35-52 */ },
      safeSend:      { /* hasTEP: null */ },
      bundles:       [{ id: 'total-email-protection', /* … */ }],
    },
  },

  operations: { /* same shape, smaller numbers */ },
}
```

### Customer (always a leaf)

```js
{
  id: '1f4e9c2a-...-...',
  name: 'Meridian Healthcare Group',
  type: 'customer',
  status: 'active',
  children: [],                         // always empty

  devices: 84,
  licenses: 110,
  threatsBlocked: 47,
  lastActive: '2026-05-02T16:40:00.000Z',
  region: 'North America',

  address: { /* … */ },
  contact: { /* … */ },
  products: { /* … */ },

  business: {
    mrr: 850, seatsLicensed: 110, seatsConsumed: 92, utilizationRate: 8.4,
    opportunityScore: 38,
    renewals: { d30: 0, d60: 0 },        // small/zero for leaves
    churnRisk: 0, netNew: 0, churned: 0,
    activeTrials: 0,
    productAdoption: {
      endpoint: { /* tiers without bundle rows */ },
      emailSecurity: {
        bundleContributionPct: 0,        // customers never contribute via bundle here
        hasTEP: true,                    // boolean for customers (true ~55% of the time)
        tiers: [ /* SEG tiers, no 'via TEP' row */ ],
        // …
      },
      safeSend: { bundleContributionPct: 0, hasTEP: true, /* … */ },
      bundles: [                         // populated only if hasTEP
        {
          id: 'total-email-protection',
          name: 'Total Email Protection',
          includedProductIds: ['emailSecurity', 'safeSend'],
          subscribedPct: 100,            // single-customer view
          seats: 180, utilization: 82,
          productBreakdown: [
            { productId: 'emailSecurity', productName: 'Email Security', seats: 180, utilization: 87 },
            { productId: 'safeSend',      productName: 'SafeSend',       seats: 180, utilization: 67 },
          ],
        },
      ],
    },
  },

  operations: { /* same shape */ },
}
```

### Hierarchy "edge"

There is no edge object. The relationship is the array-membership of `child` inside `parent.children`. No metadata, no contract type, no ownership share, no relationship status — just containment.

---

## 4. Hierarchy Assumptions

**Structure in code.** Nested adjacency: `Entity.children: Entity[]`. There is no flat list with `parentId`. The current path is reconstructed by walks (`flattenEntities`, `findEntityById`) and stored in `ScopeContext` as `path: Entity[]`.

**Levels assumed.** The code is structurally **recursive** — `flattenEntities` and `findEntityById` walk to any depth, and `ScopeContext.path` is unbounded. But the codebase carries strong **3-level assumptions** baked in via `typeOrder` and the type discriminator:

- `typeOrder = ['distributor', 'reseller', 'customer']` (in `config.jsx`) — the depth ordering for sorting and grouping.
- The synthetic root has `type: 'root'`, which is **not** in `typeOrder` and **not** in `typeConfig`. So root + 3 levels = 4 conceptual tiers, but only 3 are first-class.
- Mock data nests exactly 3 deep (Distributor → Distributor → Reseller → Customer is possible at most: see `subDist1`, which contains resellers; one nested case `subReseller` puts a reseller under a reseller).
- Customers are hard-coded as leaves: many code paths short-circuit on `entity.type === 'customer'` (see §6).

**Partner-type distinctions.** Every type — distributor, reseller, customer — is rendered/handled with the same `Entity` shape and the same fields. The only places where the type matters:

- **`typeConfig`** drives icon, color, label per type.
- **`isLeaf` / `entity.type === 'customer'`** — gates package functions, panels, and metric scaling (see §6).
- **`ScopeAddButton` (`EntityList.jsx:160`)** — the only place where distributor and reseller diverge: distributors can add (distributor, reseller, customer); resellers can only add (reseller, customer); customers can't add anything.
- **`PackageAdoptionTable` (`EntityDetail.jsx:316`)** — when expanding a package row, the synthetic customer-row generator picks types from `['distributor','reseller','customer']` if the entity is a distributor, otherwise `['reseller','customer']`.
- **`makeEntity` device/license/MRR scaling** — uses three keyed scales `{ distributor, reseller, customer }`.
- **Package generation** — `genPartnerPackages` is used for *both* distributor and reseller (treated identically); `genCustomerPackages` for customer only.

So: distributor vs reseller is a **mostly cosmetic** distinction (icon, label, name pool, scale numbers) plus the one provisioning rule. The deep behavioral split is **partner (distributor|reseller) vs customer**.

---

## 5. Scope / Active Selection State

**Tracked in.** React Context (`ScopeContext.jsx`), in-memory only. **Not** in the URL — no router is mounted; refreshing returns to the empty scope. `useState` inside the provider holds `path: Entity[]` and `teleportedSegments: Set<string>`.

**API.** `useScope()` returns:

```js
{
  path,                  // Entity[] from immediate-root-child to current
  currentEntity,         // path.at(-1) ?? null
  currentLevel,          // path.length === 0 ? 'root' : path.at(-1).type
  childEntities,         // currentEntity?.children ?? mockData
  teleportedSegments,    // Set<string> of entity IDs that just teleported, cleared after 600ms
  navigate(newPath),     // setPath(newPath) — full replace
  drillDown(entity),     // setPath(prev => [...prev, entity])
  teleport(entity, fullPath),  // [...prev, ...fullPath] then trigger highlight animation
}
```

**Where the breadcrumb / scope indicator is rendered.**

- `<ScopeNavigator>` — the breadcrumb across the top of the app, mounted at the top of `App.jsx` (above the sidebar and content). Always visible regardless of the active page. Each segment is either a root pill ("All Accounts"), an ancestor segment (with a child dropdown), or the active segment (also with a child dropdown). Uses a `ResizeObserver` to collapse middle segments into an ellipsis menu when overflow occurs.
- `<ScopeSummaryStrip>` — only on the legacy "Customer Management" page, between the page header and the list/detail panes.
- The dashboard scope card in `DashboardPage.jsx` — only when the dashboard is rendered.
- Per-entity headers inside `EntityDetail.jsx` — show name + type badge + status pill of whichever entity is selected (independent of the path).

**Drill-down state updates.** Three handler styles, all defined in pages, all wired through `useScope` plus a local `selectedEntity` state for the detail pane:

- **`handleDrillDown(entity)`** — calls `drillDown(entity)` to push onto the path; sets `selectedEntity` to `entity.children?.[0] ?? null` (so the right pane re-populates).
- **`handleNavigate(newPath)`** — calls `navigate(newPath)` for arbitrary jumps (root pill, ancestor pill, search palette result).
- **`handleTeleport(entity, fullPath)`** — used when the user clicks a deep search result inside `EntityList`. Calls `teleport(entity, fullPath)` which appends the *entire* descent path; the `teleportedSegments` set then drives a one-shot highlight animation on the breadcrumb (cleared after 600ms via `setTimeout`).

The breadcrumb's per-segment ▼ dropdowns are **drill-down only** in this code: they always treat the dropdown as "drill into child" (`getDropdownHeader(items, 'drill')`), although a `'switch'` mode is implemented in the helper but never invoked.

---

## 6. Capability Gating

There is no central capability/permission system. Gating is **scattered, conditional on `type` or `currentLevel`**, and falls into a few buckets:

**Provisioning gates** (the only place where distributor vs reseller diverges in behavior).

- `EntityList.jsx:160` — `ScopeAddButton`:
  ```js
  if (!currentLevel || currentLevel === 'customer') return null;
  const availableTypes =
    currentLevel === 'root'        ? ['distributor', 'reseller', 'customer'] :
    currentLevel === 'distributor' ? ['distributor', 'reseller', 'customer'] :
    /* reseller */                   ['reseller', 'customer'];
  ```
- `ProvisioningModal.jsx` — exposes 4 flows (`addCustomer`, `addReseller`, `addDistributor`, `addProduct`). `AddResellerFlow` and `AddDistributorFlow` are thin wrappers around the same `AddPartnerFlow`. Add-customer and add-product are separate flows.

**Customer-as-leaf gates.**

- `EntityList.jsx:74` — `isLeaf = entity.type === 'customer'` hides the "Manage" button on customer rows.
- `EntityDetail.jsx:1001` — `isLeaf = entity.type === 'customer' || !hasChildren`.
- `EntityDetail.jsx:1174` — hides the entire **Business Health / Overview** section when `entity.type !== 'customer'` is **false** (i.e., the section is *only* shown for non-customers).
- `DevicesPage.jsx:449` and `DevicesPageB.jsx:690` — `showPanelTrigger = currentLevel !== 'customer'` hides the hierarchy filter panel trigger when scoped to a customer (no descendants to filter).
- `DevicesPage.jsx:550` and `DevicesPageB.jsx:761` — render a plain customer name vs. a clickable "navigate to this customer" link based on `currentLevel === 'customer'`.
- `CommandPalette.jsx:328` — comment `// Business — non-customer only`; the business detail block is skipped for customers via `isCustomer = entity.type === 'customer'`.

**Customer vs. partner content gates** (no permission semantics, just different views).

- `EntityDetail.jsx:355` — `PackageAdoptionTable` branches: `if (isCustomer) { … genCustomerPackages(entityId) }` else `genPartnerPackages(entityId)`. Customer table shows status/declared/actual; partner table shows customers/seats with an expandable child list.
- `EntityDetail.jsx:316-318` — partner row generator allowed types depend on parent: `entityType === 'distributor' ? ['distributor','reseller','customer'] : ['reseller','customer']`.
- `data.js:208`, `:240`, `:267`, `:283-294` — `productAdoption` shape diverges: `bundleContributionPct = 0` for customers, `hasTEP` is `boolean` for customers and `null` for partners, customer bundles list contains `[TEP]` only if `hasTEP` is true (~55%).
- `data.js:556-569` — `collectDevicesInScope` walks children for partners, returns just the customer's own devices for customers.
- `data.js:687-701` — `collectPackageAdoption` calls `addCustomer` for leaves, walks `children` and calls `addEntity` (which dispatches to `addCustomer` or `addPartner`) for partners.

**Status gates.** The status enum `{active, trial, suspended}` drives badge color only; no action is gated by status anywhere I found.

**Future-state gates.** The `showFuture` boolean (toggled by the "Future State" pill in the breadcrumb) is a thin display switch passed through `App.jsx` → `EntityDetail` / `CustomerManagementPageB`. It changes the header label ("Business Health" vs "Overview") and reveals the `OpportunityGauge`. Nothing destructive is gated by it.

**Roles / users / RBAC.** None. There is no user object, no role check, no `canX` helper. "Users & Roles" is a left-nav placeholder only.

---

## 7. Theme & Tokens

**Tailwind.** Tailwind 4 via `@tailwindcss/vite` (no `tailwind.config.js`, no `postcss.config.js`). Configuration is inline in `src/index.css`:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, …;
}
```

**Custom theme tokens.** Only `--font-sans` is declared in `@theme`. Everything else is Tailwind's default palette. There are **no custom colors, no spacing tokens, no semantic CSS variables** beyond the font family.

**"Design tokens" via convention.** There are repeated per-type literal sets in `config.jsx#typeConfig`:

```js
distributor: { color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/30',   ring: 'ring-amber-200 dark:ring-amber-800',   stroke: '#d97706' }
reseller:    { color: 'text-teal-600  dark:text-teal-400',    bg: 'bg-teal-50  dark:bg-teal-900/30',    ring: 'ring-teal-200  dark:ring-teal-800',    stroke: '#0d9488' }
customer:    { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30', ring: 'ring-violet-200 dark:ring-violet-800', stroke: '#8b5cf6' }
```

…and `statusConfig` with per-status pill / dot classes, and `pkgIconMap` with per-package icon + color. These are JS objects, not CSS variables.

**Dark mode.** Wired up. `App.jsx:60-62` toggles the `dark` class on `document.documentElement` via a local `dark` state and a `Sun` / `Moon` button at the bottom of the left nav. `index.css` also sets `color-scheme: dark` on `.dark` and provides separate scrollbar colors for light/dark. Default is light. The setting is **not** persisted across reloads (no localStorage).

**Custom animations.** Two keyframes in `index.css`:

- `palette-in` — used for the command palette + provisioning modal entry (150ms scale-and-fade-in).
- `teleport-highlight` (+ `teleport-highlight-dark`) — 600ms background-color flash used on breadcrumb segments when `teleport()` runs.

---

## 8. Known TODOs and Stubs

Verbatim, with file paths. There are no `FIXME`, `XXX`, or `HACK` markers anywhere in `src/`.

```
src/CommandPalette.jsx:376:    // TODO: server-side search with debounce for production scale (21,000+ entities)
src/CommandPalette.jsx:389:    // TODO: relevance ranking (recency of access, frequency)
src/CommandPalette.jsx:501:            {/* TODO: filter chips for type and status */}
src/EntityDetail.jsx:571:        {/* // TODO: add 150ms debounce in production */}
src/EntityDetail.jsx:1330:          {/* // TODO: consider making analytics toolbar sticky below entity header if user research shows frequent period switching while scrolled */}
```

**Other stub-shaped behavior.**

- `App.jsx:185-256` — the page router renders `<div>Placeholder</div>` for every left-nav item that isn't one of the seven implemented pages.
- `MetadataBar.jsx` — fully implemented but **never imported**. (See §1.)
- `ScopeNavigator.jsx:7-15` — `getDropdownHeader(items, mode)` accepts `mode === 'switch'`, but no caller ever passes `'switch'`; only `'drill'` is used.
- `App.jsx:266` — `onSuccess={showToast}` writes to a `toast` string state; the toast then auto-dismisses after 5s in `SuccessToast`. There is no real provisioning side-effect; the modals all just call `onClose` + `onSuccess(message)` and the data tree is never mutated.

There are no commented-out blocks of source code (other than the `// TODO` comments above and the section-divider banner comments).

---

## 9. What's Visibly Broken or Incomplete

**Behavioral.**

- **Provisioning is purely cosmetic.** All four `Add…` flows in `ProvisioningModal.jsx` end at the success toast without mutating `mockData` or `ScopeContext`. The newly-added partner/customer/product never appears in the tree. (`AddProductModal` in `EntityDetail.jsx:861-929` has the same issue — its "Provision" button just calls `onClose`.)
- **Scope is not in the URL.** Refreshing the page resets to no scope; deep links are not possible.
- **Dark-mode preference is not persisted.** Toggle resets to light on reload.
- **`MetadataBar.jsx` is orphaned** — implemented but unimported (see §1).
- **`HierarchyFilterPanel` is duplicated.** `DevicesPageB.jsx` reimplements the same tree-picker inline (lines ~248-498) instead of importing the shared `HierarchyFilterPanel`. The two implementations may drift.
- **Customer Management vs. Customer Management B.** Two parallel implementations of the same page are wired into the left nav; "B" is the default. The non-B variant uses `ScopeSummaryStrip` while "B" doesn't.
- **Devices vs. Devices B.** Same situation as above — two parallel pages, both reachable. They share leaf-collection logic but diverge on hierarchy-filter chrome.
- **Search palette is purely client-side.** `CommandPalette.jsx` filters `flatEntityList` (the prebuilt flatten of `mockData`) on every keystroke, no debounce. With ~thousands of entities this is fine in dev; the in-file TODOs flag this for production.

**UI / scope-correctness.**

- **Synthetic `'root'` type isn't in `typeConfig`.** Code that does `typeConfig[entity.type]` on `currentEntity` must guard for `null` (most call sites do `currentEntity?.…`). `BreadcrumbSegment` in `ScopeNavigator.jsx:210` falls back to `typeConfig.distributor.Icon` for the root — meaning the root pill borrows the distributor icon by accident.
- **`hasTEP` semantics differ between leaves and partners.** Partners always get `hasTEP: null` and `bundles: [TEP]`; customers get `hasTEP: boolean` and `bundles` is `[]` if false. Code reading `hasTEP` must distinguish "unknown for partner" from "no for customer". (No place currently mishandles this, but the asymmetry is fragile.)
- **`utilizationRate` is on a 0-10 scale**, while many UI cells display it next to other percentages on a 0-100 scale. (`makeEntity` divides by 10: `utilizationRate: scale(45,95,r5) / 10`.) Any partner taxonomy revision that touches business-health rendering should normalize this.
- **`reseller` allowed under another `reseller` in mock data** but isn't reflected in `ScopeAddButton`'s rules — adding a *distributor* under a reseller is not permitted by the UI rule, while the same rule does allow it under a distributor; the discrepancy is intentional but worth a re-read with the new taxonomy.

**Inconsistent type-distinction.** Distributor and reseller are treated as the same partner type by `genPartnerPackages`, by the device-walk logic, and by most of `EntityDetail`. They diverge only in (1) icon/color, (2) the `ScopeAddButton` rule, and (3) the row-generator allowed-types in `PackageAdoptionTable`. If the taxonomy revision splits or merges partner kinds, the touch-points are concentrated in `config.jsx` (display) and the three rules above (behavior).
