
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

// Define the shape of the data to be passed to addAppNotification
// This should align with the properties needed by NotificationItem in DashboardLayout
export interface NewNotificationPayload {
  type: 'project' | 'task' | 'alert' | 'message' | 'generic' | 'birthday' | 'academic' | 'info' | 'chat' | 'violation' | 'target' | 'asset' | 'lss' | 'sheet5b7s' | 'bot';
  message: string;
  link?: string;
  iconName: string; // e.g., "Briefcase", "Cake", matching keys in iconMap
}

interface NotificationContextType {
  addAppNotification: (payload: NewNotificationPayload) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({
  children,
  addAppNotification,
}: {
  children: ReactNode;
  addAppNotification: (payload: NewNotificationPayload) => void;
}) => {
  return (
    <NotificationContext.Provider value={{ addAppNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
