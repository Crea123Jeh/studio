
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { LayoutGrid } from "lucide-react"; // Changed from Building

const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(20, { message: "Username must be at most 20 characters."}),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signUp, user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);


  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      const newUser = await signUp({ 
        email: data.email, 
        username: data.username, 
        password: data.password 
      });

      if (newUser) {
        toast({ title: "Signup Successful", description: "Welcome! Redirecting to dashboard..." });
        router.push("/dashboard");
      }
    } catch (error: any) {
      let toastMessage = "An unexpected error occurred during signup. Please try again.";
      if (error.code) { 
        switch (error.code) {
          case 'auth/email-already-in-use':
            toastMessage = "This email address is already registered. Please try logging in or use a different email.";
            break;
          case 'auth/weak-password':
            toastMessage = "The password is too weak. It must be at least 6 characters long.";
            break;
          case 'auth/invalid-email':
            toastMessage = "The email address is not valid. Please enter a correct email.";
            break;
          case 'auth/operation-not-allowed':
            toastMessage = "Email/Password sign-up is not enabled for this project. Please check Firebase console settings or contact support.";
            break;
          default:
            toastMessage = error.message || toastMessage; 
        }
      } else if (error.message) {
        toastMessage = error.message;
      }

      toast({
        title: "Signup Failed",
        description: toastMessage,
        variant: "destructive",
      });
    }
  };
  
  if (loading || user) {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <div className="inline-flex items-center justify-center gap-2 mb-4">
            <LayoutGrid className="h-10 w-10 text-primary" /> {/* Changed from Building */}
            <CardTitle className="text-3xl font-headline">Create Account</CardTitle>
          </div>
          <CardDescription>Enter your details to get started with PPM Management.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Display Name)</FormLabel>
                    <FormControl>
                      <Input placeholder="your_display_name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:text-accent/90">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
