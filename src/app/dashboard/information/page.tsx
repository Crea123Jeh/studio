
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { format, startOfDay } from "date-fns";
import Image from "next/image";
import { Info, Newspaper, TrendingUp, AlertTriangle, Megaphone, Users, Briefcase, PlusCircle, CalendarIcon as LucideCalendarIcon, Loader2 } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface HappeningItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  iconName: string; 
  date: Timestamp;
  createdAt: Timestamp;
}

interface TrendItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  createdAt: Timestamp;
}

const happeningCategories = ["Industry News", "Methodologies", "Security", "Training", "Product Update", "Company Announcement", "Other"];
const happeningIcons: { name: string; IconComponent: React.ElementType<LucideProps> }[] = [
  { name: "Newspaper", IconComponent: Newspaper },
  { name: "AlertTriangle", IconComponent: AlertTriangle },
  { name: "Megaphone", IconComponent: Megaphone },
  { name: "Users", IconComponent: Users },
  { name: "Briefcase", IconComponent: Briefcase },
  { name: "Info", IconComponent: Info },
];

const getIconComponent = (iconName: string): React.ElementType<LucideProps> => {
  const foundIcon = happeningIcons.find(icon => icon.name === iconName);
  return foundIcon ? foundIcon.IconComponent : Newspaper; // Default to Newspaper if not found
};


export default function InformationPage() {
  const [happenings, setHappenings] = useState<HappeningItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoadingHappenings, setIsLoadingHappenings] = useState(true);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const { toast } = useToast();

  const [isAddHappeningDialogOpen, setIsAddHappeningDialogOpen] = useState(false);
  
  // Form state for adding new happening
  const [newHappeningTitle, setNewHappeningTitle] = useState("");
  const [newHappeningSummary, setNewHappeningSummary] = useState("");
  const [newHappeningSource, setNewHappeningSource] = useState("");
  const [newHappeningCategory, setNewHappeningCategory] = useState(happeningCategories[0]);
  const [newHappeningIconName, setNewHappeningIconName] = useState(happeningIcons[0].name);
  const [newHappeningDate, setNewHappeningDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    setIsLoadingHappenings(true);
    const happeningsCol = collection(db, "informationHubHappenings");
    const qHappenings = query(happeningsCol, orderBy("date", "desc"));
    const unsubscribeHappenings = onSnapshot(qHappenings, (snapshot) => {
      setHappenings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HappeningItem)));
      setIsLoadingHappenings(false);
    }, (error) => {
      console.error("Error fetching happenings: ", error);
      toast({ title: "Error", description: "Could not fetch happenings.", variant: "destructive" });
      setIsLoadingHappenings(false);
    });

    return () => unsubscribeHappenings();
  }, [toast]);

  useEffect(() => {
    setIsLoadingTrends(true);
    const trendsCol = collection(db, "informationHubTrends");
    // Example: If you want to order trends by when they were added
    const qTrends = query(trendsCol, orderBy("createdAt", "desc")); 
    const unsubscribeTrends = onSnapshot(qTrends, (snapshot) => {
      setTrends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrendItem)));
      setIsLoadingTrends(false);
    }, (error) => {
      console.error("Error fetching trends: ", error);
      toast({ title: "Error", description: "Could not fetch trends.", variant: "destructive" });
      setIsLoadingTrends(false);
    });

    return () => unsubscribeTrends();
  }, [toast]);

  const resetNewHappeningForm = () => {
    setNewHappeningTitle("");
    setNewHappeningSummary("");
    setNewHappeningSource("");
    setNewHappeningCategory(happeningCategories[0]);
    setNewHappeningIconName(happeningIcons[0].name);
    setNewHappeningDate(new Date());
  };

  const handleSaveHappening = async (e: FormEvent) => {
    e.preventDefault();
    if (!newHappeningTitle || !newHappeningSummary || !newHappeningSource || !newHappeningCategory || !newHappeningIconName || !newHappeningDate) {
      toast({ title: "Missing Information", description: "Please fill all fields for the new happening.", variant: "destructive" });
      return;
    }

    const happeningData = {
      title: newHappeningTitle,
      summary: newHappeningSummary,
      source: newHappeningSource,
      category: newHappeningCategory,
      iconName: newHappeningIconName,
      date: Timestamp.fromDate(startOfDay(newHappeningDate)),
      createdAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, "informationHubHappenings"), happeningData);
      toast({ title: "Happening Added", description: `"${newHappeningTitle}" has been added.` });
      setIsAddHappeningDialogOpen(false);
      resetNewHappeningForm();
    } catch (error) {
      console.error("Error saving happening: ", error);
      toast({ title: "Save Error", description: "Could not save the new happening.", variant: "destructive" });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
            <Info className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold font-headline tracking-tight">Information Hub</h1>
        </div>
        <Dialog open={isAddHappeningDialogOpen} onOpenChange={(isOpen) => {
            setIsAddHappeningDialogOpen(isOpen);
            if (!isOpen) resetNewHappeningForm();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4"/> Record New Happening
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Record New Happening</DialogTitle>
                    <DialogDescription>Enter the details for the new information item.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveHappening}>
                  <ScrollArea className="max-h-[70vh] p-1">
                    <div className="grid gap-4 py-4 pr-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="happening-title" className="text-right">Title</Label>
                            <Input id="happening-title" value={newHappeningTitle} onChange={(e) => setNewHappeningTitle(e.target.value)} className="col-span-3" required/>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="happening-summary" className="text-right pt-2">Summary</Label>
                            <Textarea id="happening-summary" value={newHappeningSummary} onChange={(e) => setNewHappeningSummary(e.target.value)} className="col-span-3" rows={3} required/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="happening-source" className="text-right">Source</Label>
                            <Input id="happening-source" value={newHappeningSource} onChange={(e) => setNewHappeningSource(e.target.value)} className="col-span-3" required/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="happening-category" className="text-right">Category</Label>
                            <Select value={newHappeningCategory} onValueChange={setNewHappeningCategory}>
                                <SelectTrigger className="col-span-3" id="happening-category"><SelectValue /></SelectTrigger>
                                <SelectContent>{happeningCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="happening-icon" className="text-right">Icon</Label>
                            <Select value={newHappeningIconName} onValueChange={setNewHappeningIconName}>
                                <SelectTrigger className="col-span-3" id="happening-icon"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {happeningIcons.map(({ name, IconComponent }) => (
                                        <SelectItem key={name} value={name}>
                                            <div className="flex items-center gap-2"> <IconComponent className="h-4 w-4"/> {name} </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="happening-date" className="text-right">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newHappeningDate && "text-muted-foreground")}>
                                        <LucideCalendarIcon className="mr-2 h-4 w-4" />
                                        {newHappeningDate ? format(newHappeningDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newHappeningDate} onSelect={setNewHappeningDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter className="mt-4 pt-4 border-t">
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit">Save Happening</Button>
                  </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
      <p className="text-muted-foreground text-md">
        Stay updated with the latest news, announcements, and emerging trends relevant to your work and industry.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2 mb-1">
                <Newspaper className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">What&apos;s Happening</CardTitle>
            </div>
            <CardDescription>Latest updates, articles, and important announcements.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="pr-3"> {/* Removed h-[calc(100vh-350px)] */}
              {isLoadingHappenings ? (
                 <div className="flex justify-center items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Loading happenings...</p></div>
              ) : happenings.length > 0 ? (
                <div className="space-y-4">
                  {happenings.map((item) => {
                    const Icon = getIconComponent(item.iconName);
                    return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start gap-3">
                          <Icon className={cn("h-5 w-5 flex-shrink-0", item.iconName === "AlertTriangle" ? "text-destructive" : "text-primary")} />
                          <div className="flex-1 min-w-0">
                              <CardTitle className="text-md leading-tight truncate">{item.title}</CardTitle>
                              <span className="text-xs font-medium text-primary mt-0.5 block">{item.category}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground mb-1.5 line-clamp-3">{item.summary}</p>
                        <p className="text-xs text-muted-foreground">{item.source} - {format(item.date.toDate(), "PP")}</p>
                      </CardContent>
                    </Card>
                  );
                })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-10">No happenings recorded yet.</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">Current Trends</CardTitle>
            </div>
            <CardDescription>Emerging patterns and insights in technology and project management.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="pr-3"> {/* Removed h-[calc(100vh-350px)] */}
            {isLoadingTrends ? (
                <div className="flex justify-center items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Loading trends...</p></div>
            ) : trends.length > 0 ? (
              <div className="space-y-6">
                {trends.map((trend) => (
                  <Card key={trend.id} className="overflow-hidden hover:shadow-md transition-shadow">
                     <Image src={trend.imageUrl || "https://placehold.co/600x200.png"} alt={trend.name} width={600} height={200} className="w-full h-48 object-cover" data-ai-hint={trend.imageHint}/>
                    <CardHeader className="p-4">
                      <CardTitle className="text-md">{trend.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-3">{trend.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              ) : (
                <div className="text-center text-muted-foreground py-10">No trends available at the moment.</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
