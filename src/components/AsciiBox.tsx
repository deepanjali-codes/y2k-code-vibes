import React from "react";

interface AsciiBoxProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function AsciiBox({ title, children, className = "" }: AsciiBoxProps) {
  const padded = ` ${title} `;
  const width = Math.max(padded.length + 4, 34);
  const top = "╔" + "═".repeat(width - 2) + "╗";
  const bottom = "╚" + "═".repeat(width - 2) + "╝";
  const pad = width - 2 - padded.length;
  const left = Math.floor(pad / 2);
  const right = pad - left;
  const mid = "║" + " ".repeat(left) + padded + " ".repeat(right) + "║";

  return (
    <div className={`font-mono text-sm ${className}`}>
      <pre className="text-primary text-glow-green leading-tight select-none">
        {top}
        {"\n"}
        {mid}
        {"\n"}
        {bottom}
      </pre>
      {children}
    </div>
  );
}
