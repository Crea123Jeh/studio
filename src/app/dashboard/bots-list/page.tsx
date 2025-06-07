
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Bot, Info, Edit2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BotItem {
  id: string;
  name: string;
  status: "active" | "inactive" | "error";
  description: string;
  lastCheckin: string;
  enabled: boolean;
}

const initialBots: BotItem[] = [
  { id: "bot_001", name: "AlphaBot", status: "active", description: "Handles automated reporting.", lastCheckin: "2 mins ago", enabled: true },
  { id: "bot_002", name: "BetaTasker", status: "inactive", description: "Processes background tasks.", lastCheckin: "1 day ago", enabled: false },
  { id: "bot_003", name: "GammaNotifier", status: "active", description: "Sends project notifications.", lastCheckin: "5 mins ago", enabled: true },
  { id: "bot_004", name: "DeltaScraper", status: "error", description: "Collects external data.", lastCheckin: "1 hour ago", enabled: true },
];

export default function BotsListPage() {
  const [bots, setBots] = useState<BotItem[]>(initialBots);

  const toggleBotEnabled = (id: string) => {
    setBots(bots.map(bot => bot.id === id ? { ...bot, enabled: !bot.enabled } : bot));
  };

  const getStatusBadgeVariant = (status: BotItem["status"]) => {
    switch (status) {
      case "active": return "bg-green-600 text-white hover:bg-green-700";
      case "inactive": return "bg-muted text-muted-foreground hover:bg-muted/80";
      case "error": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Bot's List</h1>
        </div>
        <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add New Bot</Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">Manage Your Bots</CardTitle>
          <CardDescription>Overview of all configured bots, their status, and actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Enabled</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Check-in</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bots.map((bot) => (
                <TableRow key={bot.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <Checkbox
                      checked={bot.enabled}
                      onCheckedChange={() => toggleBotEnabled(bot.id)}
                      id={`bot-enabled-${bot.id}`}
                      aria-label={`Enable ${bot.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{bot.name}</TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusBadgeVariant(bot.status))}>{bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{bot.description}</TableCell>
                  <TableCell>{bot.lastCheckin}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Bot">
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
          {bots.length === 0 && (
             <div className="text-center py-10 text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 mb-3" />
                <p>No bots configured yet.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
