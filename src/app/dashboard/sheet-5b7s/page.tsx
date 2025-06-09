
"use client";

import { useState, useEffect, type FormEvent, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { FileSpreadsheet, PlusCircle, Edit3, Trash2, User, Users, Link as LinkIcon, Search, ListFilter, Loader2, Eye, EyeOff } from "lucide-react";

// --- Data Interfaces ---
interface BaseEntry {
  id: string;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

interface TeacherEntry extends BaseEntry {
  name: string;
  subject?: string; 
  email?: string;
  password?: string; 
}

interface StudentEntry extends BaseEntry {
  name: string;
  grade?: string;
  email?: string; 
  password?: string; 
}

interface DriveLinkEntry extends BaseEntry {
  title: string;
  url: string;
  email?: string; // Changed from description
  category?: string;
}

type TeacherSortOption = "newest" | "oldest" | "alphabetical";
const teacherSortOptionsList: { value: TeacherSortOption; label: string }[] = [
  { value: "newest", label: "Newest Added" },
  { value: "oldest", label: "Oldest Added" },
  { value: "alphabetical", label: "Name (A-Z)" },
];

type StudentSortOption =
  | "createdAt_desc"
  | "createdAt_asc"
  | "name_asc"
  | "name_desc"
  | "email_asc"
  | "email_desc"
  | "grade_asc"
  | "grade_desc"
  | "lastUpdated_desc"
  | "lastUpdated_asc";

const studentSortOptionsList: { value: StudentSortOption; label: string }[] = [
  { value: "createdAt_desc", label: "Newest Added" },
  { value: "createdAt_asc", label: "Oldest Added" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "email_asc", label: "Email (A-Z)" },
  { value: "email_desc", label: "Email (Z-A)" },
  { value: "grade_asc", label: "Grade (A-Z)" },
  { value: "grade_desc", label: "Grade (Z-A)" },
  { value: "lastUpdated_desc", label: "Last Updated (Newest)" },
  { value: "lastUpdated_asc", label: "Last Updated (Oldest)" },
];

type DriveLinkSortOption = "newest" | "oldest" | "alphabetical";
const driveLinkSortOptionsList: { value: DriveLinkSortOption; label: string }[] = [
  { value: "newest", label: "Newest Added" },
  { value: "oldest", label: "Oldest Added" },
  { value: "alphabetical", label: "Title (A-Z)" },
];

const driveLinkCategories = ["Kurikulum", "Students Stuff", "Teacher Stuff", "School Events", "CM", "Other"];

export default function Sheet5B7SPage() {
  const { toast } = useToast();

  // --- Teachers State ---
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherEntry | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherEntry | null>(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [teacherSortOrder, setTeacherSortOrder] = useState<TeacherSortOption>("newest");
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [showTeacherFormPassword, setShowTeacherFormPassword] = useState(false);
  const [visibleTeacherPasswordId, setVisibleTeacherPasswordId] = useState<string | null>(null);

  // --- Students State ---
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentEntry | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentEntry | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSortOrder, setStudentSortOrder] = useState<StudentSortOption>("createdAt_desc");
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [showStudentFormPassword, setShowStudentFormPassword] = useState(false);
  const [visibleStudentPasswordId, setVisibleStudentPasswordId] = useState<string | null>(null);


  // --- Drive Links State ---
  const [driveLinks, setDriveLinks] = useState<DriveLinkEntry[]>([]);
  const [isLoadingDriveLinks, setIsLoadingDriveLinks] = useState(true);
  const [isDriveLinkDialogOpen, setIsDriveLinkDialogOpen] = useState(false);
  const [editingDriveLink, setEditingDriveLink] = useState<DriveLinkEntry | null>(null);
  const [driveLinkToDelete, setDriveLinkToDelete] = useState<DriveLinkEntry | null>(null);
  const [driveLinkSearchTerm, setDriveLinkSearchTerm] = useState("");
  const [driveLinkSortOrder, setDriveLinkSortOrder] = useState<DriveLinkSortOption>("newest");
  const [driveLinkTitle, setDriveLinkTitle] = useState("");
  const [driveLinkUrl, setDriveLinkUrl] = useState("");
  const [driveLinkEmail, setDriveLinkEmail] = useState(""); // Changed from driveLinkDescription
  const [driveLinkCategory, setDriveLinkCategory] = useState(driveLinkCategories[0]);

  // --- Firestore Effects ---
  useEffect(() => {
    setIsLoadingTeachers(true);
    const q = query(collection(db, "sheet5B7STeachers"), orderBy("lastUpdatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeachers(snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as TeacherEntry)));
      setIsLoadingTeachers(false);
    }, (err) => { toast({ title: "Error", description: "Could not fetch teachers.", variant: "destructive" }); setIsLoadingTeachers(false); });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setIsLoadingStudents(true);
    const q = query(collection(db, "sheet5B7SStudents"), orderBy("lastUpdatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as StudentEntry)));
      setIsLoadingStudents(false);
    }, (err) => { toast({ title: "Error", description: "Could not fetch students.", variant: "destructive" }); setIsLoadingStudents(false); });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setIsLoadingDriveLinks(true);
    const q = query(collection(db, "sheet5B7SDriveLinks"), orderBy("lastUpdatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDriveLinks(snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as DriveLinkEntry)));
      setIsLoadingDriveLinks(false);
    }, (err) => { toast({ title: "Error", description: "Could not fetch drive links.", variant: "destructive" }); setIsLoadingDriveLinks(false); });
    return () => unsubscribe();
  }, [toast]);


  // --- Form Reset Callbacks ---
  const resetTeacherForm = useCallback(() => {
    setTeacherName(""); setTeacherSubject(""); setTeacherEmail(""); setTeacherPassword(""); setEditingTeacher(null); setShowTeacherFormPassword(false);
  }, []);
  const resetStudentForm = useCallback(() => {
    setStudentName(""); setStudentGrade(""); setStudentEmail(""); setStudentPassword(""); setEditingStudent(null); setShowStudentFormPassword(false);
  }, []);
  const resetDriveLinkForm = useCallback(() => {
    setDriveLinkTitle(""); setDriveLinkUrl(""); setDriveLinkEmail(""); setDriveLinkCategory(driveLinkCategories[0]); setEditingDriveLink(null);
  }, []);

  // --- Add/Edit Dialog Openers ---
  const openTeacherDialog = (teacher: TeacherEntry | null = null) => {
    if (teacher && typeof teacher.id === 'string' && teacher.id.length > 0) {
      setEditingTeacher(teacher);
      setTeacherName(teacher.name || "");
      setTeacherSubject(teacher.subject || "");
      setTeacherEmail(teacher.email || "");
      setTeacherPassword(teacher.password || "");
      setShowTeacherFormPassword(false);
    } else {
      resetTeacherForm();
    }
    setIsTeacherDialogOpen(true);
  };

  const openStudentDialog = (student: StudentEntry | null = null) => {
    if (student && typeof student.id === 'string' && student.id.length > 0) {
      setEditingStudent(student);
      setStudentName(student.name || "");
      setStudentGrade(student.grade || "");
      setStudentEmail(student.email || "");
      setStudentPassword(student.password || "");
      setShowStudentFormPassword(false);
    } else {
      resetStudentForm();
    }
    setIsStudentDialogOpen(true);
  };

  const openDriveLinkDialog = (link: DriveLinkEntry | null = null) => {
     if (link && typeof link.id === 'string' && link.id.length > 0) {
      setEditingDriveLink(link);
      setDriveLinkTitle(link.title || "");
      setDriveLinkUrl(link.url || "");
      setDriveLinkEmail(link.email || ""); // Changed from description
      setDriveLinkCategory(link.category || driveLinkCategories[0]);
    } else {
      resetDriveLinkForm();
    }
    setIsDriveLinkDialogOpen(true);
  };

  // --- Save Handlers ---
  const handleSaveTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherName) { toast({ title: "Missing Name", description: "Teacher name is required.", variant: "destructive" }); return; }
    const now = Timestamp.now();
    
    const dataToUpdate: Omit<TeacherEntry, 'id' | 'createdAt'> = {
        name: teacherName,
        subject: teacherSubject || "",
        email: teacherEmail || "",
        password: teacherPassword || "",
        lastUpdatedAt: now,
    };

    try {
      if (editingTeacher && typeof editingTeacher.id === 'string' && editingTeacher.id.length > 0) {
        await updateDoc(doc(db, "sheet5B7STeachers", editingTeacher.id), dataToUpdate);
        toast({ title: "Teacher Updated" });
      } else { 
        const newTeacherData: Omit<TeacherEntry, 'id'> = {
            ...dataToUpdate,
            createdAt: now,
        };
        await addDoc(collection(db, "sheet5B7STeachers"), newTeacherData);
        toast({ title: "Teacher Added" });
      }
      setIsTeacherDialogOpen(false); 
      resetTeacherForm();
    } catch (err) { 
        console.error("Error saving teacher:", err);
        toast({ title: "Save Error", description: `Could not save teacher. ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" }); 
    }
  };

  const handleSaveStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentName) { toast({ title: "Missing Name", description: "Student name is required.", variant: "destructive" }); return; }
    const now = Timestamp.now();
    const studentDataToUpdate: Omit<StudentEntry, 'id' | 'createdAt'> = { 
        name: studentName, 
        grade: studentGrade || "", 
        email: studentEmail || "",
        password: studentPassword || "",
        lastUpdatedAt: now 
    };
    try {
      if (editingStudent && typeof editingStudent.id === 'string' && editingStudent.id.length > 0) {
        await updateDoc(doc(db, "sheet5B7SStudents", editingStudent.id), studentDataToUpdate);
        toast({ title: "Student Updated" });
      } else {
        const newStudentData: Omit<StudentEntry, 'id'> = {
            ...studentDataToUpdate,
            createdAt: now,
        };
        await addDoc(collection(db, "sheet5B7SStudents"), newStudentData);
        toast({ title: "Student Added" });
      }
      setIsStudentDialogOpen(false); resetStudentForm();
    } catch (err) { 
        console.error("Error saving student:", err);
        toast({ title: "Save Error", description: `Could not save student. ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" }); 
    }
  };

  const handleSaveDriveLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!driveLinkTitle || !driveLinkUrl) { toast({ title: "Missing Fields", description: "Title and URL are required.", variant: "destructive" }); return; }
    try { new URL(driveLinkUrl); } catch (_) { toast({ title: "Invalid URL", variant: "destructive" }); return; }
    const now = Timestamp.now();
    const driveLinkDataToUpdate: Omit<DriveLinkEntry, 'id' | 'createdAt'> = { 
        title: driveLinkTitle, 
        url: driveLinkUrl, 
        email: driveLinkEmail || "", // Changed from description
        category: driveLinkCategory || driveLinkCategories[0], 
        lastUpdatedAt: now 
    };
    try {
      if (editingDriveLink && typeof editingDriveLink.id === 'string' && editingDriveLink.id.length > 0) {
        await updateDoc(doc(db, "sheet5B7SDriveLinks", editingDriveLink.id), driveLinkDataToUpdate);
        toast({ title: "Drive Link Updated" });
      }
      else {
        const newDriveLinkData: Omit<DriveLinkEntry, 'id'> = {
            ...driveLinkDataToUpdate,
            createdAt: now,
        };
        await addDoc(collection(db, "sheet5B7SDriveLinks"), newDriveLinkData);
        toast({ title: "Drive Link Added" });
      }
      setIsDriveLinkDialogOpen(false); resetDriveLinkForm();
    } catch (err) { 
        console.error("Error saving drive link:", err);
        toast({ title: "Save Error", description: `Could not save drive link. ${err instanceof Error ? err.message : 'Unknown error'}`, variant: "destructive" }); 
    }
  };

  // --- Delete Handlers ---
  const handleDelete = async (collectionName: string, id: string, name: string, resetDeleteState: () => void) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast({ title: `${name} Deleted` });
    } catch (err) {
      toast({ title: "Deletion Error", description: `Could not delete ${name}.`, variant: "destructive" });
    } finally {
      resetDeleteState();
    }
  };

  // --- Filtered and Sorted Data ---
  const getProcessedTeachers = useMemo(() => {
    let processed = [...teachers];
    if (teacherSearchTerm) {
      const lowerSearch = teacherSearchTerm.toLowerCase();
      processed = processed.filter(item => 
        (item.name || "").toLowerCase().includes(lowerSearch) ||
        (item.subject || "").toLowerCase().includes(lowerSearch) ||
        (item.email || "").toLowerCase().includes(lowerSearch)
      );
    }
    processed.sort((a, b) => {
      if (teacherSortOrder === "alphabetical") return (a.name || "").localeCompare(b.name || "");
      const timeA = a.createdAt.toMillis(); 
      const timeB = b.createdAt.toMillis();
      return teacherSortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return processed;
  }, [teachers, teacherSearchTerm, teacherSortOrder]);

  const getProcessedStudents = useMemo(() => {
    let processed = [...students];
    if (studentSearchTerm) {
        const lowerSearch = studentSearchTerm.toLowerCase();
        processed = processed.filter(item =>
            (item.name || "").toLowerCase().includes(lowerSearch) ||
            (item.grade || "").toLowerCase().includes(lowerSearch) ||
            (item.email || "").toLowerCase().includes(lowerSearch)
        );
    }
    processed.sort((a, b) => {
        switch (studentSortOrder) {
            case "name_asc": return (a.name || "").localeCompare(b.name || "");
            case "name_desc": return (b.name || "").localeCompare(a.name || "");
            case "email_asc": return (a.email || "").localeCompare(b.email || "");
            case "email_desc": return (b.email || "").localeCompare(a.email || "");
            case "grade_asc": return (a.grade || "").localeCompare(b.grade || "");
            case "grade_desc": return (b.grade || "").localeCompare(a.grade || "");
            case "lastUpdated_desc": return b.lastUpdatedAt.toMillis() - a.lastUpdatedAt.toMillis();
            case "lastUpdated_asc": return a.lastUpdatedAt.toMillis() - b.lastUpdatedAt.toMillis();
            case "createdAt_asc": return a.createdAt.toMillis() - b.createdAt.toMillis();
            case "createdAt_desc":
            default:
                return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
    });
    return processed;
  }, [students, studentSearchTerm, studentSortOrder]);

  const getProcessedDriveLinks = useMemo(() => {
    let processed = [...driveLinks];
    if (driveLinkSearchTerm) {
      const lowerSearch = driveLinkSearchTerm.toLowerCase();
      processed = processed.filter(item => 
        (item.title || "").toLowerCase().includes(lowerSearch) ||
        (item.email || "").toLowerCase().includes(lowerSearch) || // Changed from description
        (item.category || "").toLowerCase().includes(lowerSearch)
      );
    }
    processed.sort((a, b) => {
      if (driveLinkSortOrder === "alphabetical") return (a.title || "").localeCompare(b.title || "");
      const timeA = a.createdAt.toMillis();
      const timeB = b.createdAt.toMillis();
      return driveLinkSortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return processed;
  }, [driveLinks, driveLinkSearchTerm, driveLinkSortOrder]);


  const renderLoading = (text: string) => (
    <div className="flex justify-center items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">{text}</p></div>
  );

  const renderEmptyState = (text: string) => (
    <div className="text-center text-muted-foreground py-10">{text}</div>
  );

  const renderSortAndSearch = (
    itemType: string,
    searchTerm: string,
    setSearchTerm: (term: string) => void,
    currentSortOrder: string,
    setSortOrder: (order: string) => void,
    sortOptions: { value: string; label: string }[],
    onAdd: () => void
  ) => (
    <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
      <div className="relative w-full md:flex-grow">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={`Search ${itemType.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 w-full"
        />
      </div>
      <Select value={currentSortOrder} onValueChange={(value) => setSortOrder(value)}>
        <SelectTrigger className="w-full md:w-[220px]">
          <ListFilter className="h-4 w-4 mr-2"/>
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onAdd} className="w-full md:w-auto">
        <PlusCircle className="mr-2 h-4 w-4" /> Add New {itemType}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Sheet 5B7S Organizer</h1>
      </div>
      <CardDescription>Manage teachers, students, and drive links efficiently.</CardDescription>

      <Tabs defaultValue="teachers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teachers"><Users className="mr-2 h-4 w-4"/>Teachers</TabsTrigger>
          <TabsTrigger value="students"><User className="mr-2 h-4 w-4"/>Students</TabsTrigger>
          <TabsTrigger value="driveLinks"><LinkIcon className="mr-2 h-4 w-4"/>Drive Links</TabsTrigger>
        </TabsList>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="mt-4">
          <Card>
            <CardHeader>{renderSortAndSearch("Teacher", teacherSearchTerm, setTeacherSearchTerm, teacherSortOrder, setTeacherSortOrder as (order: string) => void, teacherSortOptionsList, openTeacherDialog)}</CardHeader>
            <CardContent>
              {isLoadingTeachers ? renderLoading("Loading teachers...") : getProcessedTeachers.length === 0 ? renderEmptyState(teacherSearchTerm ? "No teachers match your search." : "No teachers added yet.") : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Teaching (Subject)</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {getProcessedTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name ?? "N/A"}</TableCell>
                        <TableCell>{teacher.subject || "N/A"}</TableCell>
                        <TableCell>{teacher.email || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between min-w-[100px]">
                            <span>
                              {visibleTeacherPasswordId === teacher.id
                                ? (teacher.password || "") 
                                : (teacher.password && teacher.password.length > 0 ? '••••••••' : "N/A")}
                            </span>
                            {teacher.password && teacher.password.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-2"
                                onClick={() =>
                                  setVisibleTeacherPasswordId(
                                    visibleTeacherPasswordId === teacher.id ? null : teacher.id
                                  )
                                }
                              >
                                {visibleTeacherPasswordId === teacher.id ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                <span className="sr-only">
                                  {visibleTeacherPasswordId === teacher.id
                                    ? "Hide password"
                                    : "Show password"}
                                </span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{teacher.createdAt ? format(teacher.createdAt.toDate(), "PP") : "N/A"}</TableCell>
                        <TableCell>{teacher.lastUpdatedAt ? formatDistanceToNow(teacher.lastUpdatedAt.toDate(), { addSuffix: true }) : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openTeacherDialog(teacher)}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setTeacherToDelete(teacher)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader>{renderSortAndSearch("Student", studentSearchTerm, setStudentSearchTerm, studentSortOrder, setStudentSortOrder as (order: string) => void, studentSortOptionsList, openStudentDialog)}</CardHeader>
            <CardContent>
              {isLoadingStudents ? renderLoading("Loading students...") : getProcessedStudents.length === 0 ? renderEmptyState(studentSearchTerm ? "No students match your search." : "No students added yet.") : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {getProcessedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name ?? "N/A"}</TableCell>
                        <TableCell>{student.grade || "N/A"}</TableCell>
                        <TableCell>{student.email || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between min-w-[100px]">
                            <span>
                              {visibleStudentPasswordId === student.id
                                ? (student.password || "") 
                                : (student.password && student.password.length > 0 ? '••••••••' : "N/A")}
                            </span>
                            {student.password && student.password.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-2"
                                onClick={() =>
                                  setVisibleStudentPasswordId(
                                    visibleStudentPasswordId === student.id ? null : student.id
                                  )
                                }
                              >
                                {visibleStudentPasswordId === student.id ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                <span className="sr-only">
                                  {visibleStudentPasswordId === student.id
                                    ? "Hide password"
                                    : "Show password"}
                                </span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{student.createdAt ? format(student.createdAt.toDate(), "PP") : "N/A"}</TableCell>
                        <TableCell>{student.lastUpdatedAt ? formatDistanceToNow(student.lastUpdatedAt.toDate(), { addSuffix: true }) : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openStudentDialog(student)}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drive Links Tab */}
        <TabsContent value="driveLinks" className="mt-4">
          <Card>
            <CardHeader>{renderSortAndSearch("Drive Link", driveLinkSearchTerm, setDriveLinkSearchTerm, driveLinkSortOrder, setDriveLinkSortOrder as (order: string) => void, driveLinkSortOptionsList, openDriveLinkDialog)}</CardHeader>
            <CardContent>
              {isLoadingDriveLinks ? renderLoading("Loading drive links...") : getProcessedDriveLinks.length === 0 ? renderEmptyState(driveLinkSearchTerm ? "No links match your search." : "No drive links added yet.") : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {getProcessedDriveLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.title ?? "N/A"}</TableCell>
                        <TableCell><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs block">{link.url}</a></TableCell>
                        <TableCell>{link.category || "N/A"}</TableCell>
                        <TableCell>{link.email || "N/A"}</TableCell>
                        <TableCell>{link.createdAt ? format(link.createdAt.toDate(), "PP") : "N/A"}</TableCell>
                        <TableCell>{link.lastUpdatedAt ? formatDistanceToNow(link.lastUpdatedAt.toDate(), { addSuffix: true }) : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openDriveLinkDialog(link)}><Edit3 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDriveLinkToDelete(link)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Teacher Add/Edit Dialog */}
      <Dialog open={isTeacherDialogOpen} onOpenChange={(isOpen) => { setIsTeacherDialogOpen(isOpen); if (!isOpen) resetTeacherForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTeacher ? "Edit Teacher" : "Add New Teacher"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTeacher} className="space-y-4 py-2">
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-4 p-1">
                <div><Label htmlFor="teacher-name">Name</Label><Input id="teacher-name" value={teacherName ?? ""} onChange={e => setTeacherName(e.target.value)} required /></div>
                <div><Label htmlFor="teacher-subject">Teaching (Subject)</Label><Input id="teacher-subject" value={teacherSubject ?? ""} onChange={e => setTeacherSubject(e.target.value)} /></div>
                <div><Label htmlFor="teacher-email">Email</Label><Input id="teacher-email" type="email" value={teacherEmail ?? ""} onChange={e => setTeacherEmail(e.target.value)} /></div>
                <div>
                  <Label htmlFor="teacher-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="teacher-password"
                      type={showTeacherFormPassword ? "text" : "password"}
                      value={teacherPassword ?? ""}
                      onChange={e => setTeacherPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowTeacherFormPassword(!showTeacherFormPassword)}
                      tabIndex={-1} 
                    >
                      {showTeacherFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showTeacherFormPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Note: For prototype purposes only. Do not use real passwords.</p>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Add/Edit Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={(isOpen) => { setIsStudentDialogOpen(isOpen); if (!isOpen) resetStudentForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStudent} className="space-y-4 py-2">
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-4 p-1">
                <div><Label htmlFor="student-name">Name</Label><Input id="student-name" value={studentName ?? ""} onChange={e => setStudentName(e.target.value)} required /></div>
                <div><Label htmlFor="student-grade">Grade</Label><Input id="student-grade" value={studentGrade ?? ""} onChange={e => setStudentGrade(e.target.value)} /></div>
                <div><Label htmlFor="student-email">Email</Label><Input id="student-email" type="email" value={studentEmail ?? ""} onChange={e => setStudentEmail(e.target.value)} /></div>
                <div>
                  <Label htmlFor="student-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="student-password"
                      type={showStudentFormPassword ? "text" : "password"}
                      value={studentPassword ?? ""}
                      onChange={e => setStudentPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowStudentFormPassword(!showStudentFormPassword)}
                      tabIndex={-1} 
                    >
                      {showStudentFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showStudentFormPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drive Link Add/Edit Dialog */}
      <Dialog open={isDriveLinkDialogOpen} onOpenChange={(isOpen) => { setIsDriveLinkDialogOpen(isOpen); if (!isOpen) resetDriveLinkForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDriveLink ? "Edit Drive Link" : "Add New Drive Link"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveDriveLink} className="space-y-4 py-2">
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-4 p-1">
                <div><Label htmlFor="drive-title">Title</Label><Input id="drive-title" value={driveLinkTitle ?? ""} onChange={e => setDriveLinkTitle(e.target.value)} required /></div>
                <div><Label htmlFor="drive-url">URL</Label><Input id="drive-url" type="url" value={driveLinkUrl ?? ""} onChange={e => setDriveLinkUrl(e.target.value)} required placeholder="https://example.com" /></div>
                <div><Label htmlFor="drive-category">Category</Label>
                  <Select value={driveLinkCategory} onValueChange={(val) => setDriveLinkCategory(val)}>
                    <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>{driveLinkCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="drive-email">Email (Source)</Label><Input id="drive-email" type="email" value={driveLinkEmail ?? ""} onChange={e => setDriveLinkEmail(e.target.value)} placeholder="email@example.com"/></div>
              </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!teacherToDelete || !!studentToDelete || !!driveLinkToDelete} onOpenChange={(isOpen) => { if (!isOpen) { setTeacherToDelete(null); setStudentToDelete(null); setDriveLinkToDelete(null); }}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the entry:
              <span className="font-semibold"> {teacherToDelete?.name || studentToDelete?.name || driveLinkToDelete?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setTeacherToDelete(null); setStudentToDelete(null); setDriveLinkToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teacherToDelete) handleDelete("sheet5B7STeachers", teacherToDelete.id, teacherToDelete.name, () => setTeacherToDelete(null));
                else if (studentToDelete) handleDelete("sheet5B7SStudents", studentToDelete.id, studentToDelete.name, () => setStudentToDelete(null));
                else if (driveLinkToDelete) handleDelete("sheet5B7SDriveLinks", driveLinkToDelete.id, driveLinkToDelete.title, () => setDriveLinkToDelete(null));
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
