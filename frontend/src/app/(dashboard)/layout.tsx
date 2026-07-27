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
import { LogOut, User } from "lucide-react";

// Admin-only routes — members should not access these
const ADMIN_ROUTES = ["/dashboard", "/members", "/finances", "/events", "/communications", "/elections", "/documents", "/analytics", "/workflows", "/ai", "/integrations", "/marketing"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isStaff) {
      // Redirect non-staff members away from admin routes
      router.replace("/profile");
    }
  }, [loading, user, isStaff, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-500">Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-white dark:bg-slate-900 dark:border-slate-700 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="h-4 w-4" />
              <span>{user?.email || "User"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-400 hover:text-slate-600"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
