import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import PatientList from "./pages/PatientList";
import PatientDetail from "./pages/PatientDetail";
import NewPatient from "./pages/NewPatient";
import Login from "./pages/Login";
import CompanyManagement from "./pages/CompanyManagement";
import UserManagement from "./pages/UserManagement";
import MobileUpload from "./pages/MobileUpload";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Snapshots from "./pages/Snapshots";
import Calibrate from "./pages/Calibrate";
import SystemDocs from "./pages/SystemDocs";
import ContractGenerator from "./pages/ContractGenerator";
import Tickets from "./pages/Tickets";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/upload" element={<MobileUpload />} />
            <Route path="/calibrate" element={<Calibrate />} />
            <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/patients" element={<ProtectedPage><PatientList /></ProtectedPage>} />
            <Route path="/new-patient" element={<ProtectedPage><NewPatient /></ProtectedPage>} />
            <Route path="/patient/:id" element={<ProtectedPage><PatientDetail /></ProtectedPage>} />
            <Route path="/companies" element={<ProtectedPage><AdminRoute><CompanyManagement /></AdminRoute></ProtectedPage>} />
            <Route path="/users" element={<ProtectedPage><AdminRoute><UserManagement /></AdminRoute></ProtectedPage>} />
            <Route path="/snapshots" element={<ProtectedPage><AdminRoute><Snapshots /></AdminRoute></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
            <Route path="/system-docs" element={<ProtectedPage><AdminRoute><SystemDocs /></AdminRoute></ProtectedPage>} />
            <Route path="/contracts" element={<ProtectedPage><AdminRoute><ContractGenerator /></AdminRoute></ProtectedPage>} />
            <Route path="/tickets" element={<ProtectedPage><Tickets /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
