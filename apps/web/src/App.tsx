import { Routes, Route } from "react-router-dom";
import ArenaPage from "./pages/AreaPage";
import LandingPage from "./pages/LandinPage";
import SpaceListPage from "./pages/SpaceListPage";
import SpacePage from "./pages/SpacePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";


function App() {

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/arena" element={<ArenaPage />} />
      <Route path="/space" element={<SpaceListPage />} />
      <Route path="/space/:spaceName" element={<SpacePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

    </Routes>
  )
}

export default App
