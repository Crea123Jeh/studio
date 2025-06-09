
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, formatDistanceToNow, startOfDay } from "date-fns";
import { Bot, PlusCircle, Edit3, Trash2, CalendarIcon as LucideCalendarIcon, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";

type BotVersion = "V1.9.1" | "V2.0";
const botVersionOptions: BotVersion[] = ["V1.9.1", "V2.0"];

type BotStatus = "active" | "inactive" | "error";
const botStatusOptions: BotStatus[] = ["active", "inactive", "error"];

interface BotItem {
  id: string;
  room: string;
  version: BotVersion;
  status: BotStatus;
  installationDate: Timestamp;
  enabled: boolean;
  addedByUserId?: string;
  addedByUserName?: string;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

type SortableBotKeys = 'room' | 'version' | 'status' | 'installationDate' | 'lastUpdatedAt' | 'enabled';

export default function BotsListPage() {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<BotItem | null>(null);
  const [botToDelete, setBotToDelete] = useState<BotItem | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableBotKeys; direction: 'ascending' | 'descending' }>({ key: 'lastUpdatedAt', direction: 'descending' });

  // Form state
  const [formRoom, setFormRoom] = useState("");
  const [formVersion, setFormVersion] = useState<BotVersion>("V1.9.1");
  const [formStatus, setFormStatus] = useState<BotStatus>("active");
  const [formInstallationDate, setFormInstallationDate] = useState<Date | undefined>(new Date());
  const [formEnabled, setFormEnabled] = useState(true);

  const { toast } = useToast();
  const { user, username } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const botsCollectionRef = collection(db, "botConfigurations");
    // Initial sort from Firestore for lastUpdatedAt, client-side sort will override for display
    const q = query(botsCollectionRef, orderBy("lastUpdatedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBots = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as BotItem));
      setBots(fetchedBots);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching bot configurations: ", error);
      toast({ title: "Error", description: "Could not fetch bot configurations.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setFormRoom("");
    setFormVersion("V1.9.1");
    setFormStatus("active");
    setFormInstallationDate(new Date());
    setFormEnabled(true);
    setEditingBot(null);
  };

  const handleOpenFormDialog = (bot: BotItem | null = null) => {
    if (bot) {
      setEditingBot(bot);
      setFormRoom(bot.room);
      setFormVersion(bot.version);
      setFormStatus(bot.status);
      setFormInstallationDate(bot.installationDate.toDate());
      setFormEnabled(bot.enabled);
    } else {
      resetForm();
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveBot = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRoom || !formInstallationDate) {
      toast({ title: "Missing Information", description: "Please fill Room and Installation Date fields.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const now = Timestamp.now();
    const botData: Omit<BotItem, 'id' | 'createdAt'> & { createdAt?: Timestamp } = {
      room: formRoom,
      version: formVersion,
      status: formStatus,
      installationDate: Timestamp.fromDate(startOfDay(formInstallationDate)),
      enabled: formEnabled,
      lastUpdatedAt: now,
      addedByUserId: user.uid,
      addedByUserName: username || "Unknown User",
    };

    try {
      if (editingBot) {
        const botRef = doc(db, "botConfigurations", editingBot.id);
        await updateDoc(botRef, botData as Partial<BotItem>);
        toast({ title: "Bot Configuration Updated", description: `"${formRoom}" has been updated.` });
      } else {
        botData.createdAt = now; 
        await addDoc(collection(db, "botConfigurations"), botData);
        toast({ title: "Bot Configuration Added", description: `"${formRoom}" has been added.` });
      }
      resetForm();
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error saving bot configuration: ", error);
      toast({ title: "Save Error", description: "Could not save the bot configuration.", variant: "destructive" });
    }
  };

  const confirmDeleteBot = (bot: BotItem) => {
    setBotToDelete(bot);
  };

  const handleDeleteBot = async () => {
    if (!botToDelete) return;
    try {
      await deleteDoc(doc(db, "botConfigurations", botToDelete.id));
      toast({ title: "Bot Configuration Deleted", description: `"${botToDelete.room}" has been deleted.` });
      setBotToDelete(null);
    } catch (error) {
      console.error("Error deleting bot configuration: ", error);
      toast({ title: "Deletion Error", description: "Could not delete the bot configuration.", variant: "destructive" });
      setBotToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: BotStatus) => {
    switch (status) {
      case "active": return "bg-green-600 text-white hover:bg-green-700";
      case "inactive": return "bg-muted text-muted-foreground hover:bg-muted/80";
      case "error": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  const toggleBotEnabled = async (botItem: BotItem) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    const botRef = doc(db, "botConfigurations", botItem.id);
    try {
      await updateDoc(botRef, {
        enabled: !botItem.enabled,
        lastUpdatedAt: Timestamp.now(),
        addedByUserId: user.uid, // Track who made the change
        addedByUserName: username || "Unknown User",
      });
      toast({ title: "Status Updated", description: `Bot "${botItem.room}" enabled status changed.` });
    } catch (error) {
      console.error("Error updating bot enabled status:", error);
      toast({ title: "Update Error", description: "Could not update bot enabled status.", variant: "destructive" });
    }
  };

  const requestSort = (key: SortableBotKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableBotKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedBots = useMemo(() => {
    let sortableItems = [...bots];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        let comparison = 0;

        if (aVal instanceof Timestamp && bVal instanceof Timestamp) {
          comparison = aVal.toDate().getTime() - bVal.toDate().getTime();
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = aVal === bVal ? 0 : aVal ? -1 : 1; // true comes before false when ascending
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [bots, sortConfig]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading bot configurations...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Bot className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Bot Configuration List</h1>
        </div>
        <Button variant="outline" onClick={() => handleOpenFormDialog()}><PlusCircle className="mr-2 h-4 w-4"/> Add New Bot Config</Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">Manage Your Bot Configurations</CardTitle>
          <CardDescription>Overview of all configured bots, their version, status, and installation details. Click headers to sort.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('enabled')} className="cursor-pointer hover:bg-muted/50 w-[80px]">
                    <div className="flex items-center">Enabled {getSortIcon('enabled')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('room')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Room {getSortIcon('room')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('version')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Version {getSortIcon('version')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('installationDate')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Installed {getSortIcon('installationDate')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('lastUpdatedAt')} className="cursor-pointer hover:bg-muted/50 hidden md:table-cell">
                   <div className="flex items-center">Last Updated {getSortIcon('lastUpdatedAt')}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBots.map((bot) => (
                <TableRow key={bot.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <Checkbox
                      checked={bot.enabled}
                      onCheckedChange={() => toggleBotEnabled(bot)}
                      id={`bot-enabled-${bot.id}`}
                      aria-label={`Enable ${bot.room}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{bot.room}</TableCell>
                  <TableCell>{bot.version}</TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusBadgeVariant(bot.status))}>{bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}</Badge>
                  </TableCell>
                  <TableCell>{format(bot.installationDate.toDate(), "PP")}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {formatDistanceToNow(bot.lastUpdatedAt.toDate(), { addSuffix: true })} by {bot.addedByUserName || "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Bot Config" onClick={() => handleOpenFormDialog(bot)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Delete Bot Config" onClick={() => confirmDeleteBot(bot)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedBots.length === 0 && !isLoading && (
             <div className="text-center py-10 text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 mb-3" />
                <p>No bot configurations found. Add one to get started!</p>
             </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => {
        setIsFormDialogOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBot ? "Edit Bot Configuration" : "Add New Bot Configuration"}</DialogTitle>
            <DialogDescription>
              {editingBot ? "Update the details for this bot configuration." : "Enter the details for the new bot configuration."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBot}>
            <ScrollArea className="max-h-[70vh] p-1">
              <div className="grid gap-4 py-4 pr-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formRoom" className="text-right">Room</Label>
                  <Input id="formRoom" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} className="col-span-3" placeholder="e.g., Server Room A" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formVersion" className="text-right">Version</Label>
                  <Select value={formVersion} onValueChange={(val) => setFormVersion(val as BotVersion)}>
                    <SelectTrigger className="col-span-3" id="formVersion"><SelectValue /></SelectTrigger>
                    <SelectContent>{botVersionOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formStatus" className="text-right">Status</Label>
                  <Select value={formStatus} onValueChange={(val) => setFormStatus(val as BotStatus)}>
                    <SelectTrigger className="col-span-3" id="formStatus"><SelectValue /></SelectTrigger>
                    <SelectContent>{botStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formInstallationDate" className="text-right">Installation Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !formInstallationDate && "text-muted-foreground")}>
                          <LucideCalendarIcon className="mr-2 h-4 w-4" />
                          {formInstallationDate ? format(formInstallationDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formInstallationDate} onSelect={setFormInstallationDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formEnabled" className="text-right">Enabled</Label>
                  <div className="col-span-3 flex items-center">
                    <Checkbox id="formEnabled" checked={formEnabled} onCheckedChange={(checked) => setFormEnabled(checked as boolean)} />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : (editingBot ? "Save Changes" : "Add Bot Config")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!botToDelete} onOpenChange={(open) => !open && setBotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bot configuration for room: "{botToDelete?.room}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBotToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBot} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
