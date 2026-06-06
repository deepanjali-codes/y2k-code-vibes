import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TerminalHeader } from "@/components/TerminalHeader";

const BOOT_LINES = [
  "> initializing system...",
  "> loading intelligence modules...",
  "> connecting to ai core (gemini-3.5-flash)...",
  "> calibrating senior engineer persona...",
  "> ready.",
];

function BootSequence() {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i < BOOT_LINES.length) {
        setLines((prev) => [...prev, BOOT_LINES[i]]);
        i++;
        setTimeout(tick, 600 + Math.random() * 300);
      } else {
        setDone(true);
      }
    };
    const t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-5 font-mono text-sm leading-relaxed">
      {/* ASCII header box */}
      <div className="border border-border rounded px-4 py-2 inline-block mb-4 text-xs text-muted-foreground">
        <div className="text-foreground font-semibold">CODELENS v1.0</div>
        <div>AI CODE REVIEW TERMINAL</div>
      </div>

      <div className="space-y-0.5">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`${line === "> ready." ? "text-hero-green font-semibold" : "text-muted-foreground"}`}
          >
            {line}
          </div>
        ))}
      </div>

      {done && (
        <div className="mt-1 text-foreground">
          <span className="animate-blink">$</span>
        </div>
      )}
    </div>
  );
}

const SAMPLE_REVIEW = `[ CODE REVIEW START ]

✓ Strengths:
- Clean separation of concerns.
- Reasonable variable naming.

✗ Issues:
- Mutates input array silently.
- No bounds checking on index.

→ Suggestions:
1. Return a new array instead of mutating.
2. Validate inputs at the boundary.
3. Add tests for edge cases.

📊 Code Score:
6.5/10 — ships, but you'll regret it on Friday.

💡 Vibe Check:
- Clean logic, but dangerously overconfident.
- Readable, not yet scalable.
- Senior-shaped instinct, junior-shaped execution.

[ CODE REVIEW END ]`;

const FEATURES = [
  {
    icon: "⚙️",
    title: "strict ai engine",
    desc: "Gemini trained on the senior-engineer mindset.",
  },
  {
    icon: "📂",
    title: "real codebases",
    desc: "files, folders, .zip — even nested archives.",
  },
  {
    icon: "📸",
    title: "screenshot ocr",
    desc: "paste an image, we extract the code & review it.",
  },
  {
    icon: "✨",
    title: "vibe check",
    desc: "brutally honest 3-line verdict on your code.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Custom CTA buttons for authenticated user

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <TerminalHeader />

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10">
        <p className="font-mono text-xs tracking-[0.25em] text-hero-purple mb-5 uppercase">
          AI CODE REVIEW TERMINAL
        </p>
        <h1 className="font-mono font-bold text-4xl md:text-5xl leading-tight text-foreground mb-6">
          See your code{" "}
          <span className="text-hero-blue">clearly</span>.<br />
          Get judged by a{" "}
          <span className="text-hero-purple">strict senior<br />engineer</span>.
        </h1>
        <p className="font-mono text-sm text-muted-foreground max-w-xl mb-8 leading-relaxed">
          Codelens reviews your code with surgical precision —<br />
          strengths, issues, suggestions, alternative solutions, a<br />
          brutal score, and a vibe check that doesn't sugarcoat.
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <>
              <Link to="/app">
                <button className="btn-primary flex items-center gap-2">
                  go to console <span>→</span>
                </button>
              </Link>
              <Link to="/history">
                <button className="btn-outline">view history</button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/signup">
                <button className="btn-primary flex items-center gap-2">
                  start review session <span>→</span>
                </button>
              </Link>
              <Link to="/login">
                <button className="btn-outline">login</button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap gap-10">
          <div>
            <div className="font-mono font-bold text-2xl text-hero-blue">15+</div>
            <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase mt-0.5">
              LANGUAGES
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-2xl text-hero-green">6</div>
            <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase mt-0.5">
              INPUT MODES
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-2xl text-hero-purple">strict</div>
            <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase mt-0.5">
              AI PERSONA
            </div>
          </div>
        </div>
      </section>

      {/* ── Boot Terminal Demo ── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="terminal-window shadow-lg">
          <div className="terminal-titlebar">
            <div className="w-3 h-3 rounded-full mac-dot-red" />
            <div className="w-3 h-3 rounded-full mac-dot-yellow" />
            <div className="w-3 h-3 rounded-full mac-dot-green" />
            <span className="font-mono text-xs text-muted-foreground ml-2">
              codelens@local — boot.sh
            </span>
          </div>
          <BootSequence />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="terminal-window p-5">
              <div className="text-xl mb-3">{f.icon}</div>
              <div className="font-mono font-semibold text-sm text-foreground mb-1">
                {f.title}
              </div>
              <div className="font-mono text-xs text-muted-foreground leading-relaxed">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample Output ── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <p className="font-mono text-xs tracking-[0.25em] text-hero-purple mb-5 uppercase">
          SAMPLE OUTPUT
        </p>
        <div className="terminal-window shadow-lg">
          <div className="terminal-titlebar">
            <div className="w-3 h-3 rounded-full mac-dot-red" />
            <div className="w-3 h-3 rounded-full mac-dot-yellow" />
            <div className="w-3 h-3 rounded-full mac-dot-green" />
            <span className="font-mono text-xs text-muted-foreground ml-2">
              review.out
            </span>
          </div>
          <pre className="p-5 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {SAMPLE_REVIEW.split("\n").map((line, i) => {
              let cls = "text-foreground";
              if (line.startsWith("✓")) cls = "text-hero-green";
              else if (line.startsWith("✗")) cls = "text-destructive";
              else if (line.startsWith("→")) cls = "text-hero-blue";
              else if (line.startsWith("📊")) cls = "text-hero-blue font-semibold";
              else if (line.startsWith("💡")) cls = "text-hero-purple font-semibold";
              else if (line.includes("[ CODE REVIEW")) cls = "text-foreground font-bold";
              return (
                <span key={i} className={cls}>
                  {line}
                  {"\n"}
                </span>
              );
            })}
          </pre>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            🔒 jwt-secured · self-hostable
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            codelens v1.0 — see your code clearly.
          </span>
        </div>
      </footer>
    </div>
  );
}
