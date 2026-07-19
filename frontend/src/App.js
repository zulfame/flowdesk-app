import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import TaskForm from "@/pages/TaskForm";
import Meetings from "@/pages/Meetings";
import MeetingDetail from "@/pages/MeetingDetail";
import Calendar from "@/pages/Calendar";
import Reminders from "@/pages/Reminders";
import Notes from "@/pages/Notes";
import Notifications from "@/pages/Notifications";
import ActivityLog from "@/pages/ActivityLog";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";

const PAGES = [
  { path: "/", element: <Dashboard /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/tasks/new", element: <TaskForm /> },
  { path: "/tasks/:id", element: <TaskDetail /> },
  { path: "/tasks/:id/edit", element: <TaskForm /> },
  { path: "/meetings", element: <Meetings /> },
  { path: "/meetings/:id", element: <MeetingDetail /> },
  { path: "/calendar", element: <Calendar /> },
  { path: "/reminders", element: <Reminders /> },
  { path: "/notes", element: <Notes /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/activity", element: <ActivityLog /> },
  { path: "/users", element: <Users /> },
  { path: "/settings", element: <Settings /> },
];

function App() {
  return (
    <ThemeProvider>
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
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
