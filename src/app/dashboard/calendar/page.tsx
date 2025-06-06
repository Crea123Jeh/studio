
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay, getYear, getMonth, getDate } from "date-fns";
import { CalendarDays, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, PartyPopper } from "lucide-react";

interface CalendarEvent {
  id: string; // Firestore document ID
  date: Date; // Converted from Firestore Timestamp. For recurring, this is the anchor date.
  title: string;
  description: string;
  type: "Deadline" | "Meeting" | "Milestone" | "Reminder" | "Birthday";
  isRecurring?: boolean;
}

const eventTypes: CalendarEvent["type"][] = ["Deadline", "Meeting", "Milestone", "Reminder", "Birthday"];

export default function CalendarEventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(selectedDate || new Date());
  const [newEventType, setNewEventType] = useState<CalendarEvent["type"]>("Meeting");
  const { toast } = useToast();

  useEffect(() => {
    const eventsCollection = collection(db, "calendarEvents");
    const q = query(eventsCollection, orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          type: data.type,
          date: (data.date as Timestamp).toDate(),
          isRecurring: data.isRecurring || false,
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

  const handleDeleteEvent = async (eventId: string) => {
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
    return events.filter(event => {
      if (event.type === "Birthday" && event.isRecurring) {
        // For birthdays, match month and day, ignoring the year of the selectedDate for comparison with anchor date
        return getMonth(event.date) === getMonth(selectedDate) &&
               getDate(event.date) === getDate(selectedDate);
      }
      return isSameDay(event.date, selectedDate);
    }).map(event => {
      if (event.type === "Birthday" && event.isRecurring && selectedDate) {
        // Ensure the displayed date for a birthday matches the selectedDate's year
        return { ...event, date: new Date(getYear(selectedDate), getMonth(event.date), getDate(event.date)) };
      }
      return event;
    });
  }, [events, selectedDate]);
  
  const allUpcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const displayEvents: CalendarEvent[] = [];

    events.forEach(event => {
      if (event.type === "Birthday" && event.isRecurring) {
        const currentYear = getYear(today);
        let nextBirthdayDate = new Date(currentYear, getMonth(event.date), getDate(event.date));
        if (startOfDay(nextBirthdayDate) < today) { // If this year's birthday has passed
          nextBirthdayDate = new Date(currentYear + 1, getMonth(event.date), getDate(event.date));
        }
        // Only add if it's today or in the future
        if (startOfDay(nextBirthdayDate) >= today) {
          displayEvents.push({
            ...event,
            date: nextBirthdayDate, // Override date for display purposes
          });
        }
      } else if (!event.isRecurring && event.date >= today) {
        displayEvents.push(event);
      }
    });
    return displayEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const eventTypeDotColors: Record<CalendarEvent["type"], string> = {
    Deadline: "bg-destructive",
    Meeting: "bg-primary",
    Milestone: "bg-green-500",
    Reminder: "bg-yellow-400",
    Birthday: "bg-purple-500",
  };

  const eventTypeBorderColors: Record<CalendarEvent["type"], string> = {
    Deadline: "hsl(var(--destructive))",
    Meeting: "hsl(var(--primary))",
    Milestone: "hsl(var(--chart-2))", 
    Reminder: "hsl(var(--chart-4))", 
    Birthday: "hsl(var(--purple-500, 262 84% 57%))", // Fallback in case --purple-500 is not in theme
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
      case "Birthday":
        return "bg-purple-500 text-white hover:bg-purple-600";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };
  
  const handleAddEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and date for the event.",
        variant: "destructive",
      });
      return;
    }

    const eventData: Omit<CalendarEvent, 'id' | 'date'> & { date: Timestamp; isRecurring?: boolean } = {
      title: newEventTitle,
      description: newEventDescription,
      type: newEventType,
      date: Timestamp.fromDate(startOfDay(newEventDate)),
    };

    if (newEventType === "Birthday") {
      eventData.isRecurring = true;
    }


    try {
      await addDoc(collection(db, "calendarEvents"), eventData);
      toast({
        title: "Event Added",
        description: `"${newEventTitle}" has been added to the calendar.`,
      });
      setNewEventTitle("");
      setNewEventDescription("");
      setNewEventDate(selectedDate || new Date());
      setNewEventType("Meeting");
      setIsAddEventDialogOpen(false);
    } catch (error) {
      console.error("Error adding event: ", error);
      toast({
        title: "Error",
        description: "Could not add the event. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedDate) {
      setNewEventDate(startOfDay(selectedDate));
    }
  }, [selectedDate]);

  const EventCard = ({ event, showDeleteButton = false }: { event: CalendarEvent, showDeleteButton?: boolean }) => (
    <Card 
      className="hover:shadow-xl transition-shadow duration-200 ease-in-out border-l-4"
      style={{ borderLeftColor: eventTypeBorderColors[event.type] }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight">{event.title}</CardTitle>
           <div className="flex items-center gap-2">
            <Badge className={cn("text-xs whitespace-nowrap shrink-0", getBadgeClassNames(event.type))}>
              {event.type === "Birthday" ? <PartyPopper className="inline h-3 w-3 mr-1"/> : null}
              {event.type}
            </Badge>
            {showDeleteButton && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete event</span>
                  </Button>
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
          <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Project Calendar</h1>
        </div>
        <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Fill in the details for your new calendar event. It will be added for {newEventDate ? format(newEventDate, "PPP") : "the selected date"}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEvent} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-title" className="text-right">
                  Title
                </Label>
                <Input
                  id="event-title"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="event-description"
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="col-span-3"
                  rows={3}
                  placeholder="Optional: Add more details..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-date" className="text-right">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !newEventDate && "text-muted-foreground"
                      )}
                    >
                      <LucideCalendarIcon className="mr-2 h-4 w-4" />
                      {newEventDate ? format(newEventDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newEventDate}
                      onSelect={(date) => date && setNewEventDate(startOfDay(date))}
                      initialFocus
                      month={newEventDate}
                      onMonthChange={(month) => setNewEventDate(current => current ? new Date(month.getFullYear(), month.getMonth(), current.getDate()) : month)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-type" className="text-right">
                  Type
                </Label>
                <Select value={newEventType} onValueChange={(value) => setNewEventType(value as CalendarEvent["type"])}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Event</Button>
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
              modifiers={{
                // eventDay will be based on dynamic check in DayContent for recurring events
              }}
              modifiersStyles={{
                // eventDay: { /* Style for days that have events (dot indicator logic is in DayContent) */ }
              }}
              components={{
                DayContent: ({ date, displayMonth }) => {
                  const dayEvents = events.filter(event => {
                     if (event.type === "Birthday" && event.isRecurring) {
                       return getMonth(event.date) === getMonth(date) &&
                              getDate(event.date) === getDate(date);
                     }
                     return isSameDay(event.date, date);
                  });
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();

                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-1.5">
                      {format(date, "d")}
                      {isCurrentMonth && dayEvents.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex space-x-1">
                          {dayEvents.slice(0,3).map(event => (
                            <span key={`${event.id}-${date.getTime()}-dot`} className={`h-2 w-2 rounded-full ${eventTypeDotColors[event.type]}`} />
                          ))}
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
                  {eventsForSelectedDate.map((event) => (
                    <li key={event.id + (event.isRecurring ? `-${getYear(event.date)}` : '')}>
                       <EventCard event={event} showDeleteButton={true} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50">
                  <Info className="h-12 w-12 text-primary/70 mb-3"/>
                  <p className="text-muted-foreground font-medium text-lg">
                    {selectedDate ? "No Events Scheduled" : "Select a Date"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                     {selectedDate ? "There are no events for this day." : "Click on a day in the calendar to view its events."}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* All Upcoming Events Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListOrdered className="h-6 w-6 text-primary" />
            All Upcoming Events
          </CardTitle>
          <CardDescription>
            A list of all scheduled events, including next occurrences of birthdays, sorted by date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allUpcomingEvents.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-2">
              <ul className="space-y-4">
                {allUpcomingEvents.map((event) => (
                  <li key={event.id + (event.isRecurring ? `-${getYear(event.date)}` : '')}>
                     <EventCard event={event} showDeleteButton={true} />
                  </li>
                ))}
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


    