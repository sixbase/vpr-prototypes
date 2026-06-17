import { useState, useMemo } from 'react';
import {
  Shield, ShieldCheck, ShieldX, ShieldAlert, Monitor, Mail,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Search,
  Users, Building2, Store, Copy, MoreHorizontal,
} from '@icons';
import { useScope } from './ScopeContext';
import { typeConfig } from './config';

// ── Policy definitions ─────────────────────────────────────────────

const EP_POLICIES = [
  { id: 'ep-1',  name: 'Default Endpoint Protection',     type: 'protection',  status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Real-time scanning, behavior monitoring, and exploit prevention for all endpoints.' },
  { id: 'ep-2',  name: 'Workstation Security Baseline',   type: 'protection',  status: 'active',   scope: 'local',     assignedTo: 8,  description: 'Standard security controls for Windows and macOS workstations.' },
  { id: 'ep-3',  name: 'Server Hardening Policy',         type: 'protection',  status: 'active',   scope: 'local',     assignedTo: 4,  description: 'Enhanced protection rules for Windows Server and Linux server endpoints.' },
  { id: 'ep-4',  name: 'Ransomware Prevention',           type: 'threat',      status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Anti-ransomware rules including canary files, volume shadow copy protection, and rollback.' },
  { id: 'ep-5',  name: 'USB & Removable Media Control',   type: 'device',      status: 'active',   scope: 'local',     assignedTo: 6,  description: 'Block or restrict USB storage devices, optical drives, and portable media.' },
  { id: 'ep-6',  name: 'Application Whitelisting',        type: 'application', status: 'active',   scope: 'local',     assignedTo: 3,  description: 'Allow only approved applications to execute. Blocks unknown and untrusted binaries.' },
  { id: 'ep-7',  name: 'Web Content Filtering',           type: 'web',         status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Block access to malicious, phishing, and policy-violating web categories.' },
  { id: 'ep-8',  name: 'Firewall — Strict Mode',          type: 'firewall',    status: 'disabled',  scope: 'local',     assignedTo: 0,  description: 'Deny-all inbound with explicit allow rules. For high-security segments only.' },
  { id: 'ep-9',  name: 'Firewall — Standard',             type: 'firewall',    status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Default firewall rules allowing standard business traffic and blocking known threats.' },
  { id: 'ep-10', name: 'Patch Management — Critical Only', type: 'update',     status: 'active',   scope: 'local',     assignedTo: 5,  description: 'Auto-deploy critical and security patches within 24 hours of release.' },
  { id: 'ep-11', name: 'Full Disk Encryption',            type: 'encryption',  status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Enforce BitLocker (Windows) and FileVault (macOS) with key escrow.' },
  { id: 'ep-12', name: 'Developer Workstation Exception',  type: 'protection', status: 'active',   scope: 'local',     assignedTo: 2,  description: 'Relaxed scanning exclusions for build tools, IDEs, and local dev servers.' },
  { id: 'ep-13', name: 'BYOD Restricted Access',          type: 'device',      status: 'draft',    scope: 'local',     assignedTo: 0,  description: 'Limited network access and mandatory agent enrollment for personal devices.' },
  { id: 'ep-14', name: 'Threat Response — Auto-Isolate',   type: 'threat',     status: 'active',   scope: 'local',     assignedTo: 7,  description: 'Automatically isolate endpoint from network upon confirmed threat detection.' },
];

const ES_POLICIES = [
  { id: 'es-1',  name: 'Default Inbound Filtering',        type: 'inbound',     status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Spam, phishing, and malware filtering for all inbound email traffic.' },
  { id: 'es-2',  name: 'Executive Impersonation Guard',    type: 'inbound',     status: 'active',   scope: 'local',     assignedTo: 5,  description: 'Detect and block emails impersonating C-suite and senior leadership.' },
  { id: 'es-3',  name: 'Outbound DLP — PII',               type: 'outbound',    status: 'active',   scope: 'local',     assignedTo: 8,  description: 'Prevent outbound emails containing SSNs, credit card numbers, or health records.' },
  { id: 'es-4',  name: 'Outbound DLP — Confidential Files', type: 'outbound',   status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Block or quarantine emails with attachments marked Confidential or Internal Only.' },
  { id: 'es-5',  name: 'Attachment Sandboxing',            type: 'inbound',     status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Detonate suspicious attachments in sandbox before delivery to mailbox.' },
  { id: 'es-6',  name: 'Link Rewriting & Time-of-Click',  type: 'inbound',     status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Rewrite URLs and re-scan at time of click to catch delayed weaponization.' },
  { id: 'es-7',  name: 'DMARC Enforcement',                type: 'authentication', status: 'active', scope: 'local',    assignedTo: 9,  description: 'Reject or quarantine messages failing DMARC validation from protected domains.' },
  { id: 'es-8',  name: 'Encryption — TLS Enforce',         type: 'encryption',  status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Require TLS for email delivery to specified partner domains.' },
  { id: 'es-9',  name: 'Encryption — S/MIME Gateway',      type: 'encryption',  status: 'disabled',  scope: 'local',    assignedTo: 0,  description: 'Gateway-level S/MIME encryption for regulated communication channels.' },
  { id: 'es-10', name: 'Safe Attachments — Block Macros',  type: 'inbound',     status: 'active',   scope: 'local',     assignedTo: 6,  description: 'Strip or block Office documents containing macros from inbound mail.' },
  { id: 'es-11', name: 'Quarantine Digest — Daily',        type: 'notification', status: 'active',  scope: 'inherited', assignedTo: 12, description: 'Send daily digest of quarantined messages to end users for self-service release.' },
  { id: 'es-12', name: 'Auto-Archive — 90 Day',            type: 'retention',   status: 'draft',    scope: 'local',     assignedTo: 0,  description: 'Automatically archive mailbox items older than 90 days to compliance vault.' },
  { id: 'es-13', name: 'External Sender Warning',          type: 'inbound',     status: 'active',   scope: 'inherited', assignedTo: 12, description: 'Prepend visual banner to emails from external senders.' },
];

// ── Policy type metadata ───────────────────────────────────────────

const EP_TYPE_META = {
  protection:  { label: 'Protection',   color: 'text-azure-600 dark:text-azure-400',    bg: 'bg-blue-50 dark:bg-blue-900/30' },
  threat:      { label: 'Threat',       color: 'text-rose-600 dark:text-rose-400',      bg: 'bg-rose-50 dark:bg-rose-900/30' },
  device:      { label: 'Device',       color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  application: { label: 'Application',  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30' },
  web:         { label: 'Web',          color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
  firewall:    { label: 'Firewall',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  update:      { label: 'Update',       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  encryption:  { label: 'Encryption',   color: 'text-pink-600 dark:text-pink-400',    bg: 'bg-pink-50 dark:bg-pink-900/30' },
};

const ES_TYPE_META = {
  inbound:        { label: 'Inbound',        color: 'text-azure-600 dark:text-azure-400',      bg: 'bg-blue-50 dark:bg-blue-900/30' },
  outbound:       { label: 'Outbound',       color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-900/30' },
  authentication: { label: 'Auth',           color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-900/30' },
  encryption:     { label: 'Encryption',     color: 'text-pink-600 dark:text-pink-400',      bg: 'bg-pink-50 dark:bg-pink-900/30' },
  notification:   { label: 'Notification',   color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
  retention:      { label: 'Retention',       color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/30' },
};

const STATUS_META = {
  active:   { label: 'Active',   dot: 'bg-emerald-500',  pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  disabled: { label: 'Disabled', dot: 'bg-zinc-400',   pill: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400' },
  draft:    { label: 'Draft',    dot: 'bg-amber-400',  pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

const SCOPE_META = {
  inherited: { label: 'Inherited', color: 'text-azure-600 dark:text-azure-400' },
  local:     { label: 'Local',     color: 'text-zinc-600 dark:text-zinc-400' },
};

// ── Component ──────────────────────────────────────────────────────

export default function PoliciesPage({ variant }) {
  const isEP = variant === 'ep';
  const policies = isEP ? EP_POLICIES : ES_POLICIES;
  const typeMeta = isEP ? EP_TYPE_META : ES_TYPE_META;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const types = useMemo(() => {
    const seen = new Map();
    for (const p of policies) {
      if (!seen.has(p.type)) seen.set(p.type, typeMeta[p.type]?.label || p.type);
    }
    return [...seen.entries()];
  }, [policies, typeMeta]);

  const filtered = useMemo(() => {
    return policies.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [policies, statusFilter, typeFilter, search]);

  const counts = useMemo(() => {
    const c = { active: 0, disabled: 0, draft: 0 };
    for (const p of policies) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [policies]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isEP ? 'Endpoint Policies' : 'Email Security Policies'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {policies.length} policies &middot; {counts.active} active &middot; {counts.disabled} disabled &middot; {counts.draft} draft
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">All types</option>
            {types.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-zinc-400 dark:text-zinc-500 text-sm">No policies match your filters.</span>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map(policy => {
              const tMeta = typeMeta[policy.type] || { label: policy.type, color: 'text-zinc-600', bg: 'bg-zinc-100' };
              const sMeta = STATUS_META[policy.status];
              const scMeta = SCOPE_META[policy.scope];
              const expanded = expandedId === policy.id;

              return (
                <div
                  key={policy.id}
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div
                    className="flex items-center gap-4 px-6 py-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : policy.id)}
                  >
                    {/* Expand chevron */}
                    <div className="w-4 flex-shrink-0">
                      {expanded
                        ? <ChevronDown className="w-4 h-4 text-zinc-400" />
                        : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </div>

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tMeta.bg}`}>
                      {isEP
                        ? <Shield className={`w-4 h-4 ${tMeta.color}`} />
                        : <Mail className={`w-4 h-4 ${tMeta.color}`} />}
                    </div>

                    {/* Name + type badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {policy.name}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${tMeta.bg} ${tMeta.color}`}>
                          {tMeta.label}
                        </span>
                      </div>
                    </div>

                    {/* Scope */}
                    <div className="w-20 flex-shrink-0 text-right">
                      <span className={`text-xs font-medium ${scMeta.color}`}>
                        {scMeta.label}
                      </span>
                    </div>

                    {/* Assigned count */}
                    <div className="w-24 flex-shrink-0 text-right">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {policy.assignedTo > 0 ? `${policy.assignedTo} assigned` : '—'}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="w-20 flex-shrink-0 flex justify-end">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium leading-none ${sMeta.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sMeta.dot}`} />
                        {sMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-6 pb-4 pl-[4.5rem]">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        {policy.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>ID: <span className="font-mono text-zinc-600 dark:text-zinc-300">{policy.id}</span></span>
                        <span>&middot;</span>
                        <span>Scope: {scMeta.label}</span>
                        <span>&middot;</span>
                        <span>Assigned to {policy.assignedTo} {policy.assignedTo === 1 ? 'entity' : 'entities'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
