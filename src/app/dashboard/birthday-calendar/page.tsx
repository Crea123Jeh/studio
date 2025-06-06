
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay, getYear, getMonth, getDate } from "date-fns";
import { Cake, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, PartyPopper } from "lucide-react";

interface BirthdayEvent {
  id: string; // Firestore document ID
  anchorDate: Date; // The specific birth date (day, month, year) used as an anchor.
  name: string; // Person's name
}

export default function BirthdayCalendarPage() {
  const [birthdays, setBirthdays] = useState<BirthdayEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAddBirthdayDialogOpen, setIsAddBirthdayDialogOpen] = useState(false);
  const [newBirthdayName, setNewBirthdayName] = useState("");
  const [newBirthdayDate, setNewBirthdayDate] = useState<Date | undefined>(selectedDate || new Date());
  const { toast } = useToast();

  useEffect(() => {
    const birthdaysCollection = collection(db, "birthdayEvents");
    const q = query(birthdaysCollection, orderBy("anchorDate", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBirthdays = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          anchorDate: (data.anchorDate as Timestamp).toDate(),
        } as BirthdayEvent;
      });
      setBirthdays(fetchedBirthdays);
    }, (error) => {
      console.error("Error fetching birthdays: ", error);
      toast({
        title: "Error",
        description: "Could not fetch birthdays.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  const handleDeleteBirthday = async (birthdayId: string) => {
    try {
      await deleteDoc(doc(db, "birthdayEvents", birthdayId));
      toast({
        title: "Birthday Deleted",
        description: "The birthday has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting birthday: ", error);
      toast({
        title: "Error Deleting Birthday",
        description: "Could not delete the birthday. Please try again.",
        variant: "destructive",
      });
    }
  };

  const birthdaysForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return birthdays.filter(bday => 
        getMonth(bday.anchorDate) === getMonth(selectedDate) &&
        getDate(bday.anchorDate) === getDate(selectedDate)
    ).map(bday => ({
        ...bday,
        // Display date should reflect the selected year for consistency
        displayDate: new Date(getYear(selectedDate), getMonth(bday.anchorDate), getDate(bday.anchorDate))
    }));
  }, [birthdays, selectedDate]);
  
  const allUpcomingBirthdays = useMemo(() => {
    const today = startOfDay(new Date());
    const displayBirthdays: (BirthdayEvent & { displayDate: Date })[] = [];

    birthdays.forEach(bday => {
      const currentYear = getYear(today);
      let nextBirthdayDate = new Date(currentYear, getMonth(bday.anchorDate), getDate(bday.anchorDate));
      
      if (startOfDay(nextBirthdayDate) < today) { // If this year's birthday has passed
        nextBirthdayDate = new Date(currentYear + 1, getMonth(bday.anchorDate), getDate(bday.anchorDate));
      }
      displayBirthdays.push({
        ...bday,
        displayDate: nextBirthdayDate,
      });
    });
    return displayBirthdays.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
  }, [birthdays]);

  const birthdayDotColor = "bg-purple-500";
  const birthdayBorderColor = "hsl(var(--purple-500, 262 84% 57%))";
  const birthdayBadgeClassName = "bg-purple-500 text-white hover:bg-purple-600";
  
  const handleAddBirthday = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBirthdayName || !newBirthdayDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and date for the birthday.",
        variant: "destructive",
      });
      return;
    }

    const birthdayData: Omit<BirthdayEvent, 'id'> & { anchorDate: Timestamp } = {
      name: newBirthdayName,
      anchorDate: Timestamp.fromDate(startOfDay(newBirthdayDate)), // Store the actual selected date as anchor
    };

    try {
      await addDoc(collection(db, "birthdayEvents"), birthdayData);
      toast({
        title: "Birthday Added",
        description: `${newBirthdayName}'s birthday has been added.`,
      });
      setNewBirthdayName("");
      setNewBirthdayDate(selectedDate || new Date());
      setIsAddBirthdayDialogOpen(false);
    } catch (error) {
      console.error("Error adding birthday: ", error);
      toast({
        title: "Error",
        description: "Could not add the birthday. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedDate) {
      setNewBirthdayDate(startOfDay(selectedDate));
    }
  }, [selectedDate]);

  const BirthdayCard = ({ birthday, displayDate, showDeleteButton = false }: { birthday: BirthdayEvent, displayDate: Date, showDeleteButton?: boolean }) => (
    <Card 
      className="hover:shadow-xl transition-shadow duration-200 ease-in-out border-l-4"
      style={{ borderLeftColor: birthdayBorderColor }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight">{birthday.name}'s Birthday</CardTitle>
           <div className="flex items-center gap-2">
            <Badge className={cn("text-xs whitespace-nowrap shrink-0", birthdayBadgeClassName)}>
              <PartyPopper className="inline h-3 w-3 mr-1"/>
              Birthday
            </Badge>
            {showDeleteButton && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteBirthday(birthday.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete birthday</span>
                  </Button>
            )}
           </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm font-semibold text-muted-foreground mb-1.5">{format(displayDate, "EEEE, MMMM d, yyyy")}</p>
        <p className="text-sm text-muted-foreground italic">Age: {getYear(displayDate) - getYear(birthday.anchorDate)} (on this date)</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
            <Cake className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Birthday Calendar</h1>
        </div>
        <Dialog open={isAddBirthdayDialogOpen} onOpenChange={setIsAddBirthdayDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Birthday
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Birthday</DialogTitle>
              <DialogDescription>
                Enter the person's name and their birth date. This will be a recurring annual event.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBirthday} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="birthday-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="birthday-name"
                  value={newBirthdayName}
                  onChange={(e) => setNewBirthdayName(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="Person's Name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="birthday-date" className="text-right">
                  Birth Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !newBirthdayDate && "text-muted-foreground"
                      )}
                    >
                      <LucideCalendarIcon className="mr-2 h-4 w-4" />
                      {newBirthdayDate ? format(newBirthdayDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newBirthdayDate}
                      onSelect={(date) => date && setNewBirthdayDate(startOfDay(date))}
                      initialFocus
                      month={newBirthdayDate}
                      onMonthChange={(month) => setNewBirthdayDate(current => current ? new Date(month.getFullYear(), month.getMonth(), current.getDate()) : month)}
                      captionLayout="dropdown-buttons" 
                      fromYear={1900} 
                      toYear={getYear(new Date()) + 1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Birthday</Button>
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
                  const dayHasBirthday = birthdays.some(bday => 
                    getMonth(bday.anchorDate) === getMonth(date) &&
                    getDate(bday.anchorDate) === getDate(date)
                  );
                  const isCurrentMonth = date.getMonth() === displayMonth.getMonth();

                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-1.5">
                      {format(date, "d")}
                      {isCurrentMonth && dayHasBirthday && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex space-x-1">
                          <span className={`h-2 w-2 rounded-full ${birthdayDotColor}`} />
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
              Birthdays on: {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
            </h3>
            <ScrollArea className="max-h-[calc(100vh-450px)] pr-2">
              {birthdaysForSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {birthdaysForSelectedDate.map(({id, displayDate, ...bday}) => (
                    <li key={id}>
                       <BirthdayCard birthday={bday} displayDate={displayDate} showDeleteButton={true} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50">
                  <Info className="h-12 w-12 text-primary/70 mb-3"/>
                  <p className="text-muted-foreground font-medium text-lg">
                    {selectedDate ? "No Birthdays This Day" : "Select a Date"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                     {selectedDate ? "There are no birthdays recorded for this day." : "Click on a day in the calendar to view birthdays."}
                  </p>
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
            All Upcoming Birthdays
          </CardTitle>
          <CardDescription>
            A list of all upcoming birthdays, sorted by their next occurrence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allUpcomingBirthdays.length > 0 ? (
            <ScrollArea className="max-h-[400px] pr-2">
              <ul className="space-y-4">
                {allUpcomingBirthdays.map(({id, displayDate, ...bday}) => (
                  <li key={id + `-${getYear(displayDate)}`}>
                     <BirthdayCard birthday={bday} displayDate={displayDate} showDeleteButton={true} />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
              <Cake className="h-12 w-12 text-primary/70 mb-3"/>
              <p className="text-muted-foreground font-medium text-lg">No Upcoming Birthdays</p>
              <p className="text-sm text-muted-foreground mt-1">Add some birthdays to see them here!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    