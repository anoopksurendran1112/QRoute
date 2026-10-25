import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage.tsx";
import { ScanPage } from "./pages/ScanPage.tsx";
import { SearchPage } from "./pages/SearchPage.tsx";
import { RoutePage } from "./pages/RoutePage.tsx";
import { GuidePage } from "./pages/GuidePage.tsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/scan/:token" element={<ScanPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/route" element={<RoutePage />} />
      <Route path="/guide" element={<GuidePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
