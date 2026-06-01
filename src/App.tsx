import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PublicReport from "./pages/PublicReport";
import PublicSupportReport from "./pages/PublicSupportReport";
import LandingPage from "./pages/LandingPage";
import { AuthGate } from "@/components/auth/AuthGate";
import { useGlobalEnter } from "@/hooks/useGlobalEnter";

const queryClient = new QueryClient();

const App = () => {
  useGlobalEnter();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthGate><Index /></AuthGate>} />
            {/* Landing page pública */}
            <Route path="/lp" element={<LandingPage />} />
            {/* Página pública de relatório gerado — sem autenticação */}
            <Route path="/r/:token" element={<PublicReport />} />
            {/* Página pública de acesso compartilhado ao relatório de atendimentos */}
            <Route path="/acesso/:token" element={<PublicSupportReport />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
