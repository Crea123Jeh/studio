
"use client";

import { useState, useEffect, type FormEvent, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Youtube, PlusCircle, Loader2, UploadCloud, Search, ListFilter } from "lucide-react"; 
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  videoId: string; 
  category: string;
  createdAt: Timestamp;
}

const knowledgeCategories = ["Project Management", "Agile Methodologies", "Team Collaboration", "Risk Management", "Tooling & Software", "Data Analysis", "AI & Machine Learning", "Software Development", "Productivity", "Other"];

export default function KnowledgeHubPage() {
  const [knowledgeFeed, setKnowledgeFeed] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVideoId, setNewVideoId] = useState("");
  const [newCategory, setNewCategory] = useState(knowledgeCategories[0]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const itemsCollection = collection(db, "knowledgeHubItems");
    const q = query(itemsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as KnowledgeItem));
      setKnowledgeFeed(fetchedItems);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching knowledge items: ", error);
      toast({ title: "Error", description: "Could not fetch knowledge items.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const resetForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewVideoId("");
    setNewCategory(knowledgeCategories[0]);
  };

  const handleSaveKnowledgeItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newVideoId || !newCategory) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(newVideoId)) {
      toast({ title: "Invalid Video ID", description: "Please enter a valid 11-character YouTube Video ID.", variant: "destructive"});
      return;
    }

    const newItemData = {
      title: newTitle,
      description: newDescription,
      videoId: newVideoId,
      category: newCategory,
      createdAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, "knowledgeHubItems"), newItemData);
      toast({ title: "Item Added", description: `"${newTitle}" added to Knowledge Hub.` });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving knowledge item: ", error);
      toast({ title: "Save Error", description: "Could not save the new knowledge item.", variant: "destructive" });
    }
  };

  const filteredAndSortedFeed = useMemo(() => {
    let filtered = knowledgeFeed;

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(lowercasedSearchTerm) ||
        item.description.toLowerCase().includes(lowercasedSearchTerm) ||
        item.category.toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    if (sortOrder === "newest") {
      return filtered; // Already sorted by newest due to Firestore query
    } else {
      // Create a new sorted array for "oldest"
      return [...filtered].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
    }
  }, [knowledgeFeed, searchTerm, sortOrder]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline tracking-tight">Knowledge Hub</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
          setIsAddDialogOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Learning Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Learning Item</DialogTitle>
              <DialogDescription>Share a new video resource with the team.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveKnowledgeItem}>
              <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-4 py-4 pr-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-title" className="text-right">Title</Label>
                    <Input id="new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="new-description" className="text-right pt-2">Description</Label>
                    <Textarea id="new-description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="col-span-3" rows={3} required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-videoId" className="text-right">YouTube Video ID</Label>
                    <Input id="new-videoId" value={newVideoId} onChange={(e) => setNewVideoId(e.target.value)} className="col-span-3" placeholder="e.g., erLk59H86ww" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-category" className="text-right">Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger className="col-span-3" id="new-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {knowledgeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="mt-4 pt-4 border-t">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-muted-foreground text-md">
        Explore a curated feed of videos and resources to enhance your skills and stay informed.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-2/3 lg:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by title, description, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-auto flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-muted-foreground" />
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-350px)] pr-3"> {/* Adjusted height slightly */}
            {isLoading ? (
              <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading learning feed...</p></div>
            ) : filteredAndSortedFeed.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {filteredAndSortedFeed.map((item) => (
                  <Card 
                    key={item.id} 
                    className={cn(
                        "overflow-hidden hover:shadow-xl transition-shadow duration-200 ease-in-out",
                        "flex flex-col md:flex-row" 
                    )}
                  >
                    <div className="md:w-2/5 lg:w-1/3 aspect-video bg-muted shrink-0">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${item.videoId}`}
                        title={item.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      ></iframe>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <CardTitle className="text-lg leading-tight mb-1.5 text-foreground">{item.title}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2 flex-grow">{item.description}</p>
                      <div className="flex justify-between items-center mt-auto pt-2 border-t">
                        <Badge variant="secondary">{item.category}</Badge>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <UploadCloud className="h-3.5 w-3.5" />
                          {format(item.createdAt.toDate(), "PP")}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-10 border rounded-md border-dashed h-full bg-muted/50 min-h-[200px]">
                <Youtube className="h-12 w-12 text-primary/70 mb-4" />
                <p className="text-muted-foreground font-medium text-lg">
                  {searchTerm ? "No items match your search." : "Knowledge Feed is Empty"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm ? "Try a different search term or clear the search." : "Be the first to add a learning item!"}
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

