import DashboardPageB from './DashboardPageB';

// Customer Management B is a single host: DashboardPageB renders the dashboard at
// the root scope and the rich entity detail when drilled in — both wired to the
// same right-side drawers (descendants + package).
export default function CustomerManagementPageB({ openModal, showFuture, rootNameOverride, hideRootStatus }) {
  return <DashboardPageB openModal={openModal} showFuture={showFuture} rootNameOverride={rootNameOverride} hideRootStatus={hideRootStatus} />;
}
