import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ScannerPage from './pages/ScannerPage';
import AnalysisPage from './pages/AnalysisPage';
import PickupRequestPage from './pages/PickupRequestPage';
import PickupsPage from './pages/PickupsPage';
import PickupDetailsPage from './pages/PickupDetailsPage';
import CollectorDashboardPage from './pages/CollectorDashboardPage';
import ImpactPage from './pages/ImpactPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      <Route element={<DashboardLayout role="citizen" />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/pickup/new" element={<PickupRequestPage />} />
        <Route path="/pickups" element={<PickupsPage />} />
        <Route path="/pickups/:pickupId" element={<PickupDetailsPage viewer="citizen" />} />
        <Route path="/impact" element={<ImpactPage />} />
      </Route>

      <Route element={<DashboardLayout role="collector" />}>
        <Route path="/collector" element={<CollectorDashboardPage />} />
        <Route path="/collector/pickups/:pickupId" element={<PickupDetailsPage viewer="collector" />} />
      </Route>

      <Route element={<DashboardLayout role="admin" />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
