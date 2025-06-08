
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase, CalendarDays, Cake, School, Crosshair, ShieldAlert,
  Users, ArrowRight, Activity, Info, BookOpen, ListChecks, PlusCircle
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Mock data for dashboard - in a real app, this would come from API/Firestore hooks
const mockDashboardData = {
  upcomingPpmEvents: [
    { id: "ppm1", title: "Project Alpha Review", date: "Oct 25, 10:00 AM", projectId: "Alpha" },
    { id: "ppm2", title: "Client Meeting - Zeta Corp", date: "Oct 28, 2:00 PM", projectId: "Zeta" },
  ],
  todaysBirthdays: [
    { id: "bday1", name: "Alice Wonderland", type: "Teacher" },
    { id: "bday2", name: "Student McStudentFace", type: "Student", grade: "5" },
  ],
  upcomingAcademicEvents: [
    { id: "acad1", title: "Mid-Term Exams Start", date: "Nov 1" },
    { id: "acad2", title: "School Holiday", date: "Nov 10" },
  ],
  activeProjectsCount: 7,
  inProgressTargetsCount: 3,
  recentViolationsCount: 1,
  recentActivities: [
    { id: "act1", user: "Bob The Builder", action: "updated Project Gamma", time: "1h ago" },
    { id: "act2", user: "Charlie Brown", action: "added a new target to 'Research Team'", time: "3h ago" },
  ]
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  value?: string | number;
  valueLabel?: string;
  ctaLabel?: string;
  iconBgColor?: string; // Tailwind background color class e.g., "bg-primary", "bg-pink-500"
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, link, value, valueLabel, ctaLabel = "View Details", iconBgColor = "bg-primary" }) => {
  const router = useRouter();
  return (
    <Card className="shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-in-out flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn("p-2.5 rounded-lg", iconBgColor)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs leading-relaxed min-h-[30px]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {value !== undefined && valueLabel && (
          <div className="mb-1">
            <p className="text-3xl font-bold text-foreground">{value}</p>
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


export default function DashboardPage() {
  const { user, username } = useAuth();
  const router = useRouter();
  const data = mockDashboardData; 

  const summaryMetrics = [
    { title: "Active Projects", value: data.activeProjectsCount, icon: Briefcase, link: "/dashboard/project", iconColor: "text-primary" },
    { title: "Targets In Progress", value: data.inProgressTargetsCount, icon: Crosshair, link: "/dashboard/target-list", iconColor: "text-accent" },
    { title: "Recent Violations", value: data.recentViolationsCount, icon: ShieldAlert, link: "/dashboard/violations", iconColor: "text-destructive" },
    { title: "Today's Birthdays", value: data.todaysBirthdays.length, icon: Cake, link: "/dashboard/birthday-calendar", iconColor: "text-pink-500" },
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">
              Welcome back, {username || "User"}!
            </h1>
            <p className="text-muted-foreground mt-1">Here's your PPM summary for today.</p>
          </div>
          <Image
            src={`https://placehold.co/80x80.png?text=${username ? username.charAt(0).toUpperCase() : 'U'}`}
            alt="User Avatar"
            width={72}
            height={72}
            className="rounded-full border-2 border-primary shadow-md"
            data-ai-hint="user avatar large"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <Card key={metric.title} className="shadow-md hover:shadow-lg hover:ring-2 hover:ring-primary/30 transition-all duration-200 cursor-pointer" onClick={() => router.push(metric.link)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <metric.icon className={cn("h-5 w-5", metric.iconColor)} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{metric.value}</div>
              <span className="text-xs text-primary hover:underline">
                View details <ArrowRight className="inline h-3 w-3" />
              </span>
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
            value={data.upcomingPpmEvents.length}
            valueLabel="Upcoming Events"
            iconBgColor="bg-blue-500"
          />
          <FeatureCard
            title="Birthday Calendar"
            description="Don't miss any colleague or student birthdays."
            icon={Cake}
            link="/dashboard/birthday-calendar"
            value={data.todaysBirthdays.length}
            valueLabel="Birthdays Today"
            iconBgColor="bg-pink-500"
          />
          <FeatureCard
            title="Academic Calendar"
            description="Stay on top of school events, exams, and holidays."
            icon={School}
            link="/dashboard/academic-calendar"
            value={data.upcomingAcademicEvents.length}
            valueLabel="Upcoming Academic Events"
            iconBgColor="bg-indigo-500"
          />
          <FeatureCard
            title="Information Hub"
            description="Latest news, announcements, and industry trends."
            icon={Info}
            link="/dashboard/information"
            ctaLabel="Explore Hub"
            iconBgColor="bg-teal-500"
          />
          <FeatureCard
            title="Knowledge Hub"
            description="Access learning resources and tutorials."
            icon={BookOpen}
            link="/dashboard/knowledge"
            ctaLabel="Learn More"
            iconBgColor="bg-purple-500"
          />
          <FeatureCard
            title="Quick Add Event"
            description="Quickly add an event to your PPM Calendar."
            icon={PlusCircle}
            link="/dashboard/calendar" // Ideally opens add dialog
            ctaLabel="Add PPM Event"
            iconBgColor="bg-green-500"
          />
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
         <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Activity className="h-6 w-6 text-primary" />Recent Activity</CardTitle>
            <CardDescription>Latest updates across your projects and tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length > 0 ? (
              <ul className="space-y-3">
                {data.recentActivities.map((item) => (
                  <li key={item.id} className="flex items-center space-x-3 p-2.5 hover:bg-muted/70 rounded-md transition-colors duration-150">
                    <div className="p-1.5 bg-accent/30 rounded-full">
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">{item.user}</span> {item.action}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
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
                 <Button key={link.href} variant="outline" size="sm" className="justify-start text-left hover:bg-accent/80" asChild>
                    <Link href={link.href}> <ArrowRight className="mr-2 h-3.5 w-3.5 text-muted-foreground"/> {link.label}</Link>
                </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    