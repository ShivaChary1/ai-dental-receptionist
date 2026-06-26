import { NavLink, Outlet, useNavigate } from "react-router-dom";

const NAV = [
  { to: "overview", label: "Overview", icon: "▦" },
  { to: "appointments", label: "Appointments", icon: "📅" },
  { to: "conversations", label: "Conversations", icon: "💬" },
  { to: "knowledge", label: "Agent Knowledge", icon: "🧠" },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-100 flex flex-col">
        <div className="px-5 py-5 font-bold text-primary text-lg flex items-center gap-2">
          🦷 SmileCare
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <span>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => navigate("/")}
          className="m-3 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg text-left"
        >
          ⎋ Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <h1 className="text-lg font-semibold text-slate-800">
            SmileCare Admin Dashboard
          </h1>
          <span className="text-sm text-slate-400">{today}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
