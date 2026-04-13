import { useEffect, useRef } from "react";

const CODE_WORDS = [
  "function", "const", "let", "var", "return", "import", "export", "class",
  "async", "await", "if", "else", "for", "while", "try", "catch", "throw",
  "null", "undefined", "true", "false", "=>", "{}", "[]", "&&", "||",
  "console.log", "interface", "type", "enum", "void", "string", "number",
  "boolean", "Array", "Promise", "Error", "new", "this", "super", "extends",
  "implements", "public", "private", "static", "readonly", "abstract",
  "0x00", "0xFF", "\\n", "//", "/*", "*/", "</>", "npm", "git", "push",
];

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
}

export function BackgroundTextRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let columns: Column[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
    };

    const initColumns = () => {
      columns = [];
      const colWidth = 120;
      const numCols = Math.ceil(canvas.width / colWidth);
      for (let i = 0; i < numCols; i++) {
        columns.push({
          x: i * colWidth + Math.random() * 40,
          y: Math.random() * canvas.height,
          speed: 0.3 + Math.random() * 0.7,
          chars: Array.from({ length: 5 + Math.floor(Math.random() * 8) }, () =>
            CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]
          ),
          opacity: 0.03 + Math.random() * 0.04,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = document.documentElement.classList.contains("dark");
      
      columns.forEach((col) => {
        ctx.font = "11px 'JetBrains Mono', monospace";
        col.chars.forEach((char, j) => {
          const y = col.y + j * 18;
          const wrappedY = y % (canvas.height + 200) - 100;
          ctx.fillStyle = isDark
            ? `hsla(120, 100%, 50%, ${col.opacity})`
            : `hsla(280, 70%, 55%, ${col.opacity})`;
          ctx.fillText(char, col.x, wrappedY);
        });
        col.y += col.speed;
        if (col.y > canvas.height + 200) {
          col.y = -col.chars.length * 18;
          col.chars = Array.from({ length: col.chars.length }, () =>
            CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]
          );
        }
      });

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
