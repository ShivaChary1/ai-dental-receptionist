import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { RequireHospital, RequirePatient, RequireSuperAdmin } from "./auth/guards.jsx";
import { LogoMark } from "./components/ui/Logo.jsx";
import AssistantWidget from "./components/assistant/AssistantWidget.jsx";

// Landing stays eager — it's the entry route and should paint immediately.
import Landing from "./pages/Landing.jsx";

// Everything else loads on demand, one chunk per surface.
const TriageChat = lazy(() => import("./pages/TriageChat.jsx"));
const PatientLogin = lazy(() => import("./pages/auth/PatientLogin.jsx"));
const Register = lazy(() => import("./pages/auth/Register.jsx"));
const ApplyClinic = lazy(() => import("./pages/ApplyClinic.jsx"));
const ForClinics = lazy(() => import("./pages/ForClinics.jsx"));
const Directory = lazy(() => import("./pages/Directory.jsx"));
const HospitalDetail = lazy(() => import("./pages/HospitalDetail.jsx"));
const AccountProfile = lazy(() => import("./pages/account/AccountProfile.jsx"));
const MyBookings = lazy(() => import("./pages/account/MyBookings.jsx"));

const HospitalLogin = lazy(() => import("./pages/auth/HospitalLogin.jsx"));
const HospitalLayout = lazy(() => import("./pages/hospital/HospitalLayout.jsx"));
const HospitalOverview = lazy(() => import("./pages/hospital/HospitalOverview.jsx"));
const HospitalConversations = lazy(() => import("./pages/hospital/HospitalConversations.jsx"));
const HospitalBookings = lazy(() => import("./pages/hospital/HospitalBookings.jsx"));
const HospitalSchedule = lazy(() => import("./pages/hospital/HospitalSchedule.jsx"));
const HospitalProfile = lazy(() => import("./pages/hospital/HospitalProfile.jsx"));
const HospitalInsights = lazy(() => import("./pages/hospital/HospitalInsights.jsx"));

const AdminLogin = lazy(() => import("./pages/auth/AdminLogin.jsx"));
const SuperAdminLayout = lazy(() => import("./pages/superadmin/SuperAdminLayout.jsx"));
const Applications = lazy(() => import("./pages/superadmin/Applications.jsx"));
const LiveHospitals = lazy(() => import("./pages/superadmin/LiveHospitals.jsx"));
const Metrics = lazy(() => import("./pages/superadmin/Metrics.jsx"));

const DashboardLayout = lazy(() => import("./pages/Dashboard/DashboardLayout.jsx"));
const Overview = lazy(() => import("./pages/Dashboard/Overview.jsx"));
const Appointments = lazy(() => import("./pages/Dashboard/Appointments.jsx"));
const Conversations = lazy(() => import("./pages/Dashboard/Conversations.jsx"));
const AgentKnowledge = lazy(() => import("./pages/Dashboard/AgentKnowledge.jsx"));

/** Route-chunk fallback: brand mark pulsing on the app background. Chunk
 *  loads are usually <200ms, so this only flashes on slow connections. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LogoMark className="h-10 w-10 animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Marketing */}
        <Route path="/" element={<Landing />} />

        {/* Patient app */}
        <Route path="/chat" element={<TriageChat />} />
        <Route path="/login" element={<PatientLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/apply" element={<ApplyClinic />} />
        <Route path="/for-clinics" element={<ForClinics />} />
        <Route path="/clinics" element={<Directory />} />
        <Route path="/clinics/:id" element={<HospitalDetail />} />
        <Route path="/account" element={<RequirePatient><AccountProfile /></RequirePatient>} />
        <Route path="/account/bookings" element={<RequirePatient><MyBookings /></RequirePatient>} />

        {/* Hospital app */}
        <Route path="/hospital/login" element={<HospitalLogin />} />
        <Route
          path="/hospital"
          element={
            <RequireHospital>
              <HospitalLayout />
            </RequireHospital>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<HospitalOverview />} />
          <Route path="conversations" element={<HospitalConversations />} />
          <Route path="bookings" element={<HospitalBookings />} />
          <Route path="schedule" element={<HospitalSchedule />} />
          <Route path="profile" element={<HospitalProfile />} />
          <Route path="insights" element={<HospitalInsights />} />
        </Route>

        {/* Super admin app */}
        <Route path="/superadmin/login" element={<AdminLogin />} />
        <Route
          path="/superadmin"
          element={
            <RequireSuperAdmin>
              <SuperAdminLayout />
            </RequireSuperAdmin>
          }
        >
          <Route index element={<Navigate to="applications" replace />} />
          <Route path="applications" element={<Applications />} />
          <Route path="hospitals" element={<LiveHospitals />} />
          <Route path="metrics" element={<Metrics />} />
        </Route>

        {/* Legacy single-tenant dashboard (super-admin gated for now) */}
        <Route
          path="/dashboard"
          element={
            <RequireSuperAdmin>
              <DashboardLayout />
            </RequireSuperAdmin>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="knowledge" element={<AgentKnowledge />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AssistantWidget />
    </Suspense>
  );
}
