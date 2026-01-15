import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Cards from "./pages/Cards";
import Transactions from "./pages/Transactions";
import FixedPayments from "./pages/FixedPayments";
import Installments from "./pages/Installments";
import Loans from "./pages/Loans";
import Calendar from "./pages/Calendar";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import AIAdvisor from "./pages/AIAdvisor";
import ReceiptHistory from "./pages/ReceiptHistory";
import ProductAnalysis from "./pages/ProductAnalysis";
import PaymentHistory from "./pages/PaymentHistory";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Install from "./pages/Install";
import Family from "./pages/Family";
import Crypto from "./pages/Crypto";
import Currency from "./pages/Currency";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { DemoProvider } from "./contexts/DemoContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DemoProvider>
            <AuthProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/ai-advisor" element={<ProtectedRoute><AIAdvisor /></ProtectedRoute>} />
                  <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                  <Route path="/cards" element={<ProtectedRoute><Cards /></ProtectedRoute>} />
                  <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                  <Route path="/receipt-history" element={<ProtectedRoute><ReceiptHistory /></ProtectedRoute>} />
                  <Route path="/product-analysis" element={<ProtectedRoute><ProductAnalysis /></ProtectedRoute>} />
                  <Route path="/fixed-payments" element={<ProtectedRoute><FixedPayments /></ProtectedRoute>} />
                  <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
                  <Route path="/installments" element={<ProtectedRoute><Installments /></ProtectedRoute>} />
                  <Route path="/loans" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                  <Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
                  <Route path="/crypto" element={<ProtectedRoute><Crypto /></ProtectedRoute>} />
                  <Route path="/currency" element={<ProtectedRoute><Currency /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </AuthProvider>
          </DemoProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
