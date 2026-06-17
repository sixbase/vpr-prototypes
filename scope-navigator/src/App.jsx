import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Zap, Menu, X, Building2, Network, Briefcase, Monitor, Laptop, ShieldAlert, SlidersHorizontal, ScrollText, BarChart3, ListChecks, Globe, FileText, Users, Cog, Wrench, Settings } from '@icons';
import { ScopeProvider, useScope } from './ScopeContext';
import { ScopeNavigator, SideNav } from './vds/components/index.js';
import { VipreMark, VipreWordmark } from './config';
import CommandPalette from './CommandPalette';
import DevicesPage from './DevicesPage';
import DevicesPageB from './DevicesPageB';
import PoliciesPage from './PoliciesPage';
import CustomerManagementPageB from './CustomerManagementPageB';
import { mockData } from './data';
import { ProvisioningModal, SuccessToast } from './ProvisioningModal';

// Maps the prototype's entity types onto the DS ScopeNavigator's render config.
// Partner entities display as "Reseller" (rose), matching the rollup/drawer scheme.
const SCOPE_TYPE_CONFIG = {
  distributor: { label: 'Distributor', icon: Building2, tone: 'azure' },
  partner: { label: 'Reseller', icon: Network, tone: 'rose' },
  customer: { label: 'Customer', icon: Briefcase, tone: 'emerald' },
};

// Left-nav structure for the DS SideNav. Each item id is the `activePage` value.
// 'section' groups render as static uppercase eyebrow labels (always expanded).
const NAV_GROUPS = [
  { id: 'overview', variant: 'section', label: 'Overview', items: [
    { id: 'Customers', label: 'Customers', icon: Building2 },
  ] },
  { id: 'endpoint', variant: 'section', label: 'Endpoint', items: [
    { id: 'Devices', label: 'Devices', icon: Monitor },
    { id: 'Devices B', label: 'Devices B', icon: Laptop },
    { id: 'Threats & Incidents', label: 'Threats & Incidents', icon: ShieldAlert },
    { id: 'EP Policies', label: 'Policies', icon: SlidersHorizontal },
    { id: 'EP Configurations', label: 'Configurations', icon: Cog },
  ] },
  { id: 'email', variant: 'section', label: 'Email Security', items: [
    { id: 'Message Logs', label: 'Message Logs', icon: ScrollText },
    { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'Allow & Deny', label: 'Allow & Deny', icon: ListChecks },
    { id: 'ES Policies', label: 'Policies', icon: SlidersHorizontal },
    { id: 'Service Settings', label: 'Service Settings', icon: Wrench },
    { id: 'Domains', label: 'Domains', icon: Globe },
    { id: 'Reporting', label: 'Reporting', icon: FileText },
  ] },
];
const NAV_FOOTER_ITEMS = [
  { id: 'Users & Roles', label: 'Users & Roles', icon: Users },
  { id: 'Settings', label: 'Settings', icon: Settings },
];

function NavSection({ label, children }) {
  return (
    <div>
      <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-ink-subtle">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
        active
          ? 'bg-primary-soft text-primary font-medium'
          : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function AppContent() {
  const { path, currentEntity, currentLevel, childEntities, teleportedSegments, navigate, drillDown, teleport } = useScope();

  const [dark, setDark] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [activePage, setActivePage] = useState('Customers');
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile off-canvas sidebar
  const [provisioningModal, setProvisioningModal] = useState(null); // { type, contextEntity }
  const [toast, setToast] = useState(null); // string message

  function openModal(type, contextEntity = null, availableTypes = null) {
    setProvisioningModal({ type, contextEntity, availableTypes });
  }
  function closeModal() { setProvisioningModal(null); }
  function showToast(message) {
    setToast(message);
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Close the mobile nav whenever a page is selected.
  useEffect(() => { setNavOpen(false); }, [activePage]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSelect = useCallback((entityPath) => {
    navigate(entityPath);
    const entities = entityPath.at(-1)?.children ?? mockData;
    setSelectedEntity(entities?.[0] ?? null);
  }, [navigate]);

  useEffect(() => {
    if (!selectedEntity && childEntities?.length) {
      setSelectedEntity(childEntities[0]);
    }
  }, [childEntities, selectedEntity]);

  function handleDrillDown(entity) {
    drillDown(entity);
    setSelectedEntity(entity.children?.[0] ?? null);
  }

  function handleNavigate(newPath) {
    navigate(newPath);
    const entities = newPath.at(-1)?.children ?? mockData;
    setSelectedEntity(entities?.[0] ?? null);
  }

  function handleTeleport(entity, fullPath) {
    teleport(entity, fullPath);
    setSelectedEntity(entity.children?.[0] ?? null);
  }

  return (
    <div className="h-screen overflow-hidden bg-graphite-200 dark:bg-midnight-950 font-sans transition-colors duration-150 flex flex-col">
      {/* Breadcrumb — edge to edge, above everything. DS ScopeNavigator owns the
          navy chrome + bottom divider; Future State lives in its actions slot. */}
      <ScopeNavigator
        path={path}
        onNavigate={handleNavigate}
        rootItems={mockData}
        rootIcon={VipreMark}
        typeConfig={SCOPE_TYPE_CONFIG}
        teleportedSegments={teleportedSegments}
        /* Future State toggle temporarily hidden:
        actions={
          <button
            onClick={() => setShowFuture(f => !f)}
            title="Future State"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex-shrink-0 ${
              showFuture
                ? 'bg-violet-400/15 border-violet-400/40 text-violet-200'
                : 'border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span className="hidden md:inline">Future State</span>
          </button>
        }
        */
      />

      {/* Command palette search overlay */}
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
      />

      <div className="flex-1 flex min-h-0">
      {/* Mobile nav backdrop */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Left Nav — static on desktop, off-canvas drawer on mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 lg:transition-none ${navOpen ? 'translate-x-0' : '-translate-x-full'} shrink-0`}>
        <SideNav
          className="h-full"
          brand={<VipreWordmark className="text-ink" />}
          groups={NAV_GROUPS}
          footerItems={NAV_FOOTER_ITEMS}
          activeId={activePage}
          onSelect={(id) => setActivePage(id)}
          footer={
            <button
              onClick={() => setDark(!dark)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-ink/5 hover:text-ink transition-colors cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Page header */}
        <div className="px-4 sm:px-6 py-3 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setNavOpen(true)}
            className="lg:hidden p-1.5 -ml-1 rounded-md text-ink-muted hover:bg-surface transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-ink truncate">
            {activePage.replace(/^(EP|ES|SS) /, '')}
          </h1>
        </div>

        {activePage === 'Customers' ? (
          <CustomerManagementPageB openModal={openModal} showFuture={showFuture} />
        ) : activePage === 'Devices' ? (
          <div className="flex-1 min-h-0 overflow-hidden mx-6 mb-5 rounded-lg border border-line bg-surface">
            <DevicesPage />
          </div>
        ) : activePage === 'Devices B' ? (
          <div className="flex-1 min-h-0 overflow-hidden mx-6 mb-5 rounded-lg border border-line bg-surface">
            <DevicesPageB />
          </div>
        ) : activePage === 'EP Policies' ? (
          <div className="flex-1 min-h-0 overflow-hidden mx-6 mb-5 rounded-lg border border-line bg-surface">
            <PoliciesPage variant="ep" />
          </div>
        ) : activePage === 'ES Policies' ? (
          <div className="flex-1 min-h-0 overflow-hidden mx-6 mb-5 rounded-lg border border-line bg-surface">
            <PoliciesPage variant="es" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto mx-6 mb-5 rounded-lg border border-line bg-surface">
            <div className="flex-1 flex items-center justify-center h-full">
              <span className="text-zinc-400 dark:text-zinc-500 text-sm">Placeholder</span>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Provisioning modal (Flows 1, 2, 4) */}
      {provisioningModal && (
        <ProvisioningModal
          type={provisioningModal.type}
          contextEntity={provisioningModal.contextEntity}
          availableTypes={provisioningModal.availableTypes}
          onClose={closeModal}
          onSuccess={showToast}
        />
      )}

      {/* Success toast */}
      {toast && <SuccessToast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function App() {
  return (
    <ScopeProvider>
      <AppContent />
    </ScopeProvider>
  );
}

export default App;
