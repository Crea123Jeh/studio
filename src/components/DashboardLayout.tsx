
"use client";

import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, UserCircle, Briefcase, CalendarDays, MessageSquare, LogOut, Settings,
  ChevronDown, PanelLeft, Building, Info, Cake, BookOpen, School, History, Package,
  FileSpreadsheet, RadioTower, Bot, Bell, ListChecks, AlertCircle, CheckCircle2, Circle,
  ShieldAlert, Crosshair, Archive as ArchiveIcon, ClipboardList, Home, User as UserIcon // Added Home & UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar, SidebarSeparator,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase'; // Import db
import { collection, query, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore'; // Firestore imports

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/project', label: 'Projects', icon: Briefcase },
  { href: '/dashboard/archived-projects', label: 'Archived Projects', icon: ArchiveIcon },
  { href: '/dashboard/target-list', label: 'Target List', icon: Crosshair },
  { href: '/dashboard/calendar', label: 'PPM Calendar', icon: CalendarDays },
  { href: '/dashboard/previous-activity', label: 'Previous Activity', icon: History },
  { href: '/dashboard/birthday-calendar', label: 'Birthday Calendar', icon: Cake },
  { href: '/dashboard/academic-calendar', label: 'Academic Calendar', icon: School },
  { href: '/dashboard/violations', label: 'Violations', icon: ShieldAlert },
  { href: '/dashboard/chat', label: 'Team Chat', icon: MessageSquare },
  { href: '/dashboard/information', label: 'Information', icon: Info },
  { href: '/dashboard/knowledge', label: 'Knowledge Hub', icon: BookOpen },
  { href: '/dashboard/lss', label: 'Latihan Soal Sigma', icon: ClipboardList },
  { href: '/dashboard/total-assets', label: 'Total Assets', icon: Package },
  { href: '/dashboard/sheet-5b7s', label: 'Sheet 5B7S', icon: FileSpreadsheet },
  { href: '/dashboard/ppm-radio', label: 'PPM Radio', icon: RadioTower },
  { href: '/dashboard/bots-list', label: 'Bot\'s List', icon: Bot },
];

const bottomNavItems: NavItem[] = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export interface NotificationItem {
  id: string;
  type: 'project' | 'task' | 'alert' | 'message' | 'generic' | 'birthday' | 'academic' | 'info' | 'chat' | 'violation' | 'target' | 'asset' | 'lss' | 'sheet5b7s' | 'bot';
  message: string;
  link?: string;
  timestamp: Date; // Changed from Timestamp to Date for easier handling in state
  read: boolean;
  iconName: string; // Store icon name as string, resolve to component later
}

// Firestore data structure for notifications (conceptual)
interface FirestoreNotificationData {
  type: NotificationItem['type'];
  message: string;
  link?: string;
  timestamp: Timestamp; // Firestore Timestamp
  iconName: string;
  // any other fields your backend might send
}

const iconMap: Record<string, React.ElementType> = {
  Briefcase, CalendarDays, MessageSquare, Settings, Info, Cake, BookOpen, School,
  History, Package, FileSpreadsheet, RadioTower, Bot, ListChecks, AlertCircle,
  ShieldAlert, Crosshair, LayoutDashboard, Home, UserIcon,
  default: Bell, // Default icon if no match
};

const getIconComponent = (iconName: string): React.ElementType => {
  return iconMap[iconName] || iconMap.default;
};


function AppSidebar() {
  const pathname = usePathname();
  const { signOut, loading } = useAuth();

  if (loading) {
    return (
      <SidebarHeader className="px-3 py-3">
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
      <SidebarHeader className="pl-1 pr-3 py-3 flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
           <div className="bg-accent rounded-full h-7 w-7 flex items-center justify-center">
             <Building className="h-4 w-4 text-white" />
           </div>
          <h1 className="text-lg font-semibold text-sidebar-foreground font-headline">PPM Management</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <ScrollArea className="flex-grow pt-2 sidebar-scrollarea-custom">
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    className="ml-1"
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
                    className="ml-1"
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
              <SidebarMenuButton onClick={signOut} tooltip="Logout" className="ml-1">
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

interface HeaderProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: string, link?: string) => void;
  onMarkAllAsRead: () => void;
}

function Header({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead }: HeaderProps) {
  const { user, username, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isMobile, toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && (
          <SidebarTrigger asChild>
            <Button variant="ghost" size="icon">
              <PanelLeft />
            </Button>
          </SidebarTrigger>
        )}
         <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="text-lg font-semibold text-foreground font-headline">Para Petinggi Member</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 p-0 rounded-full text-muted-foreground hover:text-foreground">
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
                  const Icon = getIconComponent(notification.iconName);
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/80",
                        !notification.read && "bg-primary/10"
                      )}
                      onClick={() => onMarkAsRead(notification.id, notification.link)}
                    >
                      {!notification.read && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary flex-shrink-0" />}
                      {notification.read && <div className="w-2 h-2 mt-1.5 flex-shrink-0" />}

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
            <DropdownMenuItem onClick={onMarkAllAsRead} disabled={unreadCount === 0} className="cursor-pointer">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark all as read
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => {
              // console.log("View all notifications clicked");
            }} className="cursor-pointer"> 
              View all notifications (UI Placeholder)
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>

        {authLoading ? (
          <Skeleton className="h-8 w-24 rounded-md" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 flex items-center gap-2 rounded-full">
                <Avatar className="h-7 w-7">
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
  const { user, loading, username } = useAuth(); // Added username here
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notificationData: Omit<NotificationItem, 'id' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notificationData,
      id: Date.now().toString() + Math.random().toString(36).substring(2,7),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 29)]);
  }, []);

  // Listener for user-specific notifications from Firestore
  useEffect(() => {
    if (user?.uid) {
      const notificationsRef = collection(db, `userNotifications/${user.uid}/notifications`);
      // Query for the latest (e.g., 10) notifications, ordered by timestamp
      const q = query(notificationsRef, orderBy("timestamp", "desc"), limit(10));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newNotifications: NotificationItem[] = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data() as FirestoreNotificationData;
            // Check if this notification ID already exists to prevent duplicates if listener re-runs
            if (!notifications.some(n => n.id === change.doc.id)) {
              newNotifications.push({
                id: change.doc.id,
                type: data.type,
                message: data.message,
                link: data.link,
                timestamp: (data.timestamp as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
                read: false, // New notifications are unread
                iconName: data.iconName,
              });
            }
          }
        });

        if (newNotifications.length > 0) {
          // Add new notifications to the beginning of the list, maintaining sort by actual timestamp
          setNotifications(prev => 
            [...newNotifications, ...prev]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort by JS Date timestamp
            .slice(0, 30) // Keep max 30 notifications
          );
        }
      }, (error) => {
        console.error("Error fetching real-time notifications:", error);
        // Optionally, inform the user via toast, but be careful not to spam if there are connection issues
        // toast({ title: "Notification Error", description: "Could not fetch real-time notifications.", variant: "destructive" });
      });

      return () => unsubscribe(); // Cleanup listener on component unmount or user change
    } else {
      setNotifications([]); // Clear notifications if user logs out
    }
  }, [user, notifications]); // Added notifications to dependencies to avoid re-adding existing ones


  const handleMarkAsRead = useCallback((id: string, link?: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    if (link) {
      router.push(link);
    }
    // TODO: In a real app, you would also update the 'read' status of this notification
    // in the `userNotifications/{userId}/notifications/{notificationId}` document in Firestore.
    // Example: await updateDoc(doc(db, `userNotifications/${user.uid}/notifications`, id), { read: true });
  }, [router]);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // TODO: In a real app, you would update all unread notifications for this user in Firestore.
    // This might involve a batch write or a Cloud Function.
  }, []);


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
        <Header 
          notifications={notifications} 
          unreadCount={unreadCount}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-auto"> 
            {/* 
              To make other pages trigger notifications:
              1. Ensure the page has access to `user.uid` and `username`.
              2. After a data-saving operation (e.g., adding a project), you would typically call a 
                 Cloud Function. e.g., functions.httpsCallable('createProjectNotification')({ projectId: '...', ... });
              3. That Cloud Function would then write the notification to:
                 `userNotifications/{relevantUserId}/notifications/{newNotificationId}`
              4. The listener in *this* DashboardLayout component will then pick it up.
            */}
            {React.cloneElement(children as React.ReactElement, { 
              // This is a conceptual way to pass addNotification down. 
              // For a cleaner approach across many nested components, React Context is better.
              // However, direct "addNotification" calls from child pages are less ideal for
              // a true real-time system where the backend should be the source of truth for notifications.
              // For now, this line is commented out as direct child-to-parent calls for this aren't the final pattern.
              // addAppNotification: addNotification 
            })}
        </main>
      </div>
    </SidebarProvider>
  );
}
