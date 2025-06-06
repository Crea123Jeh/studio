"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, addDays } from "date-fns";
import { CalendarDays, Info } from "lucide-react";

interface CalendarEvent {
  date: Date;
  title: string;
  description: string;
  type: "Deadline" | "Meeting" | "Milestone" | "Reminder";
}

const events: CalendarEvent[] = [
  { date: new Date(2024, 9, 25), title: "Project Alpha Review", description: "Stakeholder review meeting for Project Alpha.", type: "Meeting" },
  { date: new Date(2024, 9, 28), title: "Client Meeting - Zeta Corp", description: "Discuss Q4 deliverables with Zeta Corp.", type: "Meeting" },
  { date: new Date(2024, 10, 2), title: "Sprint Planning - Project Beta", description: "Plan for upcoming sprint for Project Beta.", type: "Milestone" },
  { date: new Date(2024, 10, 10), title: "Design Phase Deadline", description: "Finalize all design assets for Project Gamma.", type: "Deadline" },
  { date: new Date(2024, 10, 15), title: "Team Building Event", description: "Company-wide team building activities.", type: "Reminder" },
  { date: addDays(new Date(), 3), title: "Submit Q3 Report", description: "Final submission of Q3 performance report.", type: "Deadline" },
  { date: addDays(new Date(), 7), title: "Product Demo", description: "Internal demo of new product features.", type: "Meeting" },
];


export default function CalendarEventsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const eventsForSelectedDate = selectedDate ? events.filter(event => isSameDay(event.date, selectedDate)) : [];
  
  const eventTypeColors: Record<CalendarEvent["type"], string> = {
    Deadline: "bg-red-500",
    Meeting: "bg-blue-500",
    Milestone: "bg-green-500",
    Reminder: "bg-yellow-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Project Calendar</h1>
      </div>
      <Card className="shadow-lg">
        <CardDescription className="p-6">
          View important project deadlines, meetings, and milestones. Click on a date to see events.
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
              modifiers={{
                event: events.map(event => event.date)
              }}
              modifiersStyles={{
                event: {
                  color: 'hsl(var(--accent-foreground))',
                  backgroundColor: 'hsl(var(--accent))',
                }
              }}
              components={{
                DayContent: ({ date, displayMonth }) => {
                  const dayEvents = events.filter(event => isSameDay(event.date, date));
                  if (!isSameDay(date, displayMonth.setDate(date.getDate()))) { // Ensure day is in current month view
                     // return <div className="p-1.5">{format(date, "d")}</div>;
                  }
                  return (
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-1.5">
                      {format(date, "d")}
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                          {dayEvents.slice(0,3).map(event => (
                            <span key={`${event.title}-${date.toISOString()}`} className={`h-1.5 w-1.5 rounded-full ${eventTypeColors[event.type]}`} />
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
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {eventsForSelectedDate.map((event, index) => (
                  <li key={index} className="p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-md">{event.title}</h4>
                      <Badge variant="default" style={{ backgroundColor: `hsl(var(--${event.type === "Deadline" ? "destructive" : event.type === "Meeting" ? "primary" : event.type === "Milestone" ? "accent": "secondary"}))` }} className={`text-xs ${event.type === "Deadline" ? "text-destructive-foreground" : event.type === "Meeting" ? "text-primary-foreground" : event.type === "Milestone" ? "text-accent-foreground" : "text-secondary-foreground"}`}>
                        {event.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(event.date, "p")}</p>
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
