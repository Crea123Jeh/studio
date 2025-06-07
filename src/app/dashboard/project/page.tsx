
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db, storage } from "@/lib/firebase"; // Added storage
import {
  collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, writeBatch, getDocs, // For deleting subcollections
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { format, formatDistanceToNow } from "date-fns";
import { Briefcase, ListChecks, FileText, Users, Paperclip, MessageCircle, PlusCircle, ArrowLeft, Edit3, Trash2, Link as LinkIcon, CalendarIcon, UploadCloud, FileWarning, CheckCircle2, XCircle, Info } from "lucide-react";
import Image from "next/image";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from '@/contexts/AuthContext';

const projectStatusOptions = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;
const taskStatusOptions = ["To Do", "In Progress", "Done"] as const;

// Zod Schemas
const uploadedFileSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number(),
  storagePath: z.string(),
  uploadedAt: z.instanceof(Timestamp),
});
type UploadedFile = z.infer<typeof uploadedFileSchema>;

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(projectStatusOptions),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date().optional().nullable(),
  budget: z.string().optional().refine(val => !val || !isNaN(parseFloat(val.replace(/,/g, ''))), { message: "Budget must be a number."}).transform(val => val ? parseFloat(val.replace(/,/g, '')) : undefined),
  managerId: z.string().min(1, "Manager selection is required."),
  // fileLinks are removed, replaced by uploadedFiles (managed directly, not in form)
});
type ProjectFormValues = z.infer<typeof projectFormSchema>;

const taskFormSchema = z.object({
  title: z.string().min(3, "Task title is required."),
  description: z.string().optional(),
  status: z.enum(taskStatusOptions),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

const updateNoteFormSchema = z.object({
  note: z.string().min(5, "Update note must be at least 5 characters."),
  date: z.date({ required_error: "Date for the update is required." }),
});
type UpdateNoteFormValues = z.infer<typeof updateNoteFormSchema>;


// Interfaces
interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: typeof projectStatusOptions[number];
  startDate: Timestamp;
  endDate: Timestamp | null;
  budget?: number;
  managerId?: string;
  managerName?: string;
  spent?: number;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  uploadedFiles: UploadedFile[];
}

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: typeof taskStatusOptions[number];
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

interface UpdateNoteData {
  id: string;
  note: string;
  date: Timestamp; // Effective date of the update
  authorName?: string;
  createdAt: Timestamp; // When the log was created
}

const mockUsers = [
  { id: "user_alice_001", name: "Alice Wonderland" },
  { id: "user_bob_002", name: "Bob The Builder" },
  { id: "user_charlie_003", name: "Charlie Brown" },
  { id: "user_diana_004", name: "Diana Prince" },
];


export default function ProjectInfoPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  
  const [projectTasks, setProjectTasks] = useState<TaskData[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  
  const [projectUploadedFiles, setProjectUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [projectUpdates, setProjectUpdates] = useState<UpdateNoteData[]>([]);
  const [isAddUpdateDialogOpen, setIsAddUpdateDialogOpen] = useState(false);

  const { toast } = useToast();
  const { user: currentUser, username: currentUsername } = useAuth();


  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", description: "", status: "Planning", managerId: "", endDate: null, budget: undefined },
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "", description: "", status: "To Do" },
  });

  const updateNoteForm = useForm<UpdateNoteFormValues>({
    resolver: zodResolver(updateNoteFormSchema),
    defaultValues: { note: "", date: new Date() },
  });

  // Fetch Projects
  useEffect(() => {
    setIsLoading(true);
    const projectsCollection = collection(db, "projectsPPM");
    const q = query(projectsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(docSnap => {
         try {
            const data = docSnap.data();
            const name = typeof data.name === 'string' ? data.name : "Untitled Project";
            const description = typeof data.description === 'string' ? data.description : "No description provided.";
            const status = projectStatusOptions.includes(data.status) ? data.status : "Planning";
            const startDate = data.startDate instanceof Timestamp ? data.startDate : Timestamp.fromDate(new Date(1970,0,1));
            const endDate = data.endDate instanceof Timestamp ? data.endDate : (data.endDate === null ? null : undefined);
            const budget = typeof data.budget === 'number' ? data.budget : undefined;
            const managerId = typeof data.managerId === 'string' ? data.managerId : undefined;
            const managerName = typeof data.managerName ==='string' ? data.managerName : "N/A";
            const spent = typeof data.spent === 'number' ? data.spent : undefined;
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(1970,0,1));
            const lastUpdatedAt = data.lastUpdatedAt instanceof Timestamp ? data.lastUpdatedAt : createdAt;
            const uploadedFiles = Array.isArray(data.uploadedFiles) ? data.uploadedFiles.map((f: any) => ({...f, uploadedAt: f.uploadedAt instanceof Timestamp ? f.uploadedAt : Timestamp.now() })) : [];


            const mappedData: ProjectData = {
                id: docSnap.id, name, description, status, startDate, endDate, budget, managerId, managerName, spent, createdAt, lastUpdatedAt, uploadedFiles
            };
            return mappedData;
        } catch (e: any) {
            console.error(`Error processing document ${docSnap.id}:`, e.message, e.stack, `Data: ${JSON.stringify(docSnap.data())}`);
            toast({
                title: "Data Processing Error",
                description: `Could not process project data for ID: ${docSnap.id}. It may be corrupted. See console. Raw data: ${JSON.stringify(docSnap.data())}`,
                variant: "destructive"
            });
            return null; 
        }
      }).filter(project => project !== null) as ProjectData[];
      setProjects(fetchedProjects);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ title: "Error", description: "Could not fetch projects. Firestore query might be failing.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  // Fetch Subcollections when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      // Fetch Tasks
      const tasksCol = collection(db, "projectsPPM", selectedProject.id, "tasks");
      const tasksQuery = query(tasksCol, orderBy("createdAt", "desc"));
      const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
        setProjectTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskData)));
      }, (err) => { console.error("Error fetching tasks:", err); toast({title:"Error", description:"Could not fetch tasks.", variant:"destructive"});});

      // Set Uploaded Files from project data (already fetched)
      setProjectUploadedFiles(selectedProject.uploadedFiles || []);

      // Fetch Updates
      const updatesCol = collection(db, "projectsPPM", selectedProject.id, "updates");
      const updatesQuery = query(updatesCol, orderBy("date", "desc")); // Order by effective date
      const unsubUpdates = onSnapshot(updatesQuery, (snapshot) => {
        setProjectUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpdateNoteData)));
      }, (err) => { console.error("Error fetching updates:", err); toast({title:"Error", description:"Could not fetch updates.", variant:"destructive"});});
      
      return () => { unsubTasks(); unsubUpdates(); };
    }
  }, [selectedProject, toast]);

  const updateProjectTimestamp = async (projectId: string) => {
    const projectRef = doc(db, "projectsPPM", projectId);
    try {
      await updateDoc(projectRef, { lastUpdatedAt: Timestamp.now() });
    } catch (error) {
      console.error("Error updating project timestamp:", error);
    }
  };

  const handleOpenAddProjectDialog = (projectToEdit: ProjectData | null = null) => {
    setEditingProject(projectToEdit);
    if (projectToEdit) {
      projectForm.reset({
        name: projectToEdit.name,
        description: projectToEdit.description,
        status: projectToEdit.status,
        startDate: projectToEdit.startDate.toDate(),
        endDate: projectToEdit.endDate ? projectToEdit.endDate.toDate() : null,
        budget: projectToEdit.budget?.toString() || "",
        managerId: projectToEdit.managerId || "",
      });
    } else {
      projectForm.reset({ name: "", description: "", status: "Planning", startDate: new Date(), endDate: null, budget: "", managerId: "" });
    }
    setIsAddProjectDialogOpen(true);
  };

  const onProjectSubmit = async (values: ProjectFormValues) => {
    const selectedManager = mockUsers.find(user => user.id === values.managerId);
    const managerName = selectedManager ? selectedManager.name : "N/A";
    const now = Timestamp.now();

    const projectDataToSave: Omit<ProjectData, 'id' | 'createdAt' | 'uploadedFiles' | 'spent'> & { createdAt?: Timestamp } = {
      ...values,
      startDate: Timestamp.fromDate(values.startDate),
      endDate: values.endDate ? Timestamp.fromDate(values.endDate) : null,
      budget: values.budget,
      managerName: managerName,
      lastUpdatedAt: now,
    };

    try {
      if (editingProject) {
        const projectRef = doc(db, "projectsPPM", editingProject.id);
        await updateDoc(projectRef, projectDataToSave);
        toast({ title: "Project Updated", description: `"${values.name}" has been updated.` });
        if(selectedProject?.id === editingProject.id) { // Refresh selected project view if it's the one being edited
             setSelectedProject(prev => prev ? {...prev, ...projectDataToSave, startDate: projectDataToSave.startDate!, endDate: projectDataToSave.endDate, lastUpdatedAt: projectDataToSave.lastUpdatedAt! } as ProjectData : null);
        }
      } else {
        await addDoc(collection(db, "projectsPPM"), { ...projectDataToSave, createdAt: now, uploadedFiles: [] });
        toast({ title: "Project Added", description: `"${values.name}" has been added.` });
      }
      setIsAddProjectDialogOpen(false);
      setEditingProject(null);
      projectForm.reset();
    } catch (error) {
      console.error("Error saving project: ", error);
      toast({ title: "Error", description: "Could not save project.", variant: "destructive" });
    }
  };
  
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete project "${projectName}" and all its tasks, documents, and updates? This action cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      // Delete subcollections (tasks, updates)
      const tasksCol = collection(db, "projectsPPM", projectId, "tasks");
      const tasksSnapshot = await getDocs(tasksCol);
      tasksSnapshot.forEach(doc => batch.delete(doc.ref));

      const updatesCol = collection(db, "projectsPPM", projectId, "updates");
      const updatesSnapshot = await getDocs(updatesCol);
      updatesSnapshot.forEach(doc => batch.delete(doc.ref));
      
      // Delete uploaded files from Storage
      const projectDoc = projects.find(p => p.id === projectId);
      if (projectDoc?.uploadedFiles) {
        for (const file of projectDoc.uploadedFiles) {
          const fileToDeleteRef = storageRef(storage, file.storagePath);
          await deleteObject(fileToDeleteRef).catch(e => console.warn("Error deleting file from storage:", file.storagePath, e));
        }
      }

      batch.delete(doc(db, "projectsPPM", projectId));
      await batch.commit();

      toast({title: "Project Deleted", description: `"${projectName}" has been deleted.`});
      if (selectedProject?.id === projectId) setSelectedProject(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({title: "Error", description: "Could not delete project.", variant: "destructive"});
    }
  };

  // Task Management
  const onTaskSubmit = async (values: TaskFormValues) => {
    if (!selectedProject) return;
    const now = Timestamp.now();
    const taskData = { ...values, createdAt: now, lastUpdatedAt: now };
    try {
      await addDoc(collection(db, "projectsPPM", selectedProject.id, "tasks"), taskData);
      toast({ title: "Task Added", description: `Task "${values.title}" added.` });
      setIsAddTaskDialogOpen(false);
      taskForm.reset();
      await updateProjectTimestamp(selectedProject.id);
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error Adding Task", variant: "destructive" });
    }
  };

  // File Upload Management
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);
    setUploadProgress(0);

    const filePath = `project_documents/${selectedProject.id}/${Date.now()}_${file.name}`;
    const fileUploadRef = storageRef(storage, filePath);
    const uploadTask = uploadBytesResumable(fileUploadRef, file);

    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        console.error("Upload failed:", error);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const newFile: UploadedFile = {
          name: file.name,
          url: downloadURL,
          type: file.type,
          size: file.size,
          storagePath: filePath,
          uploadedAt: Timestamp.now(),
        };
        const projectRef = doc(db, "projectsPPM", selectedProject.id);
        await updateDoc(projectRef, { uploadedFiles: arrayUnion(newFile), lastUpdatedAt: Timestamp.now() });
        setProjectUploadedFiles(prev => [...prev, newFile]);
        toast({ title: "File Uploaded", description: `"${file.name}" uploaded successfully.` });
        setIsUploading(false);
        setUploadProgress(0);
        if (selectedProject) await updateProjectTimestamp(selectedProject.id);
      }
    );
  };

  const handleDeleteFile = async (fileToDelete: UploadedFile) => {
    if (!selectedProject || !confirm(`Are you sure you want to delete the file "${fileToDelete.name}"?`)) return;
    try {
      const fileStorageRef = storageRef(storage, fileToDelete.storagePath);
      await deleteObject(fileStorageRef);

      const projectRef = doc(db, "projectsPPM", selectedProject.id);
      await updateDoc(projectRef, { uploadedFiles: arrayRemove(fileToDelete), lastUpdatedAt: Timestamp.now() });
      setProjectUploadedFiles(prev => prev.filter(f => f.storagePath !== fileToDelete.storagePath));
      toast({ title: "File Deleted", description: `"${fileToDelete.name}" deleted.` });
      if (selectedProject) await updateProjectTimestamp(selectedProject.id);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({ title: "Error Deleting File", variant: "destructive" });
    }
  };

  // Update Note Management
  const onUpdateNoteSubmit = async (values: UpdateNoteFormValues) => {
    if (!selectedProject || !currentUser) return;
    const now = Timestamp.now();
    const updateData = {
      note: values.note,
      date: Timestamp.fromDate(values.date),
      authorName: currentUsername || "System",
      createdAt: now,
    };
    try {
      await addDoc(collection(db, "projectsPPM", selectedProject.id, "updates"), updateData);
      toast({ title: "Update Note Added" });
      setIsAddUpdateDialogOpen(false);
      updateNoteForm.reset({ note: "", date: new Date() });
      if (selectedProject) await updateProjectTimestamp(selectedProject.id);
    } catch (error) {
      console.error("Error adding update note:", error);
      toast({ title: "Error Adding Update", variant: "destructive" });
    }
  };
  

  const ProjectCard = ({ project }: { project: ProjectData }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <Badge variant={project.status === "Completed" ? "default" : "secondary"} className={cn( project.status === "Completed" && "bg-green-500 text-white", project.status === "In Progress" && "bg-blue-500 text-white", project.status === "On Hold" && "bg-yellow-500 text-black", project.status === "Cancelled" && "bg-red-500 text-white", project.status === "Planning" && "bg-gray-400 text-white" )}> {project.status} </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Manager: {project.managerName || "N/A"} | Start: {project.startDate ? format(project.startDate.toDate(), "PP") : "N/A"}
          <br/>Last Updated: {formatDistanceToNow(project.lastUpdatedAt.toDate(), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setSelectedProject(project)}>View Details</Button>
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleOpenAddProjectDialog(project)} className="h-8 w-8"> <Edit3 className="h-4 w-4" /> </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(project.id, project.name)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"> <Trash2 className="h-4 w-4" /> </Button>
        </div>
      </CardFooter>
    </Card>
  );

  if (isLoading) return <div className="flex justify-center items-center h-64"><p>Loading projects...</p></div>;

  if (selectedProject) {
    const budgetProgress = selectedProject.budget && selectedProject.spent ? (selectedProject.spent / selectedProject.budget) * 100 : 0;
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedProject(null)} className="mb-4"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project List </Button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center"> <Briefcase className="h-8 w-8 text-primary" /> </div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{selectedProject.name}</h1>
          </div>
          <Badge variant={selectedProject.status === "Completed" ? "default" : "secondary"} className={cn("text-sm whitespace-nowrap", selectedProject.status === "Completed" && "bg-green-500 text-white", selectedProject.status === "In Progress" && "bg-blue-500 text-white", selectedProject.status === "On Hold" && "bg-yellow-500 text-black", selectedProject.status === "Cancelled" && "bg-red-500 text-white", selectedProject.status === "Planning" && "bg-gray-400 text-white")}> {selectedProject.status} </Badge>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Project Details</CardTitle>
                <CardDescription>Last updated: {formatDistanceToNow(selectedProject.lastUpdatedAt.toDate(), { addSuffix: true })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <Card> <CardHeader><CardTitle className="text-base">Start Date</CardTitle></CardHeader> <CardContent><p>{selectedProject.startDate ? format(selectedProject.startDate.toDate(), "PPP") : "N/A"}</p></CardContent> </Card>
                  <Card> <CardHeader><CardTitle className="text-base">End Date</CardTitle></CardHeader> <CardContent><p>{selectedProject.endDate ? format(selectedProject.endDate.toDate(), "PPP") : "N/A"}</p></CardContent> </Card>
                  <Card> <CardHeader><CardTitle className="text-base">Budget</CardTitle></CardHeader> <CardContent><p>{selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : "N/A"}</p></CardContent> </Card>
                  <Card> <CardHeader><CardTitle className="text-base">Manager</CardTitle></CardHeader> <CardContent className="flex items-center gap-2"> <Avatar className="h-8 w-8"> <AvatarImage src={`https://placehold.co/40x40.png?text=${selectedProject.managerName ? selectedProject.managerName.substring(0,1).toUpperCase() : 'P'}`} alt={selectedProject.managerName} data-ai-hint="person avatar"/> <AvatarFallback>{selectedProject.managerName ? selectedProject.managerName.substring(0,1).toUpperCase() : "P"}</AvatarFallback> </Avatar> <p className="text-sm font-semibold">{selectedProject.managerName || "N/A"}</p> </CardContent> </Card>
                </div>
                {selectedProject.budget && selectedProject.spent !== undefined && (
                  <Card className="mb-4"> <CardHeader><CardTitle className="text-base">Budget Utilization</CardTitle></CardHeader> <CardContent> <Progress value={budgetProgress} className="h-2.5" /> <p className="text-sm text-muted-foreground mt-1"> ${(selectedProject.spent || 0).toLocaleString()} spent of ${selectedProject.budget.toLocaleString()} ({budgetProgress.toFixed(1)}%) </p> </CardContent> </Card>
                )}
                <h4 className="font-semibold text-lg">Description</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedProject.description}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary"/>Tasks</CardTitle>
                    <CardDescription>Manage project tasks. Last project update: {formatDistanceToNow(selectedProject.lastUpdatedAt.toDate(), { addSuffix: true })}</CardDescription>
                </div>
                <Button onClick={() => { taskForm.reset(); setIsAddTaskDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Task</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectTasks.length > 0 ? projectTasks.map(task => (
                  <Card key={task.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-md">{task.title}</CardTitle>
                        <Badge variant={task.status === "Done" ? "default" : "secondary"} className={cn(task.status === "Done" && "bg-green-600", task.status === "In Progress" && "bg-blue-600", task.status === "To Do" && "bg-slate-500", "text-white")}>{task.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {task.description && <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>}
                      <p className="text-xs text-muted-foreground">Created: {formatDistanceToNow(task.createdAt.toDate(), { addSuffix: true })} | Updated: {formatDistanceToNow(task.lastUpdatedAt.toDate(), { addSuffix: true })}</p>
                    </CardContent>
                  </Card>
                )) : <p className="text-muted-foreground text-center py-4">No tasks added yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-4">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-primary"/>Documents</CardTitle>
                    <CardDescription>Upload and manage project files. Last project update: {formatDistanceToNow(selectedProject.lastUpdatedAt.toDate(), { addSuffix: true })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="file-upload" className="flex items-center justify-center w-full h-32 px-4 transition bg-background border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                            <span className="flex items-center space-x-2">
                                <UploadCloud className="w-6 h-6 text-gray-600" />
                                <span className="font-medium text-gray-600">
                                    Drop files to Attach, or <span className="text-blue-600 underline">browse</span>
                                </span>
                            </span>
                            <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
                        </Label>
                        {isUploading && <div className="mt-2"><Progress value={uploadProgress} className="h-2" /><p className="text-xs text-center">{uploadProgress.toFixed(0)}%</p></div>}
                    </div>
                    {projectUploadedFiles.length > 0 ? (
                        <div className="space-y-2">
                            {projectUploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 gap-2">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {file.type.startsWith("image/") ? <Image src={file.url} alt={file.name} width={40} height={40} className="rounded object-cover" data-ai-hint="file image"/> : <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0"/>}
                                        <div className="overflow-hidden">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">{file.name}</a>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB | Uploaded: {formatDistanceToNow(file.uploadedAt.toDate(), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFile(file)} disabled={isUploading}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !isUploading && <p className="text-sm text-muted-foreground italic text-center py-4">No files uploaded yet.</p>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="mt-4">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary"/>Project Updates</CardTitle>
                        <CardDescription>Log and view project updates. Last project update: {formatDistanceToNow(selectedProject.lastUpdatedAt.toDate(), { addSuffix: true })}</CardDescription>
                    </div>
                    <Button onClick={() => { updateNoteForm.reset({ note: "", date: new Date() }); setIsAddUpdateDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Update</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projectUpdates.length > 0 ? projectUpdates.map(update => (
                    <Card key={update.id}>
                      <CardContent className="pt-4">
                        <p className="text-sm whitespace-pre-wrap">{update.note}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Effective: {format(update.date.toDate(), "PPP")} | Logged by {update.authorName || "System"} on {formatDistanceToNow(update.createdAt.toDate(), { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  )) : <p className="text-muted-foreground text-center py-4">No updates logged yet.</p>}
                </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
         <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenAddProjectDialog(selectedProject)}> <Edit3 className="mr-2 h-4 w-4" /> Edit Project </Button>
            <Button variant="destructive" onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}> <Trash2 className="mr-2 h-4 w-4" /> Delete Project </Button>
        </div>
      </div>
    );
  }

  return ( // Project List View
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"> <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center"> <Briefcase className="h-8 w-8 text-primary" /> </div> <h1 className="text-3xl font-bold font-headline tracking-tight">Projects Portfolio</h1> </div>
        <Button onClick={() => handleOpenAddProjectDialog()}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Project </Button>
      </div>
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (<ProjectCard key={project.id} project={project} />))}
        </div>
      ) : (
        <Card><CardContent className="pt-6 text-center text-muted-foreground"> <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-3" /> <p className="text-lg font-medium">No projects found.</p> <p>Get started by adding your first project!</p> </CardContent></Card>
      )}

      <Dialog open={isAddProjectDialogOpen} onOpenChange={(isOpen) => { setIsAddProjectDialogOpen(isOpen); if (!isOpen) { projectForm.reset(); setEditingProject(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader> <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle> <DialogDescription> {editingProject ? "Update the details of this project." : "Fill in the details for the new project."} </DialogDescription> </DialogHeader>
          <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="name" className="text-right">Name</Label> <Controller name="name" control={projectForm.control} render={({ field }) => <Input id="name" {...field} className="col-span-3" placeholder="Project Alpha"/>} /> {projectForm.formState.errors.name && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.name.message}</p>} </div>
            <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="description" className="text-right pt-2">Description</Label> <Controller name="description" control={projectForm.control} render={({ field }) => <Textarea id="description" {...field} className="col-span-3" rows={3} placeholder="Briefly describe the project..."/>} /> {projectForm.formState.errors.description && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.description.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="status" className="text-right">Status</Label> <Controller name="status" control={projectForm.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger className="col-span-3" id="status"><SelectValue placeholder="Select status" /></SelectTrigger> <SelectContent> {projectStatusOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))} </SelectContent> </Select> )} /> {projectForm.formState.errors.status && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.status.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="managerId" className="text-right">Manager</Label> <Controller name="managerId" control={projectForm.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger className="col-span-3" id="managerId"><SelectValue placeholder="Select manager" /></SelectTrigger> <SelectContent> {mockUsers.map(user => (<SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>))} </SelectContent> </Select> )} /> {projectForm.formState.errors.managerId && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.managerId.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="startDate" className="text-right">Start Date</Label> <Controller name="startDate" control={projectForm.control} render={({ field }) => ( <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span>Pick start date</span>} </Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover> )} /> {projectForm.formState.errors.startDate && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.startDate.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="endDate" className="text-right">End Date</Label> <Controller name="endDate" control={projectForm.control} render={({ field }) => ( <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span className="text-muted-foreground">Pick end date (optional)</span>} </Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} /></PopoverContent></Popover> )} /> {projectForm.formState.errors.endDate && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.endDate.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="budget" className="text-right">Budget ($)</Label> <Controller name="budget" control={projectForm.control} render={({ field }) => <Input id="budget" type="text" {...field} value={field.value ?? ""} onChange={e => { const value = e.target.value.replace(/[^0-9.]/g, ''); field.onChange(value === '' ? undefined : value);}} className="col-span-3" placeholder="e.g., 50000 (optional)"/>} /> {projectForm.formState.errors.budget && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.budget.message}</p>} </div>
            <DialogFooter> <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose> <Button type="submit" disabled={projectForm.formState.isSubmitting}> {projectForm.formState.isSubmitting ? (editingProject ? "Saving..." : "Adding...") : (editingProject ? "Save Changes" : "Add Project")} </Button> </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Add New Task</DialogTitle><DialogDescription>Fill in the details for the new task for {selectedProject?.name}.</DialogDescription></DialogHeader>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4 py-4">
                <div><Label htmlFor="task-title">Title</Label><Controller name="title" control={taskForm.control} render={({ field }) => <Input id="task-title" {...field} />} />{taskForm.formState.errors.title && <p className="text-xs text-destructive">{taskForm.formState.errors.title.message}</p>}</div>
                <div><Label htmlFor="task-description">Description (Optional)</Label><Controller name="description" control={taskForm.control} render={({ field }) => <Textarea id="task-description" {...field} />} /></div>
                <div><Label htmlFor="task-status">Status</Label><Controller name="status" control={taskForm.control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="task-status"><SelectValue /></SelectTrigger><SelectContent>{taskStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)} /></div>
                <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit">Add Task</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Add Update Note Dialog */}
      <Dialog open={isAddUpdateDialogOpen} onOpenChange={setIsAddUpdateDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Add Project Update</DialogTitle><DialogDescription>Log an update for {selectedProject?.name}.</DialogDescription></DialogHeader>
            <form onSubmit={updateNoteForm.handleSubmit(onUpdateNoteSubmit)} className="space-y-4 py-4">
                <div><Label htmlFor="update-note">Update Note</Label><Controller name="note" control={updateNoteForm.control} render={({ field }) => <Textarea id="update-note" {...field} rows={4} />} />{updateNoteForm.formState.errors.note && <p className="text-xs text-destructive">{updateNoteForm.formState.errors.note.message}</p>}</div>
                <div><Label htmlFor="update-date">Effective Date</Label><Controller name="date" control={updateNoteForm.control} render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)} />{updateNoteForm.formState.errors.date && <p className="text-xs text-destructive">{updateNoteForm.formState.errors.date.message}</p>}</div>
                <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit">Add Update</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

