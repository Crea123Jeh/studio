
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { formatDistanceToNow } from "date-fns";
import { Crosshair, PlusCircle, Edit3, Trash2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

type TargetStatus = "To Do" | "In Progress" | "Done" | "Archived";
const targetStatusOptions: TargetStatus[] = ["To Do", "In Progress", "Done", "Archived"];

interface TargetListEntry {
  id: string;
  targetName: string;
  description: string;
  followUpAssignment: string;
  status: TargetStatus;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  addedByUserId?: string;
  addedByUserName?: string;
}

export default function TargetListPage() {
  const [targetEntries, setTargetEntries] = useState<TargetListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TargetListEntry | null>(null);
  const [isDeleteInfoAlertOpen, setIsDeleteInfoAlertOpen] = useState(false);

  // Form state
  const [targetName, setTargetName] = useState("");
  const [description, setDescription] = useState("");
  const [followUpAssignment, setFollowUpAssignment] = useState("");
  const [status, setStatus] = useState<TargetStatus>("To Do");

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const entriesCollectionRef = collection(db, "targetListItems");
    const q = query(entriesCollectionRef, orderBy("lastUpdatedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as TargetListEntry));
      setTargetEntries(fetchedEntries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching target list entries: ", error);
      toast({ title: "Error", description: "Could not fetch target list entries.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setTargetName("");
    setDescription("");
    setFollowUpAssignment("");
    setStatus("To Do");
    setEditingEntry(null);
  };

  const handleOpenFormDialog = (entry: TargetListEntry | null = null) => {
    if (entry) {
      setEditingEntry(entry);
      setTargetName(entry.targetName);
      setDescription(entry.description);
      setFollowUpAssignment(entry.followUpAssignment);
      setStatus(entry.status);
    } else {
      resetForm();
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveEntry = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetName || !description || !followUpAssignment) {
      toast({ title: "Missing Information", description: "Please fill all required fields for the target.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to save entries.", variant: "destructive" });
      return;
    }

    const now = Timestamp.now();
    const entryData = {
      targetName,
      description,
      followUpAssignment,
      status,
      lastUpdatedAt: now,
      addedByUserId: user.uid,
      addedByUserName: user.displayName || user.email || "Unknown User",
    };

    try {
      if (editingEntry) {
        const entryRef = doc(db, "targetListItems", editingEntry.id);
        await updateDoc(entryRef, entryData);
        toast({ title: "Target Updated", description: `"${targetName}" has been updated.` });
      } else {
        await addDoc(collection(db, "targetListItems"), { ...entryData, createdAt: now });
        toast({ title: "Target Added", description: `"${targetName}" has been added to the list.` });
      }
      resetForm();
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error saving target entry: ", error);
      toast({ title: "Save Error", description: "Could not save the target entry.", variant: "destructive" });
    }
  };

  // This function remains for potential future use or direct calls if needed, but UI won't call it directly.
  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm("Are you sure you want to delete this target entry? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "targetListItems", entryId));
      toast({ title: "Target Deleted", description: "The target entry has been successfully deleted." });
    } catch (error) {
      console.error("Error deleting target entry: ", error);
      toast({ title: "Deletion Error", description: "Could not delete the target entry.", variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (currentStatus: TargetStatus) => {
    switch (currentStatus) {
      case "To Do": return "bg-muted text-muted-foreground";
      case "In Progress": return "bg-blue-500 text-white hover:bg-blue-600";
      case "Done": return "bg-green-600 text-white hover:bg-green-700";
      case "Archived": return "bg-gray-400 text-white hover:bg-gray-500";
      default: return "outline";
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Loading target list...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Target List</h1>
        </div>
        <Button variant="outline" onClick={() => handleOpenFormDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Target
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Manage Targets</CardTitle>
          <CardDescription>Track individuals or items for follow-up and specific assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Description (Summary)</TableHead>
                <TableHead className="hidden lg:table-cell">Follow-up Assignment (Summary)</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targetEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{entry.targetName}</TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusBadgeVariant(entry.status))}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate hidden md:table-cell max-w-xs">{entry.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate hidden lg:table-cell max-w-xs">{entry.followUpAssignment}</TableCell>
                  <TableCell>{formatDistanceToNow(entry.lastUpdatedAt.toDate(), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Target" onClick={() => handleOpenFormDialog(entry)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Delete Target (Restricted)" onClick={() => setIsDeleteInfoAlertOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {targetEntries.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground">
              <Crosshair className="mx-auto h-12 w-12 mb-3" />
              <p>No targets recorded yet. Add one to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => {
        setIsFormDialogOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Target Entry" : "Add New Target Entry"}</DialogTitle>
            <DialogDescription>
              {editingEntry ? "Update the details for this target." : "Enter the details for the new target."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEntry}>
            <ScrollArea className="max-h-[70vh] p-1">
              <div className="grid gap-4 py-4 pr-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="targetName" className="text-right">Target Name</Label>
                  <Input id="targetName" value={targetName} onChange={(e) => setTargetName(e.target.value)} className="col-span-3" required placeholder="e.g., John Doe / Project X" />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right pt-2">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={3} required placeholder="Reason for targeting, initial observations..." />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="followUpAssignment" className="text-right pt-2">Follow-up Assignment</Label>
                  <Textarea id="followUpAssignment" value={followUpAssignment} onChange={(e) => setFollowUpAssignment(e.target.value)} className="col-span-3" rows={3} required placeholder="Next steps, tasks, or assignment details..." />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as TargetStatus)}>
                    <SelectTrigger className="col-span-3" id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>{targetStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{editingEntry ? "Save Changes" : "Add Target"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteInfoAlertOpen} onOpenChange={setIsDeleteInfoAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletion Restricted</AlertDialogTitle>
            <AlertDialogDescription>
              To delete target entries, please contact a developer. These records are designed for archival and cannot be modified or erased through this interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsDeleteInfoAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
