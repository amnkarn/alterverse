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
      <Route path="/arena" element={<ArenaPage />} /> {/*Arena page should be secured*/}
      <Route path="/space" element={<SpaceListPage />} /> {/* does not required to be secured */}
      <Route path="/space/:spaceName" element={<SpacePage />} /> {/*space page should be secured*/}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

    </Routes>
  )
}

export default App
