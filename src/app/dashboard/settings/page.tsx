"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Bell, Palette, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Application Settings</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/>Notifications</CardTitle>
          <CardDescription>Manage your notification preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
            <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
            <Switch id="email-notifications" defaultChecked />
          </div>
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
            <Label htmlFor="push-notifications" className="font-medium">Push Notifications</Label>
            <Switch id="push-notifications" />
          </div>
          <div className="space-y-2 p-3 border rounded-md">
            <Label htmlFor="notification-frequency" className="font-medium block mb-1">Notification Frequency</Label>
            <Select defaultValue="immediately">
              <SelectTrigger id="notification-frequency" className="w-full md:w-[280px]">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediately">Immediately</SelectItem>
                <SelectItem value="daily_digest">Daily Digest</SelectItem>
                <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary"/>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
            <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
            {/* Dark mode switch can be implemented with theme context or library */}
            <Switch id="dark-mode" disabled aria-describedby="dark-mode-description"/>
          </div>
            <p id="dark-mode-description" className="text-xs text-muted-foreground -mt-5 ml-3">Dark mode toggle is currently disabled.</p>

          <div className="space-y-2 p-3 border rounded-md">
            <Label htmlFor="theme-color" className="font-medium block mb-1">Theme Accent Color</Label>
             <Select defaultValue="default_yellow" disabled>
              <SelectTrigger id="theme-color" className="w-full md:w-[280px]">
                <SelectValue placeholder="Select accent color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default_yellow">Soft Yellow (Default)</SelectItem>
                <SelectItem value="blue">Ocean Blue</SelectItem>
                <SelectItem value="green">Forest Green</SelectItem>
                <SelectItem value="purple">Royal Purple</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Theme customization is currently unavailable.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary"/>Account & Data</CardTitle>
          <CardDescription>Manage your account data and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Button variant="outline" disabled>Export My Data</Button>
           <p className="text-xs text-muted-foreground">Data export feature is coming soon.</p>
           <Button variant="destructive" disabled>Delete My Account</Button>
           <p className="text-xs text-muted-foreground">Account deletion is a permanent action and currently unavailable through this interface. Please contact support.</p>
        </CardContent>
      </Card>

    </div>
  );
}
