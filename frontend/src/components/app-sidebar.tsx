"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/logo";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  Mail,
  Vote,
  FileText,
  BarChart3,
  GitBranch,
  Brain,
  Plug,
  Megaphone,
  BookOpen,
  UserCircle,
  Receipt,
  CalendarCheck,
  Tag,
  Building,
  Globe,
  ClipboardList,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  external?: boolean;
  permission?: string;
}

const memberNavItems: NavItem[] = [
  { title: "My Profile", href: "/profile", icon: UserCircle },
  { title: "My Invoices", href: "/my-invoices", icon: Receipt },
  { title: "My Events", href: "/my-events", icon: CalendarCheck },
];

const associationNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Members", href: "/members", icon: Users, permission: "members:read" },
  { title: "Finances", href: "/finances", icon: DollarSign, permission: "finances:read" },
  { title: "Events", href: "/events", icon: Calendar, permission: "events:read" },
  { title: "Communications", href: "/communications", icon: Mail, permission: "communications:read" },
  { title: "Elections", href: "/elections", icon: Vote, permission: "elections:read" },
  { title: "Documents", href: "/documents", icon: FileText, permission: "documents:read" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, permission: "analytics:read" },
  { title: "Workflows", href: "/workflows", icon: GitBranch, permission: "workflows:read" },
  { title: "AI Engine", href: "/ai", icon: Brain, permission: "ai:chat" },
  { title: "Integrations", href: "/integrations", icon: Plug, permission: "integrations:read" },
  { title: "Discount Codes", href: "/discount-codes", icon: Tag, permission: "finances:write" },

  { title: "My Org Profile", href: "/dashboard/org-profile", icon: Globe },
  { title: "Documentation", href: "https://tahiralatif.github.io/Association-Management-System/", icon: BookOpen, external: true },
];

const platformNavItems: NavItem[] = [
  { title: "Overview", href: "/admin", icon: Globe },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Organizations", href: "/admin/organizations", icon: Building },
  { title: "Org Requests", href: "/admin/org-requests", icon: ClipboardList },
  { title: "Platform Users", href: "/admin/users", icon: Shield },
  { title: "Marketing Page", href: "/marketing", icon: Megaphone },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const isSuperAdmin = user?.roles?.includes("super_admin") ?? false;
  const isMember = !user?.roles?.some(r => ["super_admin", "tenant_admin", "staff"].includes(r));

  // Determine which nav set to show
  const visibleAssociationItems = associationNavItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const showMemberNav = isMember;
  const showAssociationNav = !isSuperAdmin && !isMember && visibleAssociationItems.length > 0;
  const showPlatformNav = isSuperAdmin;

  // Member role: show member nav + platform link for super_admin fallback
  const showMemberPlusPlatform = isMember && isSuperAdmin;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100">
          <Logo size="sm" />
          <span className="group-data-[collapsible=icon]:hidden text-lg font-bold tracking-tight" style={{ color: '#0f172a' }}>
            Assoc<span style={{ color: '#0d9488' }}>Hub</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* ── Super Admin: Platform navigation ── */}
        {showPlatformNav && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold px-3 mt-2">
              Platform Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformNavItems.map((item) => {
                  const isActive = item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "rounded-xl transition-all duration-200 mx-1.5 mb-0.5",
                          isActive
                            ? "bg-gradient-to-r from-teal-50 to-teal-50/50 text-[#0d9488] font-semibold relative"
                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full" style={{ background: 'linear-gradient(180deg, #0d9488, #14b8a6)', boxShadow: '0 0 8px rgba(13,148,136,0.4)' }} />}
                        <item.icon className={cn("h-4 w-4", isActive ? "text-[#0d9488]" : "text-slate-400")} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── Member self-service ── */}
        {showMemberNav && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold px-3 mt-2">
              My Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {memberNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "rounded-xl transition-all duration-200 mx-1.5 mb-0.5",
                          isActive
                            ? "bg-gradient-to-r from-teal-50 to-teal-50/50 text-[#0d9488] font-semibold relative"
                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full" style={{ background: 'linear-gradient(180deg, #0d9488, #14b8a6)', boxShadow: '0 0 8px rgba(13,148,136,0.4)' }} />}
                        <item.icon className={cn("h-4 w-4", isActive ? "text-[#0d9488]" : "text-slate-400")} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── Association Admin / Staff: Management navigation ── */}
        {showAssociationNav && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold px-3 mt-2">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAssociationItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const isExternal = item.external;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={isExternal ? <a href={item.href} target="_blank" rel="noopener noreferrer" /> : <Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "rounded-xl transition-all duration-200 mx-1.5 mb-0.5",
                          isActive
                            ? "bg-gradient-to-r from-teal-50 to-teal-50/50 text-[#0d9488] font-semibold relative"
                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full" style={{ background: 'linear-gradient(180deg, #0d9488, #14b8a6)', boxShadow: '0 0 8px rgba(13,148,136,0.4)' }} />}
                        <item.icon className={cn("h-4 w-4", isActive ? "text-[#0d9488]" : "text-slate-400")} />
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto text-[10px] bg-gradient-to-r from-[#0d9488] to-[#14b8a6] text-white px-2 py-0.5 rounded-full font-bold" style={{ boxShadow: '0 2px 6px rgba(13,148,136,0.3)' }}>
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 2px 8px rgba(13,148,136,0.25)' }}>
              {(user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.email || "User"}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {isSuperAdmin ? "Platform Admin" : user?.tenant_id || "Default"}
              </p>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
