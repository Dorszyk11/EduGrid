"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/shared/auth";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/przydzial", label: "Przydział", icon: "📋" },
  { href: "/siatka-szkoly", label: "Siatka szkoły", icon: "📅" },
  { href: "/dyspozycja", label: "Dyspozycja", icon: "👤" },
  { href: "/realizacja", label: "Realizacja", icon: "✅" },
  { href: "/nauczyciele", label: "Nauczyciele", icon: "👨‍🏫" },
  { href: "/klasy", label: "Klasy", icon: "🏫" },
  { href: "/szkoly", label: "Typy szkół", icon: "🏢" },
  { href: "/mapowania", label: "Mapowania", icon: "🔗" },
  { href: "/plany-mein", label: "Plany MEiN", icon: "📖" },
  { href: "/raporty", label: "Raporty", icon: "📈" },
  { href: "/import/mein-pdf", label: "Import PDF", icon: "📥" },
  { href: "/panel-admin", label: "Administracja", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-gray-900 text-white transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed && (
          <Link href="/dashboard" className="text-xl font-bold text-white">
            EduGrid
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-1"
          aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-700 px-4 py-3">
        {!collapsed && user && (
          <div className="mb-2 text-xs text-gray-400 truncate">
            {user.firstName} {user.lastName}
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          title="Wyloguj"
        >
          <span>🚪</span>
          {!collapsed && <span>Wyloguj</span>}
        </button>
      </div>
    </aside>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
