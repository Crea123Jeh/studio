import type { ReactNode } from 'react';
import DashboardLayoutComponent from '@/components/DashboardLayout';

export default function Layout({ children }: { children: ReactNode }) {
  return <DashboardLayoutComponent>{children}</DashboardLayoutComponent>;
}
