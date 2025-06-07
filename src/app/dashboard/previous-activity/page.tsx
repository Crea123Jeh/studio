
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, where, Timestamp, doc, deleteDoc, updateDoc, orderBy } from "firebase/firestore";
import { format, isSameDay, startOfDay } from "date-fns";
import { History, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, Edit3, MessageSquare } from "lucide-react";

interface ActivityLogEntry {
  id: string; 
  date: Date;
  title: string; 
  details: string;
}

const calendarStyleProps = {
  className: "bg-muted p-4 rounded-xl shadow-lg w-full",
  classNames: {
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4 text-card-foreground",
    caption: "flex justify-center pt-1 relative items-center mb-4",
    caption_label: "text-lg font-semibold text-card-foreground",
    nav: "space-x-1 flex items-center",
    nav_button: cn(
      buttonVariants({ variant: "outline" }),
      "h-9 w-9 bg-accent/20 hover:bg-accent/30 text-accent-foreground rounded-full p-0"
    ),
    nav_button_previous: "absolute left-2",
    nav_button_next: "absolute right-2",
    table: "w-full border-collapse space-y-1",
    head_row: "flex justify-around",
    head_cell: "text-muted-foreground rounded-md w-10 font-medium text-xs uppercase",
    row: "flex w-full mt-2 justify-around",
    cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 rounded-md overflow-hidden",
    day: cn(
      buttonVariants({ variant: "ghost" }),
      "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-md text-card-foreground hover:bg-accent/10",
    ),
    day_selected: "bg-background text-primary hover:bg-background/90 focus:bg-background rounded-md shadow-sm ring-1 ring-primary/30",
    day_today: "bg-accent/20 text-accent-foreground hover:bg-accent/30 rounded-md font-medium",
    day_outside: "day-outside text-muted-foreground/50 opacity-50",
    day_disabled: "text-muted-foreground opacity-50",
    day_range_middle: "aria-selected:bg-accent/10 aria-selected:text-accent-foreground/90",
    day_hidden: "invisible",
  }
};

export default function PreviousActivityPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLogEntry | null>(null);
  
  const [logTitle, setLogTitle] = useState("");
  const [logDetails, setLogDetails] = useState("");
  const [logDate, setLogDate] = useState<Date | undefined>(new Date());

  const { toast } = useToast();

  useEffect(() => {
    const logsCollection = collection(db, "activityLogEntries");
    const q = query(logsCollection, orderBy("date", "desc")); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          details: data.details,
          date: (data.date as Timestamp).toDate(),
        } as ActivityLogEntry;
      });
      setActivityLogs(fetchedLogs);
    }, (error) => {
      console.error("Error fetching activity logs: ", error);
      toast({
        title: "Error",
        description: "Could not fetch activity logs.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setLogTitle("");
    setLogDetails("");
    setLogDate(selectedDate || new Date());
    setEditingLog(null);
  };

  const openAddDialog = () => {
    resetForm();
    setLogDate(startOfDay(selectedDate || new Date())); 
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (log: ActivityLogEntry) => {
    setEditingLog(log);
    setLogTitle(log.title);
    setLogDetails(log.details);
    setLogDate(log.date);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!logId || typeof logId !== 'string' || logId.trim() === '') {
        toast({ title: "Deletion Error", description: "Invalid log ID.", variant: "destructive"});
        return;
    }
    try {
      await deleteDoc(doc(db, "activityLogEntries", logId));
      toast({
        title: "Activity Log Deleted",
        description: "The activity log entry has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting log: ", error);
      toast({
        title: "Error Deleting Log",
        description: "Could not delete the log. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const logsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return activityLogs
        .filter(log => isSameDay(log.date, selectedDate))
        .sort((a,b) => b.date.getTime() - a.date.getTime()); 
  }, [activityLogs, selectedDate]);
  
  const handleSaveLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!logTitle || !logDetails || !logDate) {
      toast({
        title: "Missing Information",
        description: "Please provide title, details, and date for the log.",
        variant: "destructive",
      });
      return;
    }

    const logData = {
      title: logTitle,
      details: logDetails,
      date: Timestamp.fromDate(startOfDay(logDate)), 
    };

    try {
      if (editingLog) {
         if (!editingLog.id) {
            toast({ title: "Update Error", description: "Invalid log ID for update.", variant: "destructive"});
            return;
        }
        await updateDoc(doc(db, "activityLogEntries", editingLog.id), logData);
        toast({
          title: "Activity Log Updated",
          description: `The log for "${logTitle}" has been updated.`,
        });
      } else {
        await addDoc(collection(db, "activityLogEntries"), logData);
        toast({
          title: "Activity Log Added",
          description: `A new log "${logTitle}" has been added.`,
        });
      }
      resetForm();
      setIsAddEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving log: ", error);
      toast({
        title: "Error",
        description: "Could not save the log. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    if (!isAddEditDialogOpen) {
        resetForm(); 
    }
  }, [isAddEditDialogOpen, selectedDate]);

  const LogCard = ({ log, showActions = false }: { log: ActivityLogEntry, showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out border-l-4 border-muted-foreground">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight">{log.title}</CardTitle>
           {showActions && (
                <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(log)} title="Edit Log">
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit log</span>
                </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteLog(log.id)} title="Delete Log">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete log</span>
                  </Button>
                </div>
            )}
        </div>
         <CardDescription className="text-xs">{format(log.date, "PPP")}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.details}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Previous Activity Log</h1>
        </div>
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openAddDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Activity Log
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingLog ? "Edit Activity Log" : "Add New Activity Log"}</DialogTitle>
              <DialogDescription>
                {editingLog ? "Update the details for this activity." : `Log an activity that occurred on ${logDate ? format(logDate, "PPP") : "the selected date"}.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveLog} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="log-title" className="text-right">Title/Summary</Label>
                <Input id="log-title" value={logTitle} onChange={(e) => setLogTitle(e.target.value)} className="col-span-3" required placeholder="Brief title or summary"/>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="log-details" className="text-right pt-2">Details</Label>
                <Textarea id="log-details" value={logDetails} onChange={(e) => setLogDetails(e.target.value)} className="col-span-3" rows={5} required placeholder="Detailed notes about the activity..."/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="log-date" className="text-right">Date of Activity</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !logDate && "text-muted-foreground")}>
                      <LucideCalendarIcon className="mr-2 h-4 w-4" />
                      {logDate ? format(logDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={logDate} onSelect={(date) => date && setLogDate(startOfDay(date))} initialFocus month={logDate} onMonthChange={setLogDate}/>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editingLog ? "Save Changes" : "Save Log Entry"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-2 min-w-0">
           <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(startOfDay(date))}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className={calendarStyleProps.className}
              classNames={calendarStyleProps.classNames}
              components={{
                DayContent: ({ date, displayMonth }) => {
                  const dayHasLog = activityLogs.some(log => isSameDay(log.date, date));
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center">
                       <span className="text-sm">{format(date, "d")}</span>
                      {isCurrentMonth && dayHasLog && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
          <div className="md:col-span-1">
            <h3 className="text-xl font-semibold mb-4 pb-2 border-b flex items-center gap-2 text-foreground">
                <MessageSquare className="h-5 w-5 text-primary"/>
                Activities for: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            <ScrollArea className="max-h-[calc(100vh-450px)] pr-2">
              {logsForSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {logsForSelectedDate.map((log) => (<li key={log.id}><LogCard log={log} showActions={true}/></li>))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50">
                  <Info className="h-12 w-12 text-primary/70 mb-3"/>
                  <p className="text-muted-foreground font-medium text-lg">{selectedDate ? "No Activities Logged" : "Select a Date"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedDate ? "There are no activity logs for this day." : "Click on a day in the calendar to view its activity logs."}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    