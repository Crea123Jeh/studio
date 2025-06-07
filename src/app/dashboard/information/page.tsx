
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Newspaper, TrendingUp, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

// Dummy data for demonstration
const happenings = [
  { id: "1", title: "AI in Project Management Sees 20% Growth", summary: "Recent studies show significant adoption of AI tools leading to improved project outcomes and efficiency.", source: "Tech Analyst Group", date: "Nov 5, 2024", icon: Newspaper, category: "Industry News" },
  { id: "2", title: "New Agile Methodology 'StreamFlow' Gaining Traction", summary: "StreamFlow, focusing on continuous value delivery, is being adopted by several innovative firms.", source: "Agile Insights", date: "Nov 4, 2024", icon: Newspaper, category: "Methodologies" },
  { id: "3", title: "Security Advisory: Update Your Project Management Tools", summary: "A critical vulnerability has been found in several popular PM tools. Ensure your software is updated to the latest version.", source: "CyberSec News", date: "Nov 2, 2024", icon: AlertTriangle, category: "Security" },
  { id: "4", title: "Internal Training: Advanced Risk Management", summary: "Enroll now for our upcoming workshop on advanced risk management techniques for complex projects.", source: "HR Department", date: "Oct 28, 2024", icon: Newspaper, category: "Training" },
  { id: "5", title: "PPM Tool v3.2 Released with New Features", summary: "The latest version of our PPM tool includes enhanced reporting and collaboration features. Check the release notes!", source: "Product Team", date: "Oct 25, 2024", icon: Newspaper, category: "Product Update" },
];

const trends = [
  { id: "1", name: "AI-Powered Predictive Analytics", description: "AI algorithms are increasingly used to forecast project timelines, budget overruns, and potential risks with greater accuracy.", image: "https://placehold.co/600x350.png", hint: "data analytics" },
  { id: "2", name: "Focus on Remote Collaboration Tools", description: "The shift to hybrid work models continues to drive innovation in tools that support distributed teams effectively.", image: "https://placehold.co/600x350.png", hint: "team meeting" },
  { id: "3", name: "Emphasis on Sustainable and Ethical PM", description: "Projects are increasingly evaluated on their environmental and social impact, alongside traditional metrics.", image: "https://placehold.co/600x350.png", hint: "sustainability green" },
];

export default function InformationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Info className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Information Hub</h1>
      </div>
      <p className="text-muted-foreground text-md">
        Stay updated with the latest news, announcements, and emerging trends relevant to your work and industry.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2 mb-1">
                <Newspaper className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">What&apos;s Happening</CardTitle>
            </div>
            <CardDescription>Latest updates, articles, and important announcements.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)] pr-3"> {/* Adjust height as needed */}
              <div className="space-y-4">
                {happenings.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                       <div className="flex items-start gap-3">
                        <item.icon className={`h-5 w-5 ${item.icon === AlertTriangle ? "text-destructive" : "text-primary"}`} />
                        <div className="flex-1">
                            <CardTitle className="text-md leading-tight">{item.title}</CardTitle>
                             <span className="text-xs font-medium text-primary mt-0.5 block">{item.category}</span>
                        </div>
                       </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground mb-1.5">{item.summary}</p>
                      <p className="text-xs text-muted-foreground">{item.source} - {item.date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">Current Trends</CardTitle>
            </div>
            <CardDescription>Emerging patterns and insights in technology and project management.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)] pr-3"> {/* Adjust height as needed */}
              <div className="space-y-6">
                {trends.map((trend) => (
                  <Card key={trend.id} className="overflow-hidden hover:shadow-md transition-shadow">
                     <Image src={trend.image} alt={trend.name} width={600} height={200} className="w-full h-48 object-cover" data-ai-hint={trend.hint} />
                    <CardHeader className="p-4">
                      <CardTitle className="text-md">{trend.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground">{trend.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    