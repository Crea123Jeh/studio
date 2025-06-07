
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'PPM Management',
  description: 'An application for Project Portfolio Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Removed Google Font import for Baloo 2 */}
        </head>
        <body className="font-body antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  );
}
