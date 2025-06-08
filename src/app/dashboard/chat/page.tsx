
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Users, CornerDownLeft, Briefcase, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, serverTimestamp, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';


interface Message {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: Timestamp | null; // Firestore Timestamp or null if optimistic update
}

const channels = [
  { id: "general", name: "General Discussion", icon: MessageSquare },
  { id: "project-alpha", name: "Project Alpha", icon: Briefcase },
  { id: "dev-team", name: "Development Team", icon: Users },
  { id: "random", name: "Random Chats", icon: CornerDownLeft },
];


export default function TeamChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState("general");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user: currentUser, username: currentUsername } = useAuth();
  const { toast } = useToast();

  const currentUserAvatar = `https://placehold.co/28x28.png?text=${currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U'}`;

  useEffect(() => {
    if (!activeChannel || !currentUser) return;

    setIsLoadingMessages(true);
    const messagesColRef = collection(db, "chatChannels", activeChannel, "messages");
    const q = query(messagesColRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          userId: data.userId,
          username: data.username,
          avatar: data.avatar,
          text: data.text,
          timestamp: data.timestamp as Timestamp, // Assuming timestamp is always a Firestore Timestamp
        });
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages: ", error);
      toast({
        title: "Error",
        description: "Could not fetch messages for this channel.",
        variant: "destructive",
      });
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();

  }, [activeChannel, currentUser, toast]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !currentUser || !currentUsername) {
      if (!currentUser || !currentUsername) {
        toast({title: "Not Logged In", description: "You must be logged in to send messages.", variant: "destructive"});
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
      channelId: activeChannel,
    };

    try {
      await addDoc(collection(db, "chatChannels", activeChannel, "messages"), messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
      toast({
        title: "Send Error",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-4">
      <Card className="w-full md:w-1/4 shadow-lg flex flex-col">
        <CardHeader className="border-b p-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg"><Users className="h-5 w-5 text-primary"/>Channels</CardTitle>
          <CardDescription className="text-xs">Select a channel.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-1 flex-grow">
          <ScrollArea className="h-full">
            <nav className="p-1.5 space-y-0.5">
            {channels.map(channel => (
              <Button
                key={channel.id}
                variant={activeChannel === channel.id ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-start gap-2 h-8 px-2 text-sm ${activeChannel === channel.id ? 'bg-primary/30 text-primary-foreground font-semibold hover:bg-primary/40' : 'hover:bg-muted/70'}`}
                onClick={() => setActiveChannel(channel.id)}
              >
                <channel.icon className={cn("h-4 w-4", activeChannel === channel.id ? "text-primary-foreground" : "text-primary")} />
                {channel.name}
              </Button>
            ))}
            </nav>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="w-full md:w-3/4 shadow-lg flex flex-col h-full">
        <CardHeader className="border-b p-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <MessageSquare className="h-5 w-5 text-primary" /> 
            {channels.find(c => c.id === activeChannel)?.name || "Team Chat"}
          </CardTitle>
          <CardDescription className="text-xs">Real-time communication for {activeChannel}.</CardDescription>
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
                    const messageTimestamp = msg.timestamp ? format(msg.timestamp.toDate(), 'p') : "Sending...";
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
              placeholder="Type message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow h-8 text-sm px-2.5"
              disabled={isSending || isLoadingMessages || !currentUser}
            />
            <Button type="submit" size="icon" className="h-8 w-8 bg-accent hover:bg-accent/90" disabled={isSending || isLoadingMessages || !currentUser}>
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Send className="h-3.5 w-3.5" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

    