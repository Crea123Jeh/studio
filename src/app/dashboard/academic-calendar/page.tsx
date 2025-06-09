
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay, isBefore } from "date-fns";
import { School, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListChecks, Trash2, Edit3, ArrowUpDown, ArrowUp, ArrowDown, CalendarClock, BookMarked, Eye } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

interface AcademicEvent {
  id: string; 
  date: Date;
  title: string;
  description: string;
  category: "Holiday" | "Exam" | "School Event" | "Term Break" | "Reminder" | "Other";
}

type SortableAcademicEventKeys = 'title' | 'date' | 'category';

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

  const [upcomingSortConfig, setUpcomingSortConfig] = useState<{ key: SortableAcademicEventKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'ascending' });
  const [pastSortConfig, setPastSortConfig] = useState<{ key: SortableAcademicEventKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [viewingEventDetails, setViewingEventDetails] = useState<AcademicEvent | null>(null);


  const { toast } = useToast();
  const { username } = useAuth();
  const { addAppNotification } = useNotification();

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

  const openViewDetailsDialog = (event: AcademicEvent) => {
    setViewingEventDetails(event);
    setIsViewDetailsDialogOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
     if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
        console.error("Error deleting event: eventId is invalid.");
        toast({ title: "Deletion Error", description: "Invalid event ID.", variant: "destructive"});
        return;
    }
    try {
      const eventToDelete = events.find(e => e.id === eventId);
      await deleteDoc(doc(db, "academicEvents", eventId));
      toast({
        title: "Event Deleted",
        description: "The academic event has been successfully deleted.",
      });
      if (eventToDelete) {
        addAppNotification({
          type: 'academic',
          message: `Academic event "${eventToDelete.title}" deleted by ${username || 'a user'}.`,
          iconName: 'Trash2',
        });
      }
      // TODO: Backend should generate REAL notifications for all relevant users
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

  const sortEvents = (items: AcademicEvent[], config: { key: SortableAcademicEventKeys; direction: 'ascending' | 'descending' }) => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (config.key === 'date') {
        comparison = a.date.getTime() - b.date.getTime();
      } else if (config.key === 'title' || config.key === 'category') {
        comparison = a[config.key].localeCompare(b[config.key]);
      }
      return config.direction === 'ascending' ? comparison : -comparison;
    });
  };
  
  const upcomingAcademicEventsTableData = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = events.filter(event => !isBefore(event.date, today) || isSameDay(event.date, today));
    return sortEvents(upcoming, upcomingSortConfig);
  }, [events, upcomingSortConfig]);

  const pastAcademicEventsTableData = useMemo(() => {
    const today = startOfDay(new Date());
    const past = events.filter(event => isBefore(event.date, today) && !isSameDay(event.date, today));
    return sortEvents(past, pastSortConfig);
  }, [events, pastSortConfig]);

  const requestSort = (key: SortableAcademicEventKeys, tableType: 'upcoming' | 'past') => {
    const currentConfig = tableType === 'upcoming' ? upcomingSortConfig : pastSortConfig;
    const setConfig = tableType === 'upcoming' ? setUpcomingSortConfig : setPastSortConfig;
    let direction: 'ascending' | 'descending' = 'ascending';
    if (currentConfig.key === key && currentConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setConfig({ key, direction });
  };

  const getSortIcon = (key: SortableAcademicEventKeys, tableType: 'upcoming' | 'past') => {
    const currentConfig = tableType === 'upcoming' ? upcomingSortConfig : pastSortConfig;
    if (currentConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return currentConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };


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
        addAppNotification({
          type: 'academic',
          message: `Academic event "${eventTitle}" updated by ${username || 'a user'}.`,
          link: '/dashboard/academic-calendar',
          iconName: 'School',
        });
        // TODO: Backend should generate REAL notifications for all relevant users
      } else {
        const newDocRef = await addDoc(collection(db, "academicEvents"), eventData);
        toast({
          title: "Event Added",
          description: `"${eventTitle}" has been added to the calendar.`,
        });
        addAppNotification({
          type: 'academic',
          message: `New academic event "${eventTitle}" added by ${username || 'a user'}.`,
          link: '/dashboard/academic-calendar',
          iconName: 'School',
        });
        // TODO: Backend should generate REAL notifications for all relevant users
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


  const EventCard = ({ event, showCardActions = false }: { event: AcademicEvent, showCardActions?: boolean }) => (
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
            {showCardActions && (
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
          <div className="space-y-4"> 
             <div>
                <h3 className="text-xl font-semibold mb-3 pb-2 border-b text-foreground">
                    Events for: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
                </h3>
                <ScrollArea className="pr-2">
                  {eventsForSelectedDate.length > 0 ? (
                    <ul className="space-y-4">
                      {eventsForSelectedDate.map((event) => {
                        const isEventPast = isBefore(event.date, startOfDay(new Date())) && !isSameDay(event.date, startOfDay(new Date()));
                        return (<li key={event.id}><EventCard event={event} showCardActions={!isEventPast} /></li>)
                      })}
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
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <CalendarClock className="h-6 w-6 text-primary" />
            Upcoming Academic Events
          </CardTitle>
          <CardDescription>Scheduled academic events from today onwards.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAcademicEventsTableData.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('title', 'upcoming')} className="cursor-pointer hover:bg-muted/50"><div className="flex items-center">Title {getSortIcon('title', 'upcoming')}</div></TableHead>
                    <TableHead onClick={() => requestSort('date', 'upcoming')} className="cursor-pointer hover:bg-muted/50"><div className="flex items-center">Date {getSortIcon('date', 'upcoming')}</div></TableHead>
                    <TableHead onClick={() => requestSort('category', 'upcoming')} className="cursor-pointer hover:bg-muted/50"><div className="flex items-center">Category {getSortIcon('category', 'upcoming')}</div></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingAcademicEventsTableData.map((event) => (
                    <TableRow key={`${event.id}-upcoming-row`}>
                      <TableCell className="font-medium text-foreground">{event.title}</TableCell>
                      <TableCell>{format(event.date, "PP")}</TableCell>
                      <TableCell><Badge className={cn(getBadgeClassNames(event.category))}>{event.category}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(event)} title="Edit Event"><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEvent(event.id)} title="Delete Event"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <BookMarked className="h-6 w-6 text-primary" />
            Past Academic Events
          </CardTitle>
          <CardDescription>A log of academic events that have already occurred. These records are view-only.</CardDescription>
        </CardHeader>
        <CardContent>
          {pastAcademicEventsTableData.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-2">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('title', 'past')} className="cursor-pointer hover:bg-muted/50"><div className="flex items-center">Title {getSortIcon('title', 'past')}</div></TableHead>
                    <TableHead onClick={() => requestSort('date', 'past')} className="cursor-pointer hover:bg-muted/50"><div className="flex items-center">Date {getSortIcon('date', 'past')}</div></TableHead>
                    <TableHead onClick={() => requestSort('category', 'past')} className="cursor-pointer hover:bg-muted/50"><div className="flex items-center">Category {getSortIcon('category', 'past')}</div></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAcademicEventsTableData.map((event) => (
                    <TableRow key={`${event.id}-past-row`}>
                      <TableCell className="font-medium text-foreground">{event.title}</TableCell>
                      <TableCell>{format(event.date, "PP")}</TableCell>
                      <TableCell><Badge className={cn(getBadgeClassNames(event.category))}>{event.category}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => openViewDetailsDialog(event)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
              <School className="h-12 w-12 text-primary/70 mb-3"/>
              <p className="text-muted-foreground font-medium text-lg">No Past Academic Events</p>
              <p className="text-sm text-muted-foreground mt-1">There are no academic events logged from the past.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingEventDetails?.title || "Event Details"}</DialogTitle>
            {viewingEventDetails && <DialogDescription>Category: <Badge className={cn(getBadgeClassNames(viewingEventDetails.category))}>{viewingEventDetails.category}</Badge></DialogDescription>}
          </DialogHeader>
          {viewingEventDetails && (
            <div className="py-4 space-y-2">
              <p><strong>Date:</strong> {format(viewingEventDetails.date, "EEEE, MMMM d, yyyy")}</p>
              <p><strong>Description:</strong></p>
              <ScrollArea className="max-h-40 w-full rounded-md border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingEventDetails.description || <span className="italic">No description provided.</span>}
                </p>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
