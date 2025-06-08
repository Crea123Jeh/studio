
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { Archive as ArchiveIcon, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


// Interfaces (mirroring ProjectData from project/page.tsx for consistency)
interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  storagePath: string;
  uploadedAt: Timestamp;
}
interface ArchivedProjectData {
  id: string;
  name: string;
  description: string;
  status: "Planning" | "In Progress" | "Completed" | "On Hold" | "Cancelled";
  startDate: Timestamp;
  endDate: Timestamp | null;
  budget: number; 
  managerId?: string;
  managerName?: string;
  spent?: number; 
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp; // This would be the time it was archived or last updated before archive
  uploadedFiles?: UploadedFile[];
}

type SortableArchivedProjectKeys = 'name' | 'status' | 'startDate' | 'lastUpdatedAt' | 'managerName';


export default function ArchivedProjectsPage() {
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArchivedProject, setSelectedArchivedProject] = useState<ArchivedProjectData | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableArchivedProjectKeys; direction: 'ascending' | 'descending' }>({ key: 'lastUpdatedAt', direction: 'descending' });

  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const archivedProjectsCollectionRef = collection(db, "archivedProjectsPPM");
    const q = query(archivedProjectsCollectionRef, orderBy("lastUpdatedAt", "desc")); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "Untitled Archived Project",
          description: data.description || "No description",
          status: data.status || "Completed", // Default to completed if status is missing
          startDate: data.startDate || Timestamp.now(),
          endDate: data.endDate || null,
          budget: data.budget || 0,
          managerId: data.managerId,
          managerName: data.managerName || "N/A",
          spent: data.spent,
          createdAt: data.createdAt || Timestamp.now(),
          lastUpdatedAt: data.lastUpdatedAt || Timestamp.now(),
          uploadedFiles: data.uploadedFiles || [],
        } as ArchivedProjectData;
      });
      setArchivedProjects(fetchedProjects);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching archived projects: ", error);
      toast({ title: "Error", description: "Could not fetch archived projects.", variant: "destructive" });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleOpenDetailsDialog = (project: ArchivedProjectData) => {
    setSelectedArchivedProject(project);
    setIsDetailsDialogOpen(true);
  };

  const requestSort = (key: SortableArchivedProjectKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableArchivedProjectKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const sortedArchivedProjects = useMemo(() => {
    let sortableItems = [...archivedProjects];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        let comparison = 0;
        if (aVal instanceof Timestamp && bVal instanceof Timestamp) {
          comparison = aVal.toDate().getTime() - bVal.toDate().getTime();
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [archivedProjects, sortConfig]);


  if (isLoading) return <div className="flex justify-center items-center h-64"><p>Loading archived projects...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArchiveIcon className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Archived Projects</h1>
      </div>
      <CardDescription>View read-only details of projects that have been archived.</CardDescription>
      
      {archivedProjects.length > 0 ? (
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">Name {getSortIcon('name')}</TableHead>
                  <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">Status (Archived) {getSortIcon('status')}</TableHead>
                  <TableHead onClick={() => requestSort('managerName')} className="cursor-pointer hover:bg-muted/50">Manager {getSortIcon('managerName')}</TableHead>
                  <TableHead onClick={() => requestSort('lastUpdatedAt')} className="cursor-pointer hover:bg-muted/50">Archived On {getSortIcon('lastUpdatedAt')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedArchivedProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant={project.status === "Completed" ? "default" : "secondary"} 
                        className={cn(
                          project.status === "Completed" && "bg-green-600 text-white", 
                          project.status === "In Progress" && "bg-primary text-primary-foreground", 
                          project.status === "On Hold" && "bg-secondary text-secondary-foreground", 
                          project.status === "Cancelled" && "bg-destructive text-destructive-foreground", 
                          project.status === "Planning" && "bg-muted text-muted-foreground",
                          "opacity-75" // Indicate archived state
                        )}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.managerName || "N/A"}</TableCell>
                    <TableCell>{formatDistanceToNow(project.lastUpdatedAt.toDate(), { addSuffix: true })}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDetailsDialog(project)} className="h-8 w-8 hover:bg-accent/20" title="View Details">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <ArchiveIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-lg font-medium">No projects have been archived yet.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Archived Project: {selectedArchivedProject?.name}</DialogTitle>
            <DialogDescription>Read-only details. This project was archived on {selectedArchivedProject ? format(selectedArchivedProject.lastUpdatedAt.toDate(), "PPPp") : 'N/A'}.</DialogDescription>
          </DialogHeader>
          {selectedArchivedProject && (
            <ScrollArea className="max-h-[70vh] p-1 pr-3">
              <div className="space-y-4 py-4">
                <h3 className="font-semibold text-lg text-foreground">Project Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Name:</Label><p className="text-sm text-muted-foreground">{selectedArchivedProject.name}</p></div>
                    <div><Label>Status (at archive):</Label><p><Badge variant={selectedArchivedProject.status === "Completed" ? "default" : "secondary"} className={cn(selectedArchivedProject.status === "Completed" && "bg-green-600 text-white", "opacity-75")}>{selectedArchivedProject.status}</Badge></p></div>
                    <div><Label>Start Date:</Label><p className="text-sm text-muted-foreground">{format(selectedArchivedProject.startDate.toDate(), "PPP")}</p></div>
                    <div><Label>End Date:</Label><p className="text-sm text-muted-foreground">{selectedArchivedProject.endDate ? format(selectedArchivedProject.endDate.toDate(), "PPP") : "N/A"}</p></div>
                    <div><Label>Budget:</Label><p className="text-sm text-muted-foreground">${selectedArchivedProject.budget.toLocaleString()}</p></div>
                    {typeof selectedArchivedProject.spent === 'number' && <div><Label>Spent:</Label><p className="text-sm text-muted-foreground">${selectedArchivedProject.spent.toLocaleString()}</p></div>}
                     <div><Label>Manager:</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={`https://placehold.co/40x40.png?text=${selectedArchivedProject.managerName ? selectedArchivedProject.managerName.substring(0,1).toUpperCase() : 'P'}`} alt={selectedArchivedProject.managerName || "Manager"} data-ai-hint="person avatar small"/>
                                <AvatarFallback>{selectedArchivedProject.managerName ? selectedArchivedProject.managerName.substring(0,1).toUpperCase() : "P"}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">{selectedArchivedProject.managerName || "N/A"}</span>
                        </div>
                    </div>
                </div>
                <div>
                  <Label>Description:</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-2 bg-muted/30 rounded-md mt-1">{selectedArchivedProject.description}</p>
                </div>

                {selectedArchivedProject.uploadedFiles && selectedArchivedProject.uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-md text-foreground mb-2">Archived Documents:</h4>
                    <ul className="space-y-2">
                      {selectedArchivedProject.uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                           <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:underline">
                              {file.name}
                            </a>
                           </div>
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Could add read-only views for tasks and updates here if needed in future */}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
