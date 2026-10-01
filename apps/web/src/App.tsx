import { Routes, Route } from "react-router-dom";
import ArenaPage from "./pages/AreaPage";
import LandingPage from "./pages/LandinPage";
import SpaceListPage from "./pages/SpaceListPage";
import SpacePage from "./pages/SpacePage";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";


function App() {

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/arena" element={<ArenaPage />} /> {/*Arena page should be secured*/}
      <Route path="/space" element={<SpaceListPage />} /> {/* does not required to be secured */}
      <Route path="/space/:spaceName" element={<SpacePage />} /> {/*space page should be secured*/}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
