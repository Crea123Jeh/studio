
"use client";

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UserCircle,
  Briefcase,
  CalendarDays,
  MessageSquare,
  LogOut,
  Settings,
  ChevronDown,
  PanelLeft,
  Laptop,
  Info,
  Cake,
  BookOpen,
  School,
  History,
  Package,
  FileSpreadsheet,
  RadioTower,
  Bot,
  Bell,
  ListChecks,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/project', label: 'Projects', icon: Briefcase },
  { href: '/dashboard/calendar', label: 'PPM Calendar', icon: CalendarDays },
  { href: '/dashboard/previous-activity', label: 'Previous Activity', icon: History },
  { href: '/dashboard/birthday-calendar', label: 'Birthday Calendar', icon: Cake },
  { href: '/dashboard/academic-calendar', label: 'Academic Calendar', icon: School },
  { href: '/dashboard/chat', label: 'Team Chat', icon: MessageSquare },
  { href: '/dashboard/information', label: 'Information', icon: Info },
  { href: '/dashboard/knowledge', label: 'Knowledge Hub', icon: BookOpen },
  { href: '/dashboard/total-assets', label: 'Total Assets', icon: Package },
  { href: '/dashboard/sheet-5b7s', label: 'Sheet 5B7S', icon: FileSpreadsheet },
  { href: '/dashboard/ppm-radio', label: 'PPM Radio', icon: RadioTower },
  { href: '/dashboard/bots-list', label: 'Bot\'s List', icon: Bot },
];

const bottomNavItems: NavItem[] = [
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface NotificationItem {
  id: string;
  type: 'project' | 'task' | 'alert' | 'message' | 'generic';
  message: string;
  link?: string;
  timestamp: Date;
  read: boolean;
  icon: React.ElementType;
}

const initialMockNotifications: NotificationItem[] = [
  { id: '1', type: 'project', message: 'New project "Phoenix Initiative" has been assigned to you.', link: '/dashboard/project', timestamp: new Date(Date.now() - 1000 * 60 * 5), read: false, icon: Briefcase },
  { id: '2', type: 'task', message: 'Task "Setup CI/CD Pipeline" is due tomorrow.', link: '/dashboard/project', timestamp: new Date(Date.now() - 1000 * 60 * 30), read: false, icon: ListChecks },
  { id: '3', type: 'alert', message: 'Project "Gamma" budget nearing 90% utilization.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), read: true, icon: AlertCircle },
  { id: '4', type: 'message', message: 'Alice mentioned you in #project-alpha channel.', link: '/dashboard/chat', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), read: false, icon: MessageSquare },
  { id: '5', type: 'generic', message: 'System maintenance scheduled for Sunday 2 AM.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), read: true, icon: Settings },
];


function AppSidebar() {
  const pathname = usePathname();
  const { user, username, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <SidebarHeader className="p-4">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-2">
          {[...Array(mainNavItems.length + bottomNavItems.length + 1)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </SidebarHeader>
    );
  }

  return (
    <>
      <SidebarHeader className="p-4 flex items-center gap-2 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
           <Laptop className="h-7 w-7 text-accent" />
          <h1 className="text-lg font-semibold text-sidebar-foreground font-headline">PPM Management</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <ScrollArea className="flex-grow">
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    tooltip={item.label}
                    asChild
                  >
                    <a>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>

        <div className="mt-auto flex flex-col pt-2">
          <SidebarSeparator className="my-2"/>
          <SidebarMenu>
            {bottomNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    asChild
                  >
                    <a>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Logout">
                <LogOut/>
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </>
  );
}

function Header() {
  const { user, username, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isMobile, toggleSidebar } = useSidebar();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialMockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string, link?: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
      {/* Left section: Sidebar Trigger (mobile) + Logo/Title */}
      <div className="flex items-center gap-2">
        {isMobile && (
          <SidebarTrigger asChild>
            <Button variant="ghost" size="icon">
              <PanelLeft />
            </Button>
          </SidebarTrigger>
        )}
        {/* Always visible logo in the top bar */}
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Laptop className="h-6 w-6 text-accent" />
          <span className="text-lg font-semibold text-sidebar-foreground font-headline">PPM Management</span>
        </Link>
      </div>

      {/* Right section: Notifications + Profile */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute top-0.5 right-0.5 h-4 w-4 min-w-fit p-0.5 text-xs flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && <Badge variant="secondary">{unreadCount} Unread</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
                  No new notifications
                </DropdownMenuItem>
              ) : (
                notifications.map((notification) => {
                  const Icon = notification.icon;
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/80",
                        !notification.read && "bg-primary/10"
                      )}
                      onClick={() => handleMarkAsRead(notification.id, notification.link)}
                    >
                      {!notification.read && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary flex-shrink-0" />}
                      {notification.read && <div className="w-2 h-2 mt-1.5 flex-shrink-0" /> /* Placeholder for alignment */}

                      <Icon className={cn("h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0", !notification.read && "text-primary")} />
                      <div className="flex-grow">
                        <p className={cn("text-sm leading-snug text-foreground", !notification.read && "font-semibold")}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="cursor-pointer">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark all as read
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')} className="cursor-pointer"> {/* Placeholder link */}
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {authLoading ? (
          <Skeleton className="h-8 w-24 rounded-md" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 flex items-center gap-2 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${username ? username.charAt(0).toUpperCase() : 'U'}`} alt={username || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>{username ? username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block">{username}</span>
                <ChevronDown className="h-4 w-4 hidden sm:inline-block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{username}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={() => router.push('/login')}>Login</Button>
        )}
      </div>
    </header>
  );
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r border-sidebar-border">
        <AppSidebar />
      </Sidebar>
      <div className="flex flex-col flex-1 md:ml-[var(--sidebar-width-icon)] group-data-[state=expanded]:md:ml-[var(--sidebar-width)] transition-[margin-left] duration-200 ease-linear">
        <Header />
        <SidebarInset>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
