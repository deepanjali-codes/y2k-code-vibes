import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, LogOut, History, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function TerminalHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-border bg-card/80 glassmorphism sticky top-0 z-50"
    >
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-bold tracking-wider text-primary text-glow-green">
            AI_REVIEWER
          </span>
          <span className="text-xs text-muted-foreground font-mono">v2.0</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user && location.pathname !== "/history" && (
            <Button variant="ghost" size="sm" asChild className="font-mono text-xs">
              <Link to="/history">
                <History className="h-4 w-4 mr-1" />
                HISTORY
              </Link>
            </Button>
          )}
          {user && location.pathname === "/history" && (
            <Button variant="ghost" size="sm" asChild className="font-mono text-xs">
              <Link to="/">
                <Terminal className="h-4 w-4 mr-1" />
                REVIEW
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user && (
            <Button variant="ghost" size="sm" onClick={signOut} className="font-mono text-xs">
              <LogOut className="h-4 w-4 mr-1" />
              LOGOUT
            </Button>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
