
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase, CalendarDays, Cake, School, Crosshair, ShieldAlert,
  Users, ArrowRight, Activity, Info, BookOpen, ListChecks, PlusCircle, Package, Loader2
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy, Timestamp, limit, getCountFromServer } from "firebase/firestore";
import { format, formatDistanceToNow, isSameDay, isFuture, startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton"; // For loading states

// Simplified interfaces for dashboard data
interface DashboardPpmEvent { id: string; title: string; startDateTime: Timestamp; }
interface DashboardBirthday { id: string; name: string; anchorDate: Timestamp; type: string; grade?: string;}
interface DashboardAcademicEvent { id: string; title: string; date: Timestamp; }
interface DashboardActivityLog { id: string; title: string; date: Timestamp; details?: string; source?: string; }


interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  value?: string | number;
  valueLabel?: string;
  ctaLabel?: string;
  isLoading?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, link, value, valueLabel, ctaLabel = "View Details", isLoading }) => {
  const router = useRouter();
  return (
    <Card className="shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-in-out flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="h-7 w-7 text-primary" />
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs leading-relaxed min-h-[30px]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : value !== undefined && valueLabel && (
          <div className="mb-1 min-w-0">
            <p className="text-2xl md:text-3xl font-bold text-foreground break-all">{value}</p>
            <p className="text-xs text-muted-foreground">{valueLabel}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full hover:bg-accent/80" onClick={() => router.push(link)}>
          {ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Helper to format large numbers with K, M, B, T suffixes
const formatLargeNumberWithSuffix = (num: number, precision = 1): string => {
  const map = [
    { suffix: 'T', threshold: 1e12 },
    { suffix: 'B', threshold: 1e9 },
    { suffix: 'M', threshold: 1e6 },
    { suffix: 'K', threshold: 1e3 },
    { suffix: '', threshold: 1 },
  ];

  const found = map.find((x) => Math.abs(num) >= x.threshold);
  if (found) {
    const formatted = (num / found.threshold).toFixed(precision);
    // Remove .0 from the end if precision is 1 and it's a whole number (e.g., 10.0B becomes 10B)
    const finalValue = precision > 0 && formatted.endsWith(`.${'0'.repeat(precision)}`)
      ? formatted.slice(0, -(precision + 1))
      : formatted;
    return `Rp ${finalValue}${found.suffix}`;
  }
  // For numbers less than 1000, format with standard currency formatting but without decimals for whole numbers
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};


export default function DashboardPage() {
  const { user, username } = useAuth();
  const router = useRouter();

  // State for dashboard data
  const [upcomingPpmEventsCount, setUpcomingPpmEventsCount] = useState(0);
  const [todaysBirthdaysCount, setTodaysBirthdaysCount] = useState(0);
  const [upcomingAcademicEventsCount, setUpcomingAcademicEventsCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [inProgressTargetsCount, setInProgressTargetsCount] = useState(0);
  const [recentViolationsCount, setRecentViolationsCount] = useState(0);
  const [totalAssetsValue, setTotalAssetsValue] = useState(0);
  const [recentActivities, setRecentActivities] = useState<DashboardActivityLog[]>([]);

  // Loading states
  const [loadingPpmEvents, setLoadingPpmEvents] = useState(true);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);
  const [loadingAcademicEvents, setLoadingAcademicEvents] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadingViolations, setLoadingViolations] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Fetch Upcoming PPM Calendar Events
  useEffect(() => {
    const today = startOfDay(new Date());
    const q = query(
      collection(db, "calendarEvents"),
      where("startDateTime", ">=", Timestamp.fromDate(today))
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const countSnapshot = await getCountFromServer(q);
      setUpcomingPpmEventsCount(countSnapshot.data().count);
      setLoadingPpmEvents(false);
    }, (error) => {
      console.error("Error fetching PPM events count: ", error);
      setLoadingPpmEvents(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Today's Birthdays
  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const q = collection(db, "birthdayEvents");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data() as { anchorDate: Timestamp };
        if (data.anchorDate) {
          const birthday = data.anchorDate.toDate();
          if (birthday.getMonth() === currentMonth && birthday.getDate() === currentDate) {
            count++;
          }
        }
      });
      setTodaysBirthdaysCount(count);
      setLoadingBirthdays(false);
    }, (error) => {
      console.error("Error fetching birthdays count: ", error);
      setLoadingBirthdays(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Upcoming Academic Events
  useEffect(() => {
    const today = startOfDay(new Date());
    const q = query(
      collection(db, "academicEvents"),
      where("date", ">=", Timestamp.fromDate(today))
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const countSnapshot = await getCountFromServer(q);
      setUpcomingAcademicEventsCount(countSnapshot.data().count);
      setLoadingAcademicEvents(false);
    }, (error) => {
      console.error("Error fetching academic events count: ", error);
      setLoadingAcademicEvents(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Active Projects Count
  useEffect(() => {
    const q = query(
      collection(db, "projectsPPM"),
      where("status", "not-in", ["Completed", "Cancelled"])
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const countSnapshot = await getCountFromServer(q);
      setActiveProjectsCount(countSnapshot.data().count);
      setLoadingProjects(false);
    }, (error) => {
      console.error("Error fetching active projects count: ", error);
      setLoadingProjects(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch In Progress Targets Count
  useEffect(() => {
    const q = query(
      collection(db, "targetListItems"),
      where("status", "==", "In Progress")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const countSnapshot = await getCountFromServer(q);
      setInProgressTargetsCount(countSnapshot.data().count);
      setLoadingTargets(false);
    }, (error) => {
      console.error("Error fetching in-progress targets count: ", error);
      setLoadingTargets(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Recent Violations Count (counting all for now)
  useEffect(() => {
    const q = collection(db, "studentViolations");
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const countSnapshot = await getCountFromServer(q);
      setRecentViolationsCount(countSnapshot.data().count);
      setLoadingViolations(false);
    }, (error) => {
      console.error("Error fetching violations count: ", error);
      setLoadingViolations(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Total Assets Value
  useEffect(() => {
    const q = collection(db, "assetItems");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalValue = 0;
      snapshot.forEach(doc => {
        const data = doc.data() as { amount: number };
        if (data.amount && typeof data.amount === 'number') {
          totalValue += data.amount;
        }
      });
      setTotalAssetsValue(totalValue);
      setLoadingAssets(false);
    }, (error) => {
      console.error("Error fetching total assets value: ", error);
      setLoadingAssets(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Recent Activities
  useEffect(() => {
    const q = query(collection(db, "activityLogEntries"), orderBy("date", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || "No title",
        date: doc.data().date as Timestamp,
        details: doc.data().details,
        source: doc.data().source,
      } as DashboardActivityLog));
      setRecentActivities(activities);
      setLoadingActivities(false);
    }, (error) => {
      console.error("Error fetching recent activities: ", error);
      setLoadingActivities(false);
    });
    return () => unsubscribe();
  }, []);


  const summaryMetrics = [
    { title: "Active Projects", value: activeProjectsCount, icon: Briefcase, link: "/dashboard/project", iconColor: "text-primary", isLoading: loadingProjects },
    { title: "Targets In Progress", value: inProgressTargetsCount, icon: Crosshair, link: "/dashboard/target-list", iconColor: "text-primary", isLoading: loadingTargets },
    { title: "Total Violations", value: recentViolationsCount, icon: ShieldAlert, link: "/dashboard/violations", iconColor: "text-primary", isLoading: loadingViolations },
    { title: "Today's Birthdays", value: todaysBirthdaysCount, icon: Cake, link: "/dashboard/birthday-calendar", iconColor: "text-primary", isLoading: loadingBirthdays },
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-gradient-to-br from-secondary to-card border-border">
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">
                Welcome back, {username || "User"}!
              </h1>
              <p className="text-muted-foreground mt-1">Keine Daten Sind Immer Sicher</p>
            </div>
            <Avatar className="h-20 w-20 border-2 border-primary/50 shadow-md">
              <AvatarImage src={`https://placehold.co/80x80.png?text=${username ? username.charAt(0).toUpperCase() : 'U'}`} alt={username || "User"} data-ai-hint="user avatar large" />
              <AvatarFallback className="text-3xl">{username ? username.charAt(0).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              onClick={() => router.push('/dashboard/project')}
              className="hover:scale-105 hover:shadow-md active:scale-95 transition-transform duration-150"
            >
              <Briefcase className="mr-2 h-4 w-4" />
              View Projects
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/target-list')}
              className="hover:scale-105 hover:shadow-md active:scale-95 transition-transform duration-150"
            >
              <Crosshair className="mr-2 h-4 w-4" />
              View Target List
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <Card 
            key={metric.title} 
            className="shadow-md hover:shadow-lg hover:ring-2 hover:ring-primary/30 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col" 
            onClick={() => router.push(metric.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <metric.icon className={cn("h-5 w-5", metric.iconColor)} />
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between pt-2">
              {metric.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{metric.value}</div>
              )}
              <p className="text-xs text-primary hover:underline pt-1"> 
                View details <ArrowRight className="inline h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">Explore Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="PPM Calendar"
            description="Upcoming deadlines, meetings, and milestones."
            icon={CalendarDays}
            link="/dashboard/calendar"
            value={upcomingPpmEventsCount}
            valueLabel="Upcoming Events"
            isLoading={loadingPpmEvents}
          />
          <FeatureCard
            title="Birthday Calendar"
            description="Don't miss any colleague or student birthdays."
            icon={Cake}
            link="/dashboard/birthday-calendar"
            value={todaysBirthdaysCount}
            valueLabel="Birthdays Today"
            isLoading={loadingBirthdays}
          />
          <FeatureCard
            title="Academic Calendar"
            description="Stay on top of school events, exams, and holidays."
            icon={School}
            link="/dashboard/academic-calendar"
            value={upcomingAcademicEventsCount}
            valueLabel="Upcoming Academic Events"
            isLoading={loadingAcademicEvents}
          />
          <FeatureCard
            title="Total Assets"
            description="Current total value of recorded assets."
            icon={Package}
            link="/dashboard/total-assets"
            value={formatLargeNumberWithSuffix(totalAssetsValue)}
            valueLabel="Total Value (IDR)"
            isLoading={loadingAssets}
          />
          <FeatureCard
            title="Information Hub"
            description="Latest news, announcements, and industry trends."
            icon={Info}
            link="/dashboard/information"
            ctaLabel="Explore Hub"
          />
          <FeatureCard
            title="Knowledge Hub"
            description="Access learning resources and tutorials."
            icon={BookOpen}
            link="/dashboard/knowledge"
            ctaLabel="Learn More"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Activity className="h-6 w-6 text-primary" />Recent Activity</CardTitle>
            <CardDescription>Latest updates across your projects and tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivities ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-2.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <ul className="space-y-3">
                {recentActivities.map((item) => (
                  <li key={item.id} className="flex items-center space-x-3 p-2.5 hover:bg-muted/70 rounded-md transition-colors duration-150">
                    <div className="p-1.5 bg-accent/30 rounded-full">
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">
                        {item.title}
                        {item.source && <span className="text-xs text-muted-foreground"> (via {item.source})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(item.date.toDate(), { addSuffix: true })}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><ListChecks className="h-6 w-6 text-primary" />Quick Links</CardTitle>
            <CardDescription>Navigate to other important areas quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {(
              [
                {href: "/dashboard/project", label: "Manage Projects"},
                {href: "/dashboard/target-list", label: "View Target List"},
                {href: "/dashboard/violations", label: "Report Violations"},
                {href: "/dashboard/chat", label: "Open Team Chat"},
                {href: "/dashboard/profile", label: "Your Profile"},
                {href: "/dashboard/settings", label: "App Settings"},
              ]
            ).map(link => (
                 <Button key={link.href} variant="outline" size="sm" className="justify-start text-left hover:bg-accent/80 hover:shadow-md hover:scale-105 active:scale-95 transition-transform duration-150 whitespace-normal h-auto py-2 px-3" asChild>
                    <Link href={link.href}> <ArrowRight className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0"/> {link.label}</Link>
                </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
    
