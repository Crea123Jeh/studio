
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Youtube } from "lucide-react"; // Using BookOpen for the page, Youtube for items
import { Badge } from "@/components/ui/badge";

interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  videoId: string; // YouTube Video ID
  category: string;
  date: string;
}

const knowledgeFeed: KnowledgeItem[] = [
  {
    id: "1",
    title: "Mastering Project Scope: The Key to Success",
    description: "Learn how to define, manage, and control project scope effectively to avoid common pitfalls and ensure project alignment with business goals.",
    videoId: "erLk59H86ww", // Example video ID
    category: "Project Management Basics",
    date: "Nov 10, 2024",
  },
  {
    id: "2",
    title: "Advanced Agile: Scaling Scrum for Large Enterprises",
    description: "Explore techniques and frameworks like LeSS, SAFe, and Scrum@Scale for implementing Agile methodologies in large, complex organizations.",
    videoId: "2v4J3w_2sdk", // Example video ID
    category: "Agile Methodologies",
    date: "Nov 08, 2024",
  },
  {
    id: "3",
    title: "Effective Communication Strategies for Remote Teams",
    description: "Discover tools and best practices for fostering clear, consistent, and engaging communication within distributed project teams.",
    videoId: "R-O3k1N8L9c", // Example video ID
    category: "Team Collaboration",
    date: "Nov 05, 2024",
  },
  {
    id: "4",
    title: "Introduction to Risk Management in Projects",
    description: "A comprehensive overview of identifying, assessing, and mitigating risks to improve project outcomes and stakeholder confidence.",
    videoId: "yqI0pB1O-Y8", // Example video ID
    category: "Risk Management",
    date: "Nov 02, 2024",
  },
   {
    id: "5",
    title: "PPM Tool Deep Dive: Reporting & Analytics",
    description: "Unlock the full potential of your PPM software by mastering its advanced reporting and analytics features to gain actionable insights.",
    videoId: "0h1zWpg_UqM", // Example: PowerBI tutorial
    category: "Tooling & Software",
    date: "Oct 30, 2024",
  },
];

export default function KnowledgeHubPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Knowledge Hub</h1>
      </div>
      <p className="text-muted-foreground text-md">
        Explore a curated feed of videos and resources to enhance your skills and stay informed.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
                     <Youtube className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Learning Feed</CardTitle>
            </div>
          <CardDescription>
            Latest videos and tutorials relevant to project management, methodologies, and tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)] pr-3"> {/* Adjust height as needed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {knowledgeFeed.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-200 ease-in-out">
                  <div className="aspect-video bg-muted">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${item.videoId}`}
                      title={item.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    ></iframe>
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                     <div className="flex justify-between items-center mt-1">
                        <Badge variant="secondary" className="mt-1">{item.category}</Badge>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                     </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {knowledgeFeed.length === 0 && (
                 <div className="flex flex-col items-center justify-center text-center p-10 border rounded-md border-dashed h-full bg-muted/50 min-h-[200px]">
                    <Youtube className="h-12 w-12 text-primary/70 mb-4"/>
                    <p className="text-muted-foreground font-medium text-lg">Knowledge Feed is Empty</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back later for new videos and resources.</p>
                </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
