
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase"; // storage import removed as it's no longer used here
import {
  collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc,
  writeBatch, getDocs,
} from "firebase/firestore";
// Removed storage related imports: ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject
import { format, formatDistanceToNow } from "date-fns";
import { Briefcase, ListChecks, FileText, MessageCircle, PlusCircle, ArrowLeft, Edit3, Trash2, CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
// Removed Paperclip and UploadCloud as they were for documents
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from '@/contexts/AuthContext';

const projectStatusOptions = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;
const taskStatusOptions = ["To Do", "In Progress", "Done"] as const;

// Zod Schemas
const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(projectStatusOptions),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date().optional().nullable(),
  budget: z.string().optional().transform(val => {
    if (val === null || val === undefined || val.trim() === "") return undefined;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  }),
  managerId: z.string().min(1, "Manager selection is required."),
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
  budget: number; 
  managerId?: string;
  managerName?: string;
  spent?: number; 
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  // uploadedFiles field removed
}

interface TaskData {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: typeof taskStatusOptions[number];
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

interface UpdateNoteData {
  id: string;
  projectId: string;
  note: string;
  date: Timestamp; 
  authorId?: string;
  authorName?: string;
  createdAt: Timestamp;
}

const mockUsers = [ 
  { id: "user_alice_001", name: "Alice Wonderland" },
  { id: "user_bob_002", name: "Bob The Builder" },
  { id: "user_charlie_003", name: "Charlie Brown" },
  { id: "user_diana_004", name: "Diana Prince" },
];

type SortableProjectKeys = 'name' | 'status' | 'startDate' | 'lastUpdatedAt';


export default function ProjectInfoPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  
  const [projectTasks, setProjectTasks] = useState<TaskData[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  
  // Removed state for uploaded files
  // const [projectUploadedFiles, setProjectUploadedFiles] = useState<UploadedFile[]>([]);
  // const [isUploading, setIsUploading] = useState(false);
  // const [uploadProgress, setUploadProgress] = useState(0);

  const [projectUpdates, setProjectUpdates] = useState<UpdateNoteData[]>([]);
  const [isAddUpdateDialogOpen, setIsAddUpdateDialogOpen] = useState(false);

  const [showDeleteInfoAlert, setShowDeleteInfoAlert] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableProjectKeys; direction: 'ascending' | 'descending' }>({ key: 'lastUpdatedAt', direction: 'descending' });


  const { toast } = useToast();
  const { user: currentUser, username: currentUsername } = useAuth();

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", description: "", status: "Planning", managerId: "", endDate: null, budget: "0" },
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
    const projectsCollectionRef = collection(db, "projectsPPM");
    const q = query(projectsCollectionRef, orderBy("createdAt", "desc")); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(docSnap => {
         try {
            const data = docSnap.data();
            
            const name = typeof data.name === 'string' ? data.name : "Untitled Project";
            const description = typeof data.description === 'string' ? data.description : "No description provided.";
            const status = projectStatusOptions.includes(data.status) ? data.status : "Planning";
            
            const startDate = data.startDate instanceof Timestamp ? data.startDate : Timestamp.fromDate(new Date(1970,0,1));
            const endDate = data.endDate instanceof Timestamp ? data.endDate : (data.endDate === null ? null : undefined);
            
            const budget = typeof data.budget === 'number' ? data.budget : 0; 
            const managerId = typeof data.managerId === 'string' ? data.managerId : undefined;
            const managerName = typeof data.managerName ==='string' ? data.managerName : "N/A";
            const spent = typeof data.spent === 'number' ? data.spent : undefined;
            
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(1970,0,1));
            const lastUpdatedAt = data.lastUpdatedAt instanceof Timestamp ? data.lastUpdatedAt : createdAt;
            
            // Removed uploadedFiles mapping
            
            const mappedData: ProjectData = {
                id: docSnap.id, name, description, status, startDate, 
                endDate: endDate === undefined ? null : endDate, 
                budget: budget, managerId, managerName, spent, createdAt, lastUpdatedAt
            };
            return mappedData;
        } catch (e: any) {
            const errorMessage = `Error processing document ${docSnap.id}: ${e.message}. Raw Data: ${JSON.stringify(docSnap.data ? docSnap.data() : 'N/A')}. Stack: ${e.stack}`;
            console.error(errorMessage);
            toast({
                title: "Data Processing Error",
                description: `Could not process project data for ID: ${docSnap.id}. See console for details.`,
                variant: "destructive"
            });
            return null; 
        }
      }).filter(project => project !== null) as ProjectData[];
      setProjects(fetchedProjects);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      const specificError = error.message || 'Unknown Firestore error';
      toast({ title: "Error", description: `Could not fetch projects. Firestore query might be failing. Details: ${specificError}`, variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []); 

  // Fetch Subcollections when selectedProject changes
  useEffect(() => {
    if (selectedProject?.id) {
      const projectId = selectedProject.id;

      const tasksCol = collection(db, "projectsPPM", projectId, "tasks");
      const tasksQuery = query(tasksCol, orderBy("createdAt", "desc"));
      const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
        setProjectTasks(snapshot.docs.map(doc => ({ id: doc.id, projectId, ...doc.data() } as TaskData)));
      }, (err) => { console.error(`Error fetching tasks for project ${projectId}:`, err); toast({title:"Error", description:`Could not fetch tasks for ${selectedProject.name}.`, variant:"destructive"});});

      const updatesCol = collection(db, "projectsPPM", projectId, "updates");
      const updatesQuery = query(updatesCol, orderBy("date", "desc")); 
      const unsubUpdates = onSnapshot(updatesQuery, (snapshot) => {
        setProjectUpdates(snapshot.docs.map(doc => ({ id: doc.id, projectId, ...doc.data() } as UpdateNoteData)));
      }, (err) => { console.error(`Error fetching updates for project ${projectId}:`, err); toast({title:"Error", description:`Could not fetch updates for ${selectedProject.name}.`, variant:"destructive"});});
      
      // Removed setProjectUploadedFiles
      // setProjectUploadedFiles(selectedProject.uploadedFiles || []);

      return () => { unsubTasks(); unsubUpdates(); };
    } else {
      setProjectTasks([]);
      setProjectUpdates([]);
      // Removed setProjectUploadedFiles
      // setProjectUploadedFiles([]);
    }
  }, [selectedProject]); // Removed toast from dependency array

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
        budget: projectToEdit.budget?.toString() ?? "0",
        managerId: projectToEdit.managerId || "",
      });
    } else {
      projectForm.reset({ name: "", description: "", status: "Planning", startDate: new Date(), endDate: null, budget: "0", managerId: "" });
    }
    setIsAddProjectDialogOpen(true);
  };

  const onProjectSubmit = async (values: ProjectFormValues) => {
    const selectedManager = mockUsers.find(user => user.id === values.managerId);
    const managerName = selectedManager ? selectedManager.name : "N/A";
    const now = Timestamp.now();

    const budgetToSave = values.budget ?? 0; 

    const projectDataToSave: Omit<ProjectData, 'id' | 'createdAt' | 'spent' > & { createdAt?: Timestamp } = {
      name: values.name,
      description: values.description,
      status: values.status,
      startDate: Timestamp.fromDate(values.startDate),
      endDate: values.endDate ? Timestamp.fromDate(values.endDate) : null,
      budget: budgetToSave,
      managerId: values.managerId,
      managerName: managerName,
      lastUpdatedAt: now,
    };

    try {
      if (editingProject) {
        const projectRef = doc(db, "projectsPPM", editingProject.id);
        await updateDoc(projectRef, projectDataToSave);
        toast({ title: "Project Updated", description: `"${values.name}" has been updated.` });
        if(selectedProject?.id === editingProject.id) {
             const updatedProjectData = {
                ...selectedProject, 
                ...projectDataToSave, 
                startDate: projectDataToSave.startDate, 
                endDate: projectDataToSave.endDate,     
                budget: budgetToSave, 
             } as ProjectData; 
             setSelectedProject(updatedProjectData);
        }
      } else {
        projectDataToSave.createdAt = now;
        // projectDataToSave.uploadedFiles = []; Removed
        await addDoc(collection(db, "projectsPPM"), projectDataToSave);
        toast({ title: "Project Added", description: `"${values.name}" has been added.` });
      }
      setIsAddProjectDialogOpen(false);
      setEditingProject(null);
      projectForm.reset({ name: "", description: "", status: "Planning", startDate: new Date(), endDate: null, budget: "0", managerId: "" });
    } catch (error) {
      console.error("Error saving project: ", error);
      toast({ title: "Error", description: "Could not save project.", variant: "destructive" });
    }
  };
  
  const handleDeleteProjectRequest = () => {
    setShowDeleteInfoAlert(true);
  };


  const onTaskSubmit = async (values: TaskFormValues) => {
    if (!selectedProject?.id) {
        toast({ title: "Error", description: "No project selected to add task to.", variant: "destructive" });
        return;
    }
    const projectId = selectedProject.id;
    const now = Timestamp.now();
    const taskData: Omit<TaskData, 'id'> = { 
        ...values, 
        projectId: projectId,
        createdAt: now, 
        lastUpdatedAt: now 
    };
    try {
      await addDoc(collection(db, "projectsPPM", projectId, "tasks"), taskData);
      toast({ title: "Task Added", description: `Task "${values.title}" added to ${selectedProject.name}.` });
      setIsAddTaskDialogOpen(false);
      taskForm.reset();
      await updateProjectTimestamp(projectId);
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error Adding Task", description: `Could not add task. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  };

  // Removed handleFileUpload and handleDeleteFile functions

  const onUpdateNoteSubmit = async (values: UpdateNoteFormValues) => {
    if (!selectedProject?.id || !currentUser) {
        toast({ title: "Error", description: "No project selected or user not logged in.", variant: "destructive" });
        return;
    }
    const projectId = selectedProject.id;
    const now = Timestamp.now();
    const updateData: Omit<UpdateNoteData, 'id'> = { 
      projectId: projectId, 
      note: values.note,
      date: Timestamp.fromDate(values.date),
      authorId: currentUser.uid,
      authorName: currentUsername || "System User",
      createdAt: now,
    };
    try {
      await addDoc(collection(db, "projectsPPM", projectId, "updates"), updateData);
      toast({ title: "Update Note Added", description: `Update added to ${selectedProject.name}.` });
      setIsAddUpdateDialogOpen(false);
      updateNoteForm.reset({ note: "", date: new Date() });
      await updateProjectTimestamp(projectId);
    } catch (error) {
      console.error("Error adding update note:", error);
      toast({ title: "Error Adding Update", description: `Could not add update. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  };
  
  const requestSort = (key: SortableProjectKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedProjects = useMemo(() => {
    let sortableItems = [...projects];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        let comparison = 0;

        if (sortConfig.key === 'startDate' || sortConfig.key === 'lastUpdatedAt') {
          comparison = (aValue as Timestamp).toDate().getTime() - (bValue as Timestamp).toDate().getTime();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = (aValue as string).localeCompare(bValue as string);
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [projects, sortConfig]);

  const getSortIcon = (key: SortableProjectKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  if (isLoading) return <div className="flex justify-center items-center h-64"><p>Loading projects...</p></div>;

  return ( 
    <div className="space-y-6">
      {!selectedProject ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"> <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center"> <Briefcase className="h-8 w-8 text-primary" /> </div> <h1 className="text-3xl font-bold font-headline tracking-tight">Projects Portfolio</h1> </div>
            <Button onClick={() => handleOpenAddProjectDialog()}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Project </Button>
          </div>
          {projects.length > 0 ? (
             <Card className="shadow-lg">
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">
                                    Project Name {getSortIcon('name')}
                                </TableHead>
                                <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
                                    Status {getSortIcon('status')}
                                </TableHead>
                                <TableHead onClick={() => requestSort('startDate')} className="cursor-pointer hover:bg-muted/50">
                                    Start Date {getSortIcon('startDate')}
                                </TableHead>
                                <TableHead onClick={() => requestSort('lastUpdatedAt')} className="cursor-pointer hover:bg-muted/50">
                                    Last Updated {getSortIcon('lastUpdatedAt')}
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedProjects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell className="font-medium">{project.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={project.status === "Completed" ? "default" : "secondary"} className={cn( project.status === "Completed" && "bg-green-500 text-white", project.status === "In Progress" && "bg-blue-500 text-white", project.status === "On Hold" && "bg-yellow-500 text-black", project.status === "Cancelled" && "bg-red-500 text-white", project.status === "Planning" && "bg-gray-400 text-white" )}> {project.status} </Badge>
                                    </TableCell>
                                    <TableCell>{project.startDate ? format(project.startDate.toDate(), "PP") : "N/A"}</TableCell>
                                    <TableCell>{formatDistanceToNow(project.lastUpdatedAt.toDate(), { addSuffix: true })}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedProject(project)} className="h-8 w-8" title="View Details"> <FileText className="h-4 w-4" /> </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenAddProjectDialog(project)} className="h-8 w-8" title="Edit"> <Edit3 className="h-4 w-4" /> </Button>
                                            <Button variant="ghost" size="icon" onClick={handleDeleteProjectRequest} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" title="Delete Info"> <Trash2 className="h-4 w-4" /> </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
          ) : (
            <Card><CardContent className="pt-6 text-center text-muted-foreground"> <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-3" /> <p className="text-lg font-medium">No projects found.</p> <p>Get started by adding your first project!</p> </CardContent></Card>
          )}
        </>
      ) : (
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
          <TabsList className="grid w-full grid-cols-3"> {/* Adjusted grid columns */}
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            {/* Document TabTrigger removed */}
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
                  <Card> <CardHeader><CardTitle className="text-base">Budget</CardTitle></CardHeader> <CardContent><p>{selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : "$0"}</p></CardContent> </Card>
                  <Card> <CardHeader><CardTitle className="text-base">Manager</CardTitle></CardHeader> <CardContent className="flex items-center gap-2"> <Avatar className="h-8 w-8"> <AvatarImage src={`https://placehold.co/40x40.png?text=${selectedProject.managerName ? selectedProject.managerName.substring(0,1).toUpperCase() : 'P'}`} alt={selectedProject.managerName || "Manager"} data-ai-hint="person avatar"/> <AvatarFallback>{selectedProject.managerName ? selectedProject.managerName.substring(0,1).toUpperCase() : "P"}</AvatarFallback> </Avatar> <p className="text-sm font-semibold">{selectedProject.managerName || "N/A"}</p> </CardContent> </Card>
                </div>
                {selectedProject.budget > 0 && typeof selectedProject.spent === 'number' && (
                  <Card className="mb-4"> <CardHeader><CardTitle className="text-base">Budget Utilization</CardTitle></CardHeader> <CardContent> <Progress value={(selectedProject.spent / selectedProject.budget) * 100} className="h-2.5" /> <p className="text-sm text-muted-foreground mt-1"> ${(selectedProject.spent || 0).toLocaleString()} spent of ${selectedProject.budget.toLocaleString()} ({((selectedProject.spent / selectedProject.budget) * 100).toFixed(1)}%) </p> </CardContent> </Card>
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
                <Button onClick={() => { 
                    if (!selectedProject?.id) {
                        toast({ title: "Error", description: "Cannot add task: No project selected.", variant: "destructive" });
                        return;
                    }
                    taskForm.reset({ title: "", description: "", status: "To Do" }); 
                    setIsAddTaskDialogOpen(true); 
                }}><PlusCircle className="mr-2 h-4 w-4"/>Add Task</Button>
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
          
          {/* Document TabContent removed */}

          <TabsContent value="updates" className="mt-4">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary"/>Project Updates</CardTitle>
                        <CardDescription>Log and view project updates. Last project update: {formatDistanceToNow(selectedProject.lastUpdatedAt.toDate(), { addSuffix: true })}</CardDescription>
                    </div>
                    <Button onClick={() => { 
                         if (!selectedProject?.id) {
                            toast({ title: "Error", description: "Cannot add update: No project selected.", variant: "destructive" });
                            return;
                        }
                        updateNoteForm.reset({ note: "", date: new Date() }); 
                        setIsAddUpdateDialogOpen(true); 
                    }}><PlusCircle className="mr-2 h-4 w-4"/>Add Update</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projectUpdates.length > 0 ? projectUpdates.map(update => (
                    <Card key={update.id}>
                      <CardContent className="pt-4">
                        <p className="text-sm whitespace-pre-wrap">{update.note}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Effective: {format(update.date.toDate(), "PPP")} | Logged by {update.authorName || "System"} {formatDistanceToNow(update.createdAt.toDate(), { addSuffix: true })}
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
            <Button variant="destructive" onClick={handleDeleteProjectRequest}> <Trash2 className="mr-2 h-4 w-4" /> Delete Project </Button>
        </div>

        {/* Dialogs for Add Task and Add Update - moved inside detail view */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent key={`${selectedProject.id}-task-dialog`}>
              <DialogHeader><DialogTitle>Add New Task</DialogTitle><DialogDescription>Fill in the details for the new task for {selectedProject?.name || "the current project"}.</DialogDescription></DialogHeader>
              <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4 py-4">
                  <div><Label htmlFor="task-title">Title</Label><Controller name="title" control={taskForm.control} render={({ field }) => <Input id="task-title" {...field} placeholder="Task Title"/>} />{taskForm.formState.errors.title && <p className="text-xs text-destructive">{taskForm.formState.errors.title.message}</p>}</div>
                  <div><Label htmlFor="task-description">Description (Optional)</Label><Controller name="description" control={taskForm.control} render={({ field }) => <Textarea id="task-description" {...field} placeholder="Describe the task..."/>} /></div>
                  <div><Label htmlFor="task-status">Status</Label><Controller name="status" control={taskForm.control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="task-status"><SelectValue /></SelectTrigger><SelectContent>{taskStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>)} /></div>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={taskForm.formState.isSubmitting}>{taskForm.formState.isSubmitting ? "Adding..." : "Add Task"}</Button></DialogFooter>
              </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddUpdateDialogOpen} onOpenChange={setIsAddUpdateDialogOpen}>
          <DialogContent key={`${selectedProject.id}-update-dialog`}> 
              <DialogHeader><DialogTitle>Add Project Update</DialogTitle><DialogDescription>Log an update for {selectedProject?.name || "the current project"}.</DialogDescription></DialogHeader>
              <form onSubmit={updateNoteForm.handleSubmit(onUpdateNoteSubmit)} className="space-y-4 py-4">
                  <div><Label htmlFor="update-note">Update Note</Label><Controller name="note" control={updateNoteForm.control} render={({ field }) => <Textarea id="update-note" {...field} rows={4} placeholder="Describe the update..."/>} />{updateNoteForm.formState.errors.note && <p className="text-xs text-destructive">{updateNoteForm.formState.errors.note.message}</p>}</div>
                  <div><Label htmlFor="update-date">Effective Date</Label><Controller name="date" control={updateNoteForm.control} render={({ field }) => (<Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>)} />{updateNoteForm.formState.errors.date && <p className="text-xs text-destructive">{updateNoteForm.formState.errors.date.message}</p>}</div>
                  <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={updateNoteForm.formState.isSubmitting}>{updateNoteForm.formState.isSubmitting ? "Adding..." : "Add Update"}</Button></DialogFooter>
              </form>
          </DialogContent>
        </Dialog>
      </div>
      )}


      <Dialog open={isAddProjectDialogOpen} onOpenChange={(isOpen) => { setIsAddProjectDialogOpen(isOpen); if (!isOpen) { projectForm.reset({ name: "", description: "", status: "Planning", startDate: new Date(), endDate: null, budget: "0", managerId: "" }); setEditingProject(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader> <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle> <DialogDescription> {editingProject ? "Update the details of this project." : "Fill in the details for the new project."} </DialogDescription> </DialogHeader>
          <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="name" className="text-right">Name</Label> <Controller name="name" control={projectForm.control} render={({ field }) => <Input id="name" {...field} className="col-span-3" placeholder="Project Alpha"/>} /> {projectForm.formState.errors.name && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.name.message}</p>} </div>
            <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="description" className="text-right pt-2">Description</Label> <Controller name="description" control={projectForm.control} render={({ field }) => <Textarea id="description" {...field} className="col-span-3" rows={3} placeholder="Briefly describe the project..."/>} /> {projectForm.formState.errors.description && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.description.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="status" className="text-right">Status</Label> <Controller name="status" control={projectForm.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger className="col-span-3" id="status"><SelectValue placeholder="Select status" /></SelectTrigger> <SelectContent> {projectStatusOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))} </SelectContent> </Select> )} /> {projectForm.formState.errors.status && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.status.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="managerId" className="text-right">Manager</Label> <Controller name="managerId" control={projectForm.control} render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger className="col-span-3" id="managerId"><SelectValue placeholder="Select manager" /></SelectTrigger> <SelectContent> {mockUsers.map(user => (<SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>))} </SelectContent> </Select> )} /> {projectForm.formState.errors.managerId && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.managerId.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="startDate" className="text-right">Start Date</Label> <Controller name="startDate" control={projectForm.control} render={({ field }) => ( <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span>Pick start date</span>} </Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover> )} /> {projectForm.formState.errors.startDate && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.startDate.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="endDate" className="text-right">End Date</Label> <Controller name="endDate" control={projectForm.control} render={({ field }) => ( <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span className="text-muted-foreground">Pick end date (optional)</span>} </Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} /></PopoverContent></Popover> )} /> {projectForm.formState.errors.endDate && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.endDate.message}</p>} </div>
            <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="budget" className="text-right">Budget ($)</Label> <Controller name="budget" control={projectForm.control} render={({ field }) => <Input id="budget" type="text" {...field} value={field.value === undefined ? "" : String(field.value)} onChange={e => { const value = e.target.value.replace(/[^0-9.]/g, ''); field.onChange(value === '' ? undefined : value);}} className="col-span-3" placeholder="e.g., 50000 (defaults to 0)"/>} /> {projectForm.formState.errors.budget && <p className="col-span-4 text-right text-xs text-destructive">{projectForm.formState.errors.budget.message}</p>} </div>
            <DialogFooter> <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose> <Button type="submit" disabled={projectForm.formState.isSubmitting}> {projectForm.formState.isSubmitting ? (editingProject ? "Saving..." : "Adding...") : (editingProject ? "Save Changes" : "Add Project")} </Button> </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteInfoAlert} onOpenChange={setShowDeleteInfoAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project Deletion Information</AlertDialogTitle>
            <AlertDialogDescription>
              Contact Developer To Delete Projects. Projects are designed for long-term archival and cannot be deleted directly through this interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDeleteInfoAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

