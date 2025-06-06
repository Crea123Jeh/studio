"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, ListChecks, FileText, Users, Paperclip, MessageCircle } from "lucide-react";
import Image from "next/image";

const project = {
  name: "Project Alpha Centauri",
  description: "A pioneering initiative to explore advanced AI integration in project management, aiming to enhance efficiency and predictive capabilities across diverse portfolios.",
  status: "In Progress",
  startDate: "2023-01-15",
  endDate: "2024-06-30",
  budget: 500000,
  spent: 275000,
  manager: { name: "Dr. Evelyn Reed", avatar: "https://placehold.co/40x40.png?text=ER" },
  team: [
    { name: "Alice Johnson", role: "Lead Developer", avatar: "https://placehold.co/32x32.png?text=AJ" },
    { name: "Bob Williams", role: "UX Designer", avatar: "https://placehold.co/32x32.png?text=BW" },
    { name: "Charlie Davis", role: "QA Engineer", avatar: "https://placehold.co/32x32.png?text=CD" },
    { name: "Diana Miller", role: "Data Scientist", avatar: "https://placehold.co/32x32.png?text=DM" },
  ],
  tasks: [
    { id: "T1", name: "Initial Research & Feasibility Study", status: "Completed", assignee: "Diana Miller", dueDate: "2023-03-01" },
    { id: "T2", name: "Develop Core AI Model", status: "In Progress", assignee: "Alice Johnson", dueDate: "2023-09-15" },
    { id: "T3", name: "Design User Interface Mockups", status: "In Progress", assignee: "Bob Williams", dueDate: "2023-07-30" },
    { id: "T4", name: "Setup Testing Environment", status: "Pending", assignee: "Charlie Davis", dueDate: "2023-08-10" },
  ],
  documents: [
    { name: "Project Charter.pdf", size: "1.2MB", type: "PDF", uploaded: "2023-01-20" },
    { name: "Requirements Spec.docx", size: "850KB", type: "DOCX", uploaded: "2023-02-10" },
    { name: "AI Model Architecture.vsdx", size: "2.5MB", type: "VISIO", uploaded: "2023-04-05" },
  ],
  recentUpdates: [
    { user: "Alice Johnson", update: "Pushed new training dataset for the AI model.", time: "2 hours ago" },
    { user: "Bob Williams", update: "Shared v2 of UI mockups for review.", time: "1 day ago" },
    { user: "Dr. Evelyn Reed", update: "Scheduled stakeholder meeting for next Tuesday.", time: "2 days ago" },
  ]
};

export default function ProjectInfoPage() {
  const progress = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight">{project.name}</h1>
        </div>
        <Badge variant={project.status === "Completed" ? "default" : "secondary"} className="text-sm whitespace-nowrap bg-green-500 text-white">
          {project.status}
        </Badge>
      </div>
      <p className="text-muted-foreground">{project.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardHeader><CardTitle className="text-base">Start Date</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{project.startDate}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle className="text-base">End Date</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{project.endDate}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle className="text-base">Budget</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">${project.budget.toLocaleString()}</p></CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader><CardTitle className="text-base">Project Manager</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={project.manager.avatar} alt={project.manager.name} data-ai-hint="person avatar"/>
              <AvatarFallback>{project.manager.name.substring(0,1)}</AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold">{project.manager.name}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-base">Budget Utilization</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">${project.spent.toLocaleString()} spent of ${project.budget.toLocaleString()} ({progress.toFixed(1)}%)</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Project Details</CardTitle></CardHeader>
            <CardContent>
              <Image src="https://placehold.co/600x300.png" alt="Project Visual" width={600} height={300} className="w-full h-auto rounded-md mb-4" data-ai-hint="project chart" />
              <p>Further details about project goals, scope, and objectives can be outlined here. This section can include key performance indicators (KPIs), risk assessments, and stakeholder information. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary"/>Task Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {project.tasks.map(task => (
                  <li key={task.id} className="p-3 border rounded-md hover:bg-muted transition-colors">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">{task.name}</h4>
                      <Badge variant={task.status === "Completed" ? "default" : "outline"} className={task.status === "Completed" ? "bg-green-500 text-white" : ""}>{task.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Assignee: {task.assignee} | Due: {task.dueDate}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Team Members</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {project.team.map(member => (
                <div key={member.name} className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted transition-colors">
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar"/>
                    <AvatarFallback>{member.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-primary"/>Project Documents</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {project.documents.map(doc => (
                  <li key={doc.name} className="flex justify-between items-center p-3 border rounded-md hover:bg-muted transition-colors">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">Size: {doc.size} | Uploaded: {doc.uploaded}</p>
                    </div>
                    <Badge variant="secondary">{doc.type}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="updates" className="mt-4">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary"/>Recent Updates</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {project.recentUpdates.map((update, index) => (
                  <li key={index} className="p-3 border rounded-md hover:bg-muted transition-colors">
                    <p className="text-sm"><span className="font-semibold">{update.user}:</span> {update.update}</p>
                    <p className="text-xs text-muted-foreground">{update.time}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
