
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile, updatePassword as firebaseUpdatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserCircle, ShieldCheck, Bell, Palette, Shield } from "lucide-react";

const profileSchema = z.object({
  displayName: z.string().min(3, "Display name must be at least 3 characters.").optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string().min(6, "Confirm new password must be at least 6 characters."),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfileAndSettingsPage() {
  const { user, username, loading: authLoading } = useAuth(); 
  const { toast } = useToast();
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { displayName: username || "" }, 
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user || !data.displayName) return;
    try {
      await updateProfile(user, { displayName: data.displayName });
      toast({ title: "Profile Updated", description: "Your display name has been updated." });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user || !user.email) return; 
  
    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
  
      await firebaseUpdatePassword(user, data.newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      passwordForm.reset();
      setIsEditingPassword(false);
    } catch (error: any) {
      toast({ title: "Password Update Failed", description: error.code === 'auth/wrong-password' ? 'Incorrect current password.' : error.message, variant: "destructive" });
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading profile...</p></div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-full"><p>User not found. Please log in.</p></div>;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <UserCircle className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Profile & Settings</h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" /> Personal Information</CardTitle>
          <CardDescription>View and update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={`https://placehold.co/80x80.png?text=${username ? username.charAt(0).toUpperCase() : 'U'}`} alt={username || "User"} data-ai-hint="user avatar large" />
              <AvatarFallback className="text-3xl">{username ? username.charAt(0).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xl font-semibold">{username}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (Username)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}>
                {profileForm.formState.isSubmitting ? "Saving..." : "Save Display Name"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Security Settings</CardTitle>
          <CardDescription>Manage your account security, like changing your password.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditingPassword ? (
            <Button onClick={() => setIsEditingPassword(true)} variant="outline">Change Password</Button>
          ) : (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <Alert variant="default" className="bg-accent/20 border-accent/50">
                  <AlertTitle className="font-semibold">Important Security Note</AlertTitle>
                  <AlertDescription>
                    Changing your password may log you out of other active sessions.
                  </AlertDescription>
                </Alert>
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                  <Button variant="outline" onClick={() => { setIsEditingPassword(false); passwordForm.reset(); }}>Cancel</Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Settings Sections Merged Below */}
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
