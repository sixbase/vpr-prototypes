/* Per-product "full portal" navs — the deep Site Manager nav each product opens
   when you open its workspace from the Symphony launcher. Copied into the shell
   corner so the integration is self-contained and easy to remove. */
import {
  LayoutDashboard, Activity, Zap, ShieldAlert, BarChart3,
  Building2, Monitor, Shield, Ban, CircleSlash, Grid3x3,
  ShieldOff, FileSearch, Link2, AlertTriangle, Globe, Search,
  Gauge, Settings, Rocket, LifeBuoy,
  FileText, ShieldCheck,
  Home, MessageSquare, Users, Send, Megaphone, ListChecks,
  MousePointer2, AppWindow, Mail, UserCheck, Languages,
} from 'lucide-react'

export const PORTALS = {
  edr: {
    label: 'EDR',
    defaultPage: 'edr-dashboard',
    footer: 'Symphony Child Manager',
    sections: [
      {
        label: 'Monitor',
        items: [
          { id: 'edr-dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'edr-edr-dashboard', label: 'EDR Dashboard', icon: Activity },
          { id: 'edr-threats', label: 'Threats', icon: Zap },
          { id: 'edr-quarantine', label: 'Quarantine', icon: ShieldAlert },
          { id: 'edr-reports', label: 'Reports', icon: BarChart3 },
        ],
      },
      {
        label: 'Manage',
        items: [
          { id: 'edr-sites', label: 'Sites', icon: Building2 },
          { id: 'edr-devices', label: 'Devices', icon: Monitor },
          { id: 'edr-policies', label: 'Policies', icon: Shield },
          { id: 'edr-exclusions', label: 'Exclusions', icon: Ban },
          { id: 'edr-blocklists', label: 'Blocklists', icon: CircleSlash },
          { id: 'edr-applications', label: 'Applications', icon: Grid3x3 },
        ],
      },
      {
        label: 'Investigate',
        items: [
          { id: 'edr-vulnerabilities', label: 'Vulnerabilities', icon: ShieldOff },
          { id: 'edr-file-analysis', label: 'File Analysis', icon: FileSearch },
          { id: 'edr-link-analysis', label: 'Link Analysis', icon: Link2 },
          { id: 'edr-incidents', label: 'Incidents', icon: AlertTriangle },
          { id: 'edr-rbi', label: 'RBI', icon: Globe },
          { id: 'edr-events', label: 'Events', icon: Search },
        ],
      },
      {
        label: 'Setup',
        items: [
          { id: 'edr-usage', label: 'Usage', icon: Gauge },
          { id: 'edr-system', label: 'System', icon: Settings },
          { id: 'edr-deploy', label: 'Deploy', icon: Rocket },
          { id: 'edr-help', label: 'Help', icon: LifeBuoy },
        ],
      },
    ],
  },

  ies: {
    label: 'IES',
    defaultPage: 'iesp-dashboard',
    footer: 'Symphony Child Manager',
    sections: [
      {
        label: 'Overview',
        items: [
          { id: 'iesp-dashboard', label: 'Dashboard', icon: Home },
          { id: 'iesp-logs', label: 'Message Logs', icon: MessageSquare },
        ],
      },
      {
        label: 'Analytics',
        items: [
          { id: 'iesp-threats', label: 'Threat Explorer', icon: AlertTriangle },
          { id: 'iesp-reports', label: 'Reports', icon: BarChart3 },
          { id: 'iesp-users', label: 'Users', icon: Users },
        ],
      },
      {
        label: 'Settings',
        items: [
          { id: 'iesp-email-config', label: 'Email Configuration', icon: Settings },
          { id: 'iesp-action-rules', label: 'Action Rules', icon: Send },
          { id: 'iesp-banner', label: 'Banner Management', icon: Megaphone },
          { id: 'iesp-allow-list', label: 'Allow List', icon: ShieldCheck },
          { id: 'iesp-detection', label: 'Detection Settings', icon: ListChecks },
          { id: 'iesp-link-isolation', label: 'Link Isolation', icon: MousePointer2 },
        ],
      },
      {
        label: 'Admins',
        items: [
          { id: 'iesp-audit-logs', label: 'Audit Logs', icon: FileText },
        ],
      },
      {
        label: 'Tools',
        items: [
          { id: 'iesp-rbi', label: 'RBI', icon: AppWindow },
        ],
      },
    ],
  },

  safesend: {
    label: 'SafeSend',
    defaultPage: 'ssp-dashboard',
    footer: 'Symphony Child Manager',
    sections: [
      {
        label: 'Overview',
        items: [
          { id: 'ssp-dashboard', label: 'Dashboard', icon: Home },
          { id: 'ssp-reports', label: 'Reports', icon: BarChart3 },
        ],
      },
      {
        label: 'Analytics',
        items: [
          { id: 'ssp-events', label: 'Events Explorer', icon: Mail },
          { id: 'ssp-users', label: 'Users', icon: Users },
          { id: 'ssp-sensitive', label: 'Sensitive Data', icon: AlertTriangle },
        ],
      },
      {
        label: 'Manage',
        items: [
          { id: 'ssp-assignments', label: 'Assignments', icon: UserCheck },
          { id: 'ssp-policies', label: 'Policies', icon: Shield },
          { id: 'ssp-rulesets', label: 'Rulesets', icon: ListChecks },
          { id: 'ssp-strings', label: 'Strings', icon: Languages },
        ],
      },
      {
        label: 'Set up',
        items: [
          { id: 'ssp-settings', label: 'Settings', icon: Settings },
        ],
      },
    ],
  },
}
