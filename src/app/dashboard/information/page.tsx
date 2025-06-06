
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Newspaper, TrendingUp, AlertTriangle } from "lucide-react";
import Image from "next/image";

// Dummy data for demonstration
const happenings = [
  { id: "1", title: "AI in Project Management Sees 20% Growth", summary: "Recent studies show significant adoption of AI tools leading to improved project outcomes and efficiency.", source: "Tech Analyst Group", date: "Nov 5, 2024", icon: Newspaper },
  { id: "2", title: "New Agile Methodology 'StreamFlow' Gaining Traction", summary: "StreamFlow, focusing on continuous value delivery, is being adopted by several innovative firms.", source: "Agile Insights", date: "Nov 4, 2024", icon: Newspaper },
  { id: "3", title: "Security Advisory: Update Your Project Management Tools", summary: "A critical vulnerability has been found in several popular PM tools. Ensure your software is updated to the latest version.", source: "CyberSec News", date: "Nov 2, 2024", icon: AlertTriangle },
];

const trends = [
  { id: "1", name: "AI-Powered Predictive Analytics", description: "AI algorithms are increasingly used to forecast project timelines, budget overruns, and potential risks with greater accuracy.", image: "https://placehold.co/300x200.png", hint: "data analytics" },
  { id: "2", name: "Focus on Remote Collaboration Tools", description: "The shift to hybrid work models continues to drive innovation in tools that support distributed teams effectively.", image: "https://placehold.co/300x200.png", hint: "team meeting" },
  { id: "3", name: "Emphasis on Sustainable and Ethical PM", description: "Projects are increasingly evaluated on their environmental and social impact, alongside traditional metrics.", image: "https://placehold.co/300x200.png", hint: "sustainability green" },
];

export default function InformationPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Info className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Information Hub</h1>
      </div>
      <p className="text-muted-foreground">
        Stay updated with the latest news, announcements, and emerging trends relevant to your work and industry.
      </p>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              What&apos;s Happening
            </CardTitle>
            <CardDescription>Latest updates, articles, and important announcements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {happenings.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full bg-primary/10 ${item.icon === AlertTriangle ? "text-destructive" : "text-primary"}`}>
                     <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-md text-card-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2">{item.source} - {item.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Current Trends
            </CardTitle>
            <CardDescription>Emerging patterns and insights in technology and project management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {trends.map((trend) => (
              <div key={trend.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
                <Image src={trend.image} alt={trend.name} width={300} height={200} className="w-full h-40 rounded-md mb-3 object-cover" data-ai-hint={trend.hint} />
                <h3 className="font-semibold text-md mb-1 text-card-foreground">{trend.name}</h3>
                <p className="text-sm text-muted-foreground">{trend.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
