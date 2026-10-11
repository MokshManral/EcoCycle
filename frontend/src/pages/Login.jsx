import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const dashboards = {
  citizen: "/citizen",
  collector: "/collector",
  admin: "/admin",
};

const labels = {
  citizen: "Citizen",
  collector: "Collector",
  admin: "Admin",
};

const DEMO_ACCOUNTS = [
  { role: "citizen", email: "citizen@ecocycle.demo", password: "citizen123" },
  { role: "collector", email: "collector@ecocycle.demo", password: "collector123" },
  { role: "admin", email: "admin@ecocycle.demo", password: "admin123" },
];

export default function Login() {
  const { role: requestedRole } = useParams();
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const profile =
        mode === "signup"
          ? await signup(email, password, displayName)
          : await login(email, password);

      if (requestedRole && profile.role !== requestedRole) {
        setError(
          `This account is registered as ${labels[profile.role] ?? profile.role}.`
        );
        return;
      }

      const destination = dashboards[profile.role];

      if (!destination) {
        setError("Your account does not have an assigned role.");
        return;
      }

      navigate(
        location.state?.from?.pathname || destination,
        { replace: true }
      );
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center py-10">
      <section className="mx-auto w-full max-w-md space-y-5 p-6">

      <h1 className="text-2xl font-bold">EcoCycle Login</h1>

      <p>Sign in to continue to your EcoCycle dashboard.</p>

      <div className="flex flex-wrap gap-3">
        {Object.entries(labels).map(([role, label]) => (
            <Link
            key={role}
            to={`/login/${role}`}
            className="rounded border px-3 py-2"
            >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-forest/40 bg-sage-50 p-3 text-sm">
        <p className="mb-2 font-medium text-forest">Demo accounts</p>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map(({ role, email, password }) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setMode("login");
                setEmail(email);
                setPassword(password);
              }}
              className="flex w-full items-center justify-between rounded border border-forest/20 bg-white px-3 py-2 text-left"
            >
              <span>{labels[role]}</span>
              <span className="text-xs text-muted">{email}</span>
            </button>
          ))}
        </div>
      </div>

      {requestedRole && (
          <p>Portal: {labels[requestedRole] ?? "EcoCycle"}</p>
        )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
            <input
            className="w-full rounded border p-3"
            placeholder="Full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            />
        )}

        <input
          className="w-full rounded border p-3"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          />

        <input
          className="w-full rounded border p-3"
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          />

        {error && (
            <p role="alert" className="text-red-600">
            {error}
          </p>
        )}

        <button
          className="w-full rounded bg-green-700 p-3 text-white"
          type="submit"
          disabled={busy}
          >
          {busy
            ? "Please wait..."
            : mode === "signup"
            ? "Create Citizen Account"
            : "Sign In"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
        }}
        >
        {mode === "login"
          ? "New citizen? Create an account"
          : "Already registered? Sign in"}
      </button>

      {mode === "signup" && (
          <p className="text-sm">
          Public signup creates Citizen accounts only. Collector and Admin
          access requires authorization.
        </p>
      )}
      </section>
    </main>
  );
}