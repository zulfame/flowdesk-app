import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import { AuthProvider } from "@/context/AuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";

// ── Modules pending design-system migration ──
// Routes stay registered (reachable by direct URL) but are hidden from the
// sidebar until each one is rebuilt (see config/navigation.js).
import Profile from "@/pages/Profile";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import TaskForm from "@/pages/TaskForm";
import Meetings from "@/pages/Meetings";
import MeetingDetail from "@/pages/MeetingDetail";
import MeetingForm from "@/pages/MeetingForm";
import HelpTickets from "@/pages/HelpTickets";
import Calendar from "@/pages/Calendar";
import Reminders from "@/pages/Reminders";
import TimeSchedule from "@/pages/TimeSchedule";
import TimeScheduleDetail from "@/pages/TimeScheduleDetail";
import Notes from "@/pages/Notes";
import Notifications from "@/pages/Notifications";
import ActivityLog from "@/pages/ActivityLog";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";
import Database from "@/pages/Database";
import ArchivePage from "@/pages/Archive";
import AppSettings from "@/pages/AppSettings";
import NotificationSettings from "@/pages/NotificationSettings";

const PAGES = [
  { path: "/", element: <Dashboard /> },
  { path: "/profile", element: <Profile /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/tasks/new", element: <TaskForm /> },
  { path: "/tasks/:id", element: <TaskDetail /> },
  { path: "/meetings", element: <Meetings /> },
  { path: "/meetings/new", element: <MeetingForm /> },
  { path: "/meetings/:id", element: <MeetingDetail /> },
  { path: "/meetings/:id/edit", element: <MeetingForm /> },
  { path: "/help-tickets", element: <HelpTickets /> },
  { path: "/calendar", element: <Calendar /> },
  { path: "/reminders", element: <Reminders /> },
  { path: "/time-schedule", element: <TimeSchedule /> },
  { path: "/time-schedule/:id", element: <TimeScheduleDetail /> },
  { path: "/notes", element: <Notes /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/activity", element: <ActivityLog /> },
  { path: "/users", element: <Users /> },
  { path: "/roles", element: <Roles /> },
  { path: "/database", element: <Database /> },
  { path: "/archive", element: <ArchivePage /> },
  { path: "/app-settings", element: <AppSettings /> },
  { path: "/notification-settings", element: <NotificationSettings /> },
];

function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                {PAGES.map((p) => (
                  <Route
                    key={p.path}
                    path={p.path}
                    element={
                      <ProtectedRoute>
                        <AppLayout>{p.element}</AppLayout>
                      </ProtectedRoute>
                    }
                  />
                ))}
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
          <Toaster position="bottom-right" closeButton />
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}

export default App;
