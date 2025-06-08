
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { format, isSameDay, startOfDay, formatDistanceToNow } from "date-fns";
import { History, Info, MessageSquare, CalendarIcon as LucideCalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ActivityLogEntry {
  id: string; 
  date: Timestamp; 
  title: string; 
  details: string;
  source?: string; 
  sourceEventId?: string; 
  originalEventTime?: Timestamp; 
}

type SortableLogKeys = 'title' | 'date' | 'originalEventTime' | 'source';

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
  const [sortConfig, setSortConfig] = useState<{ key: SortableLogKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  
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
          date: data.date as Timestamp, 
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
  
  const requestSort = (key: SortableLogKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableLogKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedLogsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    
    let filteredLogs = activityLogs
        .filter(log => isSameDay(log.date.toDate(), selectedDate));

    if (sortConfig) {
      filteredLogs.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'date' || sortConfig.key === 'originalEventTime') {
            const aDate = a[sortConfig.key] ? (a[sortConfig.key] as Timestamp).toDate().getTime() : 0;
            const bDate = b[sortConfig.key] ? (b[sortConfig.key] as Timestamp).toDate().getTime() : 0;
            if(!a[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1; 
            if(!b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            aValue = aDate;
            bValue = bDate;
        } else {
            aValue = a[sortConfig.key] || ''; 
            bValue = b[sortConfig.key] || '';
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }
    return filteredLogs;
  }, [activityLogs, selectedDate, sortConfig]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Previous Activity Log</h1>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="grid grid-cols-1 gap-y-8 pt-6">
          <div className="min-w-0">
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
          <div>
            <h3 className="text-xl font-semibold mb-4 pb-2 border-b flex items-center gap-2 text-foreground">
                <MessageSquare className="h-5 w-5 text-primary"/>
                Activities Logged On: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            {sortedLogsForSelectedDate.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('title')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">Title {getSortIcon('title')}</div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center">Logged At {getSortIcon('date')}</div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('originalEventTime')} className="cursor-pointer hover:bg-muted/50 hidden md:table-cell">
                        <div className="flex items-center">Original Event Time {getSortIcon('originalEventTime')}</div>
                    </TableHead>
                     <TableHead onClick={() => requestSort('source')} className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell">
                        <div className="flex items-center">Source {getSortIcon('source')}</div>
                    </TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogsForSelectedDate.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{log.title}</TableCell>
                      <TableCell>{format(log.date.toDate(), "Pp")}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.originalEventTime ? format(log.originalEventTime.toDate(), "Pp") : <span className="italic text-muted-foreground/70">N/A</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{log.source || <span className="italic text-muted-foreground/70">N/A</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap max-w-sm">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
                <Info className="h-12 w-12 text-primary/70 mb-3"/>
                <p className="text-muted-foreground font-medium text-lg">{selectedDate ? "No Activities Logged" : "Select a Date"}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedDate ? "There are no activity logs for this day." : "Click on a day in the calendar to view its activity logs."}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

