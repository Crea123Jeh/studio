
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, PlusCircle, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViolationEntry {
  id: string;
  studentName: string;
  date: string;
  violationType: "Minor" | "Moderate" | "Severe";
  description: string;
  actionTaken: string;
  reportedBy: string;
}

const initialViolations: ViolationEntry[] = [
  { id: "v001", studentName: "Mike Wheeler", date: "2024-10-25", violationType: "Minor", description: "Talking during class after multiple warnings.", actionTaken: "Verbal warning, parents notified.", reportedBy: "Ms. O'Donnell" },
  { id: "v002", studentName: "Eleven Hopper", date: "2024-10-22", violationType: "Moderate", description: "Used unauthorized telekinetic abilities to disrupt cafeteria.", actionTaken: "Detention, referral to guidance counselor.", reportedBy: "Mr. Coleman" },
  { id: "v003", studentName: "Dustin Henderson", date: "2024-10-20", violationType: "Minor", description: "Brought a non-regulation pet (Demodog) to school.", actionTaken: "Confiscation of pet, warning.", reportedBy: "Principal Thompson" },
  { id: "v004", studentName: "Lucas Sinclair", date: "2024-10-18", violationType: "Severe", description: "Instigated a food fight in the west wing.", actionTaken: "3-day suspension.", reportedBy: "Security Cam Footage" },
  { id: "v005", studentName: "Max Mayfield", date: "2024-10-15", violationType: "Moderate", description: "Skipping last period (Math).", actionTaken: "After-school detention.", reportedBy: "Mr. Clarke" },
  { id: "v006", studentName: "Will Byers", date: "2024-11-01", violationType: "Minor", description: "Daydreaming excessively and not participating in art class.", actionTaken: "Encouraged to participate, seat moved.", reportedBy: "Ms. Valerie Frizzle" },
];

export default function ViolationsPage() {
  const [violations, setViolations] = useState<ViolationEntry[]>(initialViolations);

  const getViolationTypeBadgeVariant = (type: ViolationEntry["violationType"]) => {
    switch (type) {
      case "Minor":
        return "bg-muted text-muted-foreground hover:bg-muted/80";
      case "Moderate":
        return "bg-primary/80 text-primary-foreground hover:bg-primary/70";
      case "Severe":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-accent rounded-full h-8 w-8 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Student Violations</h1>
        </div>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Violation Record
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Disciplinary Records</CardTitle>
          <CardDescription>A log of student violations and actions taken.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[30%]">Description</TableHead>
                <TableHead>Action Taken</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((violation) => (
                <TableRow key={violation.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{violation.studentName}</TableCell>
                  <TableCell>{violation.date}</TableCell>
                  <TableCell>
                    <Badge className={cn(getViolationTypeBadgeVariant(violation.violationType))}>
                      {violation.violationType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{violation.description}</TableCell>
                  <TableCell>{violation.actionTaken}</TableCell>
                  <TableCell>{violation.reportedBy}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Record">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Delete Record">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {violations.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldAlert className="mx-auto h-12 w-12 mb-3" />
              <p>No violation records found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
