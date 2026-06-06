import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ParsedAlternative {
  title: string;
  code: string;
}

export interface ParsedReview {
  mainReview: string;
  hasAlternatives: boolean;
  alternatives: ParsedAlternative[];
}

/**
 * Parses the CodeLens AI review text to extract any alternative solutions.
 * Separates the main review and extracts code blocks with their custom descriptions.
 */
export function parseAlternativeSolutions(reviewText: string): ParsedReview {
  if (!reviewText) {
    return { mainReview: "", hasAlternatives: false, alternatives: [] };
  }

  // Case-insensitive match for the Alternative Solutions header, ignoring optional emoji
  const altHeaderRegex = /(?:💡\s*)?alternative\s+solutions\s*:?/i;
  const matchHeader = reviewText.match(altHeaderRegex);

  if (!matchHeader || matchHeader.index === undefined) {
    return { mainReview: reviewText, hasAlternatives: false, alternatives: [] };
  }

  const headerIndex = matchHeader.index;
  const mainReview = reviewText.slice(0, headerIndex).trim();
  const altSection = reviewText.slice(headerIndex);

  // Match code blocks within the Alternative Solutions section: ```lang ... ```
  const codeBlockRegex = /```[a-zA-Z0-9+#]*\n([\s\S]*?)```/g;
  const blocks: { code: string; index: number; endIndex: number }[] = [];
  let blockMatch;

  while ((blockMatch = codeBlockRegex.exec(altSection)) !== null) {
    blocks.push({
      code: blockMatch[1].trim(),
      index: blockMatch.index,
      endIndex: codeBlockRegex.lastIndex,
    });
  }

  if (blocks.length === 0) {
    return { mainReview: reviewText, hasAlternatives: false, alternatives: [] };
  }

  const alternatives: ParsedAlternative[] = [];
  // Start scanning title text after the header match itself
  let lastEnd = matchHeader[0].length;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prevText = altSection.slice(lastEnd, block.index).trim();
    lastEnd = block.endIndex;

    // Clean up lists/numbers from titles
    let title = prevText
      .replace(/^[-\d\.\s*•]+/, "") // remove leading markers like "1.", "-", etc.
      .replace(/:+$/, "")          // remove trailing colons
      .trim();

    if (!title) {
      title = i === 0 ? "Improved version — the glow-up" : "Alternative approach — different timeline";
    }

    alternatives.push({
      title,
      code: block.code,
    });
  }

  return {
    mainReview,
    hasAlternatives: true,
    alternatives,
  };
}
