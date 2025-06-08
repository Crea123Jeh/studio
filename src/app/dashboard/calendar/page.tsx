
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc, getDocs, writeBatch, getDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay, formatDistanceToNow, setHours, setMinutes, parse } from "date-fns";
import { CalendarDays, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, Briefcase, Edit3, Timer, Users, Award, Bell, Check, ChevronsUpDown, ArrowDown, ArrowUp, ArrowUpDown, Clock } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface CalendarEvent {
  id: string;
  startDateTime: Timestamp;
  endDateTime?: Timestamp | null;
  title: string;
  description: string;
  type: "Deadline" | "Meeting" | "Milestone" | "Reminder";
  isProjectEvent?: boolean;
  projectId?: string | null;
  createdAt?: Timestamp;
}

interface ProjectOption {
  id: string;
  name: string;
}

const eventTypes: CalendarEvent["type"][] = ["Deadline", "Meeting", "Milestone", "Reminder"];

type SortableUpcomingEventKeys = 'title' | 'startDateTime' | 'type' | 'projectId' | 'createdAt';


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

export default function CalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("Meeting");
  const [isProjectEvent, setIsProjectEvent] = useState(false);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);

  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [projectComboboxOpen, setProjectComboboxOpen] = useState(false);

  const [upcomingSortConfig, setUpcomingSortConfig] = useState<{ key: SortableUpcomingEventKeys; direction: 'ascending' | 'descending' }>({ key: 'startDateTime', direction: 'ascending' });

  const { toast } = useToast();

  const logEventToPreviousActivityAndArchive = async (event: CalendarEvent) => {
    if (!event.id) {
        console.error("Cannot log and archive event: event.id is missing.", event);
        toast({
            title: "Processing Error",
            description: `Could not process past event "${event.title}" due to missing ID.`,
            variant: "destructive",
        });
        return;
    }

    let activityTitle = "";
    let activityDetails = `Event: ${event.title}\nType: ${event.type}\nScheduled: ${format(event.startDateTime.toDate(), "PPpp")}`;
    if (event.endDateTime && event.type !== "Milestone" && event.type !== "Deadline") {
      activityDetails += ` - ${format(event.endDateTime.toDate(), "pp")}`;
    }
    if (event.description) {
      activityDetails += `\nDescription: ${event.description}`;
    }

    if (event.isProjectEvent && event.projectId) {
      const projectDoc = await getDoc(doc(db, "projectsPPM", event.projectId));
      if (projectDoc.exists()) {
        activityDetails += `\nProject: ${projectDoc.data().name || "Unnamed Project"}`;
      } else {
        activityDetails += `\nProject ID: ${event.projectId} (Name not found)`;
      }
    }


    switch (event.type) {
      case "Meeting":
        activityTitle = `Meeting Ended: ${event.title}`;
        break;
      case "Deadline":
        activityTitle = `Deadline Passed: ${event.title}`;
        break;
      default: 
        console.warn(`Attempted to log event of unhandled type for archiving: ${event.type}. Event ID: ${event.id}`);
        return; 
    }

    const activityLogEntry = {
      title: activityTitle,
      details: activityDetails,
      date: Timestamp.now(), 
      source: "PPM Calendar Event",
      sourceEventId: event.id,
      originalEventTime: event.startDateTime,
    };

    try {
      const batch = writeBatch(db);
      
      const activityLogRef = doc(collection(db, "activityLogEntries"));
      batch.set(activityLogRef, activityLogEntry);

      const calendarEventRef = doc(db, "calendarEvents", event.id);
      batch.delete(calendarEventRef);

      await batch.commit();
      console.log(`Event "${event.title}" (ID: ${event.id}) logged to previous activity and deleted from calendar.`);
    } catch (error) {
      console.error(`Error logging and deleting event "${event.title}" (ID: ${event.id}):`, error);
      toast({
        title: "Archiving Error",
        description: `Could not archive past event "${event.title}". It may be processed again later. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    const eventsCollection = collection(db, "calendarEvents");
    const q = query(eventsCollection, orderBy("startDateTime", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const eventsToArchive: CalendarEvent[] = [];

      const fetchedEvents = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const event: CalendarEvent = { 
          id: docSnap.id,
          title: data.title,
          description: data.description,
          type: data.type,
          startDateTime: data.startDateTime as Timestamp,
          endDateTime: data.endDateTime ? (data.endDateTime as Timestamp) : null,
          isProjectEvent: data.isProjectEvent || false,
          projectId: data.projectId || null,
          createdAt: data.createdAt ? (data.createdAt as Timestamp) : undefined,
        };
        
        const eventMomentForArchival = event.endDateTime ? event.endDateTime.toDate() : event.startDateTime.toDate();

        if (
            eventMomentForArchival < now &&
            (event.type === "Meeting" || event.type === "Deadline")
        ) {
          eventsToArchive.push(event);
        }
        return event;
      });

      // Asynchronously process archiving to avoid blocking UI updates
      if (eventsToArchive.length > 0) {
        (async () => {
          for (const eventToLog of eventsToArchive) {
            await logEventToPreviousActivityAndArchive(eventToLog);
          }
        })();
      }
      
      setEvents(fetchedEvents.filter(event => !eventsToArchive.some(archived => archived.id === event.id)));
    }, (error) => {
      console.error("Error fetching calendar events: ", error);
      toast({
        title: "Error",
        description: "Could not fetch calendar events.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast]); // Removed allProjects from dependencies here as it's fetched inside the logging function now

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsQuery = query(collection(db, "projectsPPM"), orderBy("name", "asc"));
        const querySnapshot = await getDocs(projectsQuery);
        const fetchedProjects = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          name: docSnap.data().name || "Unnamed Project"
        } as ProjectOption));
        setAllProjects(fetchedProjects);
      } catch (error) {
        console.error("Error fetching projects for calendar: ", error);
        toast({
          title: "Error Fetching Projects",
          description: "Could not load project list for linking events.",
          variant: "destructive",
        });
      }
    };
    fetchProjects();
  }, [toast]);

  const resetForm = () => {
    setEventTitle("");
    setEventDescription("");
    const defaultDate = selectedDate || new Date();
    setEventDate(defaultDate);
    setEventStartTime(format(defaultDate, "HH:mm"));
    setEventEndTime(format(setHours(defaultDate, defaultDate.getHours() + 1), "HH:mm"));
    setEventType("Meeting");
    setIsProjectEvent(false);
    setLinkedProjectId(null);
    setEditingEvent(null);
  };

  const openAddDialog = () => {
    resetForm();
    const newEventDate = startOfDay(selectedDate || new Date());
    setEventDate(newEventDate);
    setEventStartTime("09:00"); 
    setEventEndTime("10:00");
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description);
    setEventType(event.type);
    setEventDate(event.startDateTime.toDate());
    setEventStartTime(format(event.startDateTime.toDate(), "HH:mm"));
    if (event.type === "Meeting" || event.type === "Reminder") {
      if (event.endDateTime) {
        setEventEndTime(format(event.endDateTime.toDate(), "HH:mm"));
      } else {
        setEventEndTime(format(setHours(event.startDateTime.toDate(), event.startDateTime.toDate().getHours() + 1), "HH:mm"));
      }
    } else {
      setEventEndTime(""); 
    }
    setIsProjectEvent(event.isProjectEvent || false);
    setLinkedProjectId(event.projectId || null);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
     if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
        console.error("Error deleting event: eventId is invalid.");
        toast({ title: "Deletion Error", description: "Invalid event ID.", variant: "destructive"});
        return;
    }
    try {
      await deleteDoc(doc(db, "calendarEvents", eventId));
      toast({
        title: "Event Deleted",
        description: "The event has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting event: ", error);
      toast({
        title: "Error Deleting Event",
        description: "Could not delete the event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(event.startDateTime.toDate(), selectedDate));
  }, [events, selectedDate]);
  
  const requestUpcomingSort = (key: SortableUpcomingEventKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (upcomingSortConfig && upcomingSortConfig.key === key && upcomingSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setUpcomingSortConfig({ key, direction });
  };

  const getUpcomingSortIcon = (key: SortableUpcomingEventKeys) => {
      if (!upcomingSortConfig || upcomingSortConfig.key !== key) {
          return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
      }
      return upcomingSortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };
  
  const sortedAllUpcomingEvents = useMemo(() => {
    const today = new Date(); 
    let filteredEvents = events
        .filter(event => event.startDateTime.toDate() >= startOfDay(today)) 
        .map(event => ({
            ...event,
            createdAtDate: event.createdAt ? event.createdAt.toDate() : new Date(0) 
        }));

    if (upcomingSortConfig) {
        filteredEvents.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (upcomingSortConfig.key === 'createdAt') {
                aValue = a.createdAtDate.getTime();
                bValue = b.createdAtDate.getTime();
            } else if (upcomingSortConfig.key === 'projectId') {
                const aProjectName = a.isProjectEvent && a.projectId ? allProjects.find(p => p.id === a.projectId)?.name || 'zzzz' : 'zzzz'; 
                const bProjectName = b.isProjectEvent && b.projectId ? allProjects.find(p => p.id === b.projectId)?.name || 'zzzz' : 'zzzz';
                aValue = aProjectName;
                bValue = bProjectName;
            } else if (upcomingSortConfig.key === 'startDateTime') {
                 aValue = a.startDateTime.toDate();
                 bValue = b.startDateTime.toDate();
            }
             else {
                aValue = a[upcomingSortConfig.key];
                bValue = b[upcomingSortConfig.key];
            }

            if (aValue instanceof Date && bValue instanceof Date) {
                return upcomingSortConfig.direction === 'ascending' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const valA = aValue.toLowerCase();
                const valB = bValue.toLowerCase();
                return upcomingSortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
             if (typeof aValue === 'number' && typeof bValue === 'number') {
                 return upcomingSortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            }
            return 0;
        });
    }
    return filteredEvents;
  }, [events, upcomingSortConfig, allProjects]);


  const eventTypeDotColors: Record<CalendarEvent["type"], string> = {
    Deadline: "bg-destructive", 
    Meeting: "bg-primary", 
    Milestone: "bg-green-600", 
    Reminder: "bg-accent", 
  };

  const eventTypeBorderColors: Record<CalendarEvent["type"], string> = {
    Deadline: "hsl(var(--destructive))",
    Meeting: "hsl(var(--primary))", 
    Milestone: "hsl(var(--green-600))", 
    Reminder: "hsl(var(--accent))", 
  };

  const getBadgeClassNames = (type: CalendarEvent["type"]): string => {
    switch (type) {
      case "Deadline":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "Meeting":
        return "bg-primary text-primary-foreground hover:bg-primary/90";
      case "Milestone":
        return "bg-green-600 text-white hover:bg-green-700";
      case "Reminder":
        return "bg-accent text-accent-foreground hover:bg-accent/90";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };
  
  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventStartTime) { 
      toast({
        title: "Missing Information",
        description: "Please provide title, date, and start time.",
        variant: "destructive",
      });
      return;
    }
    if (isProjectEvent && !linkedProjectId) {
      toast({
        title: "Missing Project",
        description: "Please select a project if this is a project-related event.",
        variant: "destructive",
      });
      return;
    }

    const [startHours, startMinutes] = eventStartTime.split(':').map(Number);
    let finalStartDateTime = setMinutes(setHours(eventDate, startHours), startMinutes);
    
    let finalEndDateTime: Timestamp | null = null;
    if (eventType === "Meeting" || eventType === "Reminder") {
        if (eventEndTime) {
            const [endHours, endMinutes] = eventEndTime.split(':').map(Number);
            let tempEndDateTime = setMinutes(setHours(eventDate, endHours), endMinutes);
            if (tempEndDateTime <= finalStartDateTime) { 
                toast({title: "Invalid Time", description: "End time must be after start time.", variant: "destructive"});
                tempEndDateTime = setHours(finalStartDateTime, finalStartDateTime.getHours() + 1); 
            }
            finalEndDateTime = Timestamp.fromDate(tempEndDateTime);
        } else {
            finalEndDateTime = Timestamp.fromDate(setHours(finalStartDateTime, finalStartDateTime.getHours() + 1));
        }
    }


    const eventData: Omit<CalendarEvent, 'id' | 'createdAt'> & { createdAt?: Timestamp } = {
      title: eventTitle,
      description: eventDescription,
      type: eventType,
      startDateTime: Timestamp.fromDate(finalStartDateTime),
      endDateTime: finalEndDateTime,
      isProjectEvent: isProjectEvent,
      projectId: isProjectEvent ? linkedProjectId : null,
    };

    try {
      if (editingEvent) {
        if (!editingEvent.id) {
            toast({ title: "Update Error", description: "Invalid event ID for update.", variant: "destructive"});
            return;
        }
        await updateDoc(doc(db, "calendarEvents", editingEvent.id), eventData);
        toast({
          title: "Event Updated",
          description: `"${eventTitle}" has been updated.`,
        });
      } else {
        eventData.createdAt = Timestamp.now();
        await addDoc(collection(db, "calendarEvents"), eventData);
        toast({
          title: "Event Added",
          description: `"${eventTitle}" has been added to the calendar.`,
        });
      }
      resetForm();
      setIsAddEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving event: ", error);
      toast({
        title: "Error",
        description: "Could not save the event. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    if (!isAddEditDialogOpen) {
        resetForm();
    } else if (!editingEvent && selectedDate) { 
        const newEventDate = startOfDay(selectedDate);
        setEventDate(newEventDate);
        setEventStartTime("09:00");
        setEventEndTime("10:00");
    }
  }, [isAddEditDialogOpen, selectedDate, editingEvent]);


  const EventCard = ({ event, showActions = false }: { event: CalendarEvent, showActions?: boolean }) => {
    const typeIcons: Record<CalendarEvent["type"], React.ElementType> = {
      Deadline: Timer,
      Meeting: Users,
      Milestone: Award,
      Reminder: Bell,
    };
    const IconComponent = typeIcons[event.type];

    const isPointInTime = event.type === "Milestone" || event.type === "Deadline";

    return (
    <Card 
      className={cn(
        "hover:shadow-xl hover:ring-2 hover:ring-primary/50 transition-all duration-200 ease-in-out border-l-4"
        )}
      style={{ borderLeftColor: eventTypeBorderColors[event.type] }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {IconComponent && <IconComponent className="h-5 w-5 text-primary shrink-0" />}
            <CardTitle className="text-md leading-tight truncate text-foreground">{event.title}</CardTitle>
           </div>
           <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("text-xs whitespace-nowrap", getBadgeClassNames(event.type))}>
              {event.type}
            </Badge>
            {showActions && (
                <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(event)} title="Edit Event">
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit event</span>
                </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEvent(event.id)} title="Delete Event">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete event</span>
                  </Button>
                </>
            )}
           </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm font-semibold text-muted-foreground mb-1.5">
            {format(event.startDateTime.toDate(), "EEEE, MMMM d, yyyy")}
            <span className="ml-2 text-primary font-medium">
                {format(event.startDateTime.toDate(), "p")}
                {!isPointInTime && event.endDateTime && ` - ${format(event.endDateTime.toDate(), "p")}`}
            </span>
        </p>
        <p className="text-sm text-muted-foreground break-words">{event.description || <span className="italic">No description provided.</span>}</p>
        {event.isProjectEvent && event.projectId && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center pt-1.5 border-t border-border/50 min-w-0">
            <Briefcase className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
            <span className="truncate">
                Project: {allProjects.find(p => p.id === event.projectId)?.name || <span className="italic">ID: {event.projectId}</span>}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">PPM Calendar</h1>
        </div>
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openAddDialog} className="hover:scale-105 hover:shadow-md active:scale-95 transition-transform duration-150">
              <PlusCircle className="mr-2 h-4 w-4" />
              {editingEvent ? "Edit Event" : "Add Event"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
              <DialogDescription>
                 {editingEvent ? "Update the details for this event." : `Fill in the details for your new calendar event. It will be added for ${eventDate ? format(eventDate, "PPP") : "the selected date"}.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEvent} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-title" className="text-right">Title</Label>
                <Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="col-span-3" required placeholder="Event Title"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-description" className="text-right">Description</Label>
                <Textarea id="event-description" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="col-span-3" rows={3} placeholder="Optional: Details..." />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-date" className="text-right">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                      <LucideCalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={eventDate} onSelect={(date) => date && setEventDate(startOfDay(date))} initialFocus month={eventDate} onMonthChange={setEventDate} />
                  </PopoverContent>
                </Popover>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-start-time" className="text-right">Start Time</Label>
                <Input id="event-start-time" type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="col-span-3" required />
              </div>
              {(eventType === "Meeting" || eventType === "Reminder") && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-end-time" className="text-right">End Time</Label>
                  <Input id="event-end-time" type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="col-span-3" />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-type" className="text-right">Type</Label>
                <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEvent["type"])}>
                  <SelectTrigger className="col-span-3" id="event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="is-project-event" className="text-right">Project Event?</Label>
                 <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox id="is-project-event" checked={isProjectEvent} onCheckedChange={(checked) => setIsProjectEvent(checked as boolean)} />
                    <label htmlFor="is-project-event" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Is this related to a specific project?
                    </label>
                 </div>
              </div>
              {isProjectEvent && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="linked-project-id-combobox" className="text-right">Project</Label>
                  <Popover open={projectComboboxOpen} onOpenChange={setProjectComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={projectComboboxOpen}
                        className="col-span-3 justify-between"
                        id="linked-project-id-combobox"
                      >
                        {linkedProjectId
                          ? allProjects.find((project) => project.id === linkedProjectId)?.name
                          : "Select project..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="col-span-3 p-0 w-[--radix-popover-trigger-width]">
                      <Command>
                        <CommandInput placeholder="Search project..." />
                        <CommandEmpty>No project found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {allProjects.map((project) => (
                              <CommandItem
                                key={project.id}
                                value={project.name}
                                onSelect={(currentValue) => {
                                  const selectedProj = allProjects.find(p => p.name.toLowerCase() === currentValue.toLowerCase());
                                  setLinkedProjectId(selectedProj ? selectedProj.id : null);
                                  setProjectComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    linkedProjectId === project.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {project.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editingEvent ? "Save Changes" : "Save Event"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                  const dayEvents = events.filter(event => isSameDay(event.startDateTime.toDate(), date));
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
                  return (
                    <div className={cn("relative h-full w-full flex flex-col items-center justify-center")}>
                      <span className="text-sm">{format(date, "d")}</span>
                      {isCurrentMonth && dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                          {dayEvents.slice(0, 3).map(event => (
                            <span 
                              key={`${event.id}-dot`} 
                              className={`h-1.5 w-1.5 rounded-full ${eventTypeDotColors[event.type]} shadow-sm border border-background/30`}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 flex items-center justify-center text-background text-[0.5rem] font-bold shadow-sm border border-background/30" title={`${dayEvents.length - 3} more events`}>
                              +{dayEvents.length-3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4 pb-2 border-b text-foreground">
              Events for: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            {eventsForSelectedDate.length > 0 ? (
              <ul className="space-y-4">
                {eventsForSelectedDate.map((event) => (<li key={event.id}><EventCard event={event} showActions={true} /></li>))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
                <Info className="h-12 w-12 text-primary/70 mb-3 animate-pulse"/>
                <p className="text-muted-foreground font-medium text-lg">{selectedDate ? "No Events Scheduled" : "Select a Date"}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedDate ? "There are no events for this day." : "Click on a day in the calendar."}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <ListOrdered className="h-6 w-6 text-primary" />
            All Upcoming Events
          </CardTitle>
          <CardDescription>A list of all scheduled events, sortable by column.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedAllUpcomingEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => requestUpcomingSort('title')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Title {getUpcomingSortIcon('title')}</div>
                  </TableHead>
                  <TableHead onClick={() => requestUpcomingSort('startDateTime')} className="cursor-pointer hover:bg-muted/50">
                     <div className="flex items-center">Date & Time {getUpcomingSortIcon('startDateTime')}</div>
                  </TableHead>
                  <TableHead onClick={() => requestUpcomingSort('type')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Type {getUpcomingSortIcon('type')}</div>
                  </TableHead>
                  <TableHead onClick={() => requestUpcomingSort('projectId')} className="cursor-pointer hover:bg-muted/50 hidden md:table-cell">
                     <div className="flex items-center">Project {getUpcomingSortIcon('projectId')}</div>
                  </TableHead>
                  <TableHead onClick={() => requestUpcomingSort('createdAt')} className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell">
                    <div className="flex items-center">Date Added {getUpcomingSortIcon('createdAt')}</div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAllUpcomingEvents.map((event) => {
                  const isPointInTime = event.type === "Milestone" || event.type === "Deadline";
                  return (
                    <TableRow key={event.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{event.title}</TableCell>
                      <TableCell>
                          {format(event.startDateTime.toDate(), "PP")}<br/>
                          <span className="text-xs text-primary">
                              {format(event.startDateTime.toDate(), "p")}
                              {!isPointInTime && event.endDateTime && ` - ${format(event.endDateTime.toDate(), "p")}`}
                          </span>
                      </TableCell>
                      <TableCell><Badge className={cn(getBadgeClassNames(event.type))}>{event.type}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {event.isProjectEvent && event.projectId 
                          ? (allProjects.find(p => p.id === event.projectId)?.name || <span className="italic">ID: {event.projectId}</span>) 
                          : <span className="italic text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {event.createdAt ? formatDistanceToNow(event.createdAt.toDate(), { addSuffix: true }) : <span className="italic text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(event)} title="Edit Event">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEvent(event.id)} title="Delete Event">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
              <CalendarDays className="h-12 w-12 text-primary/70 mb-3"/>
              <p className="text-muted-foreground font-medium text-lg">No Upcoming Events</p>
              <p className="text-sm text-muted-foreground mt-1">There are no events scheduled for the future.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
