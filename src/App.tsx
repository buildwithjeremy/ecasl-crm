import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import NewJob from "./pages/NewJob";
import Interpreters from "./pages/Interpreters";
import InterpreterDetail from "./pages/InterpreterDetail";
import Facilities from "./pages/Facilities";
import FacilityDetail from "./pages/FacilityDetail";
import NewFacility from "./pages/NewFacility";
import NewInterpreter from "./pages/NewInterpreter";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payables from "./pages/Payables";
import PayableDetail from "./pages/PayableDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/auth", element: <Auth /> },
  { path: "/", element: <AppLayout><Index /></AppLayout> },
  { path: "/jobs", element: <AppLayout><Jobs /></AppLayout> },
  { path: "/jobs/new", element: <AppLayout><NewJob /></AppLayout> },
  { path: "/jobs/:id", element: <AppLayout><JobDetail /></AppLayout> },
  { path: "/interpreters", element: <AppLayout><Interpreters /></AppLayout> },
  { path: "/interpreters/new", element: <AppLayout><NewInterpreter /></AppLayout> },
  { path: "/interpreters/:id", element: <AppLayout><InterpreterDetail /></AppLayout> },
  { path: "/facilities", element: <AppLayout><Facilities /></AppLayout> },
  { path: "/facilities/new", element: <AppLayout><NewFacility /></AppLayout> },
  { path: "/facilities/:id", element: <AppLayout><FacilityDetail /></AppLayout> },
  { path: "/invoices", element: <AppLayout><Invoices /></AppLayout> },
  { path: "/invoices/:id", element: <AppLayout><InvoiceDetail /></AppLayout> },
  { path: "/payables", element: <AppLayout><Payables /></AppLayout> },
  { path: "/payables/:id", element: <AppLayout><PayableDetail /></AppLayout> },
  { path: "/settings", element: <AppLayout><Settings /></AppLayout> },
  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
