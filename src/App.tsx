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
import DemoUpload from "./pages/DemoUpload";
import Demo from "./pages/Demo";
import ContactConfirm from "./pages/ContactConfirm";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Snapshots from "./pages/Snapshots";
import Calibrate from "./pages/Calibrate";
import SystemDocs from "./pages/SystemDocs";
import ContractGenerator from "./pages/ContractGenerator";
import Tickets from "./pages/Tickets";
import FinanceDashboard from "./pages/FinanceDashboard";
import InvoiceManagement from "./pages/InvoiceManagement";
import FinanceCompanies from "./pages/FinanceCompanies";
import FinanceCompanyDetail from "./pages/FinanceCompanyDetail";
import FinanceContracts from "./pages/FinanceContracts";
import ServerAdmin from "./pages/ServerAdmin";
import { isServerAdminAvailable } from "@/lib/environment";

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

const FinanceRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user?.role !== "admin" && user?.role !== "accountant") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AccountantRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user?.role === "accountant") return <Navigate to="/finance" replace />;
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
            <Route path="/demo-upload" element={<DemoUpload />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/contact-confirm" element={<ContactConfirm />} />
            <Route path="/contact/confirm" element={<ContactConfirm />} />
            <Route path="/calibrate" element={<Calibrate />} />
            <Route path="/" element={<ProtectedPage><AccountantRedirect><Dashboard /></AccountantRedirect></ProtectedPage>} />
            <Route path="/patients" element={<ProtectedPage><AccountantRedirect><PatientList /></AccountantRedirect></ProtectedPage>} />
            <Route path="/new-patient" element={<ProtectedPage><AccountantRedirect><NewPatient /></AccountantRedirect></ProtectedPage>} />
            <Route path="/patient/:id" element={<ProtectedPage><AccountantRedirect><PatientDetail /></AccountantRedirect></ProtectedPage>} />
            <Route path="/companies" element={<ProtectedPage><AdminRoute><CompanyManagement /></AdminRoute></ProtectedPage>} />
            <Route path="/users" element={<ProtectedPage><AdminRoute><UserManagement /></AdminRoute></ProtectedPage>} />
            <Route path="/snapshots" element={<ProtectedPage><AdminRoute><Snapshots /></AdminRoute></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
            <Route path="/system-docs" element={<ProtectedPage><AdminRoute><SystemDocs /></AdminRoute></ProtectedPage>} />
            <Route path="/contracts" element={<ProtectedPage><FinanceRoute><ContractGenerator /></FinanceRoute></ProtectedPage>} />
            <Route path="/tickets" element={<ProtectedPage><AccountantRedirect><Tickets /></AccountantRedirect></ProtectedPage>} />
            {/* Finance routes - accessible by admin and accountant */}
            <Route path="/finance" element={<ProtectedPage><FinanceRoute><FinanceDashboard /></FinanceRoute></ProtectedPage>} />
            <Route path="/finance/invoices" element={<ProtectedPage><FinanceRoute><InvoiceManagement /></FinanceRoute></ProtectedPage>} />
            <Route path="/finance/companies" element={<ProtectedPage><FinanceRoute><FinanceCompanies /></FinanceRoute></ProtectedPage>} />
            <Route path="/finance/companies/:id" element={<ProtectedPage><FinanceRoute><FinanceCompanyDetail /></FinanceRoute></ProtectedPage>} />
            <Route path="/finance/contracts" element={<ProtectedPage><FinanceRoute><FinanceContracts /></FinanceRoute></ProtectedPage>} />
            <Route path="/server-admin" element={isServerAdminAvailable() ? <ProtectedPage><AdminRoute><ServerAdmin /></AdminRoute></ProtectedPage> : <Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
