
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
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
import { ClipboardList, Info, Edit3, PlusCircle, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

type LatihanSoalStatus = "Available" | "Unavailable" | "Grabbing" | "Passed_NotYetDeleted" | "Passed_ToBeDeleted";
const latihanSoalStatusOptionsAll: LatihanSoalStatus[] = ["Available", "Unavailable", "Grabbing", "Passed_NotYetDeleted", "Passed_ToBeDeleted"];

const nonPassedStatusOptions: LatihanSoalStatus[] = ["Available", "Unavailable", "Grabbing"];
const passedStatusOptions: LatihanSoalStatus[] = ["Passed_NotYetDeleted", "Passed_ToBeDeleted"];


interface LatihanSoalItem {
  id: string;
  classSubject: string; 
  teacher: string; 
  status: LatihanSoalStatus;
  hasPassed: boolean;
  lastEdited: Timestamp;
  createdAt: Timestamp;
  editedByUserId?: string;
  editedByUserName?: string;
}

type SortableLSSKeys = 'classSubject' | 'teacher' | 'status' | 'lastEdited' | 'hasPassed';


export default function LatihanSoalSigmaPage() {
  const [items, setItems] = useState<LatihanSoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LatihanSoalItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LatihanSoalItem | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLSSKeys; direction: 'ascending' | 'descending' }>({ key: 'lastEdited', direction: 'descending' });

  // Form state
  const [formClassSubject, setFormClassSubject] = useState(""); 
  const [formTeacher, setFormTeacher] = useState(""); 
  const [formStatus, setFormStatus] = useState<LatihanSoalStatus>("Available");
  const [formHasPassed, setFormHasPassed] = useState(false);

  const { toast } = useToast();
  const { user, username } = useAuth();

  const statusDisplayMap: Record<LatihanSoalStatus, string> = {
    "Available": "Available",
    "Unavailable": "Unavailable (Not Passed)",
    "Grabbing": "Grabbing",
    "Passed_NotYetDeleted": "Not Yet Deleted",
    "Passed_ToBeDeleted": "Item Deleted"
  };

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
    setFormClassSubject("");
    setFormTeacher("");
    setFormStatus("Available");
    setFormHasPassed(false);
    setEditingItem(null);
  };

  const handleOpenFormDialog = (item: LatihanSoalItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormClassSubject(item.classSubject);
      setFormTeacher(item.teacher);
      setFormHasPassed(item.hasPassed); // Set hasPassed first
      setFormStatus(item.status);     // Then set status from item
    } else {
      resetForm();
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!formClassSubject || !formTeacher) {
      toast({ title: "Missing Information", description: "Please fill Class Subject and Teacher fields.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const now = Timestamp.now();
    let finalStatus = formStatus;
    // Ensure status is consistent with hasPassed
    if (formHasPassed && !passedStatusOptions.includes(formStatus)) {
        finalStatus = "Passed_NotYetDeleted"; // Default if inconsistent
    } else if (!formHasPassed && !nonPassedStatusOptions.includes(formStatus)) {
        finalStatus = "Available"; // Default if inconsistent
    }


    const itemData: Omit<LatihanSoalItem, 'id' | 'createdAt'> & { createdAt?: Timestamp } = {
      classSubject: formClassSubject,
      teacher: formTeacher,
      status: finalStatus,
      hasPassed: formHasPassed,
      lastEdited: now,
      editedByUserId: user.uid,
      editedByUserName: username || "Unknown User",
    };

    try {
      if (editingItem) {
        const itemRef = doc(db, "latihanSoalSigmaItems", editingItem.id);
        await updateDoc(itemRef, itemData as Partial<LatihanSoalItem>);
        toast({ title: "Item Updated", description: `"${formClassSubject}" has been updated.` });
      } else {
        await addDoc(collection(db, "latihanSoalSigmaItems"), { ...itemData, createdAt: now });
        toast({ title: "Item Added", description: `"${formClassSubject}" has been added.` });
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
      toast({ title: "Item Deleted", description: `"${itemToDelete.classSubject}" has been deleted.` });
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item: ", error);
      toast({ title: "Deletion Error", description: "Could not delete the item.", variant: "destructive" });
      setItemToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: LatihanSoalStatus, hasPassed: boolean) => {
    if (status === "Passed_ToBeDeleted") return "bg-orange-500 text-white hover:bg-orange-600";
    if (status === "Passed_NotYetDeleted" || hasPassed) return "bg-gray-500 text-white hover:bg-gray-600";
    switch (status) {
      case "Available": return "bg-green-600 text-white hover:bg-green-700";
      case "Unavailable": return "bg-red-500 text-white hover:bg-red-600"; // Kept red for "Unavailable (Not Passed)"
      case "Grabbing": return "bg-yellow-500 text-black hover:bg-yellow-600";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  const handleHasPassedChange = (checked: boolean) => {
    setFormHasPassed(checked);
    if (checked) {
      setFormStatus("Passed_NotYetDeleted");
    } else {
      // If unchecking, and editing an item that was originally not passed, revert to its original status if valid
      if (editingItem && !editingItem.hasPassed && nonPassedStatusOptions.includes(editingItem.status)) {
        setFormStatus(editingItem.status);
      } else {
        setFormStatus("Available"); // Default for new items or if original status was a "passed" one
      }
    }
  };


  const requestSort = (key: SortableLSSKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableLSSKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        let comparison = 0;

        if (aVal instanceof Timestamp && bVal instanceof Timestamp) {
          comparison = aVal.toDate().getTime() - bVal.toDate().getTime();
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);


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
          <CardDescription>Monitor and manage practice questions for Sigma training. Click headers to sort.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('classSubject')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Class Subject {getSortIcon('classSubject')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
                   <div className="flex items-center">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('teacher')} className="cursor-pointer hover:bg-muted/50 hidden md:table-cell">
                  <div className="flex items-center">Teacher {getSortIcon('teacher')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('lastEdited')} className="cursor-pointer hover:bg-muted/50">
                   <div className="flex items-center">Last Edited {getSortIcon('lastEdited')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('hasPassed')} className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center">Has Passed? {getSortIcon('hasPassed')}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{item.classSubject}</TableCell>
                  <TableCell>
                    <Badge className={cn("flex items-center gap-1", getStatusBadgeVariant(item.status, item.hasPassed))}>
                        {item.status === "Grabbing" && !item.hasPassed && <Loader2 className="h-3 w-3 animate-spin" />}
                        {statusDisplayMap[item.status] || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate hidden md:table-cell">{item.teacher}</TableCell>
                  <TableCell>{formatDistanceToNow(item.lastEdited.toDate(), { addSuffix: true })} by {item.editedByUserName || "N/A"}</TableCell>
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
          {sortedItems.length === 0 && !isLoading && (
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
                  <Label htmlFor="formClassSubject" className="text-right">Class Subject</Label>
                  <Input id="formClassSubject" value={formClassSubject} onChange={(e) => setFormClassSubject(e.target.value)} className="col-span-3" placeholder="e.g., Mathematics" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="formTeacher" className="text-right pt-2">Teacher</Label>
                  <Textarea id="formTeacher" value={formTeacher} onChange={(e) => setFormTeacher(e.target.value)} className="col-span-3" rows={3} placeholder="Teacher's Name or ID" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formHasPassed" className="text-right">Has Passed?</Label>
                  <div className="col-span-3 flex items-center">
                    <Checkbox 
                      id="formHasPassed" 
                      checked={formHasPassed} 
                      onCheckedChange={(checked) => handleHasPassedChange(checked as boolean)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formStatus" className="text-right">Status</Label>
                  <Select 
                    value={formStatus} 
                    onValueChange={(val) => setFormStatus(val as LatihanSoalStatus)}
                  >
                    <SelectTrigger className="col-span-3" id="formStatus">
                      <SelectValue placeholder="Select status">
                        {formStatus ? statusDisplayMap[formStatus] : "Select status"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(formHasPassed ? passedStatusOptions : nonPassedStatusOptions).map(opt => (
                        <SelectItem key={opt} value={opt}>
                          {statusDisplayMap[opt]}
                        </SelectItem>
                      ))}
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
              This action cannot be undone. This will permanently delete the Latihan Soal Sigma item: "{itemToDelete?.classSubject}".
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
    
