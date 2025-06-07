
"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Users, CornerDownLeft, Briefcase } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface Message {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: string;
  isSender: boolean;
}

const initialMessages: Message[] = [
  { id: "1", user: "Alice", avatar: "https://placehold.co/40x40.png?text=A", text: "Hey team, how's Project Alpha progressing?", timestamp: "10:00 AM", isSender: false },
  { id: "2", user: "Bob", avatar: "https://placehold.co/40x40.png?text=B", text: "Good! Just pushed the latest updates for the UI.", timestamp: "10:01 AM", isSender: false },
  { id: "3", user: "You", avatar: "https://placehold.co/40x40.png?text=Y", text: "Great to hear, Bob! I'll review them shortly.", timestamp: "10:02 AM", isSender: true },
  { id: "4", user: "Charlie", avatar: "https://placehold.co/40x40.png?text=C", text: "Anyone available for a quick call on the new API integration?", timestamp: "10:05 AM", isSender: false },
  { id: "5", user: "You", avatar: "https://placehold.co/40x40.png?text=Y", text: "I can jump on a call in 15 mins, Charlie.", timestamp: "10:06 AM", isSender: true },
  { id: "6", user: "Alice", avatar: "https://placehold.co/40x40.png?text=A", text: "Remember the client demo is tomorrow at 2 PM.", timestamp: "10:10 AM", isSender: false },
];

const channels = [
  { id: "general", name: "General Discussion", icon: MessageSquare },
  { id: "project-alpha", name: "Project Alpha", icon: Briefcase },
  { id: "dev-team", name: "Development Team", icon: Users },
  { id: "random", name: "Random Chats", icon: CornerDownLeft },
];


export default function TeamChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState("general");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { username } = useAuth();

  const currentUserAvatar = `https://placehold.co/40x40.png?text=${username ? username.charAt(0).toUpperCase() : 'U'}`;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    const message: Message = {
      id: String(Date.now()),
      user: username || "You",
      avatar: currentUserAvatar,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSender: true,
    };
    setMessages([...messages, message]);
    setNewMessage("");
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-4">
      <Card className="w-full md:w-1/4 shadow-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-foreground"><Users className="h-6 w-6 text-primary"/>Channels</CardTitle>
          <CardDescription>Select a channel to chat in.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <ScrollArea className="h-full">
            <nav className="p-2 space-y-1">
            {channels.map(channel => (
              <Button
                key={channel.id}
                variant={activeChannel === channel.id ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 ${activeChannel === channel.id ? 'bg-primary/30 text-primary-foreground font-semibold hover:bg-primary/40' : 'hover:bg-muted/70'}`}
                onClick={() => setActiveChannel(channel.id)}
              >
                <channel.icon className="h-4 w-4" />
                {channel.name}
              </Button>
            ))}
            </nav>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="w-full md:w-3/4 shadow-lg flex flex-col h-full">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-6 w-6 text-primary" /> 
            {channels.find(c => c.id === activeChannel)?.name || "Team Chat"}
          </CardTitle>
          <CardDescription>Real-time communication with your team.</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow p-0 overflow-hidden">
          <ScrollArea className="h-[calc(100%-70px)] p-4" ref={scrollAreaRef}> {/* Adjust height based on form */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.isSender ? "justify-end" : ""}`}>
                  {!msg.isSender && (
                     <Avatar className="h-8 w-8 self-start">
                      <AvatarImage src={msg.avatar} alt={msg.user} data-ai-hint="person avatar"/>
                      <AvatarFallback>{msg.user.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow ${msg.isSender ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!msg.isSender && <p className="text-xs font-semibold mb-0.5 text-foreground">{msg.user}</p>}
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.isSender ? "text-primary-foreground/70" : "text-muted-foreground/80"} ${msg.isSender ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                   {msg.isSender && (
                    <Avatar className="h-8 w-8 self-start">
                      <AvatarImage src={msg.avatar} alt={msg.user} data-ai-hint="user avatar" />
                      <AvatarFallback>{msg.user.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90">
              <Send className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
