
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc } from "firebase/firestore";
import { format, startOfDay } from "date-fns";
import { ShieldAlert, PlusCircle, Edit3, Trash2, CalendarIcon, Eye, UploadCloud } from "lucide-react";
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

const violationTypeOptions = ["Minor", "Moderate", "Severe"] as const;
const violationCategoryOptions = [
  "Bullying", "Cheating", "Disrespect", "Vandalism", "Skipping Class", 
  "Dress Code", "Tardiness", "Unauthorized Device Use", "Fighting", "Theft", "Other"
] as const;

interface ViolationEntry {
  id: string;
  studentName: string;
  date: Timestamp;
  violationType: typeof violationTypeOptions[number];
  category: typeof violationCategoryOptions[number] | "Other";
  description: string;
  actionTaken: string;
  reportedBy: string;
  reportedById: string;
  photoProofBase64?: string; // Stores base64 encoded image
  createdAt: Timestamp;
}

export default function ViolationsPage() {
  const [violations, setViolations] = useState<ViolationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, username } = useAuth();

  const [isAddViolationDialogOpen, setIsAddViolationDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isInfoAlertDialogOpen, setIsInfoAlertDialogOpen] = useState(false);
  
  const [currentViolation, setCurrentViolation] = useState<ViolationEntry | null>(null);

  // Form state
  const [studentName, setStudentName] = useState("");
  const [violationDate, setViolationDate] = useState<Date | undefined>(new Date());
  const [selectedViolationType, setSelectedViolationType] = useState<typeof violationTypeOptions[number]>("Minor");
  const [selectedCategory, setSelectedCategory] = useState<typeof violationCategoryOptions[number] | "Other">("Other");
  const [violationDescription, setViolationDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [photoProofPreview, setPhotoProofPreview] = useState<string | null>(null);
  const [photoProofFile, setPhotoProofFile] = useState<File | null>(null);


  useEffect(() => {
    setIsLoading(true);
    const violationsCollectionRef = collection(db, "studentViolations");
    const q = query(violationsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedViolations = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as ViolationEntry;
      });
      setViolations(fetchedViolations);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching violations: ", error);
      toast({ title: "Error", description: "Could not fetch violations.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setStudentName("");
    setViolationDate(new Date());
    setSelectedViolationType("Minor");
    setSelectedCategory("Other");
    setViolationDescription("");
    setActionTaken("");
    setPhotoProofPreview(null);
    setPhotoProofFile(null);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoProofFile(null);
      setPhotoProofPreview(null);
    }
  };

  const handleSaveViolation = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentName || !violationDate || !selectedViolationType || !selectedCategory || !violationDescription || !actionTaken || !user || !username) {
      toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    let photoBase64: string | undefined = undefined;
    if (photoProofFile && photoProofPreview) {
      photoBase64 = photoProofPreview; // Already in base64 from FileReader
    }

    const newViolationData = {
      studentName,
      date: Timestamp.fromDate(startOfDay(violationDate)),
      violationType: selectedViolationType,
      category: selectedCategory,
      description: violationDescription,
      actionTaken,
      reportedBy: username,
      reportedById: user.uid,
      createdAt: Timestamp.now(),
      ...(photoBase64 && { photoProofBase64: photoBase64 }),
    };

    try {
      await addDoc(collection(db, "studentViolations"), newViolationData);
      toast({ title: "Violation Recorded", description: `Violation for ${studentName} has been successfully recorded.` });
      setIsAddViolationDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving violation: ", error);
      toast({ title: "Save Error", description: "Could not save the violation record.", variant: "destructive" });
    }
  };
  
  const openDetailsDialog = (violation: ViolationEntry) => {
    setCurrentViolation(violation);
    setIsDetailsDialogOpen(true);
  };

  const getViolationTypeBadgeVariant = (type: ViolationEntry["violationType"]) => {
    switch (type) {
      case "Minor": return "bg-yellow-500 text-black hover:bg-yellow-600"; // Changed for better visibility
      case "Moderate": return "bg-orange-500 text-white hover:bg-orange-600"; // Changed for better visibility
      case "Severe": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      default: return "bg-muted text-muted-foreground hover:bg-muted/80";
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Loading violation records...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-accent rounded-full h-8 w-8 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Student Violations</h1>
        </div>
        <Dialog open={isAddViolationDialogOpen} onOpenChange={(isOpen) => {
          setIsAddViolationDialogOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="outline"> <PlusCircle className="mr-2 h-4 w-4" /> Add Violation Record </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record New Violation</DialogTitle>
              <DialogDescription>Enter the details of the student violation.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveViolation}>
              <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-4 py-4 pr-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="studentName" className="text-right">Student Name</Label>
                    <Input id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="violationDate" className="text-right">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !violationDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {violationDate ? format(violationDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={violationDate} onSelect={setViolationDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="violationType" className="text-right">Type</Label>
                    <Select value={selectedViolationType} onValueChange={(val) => setSelectedViolationType(val as typeof violationTypeOptions[number])}>
                      <SelectTrigger className="col-span-3" id="violationType"><SelectValue /></SelectTrigger>
                      <SelectContent>{violationTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Category</Label>
                    <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as typeof violationCategoryOptions[number] | "Other")}>
                      <SelectTrigger className="col-span-3" id="category"><SelectValue /></SelectTrigger>
                      <SelectContent>{violationCategoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="violationDescription" className="text-right pt-2">Description</Label>
                    <Textarea id="violationDescription" value={violationDescription} onChange={(e) => setViolationDescription(e.target.value)} className="col-span-3" rows={3} required />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="actionTaken" className="text-right pt-2">Action Taken</Label>
                    <Textarea id="actionTaken" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} className="col-span-3" rows={3} required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="photoProof" className="text-right">Photo Proof</Label>
                    <div className="col-span-3">
                      <Input id="photoProof" type="file" accept="image/*" onChange={handlePhotoUpload} className="mb-2" />
                      {photoProofPreview && (
                        <div className="mt-2 border rounded-md p-2 flex justify-center">
                          <Image src={photoProofPreview} alt="Proof preview" width={200} height={200} className="max-h-48 w-auto object-contain rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="mt-4 pt-4 border-t">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Violation</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead>Category</TableHead>
                <TableHead className="w-[20%] hidden md:table-cell">Description (Summary)</TableHead>
                <TableHead className="hidden lg:table-cell">Reported By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((violation) => (
                <TableRow key={violation.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{violation.studentName}</TableCell>
                  <TableCell>{format(violation.date.toDate(), "PP")}</TableCell>
                  <TableCell> <Badge className={cn(getViolationTypeBadgeVariant(violation.violationType))}> {violation.violationType} </Badge> </TableCell>
                  <TableCell>{violation.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate hidden md:table-cell max-w-xs">{violation.description}</TableCell>
                  <TableCell className="hidden lg:table-cell">{violation.reportedBy}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 hover:bg-blue-600/10" title="View Details" onClick={() => openDetailsDialog(violation)}> <Eye className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Record (Contact Developer)" onClick={() => setIsInfoAlertDialogOpen(true)}> <Edit3 className="h-4 w-4" /> </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Delete Record (Contact Developer)" onClick={() => setIsInfoAlertDialogOpen(true)}> <Trash2 className="h-4 w-4" /> </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {violations.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground"> <ShieldAlert className="mx-auto h-12 w-12 mb-3" /> <p>No violation records found.</p> </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Violation Details: {currentViolation?.studentName}</DialogTitle>
            {currentViolation && <DialogDescription>Recorded on {format(currentViolation.date.toDate(), "PPP")}</DialogDescription>}
          </DialogHeader>
          {currentViolation && (
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-3 py-2">
                <p><strong className="text-foreground">Type:</strong> <Badge className={cn(getViolationTypeBadgeVariant(currentViolation.violationType))}>{currentViolation.violationType}</Badge></p>
                <p><strong className="text-foreground">Category:</strong> {currentViolation.category}</p>
                <p><strong className="text-foreground">Description:</strong></p>
                <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{currentViolation.description}</p>
                <p><strong className="text-foreground">Action Taken:</strong></p>
                <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{currentViolation.actionTaken}</p>
                <p><strong className="text-foreground">Reported By:</strong> {currentViolation.reportedBy}</p>
                {currentViolation.photoProofBase64 && (
                  <div>
                    <strong className="text-foreground">Photo Proof:</strong>
                    <div className="mt-2 border rounded-md p-2 flex justify-center bg-muted/30">
                      <Image src={currentViolation.photoProofBase64} alt="Violation proof" width={300} height={300} className="max-h-72 w-auto object-contain rounded" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="mt-2">
            <DialogClose asChild><Button type="button">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isInfoAlertDialogOpen} onOpenChange={setIsInfoAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Action Restricted</AlertDialogTitle>
            <AlertDialogDescription>
              To edit or delete violation records, please contact a developer. These records are designed for long-term archival and audit purposes and cannot be modified or erased through this interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsInfoAlertDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

