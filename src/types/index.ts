import type { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile extends FirebaseUser {
  // Add any custom user profile properties here if needed
  // For example: role?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold';
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  teamMembers: string[]; // Array of user IDs or names
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end?: string; // ISO date string
  allDay?: boolean;
  projectId?: string; // Link to a project
  description?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  assignee?: string; // User ID or name
  dueDate?: string; // ISO date string
  projectId: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number; // Firestore timestamp or Unix timestamp
  channelId: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string; // e.g., "created_task", "updated_project_status"
  details?: Record<string, any>; // Additional details about the activity
  timestamp: number;
  projectId?: string;
  taskId?: string;
}
