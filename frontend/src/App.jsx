import { Navigate, Route, Routes } from "react-router-dom";
import UserChat from "./pages/UserChat.jsx";
import DashboardLayout from "./pages/Dashboard/DashboardLayout.jsx";
import Overview from "./pages/Dashboard/Overview.jsx";
import Appointments from "./pages/Dashboard/Appointments.jsx";
import Conversations from "./pages/Dashboard/Conversations.jsx";
import AgentKnowledge from "./pages/Dashboard/AgentKnowledge.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UserChat />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="knowledge" element={<AgentKnowledge />} />
      </Route>
    </Routes>
  );
}
