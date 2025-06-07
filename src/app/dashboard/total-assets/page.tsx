
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function TotalAssetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-black rounded-md inline-flex items-center justify-center">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Total Assets</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Assets Overview</CardTitle>
          <CardDescription>Details about your total assets will be displayed here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This page is under construction. Asset information will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
