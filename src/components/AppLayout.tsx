import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, FilePlus, Truck, ShoppingCart,
  Settings, LogOut, UserCog, Menu, Database
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Bill', url: '/invoices', icon: FileText },
  { title: 'Quotations', url: '/quotations', icon: FilePlus },
  { title: 'Challans', url: '/challans', icon: Truck },
];

const adminItems = [
  { title: 'User Management', url: '/users', icon: UserCog },
  { title: 'Company Settings', url: '/settings', icon: Settings },
  { title: 'Backups', url: '/backups', icon: Database },
];

function AppSidebarContent() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="text-center">
            <h2 className="text-sm font-bold text-sidebar-foreground leading-tight">S. M. Trade</h2>
            <p className="text-xs text-sidebar-foreground/70">International</p>
          </div>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-sidebar-accent/50 text-sidebar-foreground" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent/50 text-sidebar-foreground" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="mt-auto p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs text-sidebar-foreground/70 truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-primary capitalize">{user?.role}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full text-sidebar-foreground hover:bg-sidebar-accent/50 justify-start">
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-card px-4 no-print">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-lg font-semibold text-foreground">S. M. Trade International</h1>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
