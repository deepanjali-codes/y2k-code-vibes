import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

import LandingPage  from "./pages/Landing";
import LoginPage    from "./pages/Login";
import SignupPage   from "./pages/Signup";
import ReviewPage   from "./pages/Review";
import HistoryPage  from "./pages/History";
import NotFound     from "./pages/NotFound";

const queryClient = new QueryClient();

/** Minimal full-screen loader shown while Firebase auth resolves */
function AuthLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="font-mono text-sm text-muted-foreground flex flex-col items-center gap-3">
        <div className="animate-pulse text-primary text-2xl">⬡</div>
        <span>initializing codelens...</span>
      </div>
    </div>
  );
}

/** Redirects to /login if the user is not authenticated */
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirects to /app if the user IS already authenticated */
function Guest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Guest><LandingPage /></Guest>} />
      <Route path="/login"  element={<Guest><LoginPage /></Guest>} />
      <Route path="/signup" element={<Guest><SignupPage /></Guest>} />

      {/* Protected */}
      <Route path="/app"     element={<Protected><ReviewPage /></Protected>} />
      <Route path="/history" element={<Protected><HistoryPage /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
