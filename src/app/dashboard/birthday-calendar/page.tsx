
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { format, isSameDay, startOfDay, getYear, getMonth, getDate, differenceInYears } from "date-fns";
import { Cake, Info, PlusCircle, CalendarIcon as LucideCalendarIcon, ListOrdered, Trash2, PartyPopper, User, Users, Edit3, Settings2, Timer } from "lucide-react";

interface BirthdayEvent {
  id: string; // Firestore document ID
  anchorDate: Date; // The specific birth date (day, month, year) used as an anchor.
  name: string; // Person's name
  type: "Teacher" | "Student";
  grade?: string; // e.g., "7", "8", "12", "College" - only for students
}

const studentGradeOptions = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "College"];

export default function BirthdayCalendarPage() {
  const [birthdays, setBirthdays] = useState<BirthdayEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<BirthdayEvent | null>(null);
  
  const [birthdayName, setBirthdayName] = useState("");
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(new Date());
  const [birthdayType, setBirthdayType] = useState<BirthdayEvent["type"]>("Student");
  const [birthdayGrade, setBirthdayGrade] = useState("");

  const [isConfigureGradeDialogOpen, setIsConfigureGradeDialogOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const birthdaysCollection = collection(db, "birthdayEvents");
    const q = query(birthdaysCollection, orderBy("anchorDate", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBirthdays = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          anchorDate: (data.anchorDate as Timestamp).toDate(),
          type: data.type || "Student", // Default to student if type is missing
          grade: data.grade,
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

  const resetForm = () => {
    setBirthdayName("");
    setBirthdayDate(selectedDate || new Date());
    setBirthdayType("Student");
    setBirthdayGrade("");
    setEditingBirthday(null);
  };

  const openAddDialog = () => {
    resetForm();
    setBirthdayDate(startOfDay(selectedDate || new Date())); // Set default date to selected or today
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (birthday: BirthdayEvent) => {
    setEditingBirthday(birthday);
    setBirthdayName(birthday.name);
    setBirthdayDate(birthday.anchorDate);
    setBirthdayType(birthday.type);
    setBirthdayGrade(birthday.grade || "");
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteBirthday = async (birthdayId: string) => {
    if (!birthdayId || typeof birthdayId !== 'string' || birthdayId.trim() === '') {
        console.error("Error deleting birthday: birthdayId is invalid. Value:", birthdayId);
        toast({
            title: "Deletion Error",
            description: "Could not delete birthday due to an invalid ID. Please refresh and try again.",
            variant: "destructive",
        });
        return;
    }
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
  
  const calculateAge = (birthDate: Date, onDate: Date = new Date()): number => {
    return differenceInYears(onDate, birthDate);
  };

  const birthdaysForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const currentSelectedYear = getYear(selectedDate);
    return birthdays.filter(bday => 
        getMonth(bday.anchorDate) === getMonth(selectedDate) &&
        getDate(bday.anchorDate) === getDate(selectedDate)
    ).map(event => ({ // Renamed bday to event for consistency with map parameter
        ...event,
        displayDate: new Date(currentSelectedYear, getMonth(event.anchorDate), getDate(event.anchorDate)),
        age: calculateAge(event.anchorDate, new Date(currentSelectedYear, getMonth(event.anchorDate), getDate(event.anchorDate)))
    }));
  }, [birthdays, selectedDate]);
  
  type BirthdayEventWithDisplayInfo = BirthdayEvent & { displayDate: Date; age: number };

  const categorizedUpcomingBirthdays = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming: {teachers: BirthdayEventWithDisplayInfo[], studentsByGrade: Record<string, BirthdayEventWithDisplayInfo[]> } = {
      teachers: [],
      studentsByGrade: {},
    };

    birthdays.forEach(bday => {
      const currentYear = getYear(today);
      let nextBirthdayDateThisYear = new Date(currentYear, getMonth(bday.anchorDate), getDate(bday.anchorDate));
      let displayDate: Date;

      if (startOfDay(nextBirthdayDateThisYear) < today) { 
        displayDate = new Date(currentYear + 1, getMonth(bday.anchorDate), getDate(bday.anchorDate));
      } else {
        displayDate = nextBirthdayDateThisYear;
      }
      
      const ageAtUpcomingBirthday = calculateAge(bday.anchorDate, displayDate);
      const eventWithDisplayInfo: BirthdayEventWithDisplayInfo = { ...bday, displayDate, age: ageAtUpcomingBirthday };

      if (bday.type === "Teacher") {
        upcoming.teachers.push(eventWithDisplayInfo);
      } else if (bday.type === "Student") {
        const grade = bday.grade || "Ungraded";
        if (!upcoming.studentsByGrade[grade]) {
          upcoming.studentsByGrade[grade] = [];
        }
        upcoming.studentsByGrade[grade].push(eventWithDisplayInfo);
      }
    });

    upcoming.teachers.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
    Object.keys(upcoming.studentsByGrade).forEach(grade => {
      upcoming.studentsByGrade[grade].sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
    });
    
    return upcoming;
  }, [birthdays]);

  const todaysBirthdaysList = useMemo(() => {
    const today = startOfDay(new Date());
    const result: { teachers: BirthdayEventWithDisplayInfo[]; students: BirthdayEventWithDisplayInfo[] } = {
      teachers: [],
      students: [],
    };

    birthdays.forEach(bday => {
      if (getMonth(bday.anchorDate) === getMonth(today) && getDate(bday.anchorDate) === getDate(today)) {
        const displayDate = new Date(getYear(today), getMonth(bday.anchorDate), getDate(bday.anchorDate));
        const ageAtToday = calculateAge(bday.anchorDate, displayDate);
        const eventWithDisplayInfo: BirthdayEventWithDisplayInfo = { ...bday, displayDate, age: ageAtToday };

        if (bday.type === "Teacher") {
          result.teachers.push(eventWithDisplayInfo);
        } else if (bday.type === "Student") {
          result.students.push(eventWithDisplayInfo);
        }
      }
    });
    return result;
  }, [birthdays]);


  const birthdayDotColor = "bg-purple-500";
  const birthdayBorderColor = "hsl(var(--purple-500, 262 84% 57%))"; 
  const birthdayBadgeClassName = "bg-purple-500 text-white hover:bg-purple-600";
  
  const handleSaveBirthday = async (e: FormEvent) => {
    e.preventDefault();
    if (!birthdayName || !birthdayDate || !birthdayType) {
      toast({
        title: "Missing Information",
        description: "Please provide name, birth date, and type.",
        variant: "destructive",
      });
      return;
    }
    if (birthdayType === "Student" && !birthdayGrade) {
        toast({
            title: "Missing Grade",
            description: "Please provide a grade for the student.",
            variant: "destructive",
        });
        return;
    }

    const birthdayData = {
      name: birthdayName,
      anchorDate: Timestamp.fromDate(startOfDay(birthdayDate)), 
      type: birthdayType,
      grade: birthdayType === "Student" ? birthdayGrade : null, 
    };

    try {
      if (editingBirthday) {
        if (!editingBirthday.id || typeof editingBirthday.id !== 'string' || editingBirthday.id.trim() === '') {
          console.error("Error saving birthday: editingBirthday.id is invalid. Value:", editingBirthday.id);
          toast({
            title: "Update Error",
            description: "Could not update birthday due to an invalid ID. Please refresh and try again.",
            variant: "destructive",
          });
          return; 
        }
        await updateDoc(doc(db, "birthdayEvents", editingBirthday.id), birthdayData);
        toast({
          title: "Birthday Updated",
          description: `${birthdayName}'s birthday has been updated.`,
        });
      } else {
        await addDoc(collection(db, "birthdayEvents"), birthdayData);
        toast({
          title: "Birthday Added",
          description: `${birthdayName}'s birthday has been added.`,
        });
      }
      resetForm();
      setIsAddEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving birthday: ", error);
      toast({
        title: "Error",
        description: "Could not save the birthday. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isAddEditDialogOpen) {
        resetForm(); 
    }
  }, [isAddEditDialogOpen]);

  interface TimeLeft {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    isToday?: boolean;
    hasPassed?: boolean;
  }

  const calculateTimeLeft = (targetDate: Date): TimeLeft | null => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();
  
    if (difference <= 0) {
      if (isSameDay(targetDate, now)) {
        return { isToday: true };
      }
      if (targetDate < now && !isSameDay(targetDate,now)) {
         return { hasPassed: true };
      }
      return null; 
    }
  
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);
  
    return { days, hours, minutes, seconds, isToday: false };
  };

  const BirthdayCard = ({ birthday, displayDate, age, showActions = false }: { birthday: BirthdayEventWithDisplayInfo, displayDate: Date, age: number, showActions?: boolean }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft(displayDate));

    useEffect(() => {
      setTimeLeft(calculateTimeLeft(displayDate)); 
      
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft(displayDate));
      }, 1000);
  
      return () => clearInterval(timer);
    }, [displayDate]);
    
    return (
    <Card 
      className="hover:shadow-xl transition-shadow duration-200 ease-in-out border-l-4"
      style={{ borderLeftColor: birthdayBorderColor }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
           <CardTitle className="text-md leading-tight">{birthday.name}</CardTitle>
           <div className="flex items-center gap-2">
            <Badge className={cn("text-xs whitespace-nowrap shrink-0", birthdayBadgeClassName)}>
              <PartyPopper className="inline h-3 w-3 mr-1"/>
              Birthday
            </Badge>
            {showActions && (
                <>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => openEditDialog(birthday)}
                    title="Edit Birthday"
                >
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit birthday</span>
                </Button>
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteBirthday(birthday.id)}
                    title="Delete Birthday"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete birthday</span>
                  </Button>
                </>
            )}
           </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <p className="text-sm font-semibold text-muted-foreground mb-1">{format(displayDate, "EEEE, MMMM d, yyyy")}</p>
        <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Type: <span className="font-medium text-foreground">{birthday.type}</span></p>
            {birthday.type === "Student" && birthday.grade && (
                <p>Grade: <span className="font-medium text-foreground">{birthday.grade}</span></p>
            )}
            <p>Age on this date: <span className="font-medium text-foreground">{age}</span></p>
            <p className="text-xs italic">Born: {format(birthday.anchorDate, "PPP")}</p>
        </div>
        {timeLeft && (
            <div className="mt-2 pt-2 border-t border-border/50">
                {timeLeft.isToday ? (
                     <p className="text-sm font-semibold text-center py-1 text-purple-600 animate-pulse">
                        🎉 Today is their Birthday! 🎉
                     </p>
                ) : timeLeft.hasPassed ? (
                    <p className="text-xs text-muted-foreground italic">Birthday has passed this year.</p>
                ) : timeLeft.days !== undefined ? (
                    <p className="text-xs text-muted-foreground flex items-center">
                        <Timer className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Next birthday in: 
                        <span className="font-medium text-foreground ml-1">
                            {timeLeft.days > 0 && `${timeLeft.days}d `}
                            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                        </span>
                    </p>
                ) : null}
            </div>
        )}
      </CardContent>
    </Card>
  )};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
            <Cake className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Birthday Calendar</h1>
        </div>
        <div className="flex gap-2">
            <Dialog open={isConfigureGradeDialogOpen} onOpenChange={setIsConfigureGradeDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Configure Grades
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configure Student Grades</DialogTitle>
                        <DialogDescription>
                            This feature will allow batch updating student grades (e.g., at the start of a new school year).
                            Select the current grade and the new grade to update all matching students.
                            (This is a placeholder for a future batch update feature.)
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={openAddDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Birthday
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>{editingBirthday ? "Edit Birthday" : "Add New Birthday"}</DialogTitle>
                <DialogDescription>
                    {editingBirthday ? "Update the details for this birthday." : "Enter the person's name, birth date, type, and grade (if student)."}
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveBirthday} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="birthday-name" className="text-right">Name</Label>
                    <Input id="birthday-name" value={birthdayName} onChange={(e) => setBirthdayName(e.target.value)} className="col-span-3" required placeholder="Person's Name" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="birthday-date" className="text-right">Birth Date</Label>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !birthdayDate && "text-muted-foreground")}>
                        <LucideCalendarIcon className="mr-2 h-4 w-4" />
                        {birthdayDate ? format(birthdayDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={birthdayDate}
                        onSelect={(date) => date && setBirthdayDate(startOfDay(date))}
                        initialFocus
                        month={birthdayDate}
                        onMonthChange={(month) => setBirthdayDate(current => current ? new Date(month.getFullYear(), month.getMonth(), getDate(current)) : month)}
                        captionLayout="dropdown-buttons" 
                        fromYear={getYear(new Date()) - 100} 
                        toYear={getYear(new Date())}
                        defaultMonth={birthdayDate || new Date(getYear(new Date())-10, 0, 1)} 
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="birthday-type" className="text-right">Type</Label>
                    <Select value={birthdayType} onValueChange={(value) => setBirthdayType(value as BirthdayEvent["type"])}>
                        <SelectTrigger className="col-span-3" id="birthday-type">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Student">Student</SelectItem>
                            <SelectItem value="Teacher">Teacher</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {birthdayType === "Student" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="birthday-grade" className="text-right">Grade</Label>
                         <Select value={birthdayGrade} onValueChange={setBirthdayGrade}>
                            <SelectTrigger className="col-span-3" id="birthday-grade">
                                <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                                {studentGradeOptions.map(grade => (
                                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit">{editingBirthday ? "Save Changes" : "Save Birthday"}</Button>
                </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
        </div>
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
            <ScrollArea className="h-[calc(100vh-480px)] md:h-[calc(100vh-450px)] pr-2">
              {birthdaysForSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {birthdaysForSelectedDate.map((event) => (
                    <li key={event.id}>
                       <BirthdayCard 
                          birthday={event} 
                          displayDate={event.displayDate} 
                          age={event.age} 
                          showActions={true} 
                        />
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
            <PartyPopper className="h-6 w-6 text-primary" />
            Today's Birthdays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px] pr-2">
            {(todaysBirthdaysList.teachers.length > 0 || todaysBirthdaysList.students.length > 0) ? (
              <>
                {todaysBirthdaysList.teachers.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-3 pb-1 border-b flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary/80"/>Teachers
                    </h4>
                    <ul className="space-y-4">
                      {todaysBirthdaysList.teachers.map((event) => (
                        <li key={`${event.id}-today-teacher`}>
                          <BirthdayCard birthday={event} displayDate={event.displayDate} age={event.age} showActions={true} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {todaysBirthdaysList.students.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3 pb-1 border-b flex items-center gap-2">
                      <User className="h-5 w-5 text-primary/80"/>Students
                    </h4>
                    <ul className="space-y-4">
                      {todaysBirthdaysList.students.map((event) => (
                        <li key={`${event.id}-today-student`}>
                          <BirthdayCard birthday={event} displayDate={event.displayDate} age={event.age} showActions={true} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
                <Cake className="h-12 w-12 text-primary/70 mb-3"/>
                <p className="text-muted-foreground font-medium text-lg">No Birthdays Today</p>
                <p className="text-sm text-muted-foreground mt-1">Check back tomorrow or add some birthdays!</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListOrdered className="h-6 w-6 text-primary" />
            All Upcoming Birthdays
          </CardTitle>
          <CardDescription>
            A categorized list of all upcoming birthdays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px] pr-2">
            {categorizedUpcomingBirthdays.teachers.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 pb-1 border-b flex items-center gap-2"><Users className="h-5 w-5 text-primary/80"/>Teachers</h4>
                <ul className="space-y-4">
                  {categorizedUpcomingBirthdays.teachers.map((event) => (
                    <li key={`${event.id}-teacher-${getYear(event.displayDate)}`}>
                       <BirthdayCard 
                          birthday={event} 
                          displayDate={event.displayDate} 
                          age={event.age} 
                          showActions={true} 
                        />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(categorizedUpcomingBirthdays.studentsByGrade).length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3 pb-1 border-b flex items-center gap-2"><User className="h-5 w-5 text-primary/80"/>Students</h4>
                {studentGradeOptions.map(gradeKey => {
                    const studentsInGrade = categorizedUpcomingBirthdays.studentsByGrade[gradeKey];
                    if(studentsInGrade && studentsInGrade.length > 0) {
                        return (
                            <div key={`grade-section-${gradeKey}`} className="mb-4">
                                <h5 className="text-md font-medium text-muted-foreground mb-2 ml-2">Grade: {gradeKey}</h5>
                                <ul className="space-y-4">
                                {studentsInGrade.map((event) => (
                                    <li key={`${event.id}-student-${gradeKey}-${getYear(event.displayDate)}`}>
                                    <BirthdayCard 
                                      birthday={event} 
                                      displayDate={event.displayDate} 
                                      age={event.age} 
                                      showActions={true} 
                                    />
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )
                    }
                    return null;
                })}
                {categorizedUpcomingBirthdays.studentsByGrade["Ungraded"] && categorizedUpcomingBirthdays.studentsByGrade["Ungraded"].length > 0 && (
                     <div key="grade-section-ungraded" className="mb-4">
                        <h5 className="text-md font-medium text-muted-foreground mb-2 ml-2">Grade: Ungraded/Other</h5>
                        <ul className="space-y-4">
                        {categorizedUpcomingBirthdays.studentsByGrade["Ungraded"].map((event) => (
                            <li key={`${event.id}-student-ungraded-${getYear(event.displayDate)}`}>
                            <BirthdayCard 
                              birthday={event} 
                              displayDate={event.displayDate} 
                              age={event.age} 
                              showActions={true} 
                            />
                            </li>
                        ))}
                        </ul>
                    </div>
                )}
              </div>
            )}
            
            {categorizedUpcomingBirthdays.teachers.length === 0 && Object.keys(categorizedUpcomingBirthdays.studentsByGrade).length === 0 && (
               <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md border-dashed h-full bg-muted/50 min-h-[150px]">
                <Cake className="h-12 w-12 text-primary/70 mb-3"/>
                <p className="text-muted-foreground font-medium text-lg">No Upcoming Birthdays</p>
                <p className="text-sm text-muted-foreground mt-1">Add some birthdays to see them here!</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
