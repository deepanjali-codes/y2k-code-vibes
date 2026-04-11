import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import ReviewPage from "./Review";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="font-mono text-sm text-muted-foreground animate-blink">▊ INITIALIZING...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <ReviewPage />;
}
