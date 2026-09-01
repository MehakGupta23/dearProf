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

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<div>Home — coming soon</div>} />
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
      </Route>
    </Routes>
  );
}

export default App;
