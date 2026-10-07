import { Routes, Route } from "react-router-dom";
import ArenaPage from "./pages/ArenaPage";
import LandingPage from "./pages/LandinPage";
import SpaceListPage from "./pages/SpaceListPage";
import SpacePage from "./pages/SpacePage";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AvatarManagementPage from "./pages/admin/AvatarManagementPage";
import ElementManagementPage from "./pages/admin/ElementManagementPage";
import MapManagementPage from "./pages/admin/MapManagementPage";
import HomePage from "./pages/HomePage";
import CreateSpacePage from "./pages/CreateSpacePage";
import RequireAuth from "./routes/RequireAuth";
import RequireAdmin from "./routes/RequireAdmin";


function App() {

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      {/* does not required to be secured, show all spaces */}
      <Route path="/spaces" element={<SpaceListPage />} />


      <Route element={<RequireAuth />}>
        <Route path="/app" element={<HomePage />} />
        <Route path="/app/create-space" element={<CreateSpacePage />} />
        {/*secured lobby/details page. user choose an avatar/display name and join.*/}
        <Route path="/app/spaces/:spaceId" element={<SpacePage />} />
        <Route
          path="/app/spaces/:spaceId/arena"
          element={<ArenaPage />}
        />

        {/* Admin secured pages */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/avatars" element={<AvatarManagementPage />} />
          <Route path="/admin/elements" element={<ElementManagementPage />} />
          <Route path="/admin/maps" element={<MapManagementPage />} />
        </Route>
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App