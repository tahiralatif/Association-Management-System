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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Members", href: "/members", icon: Users },
  { title: "Finances", href: "/finances", icon: DollarSign },
  { title: "Events", href: "/events", icon: Calendar },
  { title: "Communications", href: "/communications", icon: Mail },
  { title: "Elections", href: "/elections", icon: Vote },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Workflows", href: "/workflows", icon: GitBranch },
  { title: "AI Engine", href: "/ai", icon: Brain },
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Marketing Page", href: "/marketing", icon: Megaphone, badge: "NEW" },
  { title: "Documentation", href: "https://tahiralatif.github.io/Association-Management-System/", icon: BookOpen, external: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Logo size="sm" />
          <span className="group-data-[collapsible=icon]:hidden text-lg font-semibold text-slate-900">
            AssocHub
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const isExternal = "external" in item && item.external;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={isExternal ? <a href={item.href} target="_blank" rel="noopener noreferrer" /> : <Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {"badge" in item && item.badge && (
                        <span className="ml-auto text-[10px] bg-[#0d9488] text-white px-1.5 py-0.5 rounded-full font-bold">
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
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5">
          <Badge variant="secondary" className="text-xs w-full justify-center group-data-[collapsible=icon]:hidden">
            {user?.tenant_id || "Default Tenant"}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
