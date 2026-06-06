import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Code2, History, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function TerminalHeader() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isReviewer = location.pathname === "/app";
  const isHistory  = location.pathname === "/history";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="bg-navbar sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-hero-blue font-mono font-bold text-sm">&gt;_</span>
          <span className="font-mono text-sm font-bold text-white tracking-wide">
            codelens_v1.0
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {/* Reviewer link */}
              <Link
                to="/app"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                  isReviewer
                    ? "text-hero-blue bg-hero-blue/10"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                Reviewer
              </Link>

              {/* History link */}
              <Link
                to="/history"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                  isHistory
                    ? "text-hero-purple bg-hero-purple/10"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History
              </Link>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 text-white/60 hover:text-white transition-colors rounded"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs text-white/70 hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                className="p-1.5 text-white/60 hover:text-white transition-colors rounded"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </button>
              <Link
                to="/login"
                className="font-mono text-sm text-white/80 hover:text-white px-3 py-1.5 transition-colors"
              >
                login
              </Link>
              <Link to="/signup">
                <button className="bg-primary text-white font-mono text-sm px-4 py-1.5 rounded hover:opacity-90 transition-opacity">
                  sign up
                </button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
