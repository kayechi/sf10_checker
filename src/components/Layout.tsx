import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Table, Printer, Upload, ScrollText } from "lucide-react";

export default function Layout() {
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/tables", label: "Tables", icon: Table },
    { to: "/printables", label: "Printables", icon: Printer },
    { to: "/imports", label: "Imports", icon: Upload },
    { to: "/logs", label: "Logs", icon: ScrollText },
  ];

  return (
    <div className="flex h-screen w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden text-neutral-900 dark:text-neutral-100">
      <aside className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Student Records
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium shadow-md shadow-neutral-900/10 dark:shadow-white/10"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8 relative bg-neutral-50 dark:bg-neutral-900">
        <Outlet />
      </main>
    </div>
  );
}
