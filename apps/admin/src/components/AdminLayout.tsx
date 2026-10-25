import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.tsx";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/catalog/buildings", label: "Buildings", icon: "apartment" },
  { to: "/catalog/floors", label: "Floors", icon: "layers" },
  { to: "/catalog/classrooms", label: "Classrooms", icon: "meeting_room" },
  { to: "/catalog/departments", label: "Departments", icon: "account_tree" },
  { to: "/catalog/faculty", label: "Faculty", icon: "group" },
  { to: "/graph-editor", label: "Graph Editor", icon: "account_tree" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 z-50 flex flex-col justify-between bg-[#eef4ff] border-r border-[#c0c7d0]/30 shadow-sm">
        <div className="flex flex-col gap-4 p-4">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-10 h-10 rounded-lg bg-[#006699] text-white flex items-center justify-center shadow-md">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#004d75] tracking-tight leading-none" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                QRoute
              </span>
              <span className="text-xs text-[#525f75] mt-1">Admin Portal</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-[#c0c7d0]/30 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F9D58] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F9D58]"></span>
              </span>
              <span className="text-xs font-semibold text-[#004d75]">System Online</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 mt-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || 
                (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                    isActive
                      ? "bg-[#d6e3fe] text-[#004d75] font-semibold shadow-xs"
                      : "text-[#525f75] hover:text-[#061d30] hover:bg-[#e4efff]"
                  }`}
                >
                  <span className="text-lg">
                    {item.icon === "dashboard" && "📊"}
                    {item.icon === "apartment" && "🏢"}
                    {item.icon === "layers" && "🏗️"}
                    {item.icon === "meeting_room" && "🚪"}
                    {item.icon === "account_tree" && "🌳"}
                    {item.icon === "group" && "👥"}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c0c7d0]/30">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[#006699] text-white flex items-center justify-center text-xs font-semibold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#061d30] truncate">{user?.email}</p>
              <p className="text-xs text-[#707880] capitalize">{user?.role}</p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-[#707880] hover:text-[#061d30] hover:bg-[#e4efff] transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
