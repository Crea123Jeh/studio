
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { Briefcase, ListChecks, FileText, Users, Paperclip, MessageCircle, PlusCircle, ArrowLeft, Edit3, Trash2 } from "lucide-react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const projectStatusOptions = ["Planning", "In Progress", "Completed", "On Hold", "Cancelled"] as const;

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(projectStatusOptions),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date().optional(),
  budget: z.string().optional().refine(val => !val || !isNaN(parseFloat(val)), { message: "Budget must be a number."}).transform(val => val ? parseFloat(val) : undefined),
  managerName: z.string().min(2, "Manager name is required."),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: typeof projectStatusOptions[number];
  startDate: Timestamp;
  endDate: Timestamp | null; // Explicitly Timestamp or null
  budget?: number;
  managerName: string;
  managerAvatar?: string; 
  spent?: number; 
  createdAt: Timestamp;
}


export default function ProjectInfoPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);

  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Planning",
      managerName: "",
    },
  });

 useEffect(() => {
    setIsLoading(true);
    const projectsCollection = collection(db, "projectsPPM");
    const q = query(projectsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        // Defensive mapping to ensure types match ProjectData
        const mappedData: ProjectData = {
            id: docSnap.id,
            name: data.name || "Untitled Project", 
            description: data.description || "No description provided.", 
            status: projectStatusOptions.includes(data.status) ? data.status : "Planning",
            startDate: data.startDate instanceof Timestamp ? data.startDate : Timestamp.fromDate(new Date(1970, 0, 1)),
            endDate: data.endDate instanceof Timestamp ? data.endDate : (data.endDate === null ? null : null),
            budget: typeof data.budget === 'number' ? data.budget : undefined,
            managerName: data.managerName || "N/A", 
            managerAvatar: data.managerAvatar, 
            spent: typeof data.spent === 'number' ? data.spent : undefined,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(1970, 0, 1)), 
        };
        return mappedData;
      });
      setProjects(fetchedProjects);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ title: "Error", description: "Could not fetch projects.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleOpenAddDialog = (projectToEdit: ProjectData | null = null) => {
    setEditingProject(projectToEdit);
    if (projectToEdit) {
      form.reset({
        name: projectToEdit.name,
        description: projectToEdit.description,
        status: projectToEdit.status,
        startDate: projectToEdit.startDate.toDate(),
        endDate: projectToEdit.endDate ? projectToEdit.endDate.toDate() : undefined,
        budget: projectToEdit.budget?.toString(),
        managerName: projectToEdit.managerName,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        status: "Planning",
        startDate: new Date(),
        endDate: undefined,
        budget: "",
        managerName: "",
      });
    }
    setIsAddProjectDialogOpen(true);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    const projectDataToSave = {
      ...values,
      startDate: Timestamp.fromDate(values.startDate),
      endDate: values.endDate ? Timestamp.fromDate(values.endDate) : null,
      budget: values.budget, 
    };

    try {
      if (editingProject) {
        const projectRef = doc(db, "projectsPPM", editingProject.id);
        await updateDoc(projectRef, projectDataToSave);
        toast({ title: "Project Updated", description: `"${values.name}" has been updated successfully.` });
      } else {
        await addDoc(collection(db, "projectsPPM"), { ...projectDataToSave, createdAt: Timestamp.now() });
        toast({ title: "Project Added", description: `"${values.name}" has been added successfully.` });
      }
      setIsAddProjectDialogOpen(false);
      setEditingProject(null);
      form.reset();
    } catch (error) {
      console.error("Error saving project: ", error);
      toast({ title: "Error", description: "Could not save project. Please try again.", variant: "destructive" });
    }
  };
  
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "projectsPPM", projectId));
      toast({title: "Project Deleted", description: `"${projectName}" has been deleted.`});
      if (selectedProject?.id === projectId) {
        setSelectedProject(null); 
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({title: "Error", description: "Could not delete project.", variant: "destructive"});
    }
  };


  const ProjectCard = ({ project }: { project: ProjectData }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <Badge 
            variant={project.status === "Completed" ? "default" : "secondary"} 
            className={cn(
                project.status === "Completed" && "bg-green-500 text-white",
                project.status === "In Progress" && "bg-blue-500 text-white",
                project.status === "On Hold" && "bg-yellow-500 text-black",
                project.status === "Cancelled" && "bg-red-500 text-white",
                project.status === "Planning" && "bg-gray-400 text-white"
            )}
          >
            {project.status}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Manager: {project.managerName} | Start: {project.startDate ? format(project.startDate.toDate(), "PP") : "N/A"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setSelectedProject(project)}>View Details</Button>
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleOpenAddDialog(project)} className="h-8 w-8">
                <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(project.id, project.name)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Loading projects...</p></div>;
  }

  if (selectedProject) {
    const progress = selectedProject.budget && selectedProject.spent ? (selectedProject.spent / selectedProject.budget) * 100 : 0;
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedProject(null)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project List
        </Button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{selectedProject.name}</h1>
          </div>
          <Badge 
             variant={selectedProject.status === "Completed" ? "default" : "secondary"} 
             className={cn(
                "text-sm whitespace-nowrap",
                selectedProject.status === "Completed" && "bg-green-500 text-white",
                selectedProject.status === "In Progress" && "bg-blue-500 text-white",
                selectedProject.status === "On Hold" && "bg-yellow-500 text-black",
                selectedProject.status === "Cancelled" && "bg-red-500 text-white",
                selectedProject.status === "Planning" && "bg-gray-400 text-white"
            )}
          >
            {selectedProject.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">{selectedProject.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base">Start Date</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-semibold">{selectedProject.startDate ? format(selectedProject.startDate.toDate(), "PPP") : "N/A"}</p></CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base">End Date</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-semibold">{selectedProject.endDate ? format(selectedProject.endDate.toDate(), "PPP") : "N/A"}</p></CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base">Budget</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-semibold">{selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : "N/A"}</p></CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base">Project Manager</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedProject.managerAvatar || `https://placehold.co/40x40.png?text=${selectedProject.managerName ? selectedProject.managerName.substring(0,1) : 'P'}`} alt={selectedProject.managerName} data-ai-hint="person avatar"/>
                <AvatarFallback>{selectedProject.managerName ? selectedProject.managerName.substring(0,1) : "P"}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold">{selectedProject.managerName}</p>
            </CardContent>
          </Card>
        </div>
        
        {selectedProject.budget && selectedProject.spent !== undefined && (
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base">Budget Utilization</CardTitle></CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ${(selectedProject.spent || 0).toLocaleString()} spent of ${selectedProject.budget.toLocaleString()} ({progress.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Project Details</CardTitle></CardHeader>
              <CardContent>
                <Image src="https://placehold.co/600x300.png" alt="Project Visual" width={600} height={300} className="w-full h-auto rounded-md mb-4" data-ai-hint="project chart" />
                <p>Further project details, objectives, KPIs, risk assessments, and stakeholder information would be displayed here. This section can be expanded with more dynamic content related to the project.</p>
              </CardContent>
            </Card>
          </TabsContent>
          {[ "tasks", "team", "documents", "updates"].map(tabName => (
             <TabsContent key={tabName} value={tabName} className="mt-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 capitalize">
                            {tabName === "tasks" && <ListChecks className="h-5 w-5 text-primary"/>}
                            {tabName === "team" && <Users className="h-5 w-5 text-primary"/>}
                            {tabName === "documents" && <Paperclip className="h-5 w-5 text-primary"/>}
                            {tabName === "updates" && <MessageCircle className="h-5 w-5 text-primary"/>}
                            {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Content for {tabName} will be managed here. This section is currently a placeholder for future development (e.g., integrating with sub-collections in Firestore or other modules).</p>
                    </CardContent>
                </Card>
            </TabsContent>
          ))}
        </Tabs>
         <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenAddDialog(selectedProject)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Project
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Project
            </Button>
        </div>
      </div>
    );
  }

  // Project List View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
             <Briefcase className="h-8 w-8 text-primary" />
           </div>
           <h1 className="text-3xl font-bold font-headline tracking-tight">Projects Portfolio</h1>
        </div>
        <Button onClick={() => handleOpenAddDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-lg font-medium">No projects found.</p>
            <p>Get started by adding your first project!</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Update the details of this project." : "Fill in the details for the new project."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" {...form.register("name")} className="col-span-3" placeholder="Project Alpha"/>
              {form.formState.errors.name && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <Textarea id="description" {...form.register("description")} className="col-span-3" rows={3} placeholder="Briefly describe the project..."/>
              {form.formState.errors.description && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="col-span-3" id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStatusOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.status && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.status.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">Start Date</Label>
              <Controller
                name="startDate"
                control={form.control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <ListChecks className="mr-2 h-4 w-4" /> 
                        {field.value ? format(field.value, "PPP") : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.startDate && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.startDate.message}</p>}
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">End Date</Label>
               <Controller
                name="endDate"
                control={form.control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <ListChecks className="mr-2 h-4 w-4" /> 
                        {field.value ? format(field.value, "PPP") : 
                          <span className="text-muted-foreground">Pick end date (optional)</span>
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.endDate && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.endDate.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="budget" className="text-right">Budget ($)</Label>
              <Input id="budget" type="number" {...form.register("budget")} className="col-span-3" placeholder="e.g., 50000 (optional)"/>
              {form.formState.errors.budget && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.budget.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="managerName" className="text-right">Manager</Label>
              <Input id="managerName" {...form.register("managerName")} className="col-span-3" placeholder="Manager's name"/>
              {form.formState.errors.managerName && <p className="col-span-4 text-right text-xs text-destructive">{form.formState.errors.managerName.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (editingProject ? "Saving..." : "Adding...") : (editingProject ? "Save Changes" : "Add Project")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

