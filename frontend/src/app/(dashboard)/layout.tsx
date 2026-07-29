"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notification-center";
import { LogOut } from "lucide-react";

const ADMIN_ROUTES = ["/dashboard", "/members", "/finances", "/events", "/communications", "/elections", "/documents", "/analytics", "/workflows", "/ai", "/integrations", "/marketing"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isStaff) {
      router.replace("/profile");
    }
  }, [loading, user, isStaff, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #ffffff 40%, #f8fafc 100%)' }}>
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-xl border-4 border-teal-200 border-t-[#0d9488]" style={{ boxShadow: '0 4px 16px rgba(13,148,136,0.2)' }} />
          <p className="text-sm font-medium text-slate-500">Loading AssocHub...</p>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #ffffff 40%, #f8fafc 100%)' }}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 8px 24px rgba(13,148,136,0.2)' }}>
            <span className="text-white text-2xl">🔒</span>
          </div>
          <p className="text-slate-600 font-semibold">Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top teal accent line */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #065f46, #0d9488, #14b8a6, #0d9488, #065f46)' }} />
        {/* Glass morphism header */}
        <header className="flex h-16 items-center gap-3 border-b border-slate-200/50 px-5" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 1px 12px rgba(13,148,136,0.05)' }}>
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6 bg-slate-200/40" />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200/50">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 2px 10px rgba(13,148,136,0.3)' }}>
                {(user?.email?.[0] || "U").toUpperCase()}
              </div>
              <span className="text-sm text-slate-600 font-semibold hidden sm:inline">{user?.email || "User"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-[#0d9488] hover:bg-teal-50 rounded-xl px-3 py-2 h-auto transition-all font-medium">
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </header>
        {/* Main content with premium gradient background */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #ffffff 40%, #f8fafc 100%)' }}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
