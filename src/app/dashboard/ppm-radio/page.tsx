
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioTower } from "lucide-react";

export default function PpmRadioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
          <RadioTower className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">PPM Radio</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>PPM Radio Stream</CardTitle>
          <CardDescription>Tune in to PPM Radio.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This page is under construction. PPM Radio player and schedule will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
