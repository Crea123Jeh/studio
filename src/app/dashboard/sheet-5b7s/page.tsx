
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
  notes?: string;
}

interface DriveLinkEntry extends BaseEntry {
  title: string;
  url: string;
  description?: string;
  category?: string;
}

type SortOption = "newest" | "oldest" | "alphabetical";
const driveLinkCategories = ["Lesson Plan", "Homework", "Resource", "Meeting Notes", "Archive", "Other"];

export default function Sheet5B7SPage() {
  const { toast } = useToast();

  // --- Teachers State ---
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherEntry | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherEntry | null>(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [teacherSortOrder, setTeacherSortOrder] = useState<SortOption>("newest");
  // Teacher Form State
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);


  // --- Students State ---
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentEntry | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentEntry | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentSortOrder, setStudentSortOrder] = useState<SortOption>("newest");
  // Student Form State
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentNotes, setStudentNotes] = useState("");

  // --- Drive Links State ---
  const [driveLinks, setDriveLinks] = useState<DriveLinkEntry[]>([]);
  const [isLoadingDriveLinks, setIsLoadingDriveLinks] = useState(true);
  const [isDriveLinkDialogOpen, setIsDriveLinkDialogOpen] = useState(false);
  const [editingDriveLink, setEditingDriveLink] = useState<DriveLinkEntry | null>(null);
  const [driveLinkToDelete, setDriveLinkToDelete] = useState<DriveLinkEntry | null>(null);
  const [driveLinkSearchTerm, setDriveLinkSearchTerm] = useState("");
  const [driveLinkSortOrder, setDriveLinkSortOrder] = useState<SortOption>("newest");
  // Drive Link Form State
  const [driveLinkTitle, setDriveLinkTitle] = useState("");
  const [driveLinkUrl, setDriveLinkUrl] = useState("");
  const [driveLinkDescription, setDriveLinkDescription] = useState("");
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
    setTeacherName(""); setTeacherSubject(""); setTeacherEmail(""); setTeacherPassword(""); setEditingTeacher(null); setShowPassword(false);
  }, []);
  const resetStudentForm = useCallback(() => {
    setStudentName(""); setStudentGrade(""); setStudentNotes(""); setEditingStudent(null);
  }, []);
  const resetDriveLinkForm = useCallback(() => {
    setDriveLinkTitle(""); setDriveLinkUrl(""); setDriveLinkDescription(""); setDriveLinkCategory(driveLinkCategories[0]); setEditingDriveLink(null);
  }, []);

  // --- Add/Edit Dialog Openers ---
  const openTeacherDialog = (teacher: TeacherEntry | null = null) => {
    if (teacher && typeof teacher.id === 'string' && teacher.id.length > 0) {
      setEditingTeacher(teacher);
      setTeacherName(teacher.name || "");
      setTeacherSubject(teacher.subject || "");
      setTeacherEmail(teacher.email || "");
      setTeacherPassword(teacher.password || "");
      setShowPassword(false);
    } else {
      if (teacher) { // Teacher object provided but ID is invalid
        console.error("Attempted to open edit dialog for teacher with invalid ID:", teacher);
        toast({ title: "Error", description: "Cannot edit teacher: invalid teacher data provided.", variant: "destructive" });
      }
      resetTeacherForm(); // This sets editingTeacher to null
    }
    setIsTeacherDialogOpen(true);
  };

  const openStudentDialog = (student: StudentEntry | null = null) => {
    if (student && typeof student.id === 'string' && student.id.length > 0) {
      setEditingStudent(student);
      setStudentName(student.name || "");
      setStudentGrade(student.grade || "");
      setStudentNotes(student.notes || "");
    } else {
      if (student) {
        console.error("Attempted to open edit dialog for student with invalid ID:", student);
        toast({ title: "Error", description: "Cannot edit student: invalid student data provided.", variant: "destructive" });
      }
      resetStudentForm();
    }
    setIsStudentDialogOpen(true);
  };

  const openDriveLinkDialog = (link: DriveLinkEntry | null = null) => {
     if (link && typeof link.id === 'string' && link.id.length > 0) {
      setEditingDriveLink(link);
      setDriveLinkTitle(link.title || "");
      setDriveLinkUrl(link.url || "");
      setDriveLinkDescription(link.description || "");
      setDriveLinkCategory(link.category || driveLinkCategories[0]);
    } else {
      if (link) {
        console.error("Attempted to open edit dialog for drive link with invalid ID:", link);
        toast({ title: "Error", description: "Cannot edit drive link: invalid link data provided.", variant: "destructive" });
      }
      resetDriveLinkForm();
    }
    setIsDriveLinkDialogOpen(true);
  };

  // --- Save Handlers ---
  const handleSaveTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherName) { toast({ title: "Missing Name", description: "Teacher name is required.", variant: "destructive" }); return; }
    const now = Timestamp.now();
    
    try {
      if (editingTeacher && typeof editingTeacher.id === 'string' && editingTeacher.id.length > 0) {
        const dataToUpdate: Partial<Omit<TeacherEntry, 'id' | 'createdAt'>> = {
            name: teacherName,
            subject: teacherSubject || "",
            email: teacherEmail || "",
            password: teacherPassword || "",
            lastUpdatedAt: now,
        };
        await updateDoc(doc(db, "sheet5B7STeachers", editingTeacher.id), dataToUpdate);
        toast({ title: "Teacher Updated" });
      } else if (editingTeacher) { // Should not be reached if openTeacherDialog validation works
        console.error("UPDATE ATTEMPT FAILED: editingTeacher.id is invalid. editingTeacher object:", editingTeacher);
        toast({ title: "Update Error", description: "Cannot update teacher: Invalid or missing teacher ID in the editing context.", variant: "destructive" });
      }
      else { // Add new teacher
        const newTeacherData: Omit<TeacherEntry, 'id'> = {
            name: teacherName,
            subject: teacherSubject || "",
            email: teacherEmail || "",
            password: teacherPassword || "",
            createdAt: now,
            lastUpdatedAt: now,
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
    const studentDataToSave = { 
        name: studentName, 
        grade: studentGrade || "", 
        notes: studentNotes || "", 
        lastUpdatedAt: now 
    };
    try {
      if (editingStudent && typeof editingStudent.id === 'string' && editingStudent.id.length > 0) {
        await updateDoc(doc(db, "sheet5B7SStudents", editingStudent.id), studentDataToSave);
        toast({ title: "Student Updated" });
      } else if (editingStudent) {
        console.error("UPDATE ATTEMPT FAILED: editingStudent.id is invalid. editingStudent object:", editingStudent);
        toast({ title: "Update Error", description: "Cannot update student: Invalid or missing student ID.", variant: "destructive" });
      } else {
        await addDoc(collection(db, "sheet5B7SStudents"), { ...studentDataToSave, createdAt: now });
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
    const driveLinkDataToSave = { 
        title: driveLinkTitle, 
        url: driveLinkUrl, 
        description: driveLinkDescription || "", 
        category: driveLinkCategory || driveLinkCategories[0], 
        lastUpdatedAt: now 
    };
    try {
      if (editingDriveLink && typeof editingDriveLink.id === 'string' && editingDriveLink.id.length > 0) {
        await updateDoc(doc(db, "sheet5B7SDriveLinks", editingDriveLink.id), driveLinkDataToSave);
        toast({ title: "Drive Link Updated" });
      } else if (editingDriveLink) {
        console.error("UPDATE ATTEMPT FAILED: editingDriveLink.id is invalid. editingDriveLink object:", editingDriveLink);
        toast({ title: "Update Error", description: "Cannot update link: Invalid or missing link ID.", variant: "destructive" });
      }
      else {
        await addDoc(collection(db, "sheet5B7SDriveLinks"), { ...driveLinkDataToSave, createdAt: now });
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
  const getProcessedData = <T extends BaseEntry & { name?: string; title?: string }>(
    items: T[],
    searchTerm: string,
    sortOrder: SortOption,
    nameKey: 'name' | 'title' = 'name'
  ): T[] => {
    let processed = [...items];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      processed = processed.filter(item => {
        const mainFieldValue = (item[nameKey] as string)?.toLowerCase() || "";
        let matches = mainFieldValue.includes(lowerSearch);
        if (item.hasOwnProperty('subject') && (item as TeacherEntry).subject?.toLowerCase().includes(lowerSearch)) matches = true;
        if (item.hasOwnProperty('email') && (item as TeacherEntry).email?.toLowerCase().includes(lowerSearch)) matches = true;
        if (item.hasOwnProperty('grade') && (item as StudentEntry).grade?.toLowerCase().includes(lowerSearch)) matches = true;
        if (item.hasOwnProperty('category') && (item as DriveLinkEntry).category?.toLowerCase().includes(lowerSearch)) matches = true;
        return matches;
      });
    }
    processed.sort((a, b) => {
      if (sortOrder === "alphabetical") return (a[nameKey] as string)?.localeCompare(b[nameKey]as string) || 0;
      const timeA = a.createdAt.toMillis(); 
      const timeB = b.createdAt.toMillis();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return processed;
  };

  const filteredTeachers = useMemo(() => getProcessedData(teachers, teacherSearchTerm, teacherSortOrder, 'name'), [teachers, teacherSearchTerm, teacherSortOrder]);
  const filteredStudents = useMemo(() => getProcessedData(students, studentSearchTerm, studentSortOrder, 'name'), [students, studentSearchTerm, studentSortOrder]);
  const filteredDriveLinks = useMemo(() => getProcessedData(driveLinks, driveLinkSearchTerm, driveLinkSortOrder, 'title'), [driveLinks, driveLinkSearchTerm, driveLinkSortOrder]);

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
    sortOrder: SortOption,
    setSortOrder: (order: SortOption) => void,
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
      <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOption)}>
        <SelectTrigger className="w-full md:w-[180px]">
          <ListFilter className="h-4 w-4 mr-2"/>
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest Added</SelectItem>
          <SelectItem value="oldest">Oldest Added</SelectItem>
          <SelectItem value="alphabetical">Alphabetical</SelectItem>
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
            <CardHeader>{renderSortAndSearch("Teacher", teacherSearchTerm, setTeacherSearchTerm, teacherSortOrder, setTeacherSortOrder, openTeacherDialog)}</CardHeader>
            <CardContent>
              {isLoadingTeachers ? renderLoading("Loading teachers...") : filteredTeachers.length === 0 ? renderEmptyState(teacherSearchTerm ? "No teachers match your search." : "No teachers added yet.") : (
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
                    {filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.subject || "N/A"}</TableCell>
                        <TableCell>{teacher.email || "N/A"}</TableCell>
                        <TableCell>{teacher.password ? '••••••••' : "N/A"}</TableCell>
                        <TableCell>{format(teacher.createdAt.toDate(), "PP")}</TableCell>
                        <TableCell>{formatDistanceToNow(teacher.lastUpdatedAt.toDate(), { addSuffix: true })}</TableCell>
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
            <CardHeader>{renderSortAndSearch("Student", studentSearchTerm, setStudentSearchTerm, studentSortOrder, setStudentSortOrder, openStudentDialog)}</CardHeader>
            <CardContent>
              {isLoadingStudents ? renderLoading("Loading students...") : filteredStudents.length === 0 ? renderEmptyState(studentSearchTerm ? "No students match your search." : "No students added yet.") : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Grade</TableHead><TableHead>Notes</TableHead><TableHead>Added</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.grade || "N/A"}</TableCell>
                        <TableCell className="truncate max-w-xs">{student.notes || "N/A"}</TableCell>
                        <TableCell>{format(student.createdAt.toDate(), "PP")}</TableCell>
                        <TableCell>{formatDistanceToNow(student.lastUpdatedAt.toDate(), { addSuffix: true })}</TableCell>
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
            <CardHeader>{renderSortAndSearch("Drive Link", driveLinkSearchTerm, setDriveLinkSearchTerm, driveLinkSortOrder, setDriveLinkSortOrder, openDriveLinkDialog)}</CardHeader>
            <CardContent>
              {isLoadingDriveLinks ? renderLoading("Loading drive links...") : filteredDriveLinks.length === 0 ? renderEmptyState(driveLinkSearchTerm ? "No links match your search." : "No drive links added yet.") : (
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>URL</TableHead><TableHead>Category</TableHead><TableHead>Added</TableHead><TableHead>Last Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredDriveLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.title}</TableCell>
                        <TableCell><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs block">{link.url}</a></TableCell>
                        <TableCell>{link.category || "N/A"}</TableCell>
                        <TableCell>{format(link.createdAt.toDate(), "PP")}</TableCell>
                        <TableCell>{formatDistanceToNow(link.lastUpdatedAt.toDate(), { addSuffix: true })}</TableCell>
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
            <div><Label htmlFor="teacher-name">Name</Label><Input id="teacher-name" value={teacherName ?? ""} onChange={e => setTeacherName(e.target.value)} required /></div>
            <div><Label htmlFor="teacher-subject">Teaching (Subject)</Label><Input id="teacher-subject" value={teacherSubject ?? ""} onChange={e => setTeacherSubject(e.target.value)} /></div>
            <div><Label htmlFor="teacher-email">Email</Label><Input id="teacher-email" type="email" value={teacherEmail ?? ""} onChange={e => setTeacherEmail(e.target.value)} /></div>
            <div>
              <Label htmlFor="teacher-password">Password</Label>
              <div className="relative">
                <Input
                  id="teacher-password"
                  type={showPassword ? "text" : "password"}
                  value={teacherPassword ?? ""}
                  onChange={e => setTeacherPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1} 
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Note: For prototype purposes only. Do not use real passwords.</p>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Add/Edit Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={(isOpen) => { setIsStudentDialogOpen(isOpen); if (!isOpen) resetStudentForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStudent} className="space-y-4 py-2">
            <div><Label htmlFor="student-name">Name</Label><Input id="student-name" value={studentName ?? ""} onChange={e => setStudentName(e.target.value)} required /></div>
            <div><Label htmlFor="student-grade">Grade</Label><Input id="student-grade" value={studentGrade ?? ""} onChange={e => setStudentGrade(e.target.value)} /></div>
            <div><Label htmlFor="student-notes">Notes</Label><Textarea id="student-notes" value={studentNotes ?? ""} onChange={e => setStudentNotes(e.target.value)} /></div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drive Link Add/Edit Dialog */}
      <Dialog open={isDriveLinkDialogOpen} onOpenChange={(isOpen) => { setIsDriveLinkDialogOpen(isOpen); if (!isOpen) resetDriveLinkForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDriveLink ? "Edit Drive Link" : "Add New Drive Link"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveDriveLink} className="space-y-4 py-2">
            <div><Label htmlFor="drive-title">Title</Label><Input id="drive-title" value={driveLinkTitle ?? ""} onChange={e => setDriveLinkTitle(e.target.value)} required /></div>
            <div><Label htmlFor="drive-url">URL</Label><Input id="drive-url" type="url" value={driveLinkUrl ?? ""} onChange={e => setDriveLinkUrl(e.target.value)} required placeholder="https://example.com" /></div>
            <div><Label htmlFor="drive-category">Category</Label>
              <Select value={driveLinkCategory} onValueChange={(val) => setDriveLinkCategory(val)}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>{driveLinkCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="drive-description">Description</Label><Textarea id="drive-description" value={driveLinkDescription ?? ""} onChange={e => setDriveLinkDescription(e.target.value)} /></div>
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

