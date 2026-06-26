const prototypes = [
  {
    name: 'Scope Navigator',
    description: 'Hierarchical scope navigation and entity management — the base MSP workflow shell.',
    slug: 'scope-navigator',
    port: 5179,
    status: 'active',
    tags: ['React', 'Tailwind', 'Vite'],
  },
  {
    name: 'MSP — Symphony side menu',
    description: 'Scope navigator as a vertical breadcrumb (customer list) stacked inside the Symphony left nav.',
    slug: 'scope-navigator',
    view: 'msp',
    port: 5179,
    status: 'active',
    tags: ['React', 'Tailwind', 'Vite'],
  },
  {
    name: 'Symphony — top scope bar',
    description: 'Symphony × Scope shell with the scope selector as a horizontal bar across the top.',
    slug: 'scope-navigator',
    view: 'shell',
    port: 5179,
    status: 'active',
    tags: ['React', 'Tailwind', 'Vite'],
  },
  {
    name: 'Action Rules',
    description: 'Action rule configuration and management prototype.',
    slug: 'action-rules',
    port: 5181,
    status: 'active',
    tags: ['React', 'Tailwind', 'Vite'],
  },
  {
    name: 'Marketing Overview',
    description: 'Marketing overview prototype.',
    slug: 'marketing-overview',
    port: 5183,
    status: 'active',
    tags: ['React', 'Tailwind', 'Vite'],
  },
  {
    name: 'Banner Modal',
    description: 'Add Banner — three design options for the Default / Custom field interaction.',
    slug: 'banner-modal',
    port: 5185,
    status: 'active',
    tags: ['React', 'Tailwind', 'Vite'],
  },
]

function getPrototypeUrl(prototype) {
  const query = prototype.view ? `?view=${prototype.view}` : ''
  if (import.meta.env.DEV) {
    return `http://localhost:${prototype.port}/${query}`
  }
  return `${import.meta.env.BASE_URL}${prototype.slug}/${query}`
}

function StatusBadge({ status }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      Coming Soon
    </span>
  )
}

function PrototypeCard({ prototype }) {
  const isActive = prototype.status === 'active'
  const url = isActive ? getPrototypeUrl(prototype) : null

  // Render the active card as a real anchor so the click-to-open is a
  // user-gesture navigation, not a programmatic window.open() that popup
  // blockers swallow silently.
  const Tag = isActive ? 'a' : 'div'
  const anchorProps = isActive
    ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Tag
      {...anchorProps}
      className={`group relative block rounded-xl border bg-zinc-900/50 p-6 transition-all duration-200 no-underline ${
        isActive
          ? 'border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/60 cursor-pointer'
          : 'border-zinc-800/50 opacity-60 cursor-default'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">{prototype.name}</h2>
        <StatusBadge status={prototype.status} />
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed mb-4">
        {prototype.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {prototype.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50"
            >
              {tag}
            </span>
          ))}
        </div>

        {isActive && import.meta.env.DEV && (
          <span className="text-xs text-zinc-500 font-mono">
            :{prototype.port}
          </span>
        )}
      </div>

      {isActive && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-blue-500/20" />
      )}
    </Tag>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold">
              V
            </div>
            <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">
              Prototypes
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-4">
            Vipre Prototypes
          </h1>
          <p className="text-zinc-400 mt-2 text-base">
            Select a prototype to launch. Active prototypes open in a new tab.
          </p>
        </div>

        {/* Prototype Grid */}
        <div className="grid gap-4">
          {prototypes.map((proto) => (
            <PrototypeCard key={proto.name} prototype={proto} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600">
            {prototypes.length} prototype{prototypes.length !== 1 ? 's' : ''} registered
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
