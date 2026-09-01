import { Routes, Route } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { MasterDetailLayout } from './layouts/MasterDetailLayout';
import { Resources } from './pages/resources/Resources';
import { ResourceDetail } from './pages/resources/ResourceDetail';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<div>Home — coming soon</div>} />
        <Route path="/resources" element={<MasterDetailLayout list={<Resources />} basePath="/resources" />}>
          <Route index element={<div>Select a course to view resources</div>} />
          <Route path=":subjectId" element={<ResourceDetail />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;