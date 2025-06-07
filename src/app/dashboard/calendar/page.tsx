
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay } from "date-fns";
import { CalendarDays, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, Briefcase, Edit3 } from "lucide-react";

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  type: "Deadline" | "Meeting" | "Milestone" | "Reminder";
  isProjectEvent?: boolean;
  projectId?: string; 
}

const eventTypes: CalendarEvent["type"][] = ["Deadline", "Meeting", "Milestone", "Reminder"];

const MOCK_PROJECTS = [
  { id: "proj_alpha_centauri", name: "Project Alpha Centauri" },
  { id: "proj_beta_initiative", name: "Project Beta Initiative" },
  { id: "proj_gamma_exploration", name: "Project Gamma Exploration" },
];

export default function CalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("Meeting");
  const [isProjectEvent, setIsProjectEvent] = useState(false);
  const [linkedProjectId, setLinkedProjectId] = useState<string | undefined>(undefined);

  const { toast } = useToast();

  useEffect(() => {
    const eventsCollection = collection(db, "calendarEvents");
    const q = query(eventsCollection, orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          type: data.type,
          date: (data.date as Timestamp).toDate(),
          isProjectEvent: data.isProjectEvent || false,
          projectId: data.projectId,
        } as CalendarEvent;
      });
      setEvents(fetchedEvents);
    }, (error) => {
      console.error("Error fetching calendar events: ", error);
      toast({
        title: "Error",
        description: "Could not fetch calendar events.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventDate(selectedDate || new Date());
    setEventType("Meeting");
    setIsProjectEvent(false);
    setLinkedProjectId(undefined);
    setEditingEvent(null);
  };

  const openAddDialog = () => {
    resetForm();
    setEventDate(startOfDay(selectedDate || new Date()));
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description);
    setEventDate(event.date);
    setEventType(event.type);
    setIsProjectEvent(event.isProjectEvent || false);
    setLinkedProjectId(event.projectId);
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
    return events.filter(event => isSameDay(event.date, selectedDate));
  }, [events, selectedDate]);
  
  const allUpcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return events
      .filter(event => event.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const eventTypeDotColors: Record<CalendarEvent["type"], string> = {
    Deadline: "bg-destructive",
    Meeting: "bg-primary",
    Milestone: "bg-green-500",
    Reminder: "bg-yellow-400",
  };

  const eventTypeBorderColors: Record<CalendarEvent["type"], string> = {
    Deadline: "hsl(var(--destructive))",
    Meeting: "hsl(var(--primary))",
    Milestone: "hsl(var(--chart-2))", 
    Reminder: "hsl(var(--chart-4))", 
  };

  const getBadgeClassNames = (type: CalendarEvent["type"]): string => {
    switch (type) {
      case "Deadline":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "Meeting":
        return "bg-primary text-primary-foreground hover:bg-primary/90";
      case "Milestone":
        return "bg-green-500 text-white hover:bg-green-600";
      case "Reminder":
        return "bg-yellow-400 text-black hover:bg-yellow-500";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };
  
  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and date for the event.",
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

    const eventData = {
      title: eventTitle,
      description: eventDescription,
      type: eventType,
      date: Timestamp.fromDate(startOfDay(eventDate)),
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
    } else if (!editingEvent && selectedDate) { // Only set date if adding new and selectedDate is available
        setEventDate(startOfDay(selectedDate));
    }
  }, [isAddEditDialogOpen, selectedDate, editingEvent]);


  const EventCard = ({ event, showActions = false }: { event: CalendarEvent, showActions?: boolean }) => (
    <Card 
      className="hover:shadow-xl transition-shadow duration-200 ease-in-out border-l-4"
      style={{ borderLeftColor: eventTypeBorderColors[event.type] }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight">{event.title}</CardTitle>
           <div className="flex items-center gap-2">
            <Badge className={cn("text-xs whitespace-nowrap shrink-0", getBadgeClassNames(event.type))}>
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
        <p className="text-sm font-semibold text-muted-foreground mb-1.5">{format(event.date, "EEEE, MMMM d, yyyy")}</p>
        <p className="text-sm text-muted-foreground">{event.description || <span className="italic">No description provided.</span>}</p>
        {event.isProjectEvent && event.projectId && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center pt-1.5 border-t border-border/50">
            <Briefcase className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Project: {MOCK_PROJECTS.find(p => p.id === event.projectId)?.name || event.projectId}
            {/* Consider Link to /dashboard/project?id={event.projectId} in future */}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">PPM Calendar</h1>
        </div>
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openAddDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {editingEvent ? "Edit Event" : "Add Event"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
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
                    <Label htmlFor="linked-project-id" className="text-right">Project</Label>
                    <Select value={linkedProjectId} onValueChange={setLinkedProjectId}>
                    <SelectTrigger className="col-span-3" id="linked-project-id">
                        <SelectValue placeholder="Select linked project" />
                    </SelectTrigger>
                    <SelectContent>
                        {MOCK_PROJECTS.map(proj => (<SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>))}
                    </SelectContent>
                    </Select>
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-2">
           <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(startOfDay(date))}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border p-0 w-full shadow-inner bg-background"
              classNames={{
                day_today: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-bold",
                day_selected: "bg-accent text-accent-foreground hover:bg-accent/90 focus:bg-accent focus:text-accent-foreground rounded-md",
              }}
              components={{
                DayContent: ({ date, displayMonth }) => {
                  const dayEvents = events.filter(event => isSameDay(event.date, date));
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-1.5">
                      {format(date, "d")}
                      {isCurrentMonth && dayEvents.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex space-x-1">
                          {dayEvents.slice(0,3).map(event => (<span key={`${event.id}-dot`} className={`h-2 w-2 rounded-full ${eventTypeDotColors[event.type]}`} />))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
          <div className="md:col-span-1">
            <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
              Events for: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            <ScrollArea className="max-h-[calc(100vh-450px)] pr-2">
              {eventsForSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {eventsForSelectedDate.map((event) => (<li key={event.id}><EventCard event={event} showActions={true} /></li>))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50">
                  <Info className="h-12 w-12 text-primary/70 mb-3"/>
                  <p className="text-muted-foreground font-medium text-lg">{selectedDate ? "No Events Scheduled" : "Select a Date"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedDate ? "There are no events for this day." : "Click on a day in the calendar."}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListOrdered className="h-6 w-6 text-primary" />
            All Upcoming Events
          </CardTitle>
          <CardDescription>A list of all scheduled events, sorted by date.</CardDescription>
        </CardHeader>
        <CardContent>
          {allUpcomingEvents.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-2">
              <ul className="space-y-4">
                {allUpcomingEvents.map((event) => (<li key={`${event.id}-upcoming`}><EventCard event={event} showActions={true} /></li>))}
              </ul>
            </ScrollArea>
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

    