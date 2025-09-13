import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ExplorationPage from "./pages/ExplorationPage";
import LatentSpacePage from "./pages/LatentSpacePage";
import MemoryAnalysisPage from "./pages/MemoryAnalysisPage";

function AppContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ExplorationPage />} />
        <Route path="/latent-space" element={<LatentSpacePage />} />
        <Route path="/memory" element={<MemoryAnalysisPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
