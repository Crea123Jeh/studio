
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Info, Edit3, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type LatihanSoalStatus = "Available" | "Unavailable" | "Grabbing";
const latihanSoalStatusOptions: LatihanSoalStatus[] = ["Available", "Unavailable", "Grabbing"];

interface LatihanSoalItem {
  id: string;
  questionName: string;
  description: string;
  status: LatihanSoalStatus;
  hasPassed: boolean;
  lastEdited: Timestamp;
  createdAt: Timestamp;
  editedByUserId?: string;
  editedByUserName?: string;
}

export default function LatihanSoalSigmaPage() {
  const [items, setItems] = useState<LatihanSoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LatihanSoalItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LatihanSoalItem | null>(null);

  // Form state
  const [formQuestionName, setFormQuestionName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<LatihanSoalStatus>("Available");
  const [formHasPassed, setFormHasPassed] = useState(false);

  const { toast } = useToast();
  const { user, username } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const itemsCollectionRef = collection(db, "latihanSoalSigmaItems");
    const q = query(itemsCollectionRef, orderBy("lastEdited", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as LatihanSoalItem));
      setItems(fetchedItems);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching Latihan Soal Sigma items: ", error);
      toast({ title: "Error", description: "Could not fetch items.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setFormQuestionName("");
    setFormDescription("");
    setFormStatus("Available");
    setFormHasPassed(false);
    setEditingItem(null);
  };

  const handleOpenFormDialog = (item: LatihanSoalItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormQuestionName(item.questionName);
      setFormDescription(item.description);
      setFormStatus(item.status);
      setFormHasPassed(item.hasPassed);
    } else {
      resetForm();
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!formQuestionName || !formDescription) {
      toast({ title: "Missing Information", description: "Please fill Question Name and Description.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const now = Timestamp.now();
    let currentStatus = formStatus;
    if (formHasPassed) {
      currentStatus = "Unavailable";
    }

    const itemData = {
      questionName: formQuestionName,
      description: formDescription,
      status: currentStatus,
      hasPassed: formHasPassed,
      lastEdited: now,
      editedByUserId: user.uid,
      editedByUserName: username || "Unknown User",
    };

    try {
      if (editingItem) {
        const itemRef = doc(db, "latihanSoalSigmaItems", editingItem.id);
        await updateDoc(itemRef, itemData);
        toast({ title: "Item Updated", description: `"${formQuestionName}" has been updated.` });
      } else {
        await addDoc(collection(db, "latihanSoalSigmaItems"), { ...itemData, createdAt: now });
        toast({ title: "Item Added", description: `"${formQuestionName}" has been added.` });
      }
      resetForm();
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error saving item: ", error);
      toast({ title: "Save Error", description: "Could not save the item.", variant: "destructive" });
    }
  };

  const confirmDeleteItem = (item: LatihanSoalItem) => {
    setItemToDelete(item);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "latihanSoalSigmaItems", itemToDelete.id));
      toast({ title: "Item Deleted", description: `"${itemToDelete.questionName}" has been deleted.` });
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item: ", error);
      toast({ title: "Deletion Error", description: "Could not delete the item.", variant: "destructive" });
      setItemToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: LatihanSoalStatus, hasPassed: boolean) => {
    if (hasPassed) return "bg-gray-500 text-white hover:bg-gray-600"; // Overrides other statuses if passed
    switch (status) {
      case "Available": return "bg-green-600 text-white hover:bg-green-700";
      case "Unavailable": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "Grabbing": return "bg-yellow-500 text-black hover:bg-yellow-600";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  useEffect(() => {
    // When formHasPassed changes in the dialog, update formStatus accordingly
    if (formHasPassed) {
      setFormStatus("Unavailable");
    }
  }, [formHasPassed]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading Latihan Soal Sigma...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Latihan Soal Sigma</h1>
        </div>
        <Button variant="outline" onClick={() => handleOpenFormDialog()}><PlusCircle className="mr-2 h-4 w-4"/> Add New Soal</Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">Daftar Soal Sigma</CardTitle>
          <CardDescription>Monitor and manage practice questions for Sigma training.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Last Edited</TableHead>
                <TableHead>Has Passed?</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{item.questionName}</TableCell>
                  <TableCell>
                    <Badge className={cn("flex items-center gap-1", getStatusBadgeVariant(item.status, item.hasPassed))}>
                        {item.status === "Grabbing" && !item.hasPassed && <Loader2 className="h-3 w-3 animate-spin" />}
                        {item.hasPassed ? "Unavailable (Passed)" : item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate hidden md:table-cell">{item.description}</TableCell>
                  <TableCell>{formatDistanceToNow(item.lastEdited.toDate(), { addSuffix: true })}</TableCell>
                  <TableCell>{item.hasPassed ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Item" onClick={() => handleOpenFormDialog(item)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Delete Item" onClick={() => confirmDeleteItem(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 0 && !isLoading && (
             <div className="text-center py-10 text-muted-foreground">
                <ClipboardList className="mx-auto h-12 w-12 mb-3" />
                <p>No Latihan Soal Sigma items found. Add one to get started!</p>
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
            <DialogTitle>{editingItem ? "Edit Soal Sigma" : "Add New Soal Sigma"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details for this practice question." : "Enter the details for the new practice question."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem}>
            <ScrollArea className="max-h-[70vh] p-1">
              <div className="grid gap-4 py-4 pr-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formQuestionName" className="text-right">Question Name</Label>
                  <Input id="formQuestionName" value={formQuestionName} onChange={(e) => setFormQuestionName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="formDescription" className="text-right pt-2">Description</Label>
                  <Textarea id="formDescription" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="col-span-3" rows={3} required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formHasPassed" className="text-right">Has Passed?</Label>
                  <div className="col-span-3 flex items-center">
                    <Checkbox id="formHasPassed" checked={formHasPassed} onCheckedChange={(checked) => setFormHasPassed(checked as boolean)} />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formStatus" className="text-right">Status</Label>
                  <Select 
                    value={formHasPassed ? "Unavailable" : formStatus} 
                    onValueChange={(val) => setFormStatus(val as LatihanSoalStatus)}
                    disabled={formHasPassed}
                  >
                    <SelectTrigger className="col-span-3" id="formStatus"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {latihanSoalStatusOptions.map(opt => <SelectItem key={opt} value={opt} disabled={formHasPassed && opt !== "Unavailable"}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{editingItem ? "Save Changes" : "Add Soal"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the Latihan Soal Sigma item: "{itemToDelete?.questionName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
