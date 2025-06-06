
"use client";

import { useState, useEffect, type FormEvent } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase"; // Updated path
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { format, isSameDay, startOfDay } from "date-fns";
import { CalendarDays, Info, PlusCircle, CalendarIcon as LucideCalendarIcon } from "lucide-react";

interface CalendarEvent {
  id: string; // Firestore document ID
  date: Date; // Converted from Firestore Timestamp for client-side use
  title: string;
  description: string;
  type: "Deadline" | "Meeting" | "Milestone" | "Reminder";
}

const eventTypes: CalendarEvent["type"][] = ["Deadline", "Meeting", "Milestone", "Reminder"];

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

  const eventsForSelectedDate = selectedDate ? events.filter(event => isSameDay(event.date, selectedDate)) : [];
  
  const eventTypeDotColors: Record<CalendarEvent["type"], string> = {
    Deadline: "bg-destructive",
    Meeting: "bg-primary",
    Milestone: "bg-green-500", // Using a specific green for visibility
    Reminder: "bg-yellow-400", // Using a specific yellow for visibility
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
        return "bg-yellow-400 text-black hover:bg-yellow-500"; // Assuming black text for better contrast on yellow-400
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

    try {
      await addDoc(collection(db, "calendarEvents"), {
        title: newEventTitle,
        description: newEventDescription,
        type: newEventType,
        date: Timestamp.fromDate(startOfDay(newEventDate)), // Store as Firestore Timestamp, ensuring start of day
      });
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
      setNewEventDate(selectedDate);
    }
  }, [selectedDate]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary" />
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
                      onSelect={setNewEventDate}
                      initialFocus
                      month={newEventDate} // Control month view in picker
                      onMonthChange={(month) => setNewEventDate(current => current ? new Date(month.getFullYear(), month.getMonth(), current.getDate()) : month)} // Allow month change
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
        <CardDescription className="p-6 pt-2">
          View important project deadlines, meetings, and milestones. Click on a date to see events. Add new events using the button above.
        </CardDescription>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border p-0 w-full"
              classNames={{
                day_today: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
              }}
              modifiers={{
                eventDay: events.map(event => event.date)
              }}
              modifiersStyles={{
                eventDay: { // Style for days that have events (dot indicator logic is in DayContent)
                  /* No specific style here, dots are handled by DayContent */
                }
              }}
              components={{
                DayContent: ({ date, displayMonth }) => {
                  const dayEvents = events.filter(event => isSameDay(event.date, date));
                  // Check if the date is part of the displayed month
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();

                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-1.5">
                      {format(date, "d")}
                      {isCurrentMonth && dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                          {dayEvents.slice(0,3).map(event => (
                            <span key={`${event.id}-dot`} className={`h-1.5 w-1.5 rounded-full ${eventTypeDotColors[event.type]}`} />
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
            <h3 className="text-xl font-semibold mb-4">
              Events for: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            {eventsForSelectedDate.length > 0 ? (
              <ul className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2"> {/* Adjusted max height */}
                {eventsForSelectedDate.map((event) => (
                  <li key={event.id} className="p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-md">{event.title}</h4>
                       <Badge className={cn("text-xs", getBadgeClassNames(event.type))}>
                        {event.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(event.date, "MMM d, yyyy")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full">
                <Info className="h-10 w-10 text-muted-foreground mb-2"/>
                <p className="text-muted-foreground">
                  {selectedDate ? "No events scheduled for this date." : "Select a date to view events."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
