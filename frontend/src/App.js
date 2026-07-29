import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { BrandingProvider } from "@/context/BrandingContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
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
  { path: "/tasks/:id/edit", element: <TaskForm /> },
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
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              {PAGES.map((p) => (
                <Route
                  key={p.path}
                  path={p.path}
                  element={
                    <ProtectedRoute>
                      <Layout>{p.element}</Layout>
                    </ProtectedRoute>
                  }
                />
              ))}
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}

export default App;
