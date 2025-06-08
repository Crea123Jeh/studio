
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button"; // Keep Button for PopoverTrigger
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { format, isSameDay, startOfDay } from "date-fns";
import { History, Info, MessageSquare, CalendarIcon as LucideCalendarIcon } from "lucide-react";

interface ActivityLogEntry {
  id: string; 
  date: Timestamp; // Date the activity was logged or occurred
  title: string; 
  details: string;
  source?: string; // e.g., "PPM Calendar Event"
  sourceEventId?: string; 
  originalEventTime?: Timestamp; 
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
  
  const { toast } = useToast();

  useEffect(() => {
    const logsCollection = collection(db, "activityLogEntries");
    // Sort by 'date' which represents when the activity was logged or occurred
    const q = query(logsCollection, orderBy("date", "desc")); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          details: data.details,
          date: data.date as Timestamp, // This is the primary date for filtering/display
          source: data.source,
          sourceEventId: data.sourceEventId,
          originalEventTime: data.originalEventTime as Timestamp,
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
  
  const logsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    // Filter logs based on their 'date' field (when they were logged or occurred)
    return activityLogs
        .filter(log => isSameDay(log.date.toDate(), selectedDate))
        .sort((a,b) => b.date.toDate().getTime() - a.date.toDate().getTime()); 
  }, [activityLogs, selectedDate]);
  

  const LogCard = ({ log }: { log: ActivityLogEntry }) => (
    <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out border-l-4 border-muted-foreground">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight">{log.title}</CardTitle>
           {/* Actions removed */}
        </div>
         <CardDescription className="text-xs">Logged: {format(log.date.toDate(), "PPPp")}</CardDescription>
         {log.originalEventTime && (
            <CardDescription className="text-xs italic">
                Original Event Time: {format(log.originalEventTime.toDate(), "PPPp")}
            </CardDescription>
         )}
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.details}</p>
        {log.source && <p className="text-xs text-muted-foreground mt-2">Source: {log.source}</p>}
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
        {/* "Add Activity Log" button and dialog removed */}
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
                  const dayHasLog = activityLogs.some(log => isSameDay(log.date.toDate(), date));
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
                Activities Logged On: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            <ScrollArea className="max-h-[calc(100vh-450px)] pr-2">
              {logsForSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {logsForSelectedDate.map((log) => (<li key={log.id}><LogCard log={log} /></li>))}
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
