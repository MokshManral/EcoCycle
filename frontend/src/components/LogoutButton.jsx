import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LogoutButton() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      const destination = role ? `/login/${role}` : "/";
      navigate(destination, { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-sage"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Log out
    </button>
  );
}