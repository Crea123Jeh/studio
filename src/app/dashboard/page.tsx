"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CalendarCheck, DollarSign, Users, Activity, ListChecks } from "lucide-react";
import Image from "next/image";

interface SummaryMetric {
  title: string;
  value: string;
  icon: React.ElementType;
  bgColorClass: string;
  iconColorClass: string;
  description?: string;
}

const summaryMetrics: SummaryMetric[] = [
  { title: "Active Projects", value: "12", icon: Briefcase, bgColorClass: "bg-blue-100", iconColorClass: "text-blue-500", description: "+2 from last month" },
  { title: "Tasks Due This Week", value: "8", icon: ListChecks, bgColorClass: "bg-yellow-100", iconColorClass: "text-yellow-500", description: "3 overdue" },
  { title: "Team Members", value: "27", icon: Users, bgColorClass: "bg-green-100", iconColorClass: "text-green-500", description: "5 new hires" },
  { title: "Upcoming Milestones", value: "4", icon: CalendarCheck, bgColorClass: "bg-purple-100", iconColorClass: "text-purple-500", description: "Next: Project Alpha Launch" },
];

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target?: string;
  time: string;
  avatar: string;
}

const activityFeed: ActivityItem[] = [
  { id: "1", user: "Alice Wonderland", action: "updated task", target: "User Authentication Flow", time: "2 mins ago", avatar: "https://placehold.co/40x40.png?text=AW" },
  { id: "2", user: "Bob The Builder", action: "commented on project", target: "Zephyr", time: "15 mins ago", avatar: "https://placehold.co/40x40.png?text=BB" },
  { id: "3", user: "Charlie Brown", action: "completed milestone", target: "Phase 1 Delivery", time: "1 hour ago", avatar: "https://placehold.co/40x40.png?text=CB" },
  { id: "4", user: "Diana Prince", action: "added a new project", target: "Project Omega", time: "3 hours ago", avatar: "https://placehold.co/40x40.png?text=DP" },
  { id: "5", user: "Edward Elric", action: "closed issue", target: "#345 - Login Bug", time: "5 hours ago", avatar: "https://placehold.co/40x40.png?text=EE" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard Summary</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <Card key={metric.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColorClass}`}>
                <metric.icon className={`h-5 w-5 ${metric.iconColorClass}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.description && <p className="text-xs text-muted-foreground">{metric.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              What&apos;s Happening
            </CardTitle>
            <CardDescription>Recent project activities and updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {activityFeed.map((item) => (
                <li key={item.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md transition-colors">
                  <Image src={item.avatar} alt={item.user} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{item.user}</span> {item.action}{' '}
                      {item.target && <span className="text-accent font-medium">{item.target}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Key deadlines and meetings on the horizon.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: "Oct 25", title: "Project Alpha Review", time: "10:00 AM" },
                { date: "Oct 28", title: "Client Meeting - Zeta Corp", time: "2:00 PM" },
                { date: "Nov 02", title: "Sprint Planning - Project Beta", time: "9:00 AM" },
                { date: "Nov 05", title: "Team Building Event", time: "4:00 PM" },
              ].map(event => (
                <div key={event.title} className="flex items-center p-2 hover:bg-muted rounded-md transition-colors">
                  <div className="flex flex-col items-center justify-center bg-primary/20 text-primary rounded-md p-2 mr-3 w-16">
                    <span className="text-xs font-medium uppercase">{event.date.split(' ')[0]}</span>
                    <span className="text-lg font-bold">{event.date.split(' ')[1]}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
