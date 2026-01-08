import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Interpreters from "./pages/Interpreters";
import InterpreterDetail from "./pages/InterpreterDetail";
import Facilities from "./pages/Facilities";
import FacilityDetail from "./pages/FacilityDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payables from "./pages/Payables";
import PayableDetail from "./pages/PayableDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<AppLayout><Index /></AppLayout>} />
            <Route path="/jobs" element={<AppLayout><Jobs /></AppLayout>} />
            <Route path="/jobs/:id" element={<AppLayout><JobDetail /></AppLayout>} />
            <Route path="/interpreters" element={<AppLayout><Interpreters /></AppLayout>} />
            <Route path="/interpreters/:id" element={<AppLayout><InterpreterDetail /></AppLayout>} />
            <Route path="/facilities" element={<AppLayout><Facilities /></AppLayout>} />
            <Route path="/facilities/:id" element={<AppLayout><FacilityDetail /></AppLayout>} />
            <Route path="/invoices" element={<AppLayout><Invoices /></AppLayout>} />
            <Route path="/invoices/:id" element={<AppLayout><InvoiceDetail /></AppLayout>} />
            <Route path="/payables" element={<AppLayout><Payables /></AppLayout>} />
            <Route path="/payables/:id" element={<AppLayout><PayableDetail /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
