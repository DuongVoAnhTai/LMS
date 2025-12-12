"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navItems: NavItem[] = [
  { id: "students", label: "Quản lý tài khoản", icon: UserIcon, path: "/students" }
];

const MainSidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-700 to-indigo-800
        transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 text-white font-bold text-xl">
        Education Admin
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-white hover:text-gray-300"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1 px-4">
        {navItems.map((item) => {
          const active =
            item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);

          return (
            <Link
              href={item.path}
              key={item.id}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                active
                  ? "bg-white/20 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MainSidebar;
