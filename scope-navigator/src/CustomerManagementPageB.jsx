import DashboardPageB from './DashboardPageB';

// Customer Management B is a single host: DashboardPageB renders the dashboard at
// the root scope and the rich entity detail when drilled in — both wired to the
// same right-side drawers (descendants + package).
export default function CustomerManagementPageB({ openModal, showFuture }) {
  return <DashboardPageB openModal={openModal} showFuture={showFuture} />;
}
