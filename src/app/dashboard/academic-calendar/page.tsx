
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay } from "date-fns";
import { School, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, Edit3 } from "lucide-react";

interface AcademicEvent {
  id: string; 
  date: Date;
  title: string;
  description: string;
  category: "Holiday" | "Exam" | "School Event" | "Term Break" | "Reminder" | "Other";
}

const eventCategories: AcademicEvent["category"][] = ["Holiday", "Exam", "School Event", "Term Break", "Reminder", "Other"];

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

export default function AcademicCalendarPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);
  
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [eventCategory, setEventCategory] = useState<AcademicEvent["category"]>("School Event");

  const { toast } = useToast();

  useEffect(() => {
    const eventsCollection = collection(db, "academicEvents");
    const q = query(eventsCollection, orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          category: data.category,
          date: (data.date as Timestamp).toDate(),
        } as AcademicEvent;
      });
      setEvents(fetchedEvents);
    }, (error) => {
      console.error("Error fetching academic events: ", error);
      toast({
        title: "Error",
        description: "Could not fetch academic events.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventDate(selectedDate || new Date());
    setEventCategory("School Event");
    setEditingEvent(null);
  };

  const openAddDialog = () => {
    resetForm();
    setEventDate(startOfDay(selectedDate || new Date())); 
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (event: AcademicEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description);
    setEventDate(event.date);
    setEventCategory(event.category);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
     if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
        console.error("Error deleting event: eventId is invalid.");
        toast({ title: "Deletion Error", description: "Invalid event ID.", variant: "destructive"});
        return;
    }
    try {
      await deleteDoc(doc(db, "academicEvents", eventId));
      toast({
        title: "Event Deleted",
        description: "The academic event has been successfully deleted.",
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

  const eventCategoryDotColors: Record<AcademicEvent["category"], string> = {
    "Holiday": "bg-green-500",
    "Exam": "bg-destructive",
    "School Event": "bg-primary",
    "Term Break": "bg-accent",
    "Reminder": "bg-purple-500", 
    "Other": "bg-muted-foreground",
  };

   const eventCategoryBorderColors: Record<AcademicEvent["category"], string> = {
    "Holiday": "hsl(var(--green-500))", 
    "Exam": "hsl(var(--destructive))",
    "School Event": "hsl(var(--primary))",
    "Term Break": "hsl(var(--accent))",
    "Reminder": "hsl(var(--purple-500))", 
    "Other": "hsl(var(--muted-foreground))",
  };

  const getBadgeClassNames = (category: AcademicEvent["category"]): string => {
    switch (category) {
      case "Holiday": return "bg-green-500 text-white hover:bg-green-600";
      case "Exam": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "School Event": return "bg-primary text-primary-foreground hover:bg-primary/90";
      case "Term Break": return "bg-accent text-accent-foreground hover:bg-accent/90";
      case "Reminder": return "bg-purple-500 text-white hover:bg-purple-600"; 
      default: return "bg-muted text-muted-foreground hover:bg-muted/80";
    }
  };
  
  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventCategory) {
      toast({
        title: "Missing Information",
        description: "Please provide title, date, and category.",
        variant: "destructive",
      });
      return;
    }

    const eventData = {
      title: eventTitle,
      description: eventDescription,
      category: eventCategory,
      date: Timestamp.fromDate(startOfDay(eventDate)),
    };

    try {
      if (editingEvent) {
        if (!editingEvent.id) {
            toast({ title: "Update Error", description: "Invalid event ID for update.", variant: "destructive"});
            return;
        }
        await updateDoc(doc(db, "academicEvents", editingEvent.id), eventData);
        toast({
          title: "Event Updated",
          description: `"${eventTitle}" has been updated.`,
        });
      } else {
        await addDoc(collection(db, "academicEvents"), eventData);
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
    }
  }, [isAddEditDialogOpen, selectedDate]);


  const EventCard = ({ event, showActions = false }: { event: AcademicEvent, showActions?: boolean }) => (
    <Card 
      className="hover:shadow-xl transition-shadow duration-200 ease-in-out border-l-4"
      style={{ borderLeftColor: eventCategoryBorderColors[event.category] }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight text-foreground">{event.title}</CardTitle>
           <div className="flex items-center gap-2">
            <Badge className={cn("text-xs whitespace-nowrap shrink-0", getBadgeClassNames(event.category))}>
              {event.category}
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
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <School className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Academic Calendar</h1>
        </div>
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openAddDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Academic Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Academic Event" : "Add New Academic Event"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Update the details for this academic event." : `Enter details for the new event on ${eventDate ? format(eventDate, "PPP") : "the selected date"}.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEvent} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-title" className="text-right">Title</Label>
                <Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="col-span-3" required placeholder="Event Title"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-description" className="text-right">Description</Label>
                <Textarea id="event-description" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="col-span-3" rows={3} placeholder="Optional: Details about the event..." />
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
                <Label htmlFor="event-category" className="text-right">Category</Label>
                <Select value={eventCategory} onValueChange={(value) => setEventCategory(value as AcademicEvent["category"])}>
                  <SelectTrigger className="col-span-3" id="event-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
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
                  const dayEvents = events.filter(event => isSameDay(event.date, date));
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center">
                      <span className="text-sm">{format(date, "d")}</span>
                      {isCurrentMonth && dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                          {dayEvents.slice(0,3).map(event => (<span key={`${event.id}-dot`} className={`h-1.5 w-1.5 rounded-full ${eventCategoryDotColors[event.category]}`} />))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
          <div className="md:col-span-1">
            <h3 className="text-xl font-semibold mb-4 pb-2 border-b text-foreground">
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
                  <p className="text-sm text-muted-foreground mt-1">{selectedDate ? "There are no academic events for this day." : "Click on a day in the calendar."}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <ListOrdered className="h-6 w-6 text-primary" />
            All Upcoming Academic Events
          </CardTitle>
          <CardDescription>A list of all scheduled academic events, sorted by date.</CardDescription>
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
              <School className="h-12 w-12 text-primary/70 mb-3"/>
              <p className="text-muted-foreground font-medium text-lg">No Upcoming Academic Events</p>
              <p className="text-sm text-muted-foreground mt-1">There are no academic events scheduled for the future.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    