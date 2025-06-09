
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Network, Info, Edit2, PlusCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LssItem {
  id: string;
  name: string;
  status: "Available" | "Unavailable" | "Checking...";
  description: string;
  lastCheck: string; // Could be a Date object or formatted string
  enabled: boolean;
}

const initialLssItems: LssItem[] = [
  { id: "lss_001", name: "Primary API Server", status: "Available", description: "Main endpoint for core services.", lastCheck: "1 min ago", enabled: true },
  { id: "lss_002", name: "Database Cluster A", status: "Checking...", description: "Primary data storage cluster.", lastCheck: "Now", enabled: true },
  { id: "lss_003", name: "Worker Service Queue", status: "Unavailable", description: "Processes background jobs.", lastCheck: "5 mins ago", enabled: false },
  { id: "lss_004", name: "Frontend CDN", status: "Available", description: "Serves static assets globally.", lastCheck: "30 secs ago", enabled: true },
  { id: "lss_005", name: "Authentication Service", status: "Available", description: "Handles user login and sessions.", lastCheck: "2 mins ago", enabled: true },
];

export default function LssPage() {
  const [lssItems, setLssItems] = useState<LssItem[]>(initialLssItems);
  const { toast } = useToast();

  // Simulate status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLssItems(prevItems =>
        prevItems.map(item => {
          if (item.id === "lss_002" && item.status === "Checking...") {
            return { ...item, status: Math.random() > 0.3 ? "Available" : "Unavailable", lastCheck: "Now" };
          }
          if (item.enabled && Math.random() < 0.1) { // Randomly make some items change status
            const newStatus = Math.random() > 0.6 ? "Available" : (Math.random() > 0.3 ? "Unavailable" : "Checking...");
            return { ...item, status: newStatus, lastCheck: "Now" };
          }
          return item;
        })
      );
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleLssItemEnabled = (id: string) => {
    setLssItems(lssItems.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
    toast({
      title: "LSS Item Updated",
      description: `Toggled monitoring for ${lssItems.find(item => item.id ===id)?.name}.`,
    });
  };

  const getStatusBadgeVariant = (status: LssItem["status"]) => {
    switch (status) {
      case "Available": return "bg-green-600 text-white hover:bg-green-700";
      case "Unavailable": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "Checking...": return "bg-yellow-500 text-black hover:bg-yellow-600";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Network className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">LSS Overview</h1>
        </div>
        <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add New LSS Item</Button>
      </div>
      <Card className="shadow-md border-yellow-500/50 bg-yellow-500/5 border">
        <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-700">
                LSS status checks are currently simulated for demonstration purposes.
            </p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">Local Server Status (LSS)</CardTitle>
          <CardDescription>Monitor the availability and status of various local services or servers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Enabled</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lssItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <Checkbox
                      checked={item.enabled}
                      onCheckedChange={() => toggleLssItemEnabled(item.id)}
                      id={`lss-enabled-${item.id}`}
                      aria-label={`Enable monitoring for ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell>
                    <Badge className={cn("flex items-center gap-1", getStatusBadgeVariant(item.status))}>
                        {item.status === "Checking..." && <Loader2 className="h-3 w-3 animate-spin" />}
                        {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{item.description}</TableCell>
                  <TableCell>{item.lastCheck}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit LSS Item">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-accent hover:bg-accent/10" title="View Details">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lssItems.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                <Network className="mx-auto h-12 w-12 mb-3" />
                <p>No LSS items configured yet.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
