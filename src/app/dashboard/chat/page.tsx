
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Users, CornerDownLeft, Briefcase, Loader2, PlusCircle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, push, serverTimestamp, query, orderByChild, equalTo, get, off, set } from 'firebase/database'; // Added set
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number; 
}

interface Channel {
  id: string;
  name: string;
  icon: React.ElementType; 
  createdBy?: string;
  createdAt?: number;
  iconName?: string; // To store the icon identifier if needed
}

const defaultChannelIcon = MessageSquare;

export default function TeamChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user: currentUser, username: currentUsername } = useAuth();
  const { toast } = useToast();

  const currentUserAvatar = `https://placehold.co/28x28.png?text=${currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U'}`;

  useEffect(() => {
    setIsLoadingChannels(true);
    const channelsRef = ref(rtdb, 'chatChannelsList');
    const unsubscribeChannels = onValue(channelsRef, (snapshot) => {
      const channelsData = snapshot.val();
      const fetchedChannels: Channel[] = [];
      if (channelsData) {
        for (const id in channelsData) {
          // Assuming channelsData[id] is the channel object itself
          if (channelsData[id] && typeof channelsData[id].name === 'string') {
            fetchedChannels.push({ 
              id, 
              name: channelsData[id].name, 
              icon: defaultChannelIcon, // Or map channelsData[id].iconName to an icon component
              createdBy: channelsData[id].createdBy,
              createdAt: channelsData[id].createdAt,
              iconName: channelsData[id].iconName,
            });
          } else {
            console.warn("Malformed channel data for ID:", id, channelsData[id]);
          }
        }
      }
      
      if (fetchedChannels.length === 0) {
        if (!channelsData || Object.keys(channelsData).length === 0) {
            const generalKey = "general_default_channel"; 
            const generalChannelRefNew = ref(rtdb, `chatChannelsList/${generalKey}`);
            get(generalChannelRefNew).then((snap) => {
                if (!snap.exists()) {
                    set(generalChannelRefNew, { // Use set here
                        name: "General",
                        createdBy: "system",
                        createdAt: serverTimestamp(),
                        iconName: "MessageSquare" 
                    }).catch(err => console.error("Failed to create default general channel with set", err));
                }
            });
        }
      } else {
        setAllChannels(fetchedChannels);
        if (!activeChannelId && fetchedChannels.length > 0) {
          setActiveChannelId(fetchedChannels[0].id); 
        } else if (activeChannelId && !fetchedChannels.some(c => c.id === activeChannelId)) {
          setActiveChannelId(fetchedChannels.length > 0 ? fetchedChannels[0].id : null);
        }
      }
      setIsLoadingChannels(false);
    }, (error) => {
      console.error("Error fetching channels: ", error);
      toast({ title: "Error", description: "Could not fetch channels. Check Realtime Database rules.", variant: "destructive" });
      setIsLoadingChannels(false);
    });

    return () => unsubscribeChannels();
  }, [toast]);


  useEffect(() => {
    if (!activeChannelId || !currentUser) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesRef = query(ref(rtdb, `channelMessages/${activeChannelId}`), orderByChild('timestamp'));
    
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val();
      const fetchedMessages: Message[] = [];
      if (messagesData) {
        for (const id in messagesData) {
          fetchedMessages.push({ id, ...messagesData[id] });
        }
      }
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error(`Error fetching messages for channel ${activeChannelId}: `, error);
      toast({ title: "Error", description: "Could not fetch messages for this channel.", variant: "destructive" });
      setIsLoadingMessages(false);
    });

    return () => {
      // Detach the listener for the specific channel path
      // `off(messagesRef)` might need the event type if it was specified with `on`
      // For `onValue`, just the ref is typically fine, or `off(messagesRef, 'value', callbackFunction)`
      // Simpler to just detach all listeners on the ref if it's the only one.
      off(messagesRef);
    };

  }, [activeChannelId, currentUser, toast]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !currentUser || !currentUsername || !activeChannelId) {
      if (!currentUser || !currentUsername) {
        toast({title: "Not Logged In", description: "You must be logged in to send messages.", variant: "destructive"});
      }
      if(!activeChannelId){
        toast({title: "No Channel Selected", description: "Please select a channel to send a message.", variant: "destructive"});
      }
      return;
    }
    setIsSending(true);

    const messageData = {
      userId: currentUser.uid,
      username: currentUsername,
      avatar: currentUserAvatar,
      text: newMessage,
      timestamp: serverTimestamp(), 
    };

    try {
      const channelMessagesRef = ref(rtdb, `channelMessages/${activeChannelId}`);
      await push(channelMessagesRef, messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
      toast({ title: "Send Error", description: "Could not send message. Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a channel.", variant: "destructive" });
      return;
    }
    const trimmedChannelName = newChannelName.trim();
    if (trimmedChannelName === "") {
      toast({ title: "Validation Error", description: "Channel name cannot be empty.", variant: "destructive" });
      return;
    }

    try {
      const channelsListRef = ref(rtdb, 'chatChannelsList');
      const newChannelNodeRef = push(channelsListRef); // Generates a unique ID for the new channel node

      await set(newChannelNodeRef, { // Use set() to place the data directly at the generated ID
        name: trimmedChannelName,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        iconName: "MessageSquare" // default icon identifier
      });

      toast({ title: "Channel Created", description: `Channel "${trimmedChannelName}" created successfully.` });
      setIsCreateChannelDialogOpen(false);
      setNewChannelName("");
      if (newChannelNodeRef.key) {
        setActiveChannelId(newChannelNodeRef.key); 
      }
    } catch (error) {
      console.error("Error creating channel: ", error);
      toast({ title: "Creation Error", description: `Could not create channel. ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const activeChannelName = allChannels.find(c => c.id === activeChannelId)?.name || "Team Chat";

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-4">
      <Card className="w-full md:w-1/4 shadow-lg flex flex-col">
        <CardHeader className="border-b p-3 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg"><Users className="h-5 w-5 text-primary"/>Channels</CardTitle>
            <CardDescription className="text-xs">Select or create a channel.</CardDescription>
          </div>
          <Dialog open={isCreateChannelDialogOpen} onOpenChange={setIsCreateChannelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Create New Channel">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
                <DialogDescription>Enter a name for your new chat channel.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateChannel} className="space-y-4 py-2">
                <div>
                  <Label htmlFor="new-channel-name">Channel Name</Label>
                  <Input 
                    id="new-channel-name" 
                    value={newChannelName} 
                    onChange={(e) => setNewChannelName(e.target.value)} 
                    placeholder="e.g., Marketing Team"
                    required 
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">Create Channel</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 pt-1 flex-grow"> {/* Changed from pt-px to pt-1 */}
          <ScrollArea className="h-full">
            {isLoadingChannels ? (
                <div className="p-3 text-center text-muted-foreground">Loading channels...</div>
            ) : allChannels.length === 0 ? (
                 <div className="p-3 text-center text-muted-foreground">No channels available. Create one!</div>
            ) : (
                <nav className="p-1.5 space-y-0.5">
                {allChannels.map(channel => {
                  const IconComponent = channel.icon || defaultChannelIcon;
                  return (
                  <Button
                    key={channel.id}
                    variant={activeChannelId === channel.id ? "secondary" : "ghost"}
                    size="sm"
                    className={`w-full justify-start gap-2 h-8 px-2 text-sm ${activeChannelId === channel.id ? 'bg-primary/30 text-primary-foreground font-semibold hover:bg-primary/40' : 'hover:bg-muted/70'}`}
                    onClick={() => setActiveChannelId(channel.id)}
                  >
                    <IconComponent className={cn("h-4 w-4", activeChannelId === channel.id ? "text-primary-foreground" : "text-primary")} />
                    {channel.name}
                  </Button>
                  );
                })}
                </nav>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="w-full md:w-3/4 shadow-lg flex flex-col h-full">
        <CardHeader className="border-b p-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <MessageSquare className="h-5 w-5 text-primary" /> 
            {activeChannelName}
          </CardTitle>
          <CardDescription className="text-xs">Real-time communication for {activeChannelName}.</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-full p-3" ref={scrollAreaRef}>
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2"/>
                    <p className="text-lg font-medium">No messages yet.</p>
                    <p className="text-sm">Be the first to send a message in this channel!</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                {messages.map((msg) => {
                    const isSender = msg.userId === currentUser?.uid;
                    const messageTimestamp = msg.timestamp ? format(new Date(msg.timestamp), 'p') : "Sending...";
                    return (
                    <div key={msg.id} className={`flex items-end gap-1.5 ${isSender ? "justify-end" : ""}`}>
                        {!isSender && (
                        <Avatar className="h-6 w-6 self-start">
                            <AvatarImage src={msg.avatar} alt={msg.username} data-ai-hint="person avatar"/>
                            <AvatarFallback className="text-xs">{msg.username ? msg.username.charAt(0).toUpperCase() : '?'}</AvatarFallback>
                        </Avatar>
                        )}
                        <div className={`max-w-[70%] lg:max-w-[65%] p-1.5 rounded-md shadow ${isSender ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {!isSender && <p className="text-xs font-semibold mb-0.5 text-foreground">{msg.username}</p>}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        <p className={`text-[10px] mt-0.5 ${isSender ? "text-primary-foreground/70" : "text-muted-foreground/80"} ${isSender ? 'text-right' : 'text-left'}`}>
                            {messageTimestamp}
                        </p>
                        </div>
                        {isSender && (
                        <Avatar className="h-6 w-6 self-start">
                            <AvatarImage src={msg.avatar} alt={msg.username} data-ai-hint="user avatar" />
                            <AvatarFallback className="text-xs">{msg.username ? msg.username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    );
                })}
                </div>
            )}
          </ScrollArea>
        </CardContent>
        
        <div className="border-t p-2">
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
            <Input
              type="text"
              placeholder={activeChannelId ? "Type message..." : "Select a channel first..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow h-8 text-sm px-2.5"
              disabled={isSending || isLoadingMessages || !currentUser || !activeChannelId}
            />
            <Button type="submit" size="icon" className="h-8 w-8 bg-accent hover:bg-accent/90" disabled={isSending || isLoadingMessages || !currentUser || !activeChannelId}>
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Send className="h-3.5 w-3.5" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
