import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Monitor, Shield, Mail, Send, MapPin, User, Phone, DollarSign,
  AlertTriangle, Activity, Clock, Globe, LayoutDashboard, Users, Laptop,
  Bug, FileCheck, Settings, MailSearch, BarChart3, ListFilter, ScrollText,
  Globe2, FileText, ChevronRight
} from '@icons';
import { flatEntityList } from './data';
import { typeConfig, statusConfig, TypeBadge, StatusBadge } from './config';

// ── Category definitions matching left nav ──
const categories = [
  { id: 'all', label: 'All Results', icon: Search, section: null },
  // Overview
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { id: 'customers', label: 'Customer Management', icon: Users, section: 'OVERVIEW' },
  // Endpoint
  { id: 'devices', label: 'Devices', icon: Monitor, section: 'ENDPOINT' },
  { id: 'threats', label: 'Threats & Incidents', icon: Bug, section: 'ENDPOINT' },
  { id: 'ep-policies', label: 'Policies', icon: FileCheck, section: 'ENDPOINT' },
  { id: 'ep-config', label: 'Configurations', icon: Settings, section: 'ENDPOINT' },
  // Email Security
  { id: 'message-logs', label: 'Message Logs', icon: MailSearch, section: 'EMAIL SECURITY' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'EMAIL SECURITY' },
  { id: 'allow-deny', label: 'Allow & Deny', icon: ListFilter, section: 'EMAIL SECURITY' },
  { id: 'es-policies', label: 'Policies', icon: ScrollText, section: 'EMAIL SECURITY' },
  { id: 'service-settings', label: 'Service Settings', icon: Settings, section: 'EMAIL SECURITY' },
  { id: 'domains', label: 'Domains', icon: Globe2, section: 'EMAIL SECURITY' },
  { id: 'reporting', label: 'Reporting', icon: FileText, section: 'EMAIL SECURITY' },
];

// Map categories to metric extractors for result row subtitles
const categoryMetrics = {
  all: null,
  dashboard: null,
  customers: null,
  devices: (e) => {
    const ep = e.products?.endpoint || {};
    return `${(ep.devicesProtected || 0).toLocaleString()} devices · ${ep.complianceRate || 0}% compliance`;
  },
  threats: (e) => {
    const ep = e.products?.endpoint || {};
    const ops = e.operations || {};
    return `${(ep.threatsBlocked || 0).toLocaleString()} blocked · ${ops.criticalIssues || 0} critical`;
  },
  'ep-policies': (e) => {
    const ops = e.operations || {};
    return `${ops.complianceScore || 0}% compliance · ${ops.configDrift || 0} config drift`;
  },
  'ep-config': (e) => {
    const ops = e.operations || {};
    const versions = ops.agentVersions ? Object.keys(ops.agentVersions).length : 0;
    return `${ops.configDrift || 0} drift · ${versions} agent versions`;
  },
  'message-logs': (e) => {
    const es = e.products?.emailSecurity || {};
    return `${(es.emailsScanned || 0).toLocaleString()} scanned · ${(es.threatsCaught || 0).toLocaleString()} threats`;
  },
  analytics: (e) => {
    const es = e.products?.emailSecurity || {};
    return `${(es.emailsScanned || 0).toLocaleString()} emails · ${(es.phishingBlocked || 0).toLocaleString()} phishing`;
  },
  'allow-deny': (e) => {
    const es = e.products?.emailSecurity || {};
    return `${(es.spamFiltered || 0).toLocaleString()} spam · ${(es.phishingBlocked || 0).toLocaleString()} phishing blocked`;
  },
  'es-policies': (e) => {
    const es = e.products?.emailSecurity || {};
    return `${(es.threatsCaught || 0).toLocaleString()} threats caught · ${(es.spamFiltered || 0).toLocaleString()} filtered`;
  },
  'service-settings': (e) => {
    const ops = e.operations || {};
    const dh = ops.domainHealth || {};
    return `${dh.total || 0} domains · ${dh.healthy || 0} healthy`;
  },
  domains: (e) => {
    const ops = e.operations || {};
    const dh = ops.domainHealth || {};
    return `${dh.healthy || 0} / ${dh.total || 0} healthy · ${ops.quarantineDepth || 0} quarantined`;
  },
  reporting: (e) => {
    const ep = e.products?.endpoint || {};
    const es = e.products?.emailSecurity || {};
    return `${(ep.scansCompleted || 0).toLocaleString()} scans · ${(es.emailsScanned || 0).toLocaleString()} emails`;
  },
};

// Map categories to sort functions for result ordering
const categorySorters = {
  devices: (a, b) => (b.products?.endpoint?.devicesProtected || 0) - (a.products?.endpoint?.devicesProtected || 0),
  threats: (a, b) => (b.products?.endpoint?.threatsBlocked || 0) - (a.products?.endpoint?.threatsBlocked || 0),
  'ep-policies': (a, b) => (a.operations?.complianceScore || 0) - (b.operations?.complianceScore || 0),
  'ep-config': (a, b) => (b.operations?.configDrift || 0) - (a.operations?.configDrift || 0),
  'message-logs': (a, b) => (b.products?.emailSecurity?.emailsScanned || 0) - (a.products?.emailSecurity?.emailsScanned || 0),
  analytics: (a, b) => (b.products?.emailSecurity?.emailsScanned || 0) - (a.products?.emailSecurity?.emailsScanned || 0),
  'allow-deny': (a, b) => (b.products?.emailSecurity?.spamFiltered || 0) - (a.products?.emailSecurity?.spamFiltered || 0),
  'es-policies': (a, b) => (b.products?.emailSecurity?.threatsCaught || 0) - (a.products?.emailSecurity?.threatsCaught || 0),
  'service-settings': (a, b) => (b.operations?.domainHealth?.total || 0) - (a.operations?.domainHealth?.total || 0),
  domains: (a, b) => (b.operations?.domainHealth?.total || 0) - (a.operations?.domainHealth?.total || 0),
  reporting: (a, b) => (b.products?.endpoint?.scansCompleted || 0) - (a.products?.endpoint?.scansCompleted || 0),
};

// Highlight matching substring in entity name
function HighlightedName({ name, query }) {
  if (!query) return <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</span>;

  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerName.indexOf(lowerQuery);

  if (idx === -1) return <span className="text-sm font-medium text-zinc-500">{name}</span>;

  const before = name.slice(0, idx);
  const match = name.slice(idx, idx + query.length);
  const after = name.slice(idx + query.length);

  return (
    <span className="text-sm">
      <span className="text-zinc-500">{before}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{match}</span>
      <span className="text-zinc-500">{after}</span>
    </span>
  );
}

// Build breadcrumb path string for a result (excluding the entity itself)
function buildPathLabel(path) {
  if (path.length <= 1) return 'All Accounts';
  const ancestors = path.slice(0, -1);
  return 'All Accounts → ' + ancestors.map(e => e.name).join(' → ');
}

// Format last active timestamp
function formatLastActive(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Category Sidebar ──
function CategorySidebar({ activeCategory, onSelect }) {
  let lastSection = null;

  return (
    <div className="w-[200px] flex-shrink-0 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto py-2">
      {categories.map((cat) => {
        const showSection = cat.section && cat.section !== lastSection;
        lastSection = cat.section;
        const Icon = cat.icon;
        const isActive = activeCategory === cat.id;

        return (
          <div key={cat.id}>
            {showSection && (
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{cat.section}</span>
              </div>
            )}
            {cat.id === 'all' && (
              <div className="px-3 pb-1">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Search</span>
              </div>
            )}
            <button
              onClick={() => onSelect(cat.id)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs cursor-pointer transition-colors mx-1 rounded-md ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span className="truncate">{cat.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Preview Section ──
function PreviewSection({ icon: Icon, iconColor, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${iconColor || 'text-zinc-400'}`} />
        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="pl-5">
        {children}
      </div>
    </div>
  );
}

// ── Metric Row ──
function MetricRow({ label, value, sub }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</span>
        {sub && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{sub}</span>}
      </div>
    </div>
  );
}

// ── Utilization Mini Bar ──
function MiniUtilBar({ consumed, licensed }) {
  const pct = Math.min(100, Math.round((consumed / Math.max(licensed, 1)) * 100));
  let barColor = 'bg-zinc-400 dark:bg-zinc-500';
  if (pct < 30) barColor = 'bg-emerald-500';
  else if (pct >= 95) barColor = 'bg-rose-500';
  else if (pct >= 85) barColor = 'bg-amber-500';

  return (
    <div className="mt-1.5">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Seat utilization</span>
        <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{pct}%
          <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-1">{consumed.toLocaleString()} / {licensed.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Detail Preview Panel ──
function DetailPreview({ entity }) {
  if (!entity) return null;

  const cfg = typeConfig[entity.type];
  const Icon = cfg.Icon;
  const ep = entity.products?.endpoint || {};
  const es = entity.products?.emailSecurity || {};
  const ss = entity.products?.safeSend || {};
  const biz = entity.business || {};
  const ops = entity.operations || {};
  const isCustomer = entity.type === 'customer';

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{entity.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={entity.type} />
              <StatusBadge status={entity.status} />
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
              {entity.region && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {entity.region}
                </span>
              )}
              {entity.lastActive && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatLastActive(entity.lastActive)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">

        {/* Contact */}
        {entity.contact && (
          <PreviewSection icon={User} label="Primary Contact">
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{entity.contact.firstName} {entity.contact.lastName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3 text-zinc-400" />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{entity.contact.email}</span>
            </div>
            {entity.contact.phone && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-zinc-400" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">{entity.contact.phone}</span>
              </div>
            )}
          </PreviewSection>
        )}

        {/* Endpoint Protection */}
        <PreviewSection icon={Monitor} iconColor="text-blue-500" label="Endpoint">
          <MetricRow label="Devices protected" value={ep.devicesProtected?.toLocaleString() || '0'} />
          <MetricRow label="Threats blocked" value={ep.threatsBlocked?.toLocaleString() || '0'} />
          <MetricRow label="Scans completed" value={ep.scansCompleted?.toLocaleString() || '0'} />
          <MetricRow label="Compliance" value={`${ep.complianceRate || 0}%`} />
        </PreviewSection>

        {/* Email Security */}
        <PreviewSection icon={Shield} iconColor="text-emerald-500" label="Email Security">
          <MetricRow label="Emails scanned" value={es.emailsScanned?.toLocaleString() || '0'} />
          <MetricRow label="Threats caught" value={es.threatsCaught?.toLocaleString() || '0'} />
          <MetricRow label="Phishing blocked" value={es.phishingBlocked?.toLocaleString() || '0'} />
          <MetricRow label="Spam filtered" value={es.spamFiltered?.toLocaleString() || '0'} />
        </PreviewSection>

        {/* SafeSend */}
        {(ss.emailsSent > 0) && (
          <PreviewSection icon={Send} iconColor="text-violet-500" label="SafeSend">
            <MetricRow label="Emails sent" value={ss.emailsSent?.toLocaleString() || '0'} />
            <MetricRow label="DLP triggers" value={ss.dlpTriggers?.toLocaleString() || '0'} />
          </PreviewSection>
        )}

        {/* Business — non-customer only */}
        {!isCustomer && (
          <PreviewSection icon={DollarSign} iconColor="text-amber-500" label="Business">
            <MetricRow label="MRR" value={`$${(biz.mrr || 0).toLocaleString()}`} sub="/mo" />
            <MetricRow label="Renewals (30d)" value={biz.renewals?.d30 || 0} />
            <MetricRow label="Churn risk" value={biz.churnRisk || 0} />
            <MetricRow label="Opportunity" value={biz.opportunityScore || '—'} sub="/100" />
            <MiniUtilBar consumed={biz.seatsConsumed || 0} licensed={biz.seatsLicensed || 1} />
          </PreviewSection>
        )}

        {/* Operations */}
        <PreviewSection icon={Activity} iconColor="text-rose-500" label="Operations">
          <MetricRow label="Compliance score" value={`${ops.complianceScore || 0}%`} />
          <MetricRow label="Critical issues" value={ops.criticalIssues || 0} />
          <MetricRow label="Config drift" value={ops.configDrift || 0} />
          {ops.domainHealth && (
            <MetricRow label="Domains" value={ops.domainHealth.healthy} sub={`/ ${ops.domainHealth.total} healthy`} />
          )}
        </PreviewSection>

      </div>
    </div>
  );
}

export default function CommandPalette({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlightIndex(0);
      setActiveCategory('all');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filter and sort results
  const results = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    // TODO: server-side search with debounce for production scale (21,000+ entities)
    const matches = flatEntityList.filter(({ entity }) =>
      entity.name.toLowerCase().includes(lowerQuery)
    );

    // Apply category-specific sorting if available
    const sorter = categorySorters[activeCategory];
    if (sorter) {
      matches.sort((a, b) => sorter(a.entity, b.entity));
      return matches;
    }

    // Default: prefix matches first, then substring matches. Within each group, alphabetical.
    // TODO: relevance ranking (recency of access, frequency)
    const prefixMatches = [];
    const substringMatches = [];

    for (const match of matches) {
      if (match.entity.name.toLowerCase().startsWith(lowerQuery)) {
        prefixMatches.push(match);
      } else {
        substringMatches.push(match);
      }
    }

    prefixMatches.sort((a, b) => a.entity.name.localeCompare(b.entity.name));
    substringMatches.sort((a, b) => a.entity.name.localeCompare(b.entity.name));

    return [...prefixMatches, ...substringMatches];
  }, [query, activeCategory]);

  // Clamp highlight index when results change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query, activeCategory]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const highlighted = listRef.current.children[highlightIndex];
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = useCallback((entry) => {
    onSelect(entry.path);
    onClose();
  }, [onSelect, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    }
  }, [results, highlightIndex, handleSelect, onClose]);

  if (!open) return null;

  const highlightedEntity = results[highlightIndex]?.entity || null;
  const showPreview = results.length > 0;
  const metricFn = categoryMetrics[activeCategory];

  return (
    <div className="fixed inset-0 z-[200] flex justify-center" style={{ paddingTop: '16vh' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/40 transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Palette container — three columns when results showing */}
      <div
        className={`relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl flex flex-col animate-palette-in transition-[width] duration-200 ease-out ${
          showPreview ? 'w-[1060px] h-[560px]' : 'w-[560px] max-h-[520px]'
        }`}
        style={showPreview ? undefined : { height: 'fit-content' }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input — spans full width */}
        <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-700">
          <Search className="w-[18px] h-[18px] text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all entities..."
            className="flex-1 px-3 py-4 text-[16px] bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
          <kbd className="flex-shrink-0 px-1.5 py-0.5 text-[11px] font-mono text-zinc-300 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Body: category sidebar + results + preview */}
        <div className="flex flex-1 min-h-0">
          {/* Category sidebar — only when results showing */}
          {showPreview && (
            <CategorySidebar activeCategory={activeCategory} onSelect={setActiveCategory} />
          )}

          {/* Results list */}
          <div ref={listRef} className={`overflow-y-auto p-2 ${showPreview ? 'flex-1 min-w-0' : 'flex-1'}`} style={showPreview ? undefined : { maxHeight: '400px' }}>
            {query && results.length === 0 && (
              <div className="px-3 py-8 text-sm text-zinc-400 text-center">
                No entities matching '{query}'
              </div>
            )}
            {/* TODO: filter chips for type and status */}
            {results.map((entry, i) => {
              const { entity, path } = entry;
              const isHighlighted = i === highlightIndex;
              const metricLine = metricFn ? metricFn(entity) : null;

              return (
                <button
                  key={entity.id + '-' + i}
                  onClick={() => handleSelect(entry)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-zinc-50 dark:bg-zinc-800'
                      : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${typeConfig[entity.type].bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {(() => { const TIcon = typeConfig[entity.type].Icon; return <TIcon className={`w-4 h-4 ${typeConfig[entity.type].color}`} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <HighlightedName name={entity.name} query={query} />
                      <TypeBadge type={entity.type} />
                      <StatusBadge status={entity.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 truncate">
                      {buildPathLabel(path)}
                    </div>
                    {metricLine && (
                      <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                        {metricLine}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview panel */}
          {showPreview && (
            <div className="w-[340px] flex-shrink-0 border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 overflow-y-auto">
              <DetailPreview entity={highlightedEntity} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
