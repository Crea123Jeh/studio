
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, formatDistanceToNow, startOfDay } from "date-fns";
import { Package, PlusCircle, Edit3, Trash2, CalendarIcon as LucideCalendarIcon, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

interface AssetItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  dateAcquired: Timestamp;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  addedByUserId?: string;
  addedByUserName?: string;
}

type SortableAssetKeys = 'title' | 'amount' | 'dateAcquired' | 'lastUpdatedAt';

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Helper to parse currency string to number
const parseCurrency = (value: string): number => {
  const numericString = String(value).replace(/[^0-9]/g, '');
  return parseFloat(numericString) || 0;
};


export default function TotalAssetsPage() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [isDeleteInfoAlertOpen, setIsDeleteInfoAlertOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableAssetKeys; direction: 'ascending' | 'descending' }>({ key: 'lastUpdatedAt', direction: 'descending' });


  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState(""); // Store as string for input formatting
  const [formDateAcquired, setFormDateAcquired] = useState<Date | undefined>(new Date());

  const { toast } = useToast();
  const { user, username } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const assetsCollectionRef = collection(db, "assetItems");
    const q = query(assetsCollectionRef, orderBy("lastUpdatedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAssets = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as AssetItem));
      setAssets(fetchedAssets);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching assets: ", error);
      toast({ title: "Error", description: "Could not fetch assets.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const totalAssetValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.amount, 0);
  }, [assets]);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormAmount("");
    setFormDateAcquired(new Date());
    setEditingAsset(null);
  };

  const handleOpenFormDialog = (asset: AssetItem | null = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormTitle(asset.title || "");
      setFormDescription(asset.description || "");
      setFormAmount(asset.amount.toString()); 
      setFormDateAcquired(asset.dateAcquired.toDate());
    } else {
      resetForm();
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveAsset = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription || !formAmount || !formDateAcquired) {
      toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const numericAmount = parseCurrency(formAmount);
    if (isNaN(numericAmount)) {
      toast({ title: "Invalid Amount", description: "Please enter a valid number for the amount.", variant: "destructive" });
      return;
    }

    const now = Timestamp.now();
    const assetData: Omit<AssetItem, 'id' | 'createdAt'> & { createdAt?: Timestamp } = {
      title: formTitle,
      description: formDescription,
      amount: numericAmount,
      dateAcquired: Timestamp.fromDate(startOfDay(formDateAcquired)),
      lastUpdatedAt: now,
      addedByUserId: user.uid,
      addedByUserName: username || "Unknown User",
    };

    try {
      if (editingAsset) {
        const assetRef = doc(db, "assetItems", editingAsset.id);
        await updateDoc(assetRef, assetData as Partial<AssetItem>);
        toast({ title: "Asset Updated", description: `"${formTitle}" has been updated.` });
      } else {
        assetData.createdAt = now; 
        await addDoc(collection(db, "assetItems"), assetData);
        toast({ title: "Asset Added", description: `"${formTitle}" has been added.` });
      }
      resetForm();
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error saving asset: ", error);
      toast({ title: "Save Error", description: "Could not save the asset.", variant: "destructive" });
    }
  };
  
  const requestSort = (key: SortableAssetKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableAssetKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sortedAssets = useMemo(() => {
    let sortableItems = [...assets];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        let comparison = 0;

        if (aVal instanceof Timestamp && bVal instanceof Timestamp) {
          comparison = aVal.toDate().getTime() - bVal.toDate().getTime();
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [assets, sortConfig]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading assets...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Total Assets</h1>
        </div>
        <Button variant="outline" onClick={() => handleOpenFormDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Total Asset Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">{formatCurrency(totalAssetValue)}</p>
          <CardDescription className="mt-1">Sum of all recorded asset amounts.</CardDescription>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>A list of all recorded assets. Click headers to sort.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('title')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Title {getSortIcon('title')}</div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead onClick={() => requestSort('amount')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Amount (Rp.) {getSortIcon('amount')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('dateAcquired')} className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center">Date Acquired {getSortIcon('dateAcquired')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('lastUpdatedAt')} className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell">
                    <div className="flex items-center">Last Updated {getSortIcon('lastUpdatedAt')}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground">{asset.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate hidden md:table-cell max-w-xs">{asset.description}</TableCell>
                  <TableCell>{formatCurrency(asset.amount)}</TableCell>
                  <TableCell>{format(asset.dateAcquired.toDate(), "PP")}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDistanceToNow(asset.lastUpdatedAt.toDate(), { addSuffix: true })} by {asset.addedByUserName || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" title="Edit Asset" onClick={() => handleOpenFormDialog(asset)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" title="Delete Asset (Restricted)" onClick={() => setIsDeleteInfoAlertOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedAssets.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-3" />
              <p>No assets recorded yet. Add one to get started!</p>
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
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
            <DialogDescription>
              {editingAsset ? "Update the details for this asset." : "Enter the details for the new asset."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAsset}>
            <ScrollArea className="max-h-[70vh] p-1">
              <div className="grid gap-4 py-4 pr-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formTitle" className="text-right">Title</Label>
                  <Input id="formTitle" value={formTitle ?? ""} onChange={(e) => setFormTitle(e.target.value)} className="col-span-3" placeholder="e.g., Office Laptop" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="formDescription" className="text-right pt-2">Description</Label>
                  <Textarea id="formDescription" value={formDescription ?? ""} onChange={(e) => setFormDescription(e.target.value)} className="col-span-3" rows={3} placeholder="Detailed description of the asset..." required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formAmount" className="text-right">Amount (Rp.)</Label>
                  <Input 
                    id="formAmount" 
                    value={formAmount ?? ""} 
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      setFormAmount(rawValue);
                    }}
                    onBlur={(e) => {
                       const numericValue = parseCurrency(e.target.value);
                       if (!isNaN(numericValue) && numericValue > 0) {
                           setFormAmount(numericValue.toString()); 
                       } else if (e.target.value.trim() !== "") {
                       }
                    }}
                    className="col-span-3" 
                    placeholder="e.g., 15000000" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="formDateAcquired" className="text-right">Date Acquired</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !formDateAcquired && "text-muted-foreground")}>
                          <LucideCalendarIcon className="mr-2 h-4 w-4" />
                          {formDateAcquired ? format(formDateAcquired, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formDateAcquired} onSelect={setFormDateAcquired} initialFocus />
                      </PopoverContent>
                    </Popover>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">{editingAsset ? "Save Changes" : "Add Asset"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteInfoAlertOpen} onOpenChange={setIsDeleteInfoAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletion Restricted</AlertDialogTitle>
            <AlertDialogDescription>
              To delete asset records, please contact a developer. These records are designed for archival and audit purposes and cannot be modified or erased through this interface.
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

