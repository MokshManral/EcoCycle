import { Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

import DashboardPage from "./pages/DashboardPage";
import ScannerPage from "./pages/ScannerPage";
import AnalysisPage from "./pages/AnalysisPage";
import PickupRequestPage from "./pages/PickupRequestPage";
import PickupsPage from "./pages/PickupsPage";
import PickupDetailsPage from "./pages/PickupDetailsPage";
import CollectorDashboardPage from "./pages/CollectorDashboardPage";
import ImpactPage from "./pages/ImpactPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />
      <Route element={<PublicLayout />}>
        <Route path="/login/:role" element={<Login />} />
      </Route>

      {/* Legacy redirects for compatibility */}
      <Route path="/dashboard" element={<Navigate to="/citizen" replace />} />
      <Route path="/scan" element={<Navigate to="/citizen/scan" replace />} />
      <Route path="/analysis" element={<Navigate to="/citizen/analysis" replace />} />
      <Route path="/pickup/new" element={<Navigate to="/citizen/pickup/new" replace />} />
      <Route path="/pickups" element={<Navigate to="/citizen/pickups" replace />} />
      <Route path="/impact" element={<Navigate to="/citizen/impact" replace />} />

      {/* Citizen routes */}
      <Route element={<ProtectedRoute allowedRoles={["citizen"]} />}>
        <Route element={<DashboardLayout role="citizen" />}>
          <Route path="/citizen" element={<DashboardPage />} />
          <Route path="/citizen/scan" element={<ScannerPage />} />
          <Route path="/citizen/analysis" element={<AnalysisPage />} />
          <Route path="/citizen/pickup/new" element={<PickupRequestPage />} />
          <Route path="/citizen/pickups" element={<PickupsPage />} />
          <Route path="/pickups/:pickupId" element={<PickupDetailsPage viewer="citizen" />} />
          <Route
            path="/citizen/pickups/:pickupId"
            element={<PickupDetailsPage viewer="citizen" />}
          />
          <Route path="/citizen/impact" element={<ImpactPage />} />
        </Route>
      </Route>

      {/* Collector routes */}
      <Route element={<ProtectedRoute allowedRoles={["collector"]} />}>
        <Route element={<DashboardLayout role="collector" />}>
          <Route path="/collector" element={<CollectorDashboardPage />} />
          <Route
            path="/collector/pickups/:pickupId"
            element={<PickupDetailsPage viewer="collector" />}
          />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<DashboardLayout role="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
