import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useScope } from './ScopeContext';
import EntityDetail from './EntityDetail';
import EntityList from './EntityList';
import DashboardPageB from './DashboardPageB';

export default function CustomerManagementPageB({ openModal, showFuture }) {
  const { path, currentEntity, currentLevel, childEntities, navigate, drillDown, teleport } = useScope();
  const [showAllPane, setShowAllPane] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  useEffect(() => {
    setShowAllPane(false);
    setSelectedEntity(null);
  }, [currentEntity?.id]);

  useEffect(() => {
    if (showAllPane && !selectedEntity && childEntities?.length) {
      setSelectedEntity(childEntities[0]);
    }
  }, [showAllPane, childEntities, selectedEntity]);

  function handleDrillDown(entity) {
    drillDown(entity);
    setSelectedEntity(entity.children?.[0] ?? null);
  }

  function handleTeleport(entity, fullPath) {
    teleport(entity, fullPath);
    setSelectedEntity(entity.children?.[0] ?? null);
  }

  if (showAllPane) {
    return (
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden mx-3 sm:mx-6 mb-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <button
            onClick={() => { setShowAllPane(false); setSelectedEntity(null); }}
            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors group"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
          </button>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{currentEntity?.name || 'All Accounts'}</span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">· Browse all</span>
        </div>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="w-[40%] flex flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
            <EntityList
              entities={childEntities}
              onDrillDown={handleDrillDown}
              onSelect={setSelectedEntity}
              selectedEntity={selectedEntity}
              onTeleport={handleTeleport}
              scopeName={currentEntity?.name || 'All Accounts'}
              currentLevel={currentLevel}
              viewAllDescendants
              onAdd={(availableTypes) => {
                if (availableTypes.length === 1) {
                  const t = availableTypes[0];
                  openModal('add' + t.charAt(0).toUpperCase() + t.slice(1));
                } else {
                  openModal('select', null, availableTypes);
                }
              }}
            />
          </div>
          <div className="w-[60%] flex flex-col overflow-hidden">
            {selectedEntity ? (
              <EntityDetail
                entity={selectedEntity}
                siblings={childEntities}
                showFuture={showFuture}
                onDrillDown={(child) => {
                  navigate([...path, selectedEntity, child]);
                  setSelectedEntity(child.children?.[0] ?? null);
                }}
                onAddProduct={(entity) => openModal('addProduct', entity)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Select an entity from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Entity detail is a single contained panel — keep it inside a framed card.
  if (currentEntity) {
    return (
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden mx-3 sm:mx-6 mb-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <EntityDetail
          entity={currentEntity}
          siblings={childEntities}
          showFuture={showFuture}
          onDrillDown={(child) => drillDown(child)}
          onAddProduct={(entity) => openModal('addProduct', entity)}
          onViewAll={() => setShowAllPane(true)}
        />
      </main>
    );
  }

  // Dashboard view — no outer tray. The cards are the surfaces and float
  // directly on the app background (matching Customer Management C), avoiding
  // the framed-box-in-a-box look.
  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <DashboardPageB
        onDrillDown={(child) => navigate([...path, child])}
        onViewAll={() => setShowAllPane(true)}
        showFuture={showFuture}
      />
    </main>
  );
}
