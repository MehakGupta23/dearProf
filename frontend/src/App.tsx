import { Routes, Route } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { MasterDetailLayout } from "./layouts/MasterDetailLayout";
import { Resources } from "./pages/resources/Resources";
import { ResourceDetail } from "./pages/resources/ResourceDetail";
import { Announcements } from "./pages/announcements/Announcements";
import { AnnouncementDetail } from "./pages/announcements/AnnouncementDetail";
import { GeneralAnnouncements } from "./pages/announcements/GeneralAnnouncements";
import { Departments } from "./pages/admin/Departments";
import { Subjects } from "./pages/admin/Subjects";
import { Terms } from "./pages/admin/Terms";
import { TeachingAssignments } from "./pages/admin/TeachingAssignments";
import { Enrollments } from "./pages/admin/Enrollments";
import { Students } from "./pages/admin/Students";
import { StudentDetail } from "./pages/admin/StudentDetail";
import { Dashboard } from "./pages/admin/Dashboard";
import { Professors } from "./pages/admin/Professors";
import { ProfessorDetail } from "./pages/admin/ProfessorDetail";
import { Login } from "./pages/auth/Login";
import { Home } from "./pages/Home";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Home/>} />
        <Route
          path="/resources"
          element={
            <MasterDetailLayout list={<Resources />} basePath="/resources" />
          }
        >
          <Route index element={<div>Select a course to view resources</div>} />
          <Route path=":subjectId" element={<ResourceDetail />} />
        </Route>
        <Route
          path="/announcements"
          element={
            <MasterDetailLayout
              list={<Announcements />}
              basePath="/announcements"
            />
          }
        >
          <Route
            index
            element={
              <div>Select a course or General to view announcements</div>
            }
          />
          <Route path="general" element={<GeneralAnnouncements />} />
          <Route path=":subjectId" element={<AnnouncementDetail />} />
        </Route>
        <Route path="/admin/departments" element={<Departments />} />
        <Route path="/admin/subjects" element={<Subjects />} />
        <Route path="/admin/terms" element={<Terms />} />
        <Route
          path="/admin/teaching-assignments"
          element={<TeachingAssignments />}
        />
        <Route path="/admin/enrollments" element={<Enrollments />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/students/:id" element={<StudentDetail />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/professors" element={<Professors />} />
        <Route path="/admin/professors/:id" element={<ProfessorDetail />} />
        
      </Route>
    </Routes>
  );
}

export default App;
