import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-6">Loading your EcoCycle account...</div>;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    const dashboard = {
      citizen: "/citizen",
      collector: "/collector",
      admin: "/admin",
    };

    return <Navigate to={dashboard[role] ?? "/login"} replace />;
  }

  return <Outlet />;
}