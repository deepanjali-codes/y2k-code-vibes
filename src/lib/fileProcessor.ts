import JSZip from "jszip";

export interface ProcessedFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "py", "java", "c", "h", "cpp", "cc", "cxx", "hpp",
  "go", "rs", "php", "sql", "sh", "bash", "html", "htm", "css", "json", "yml",
  "yaml", "md", "txt", "xml", "toml", "cfg", "ini", "env", "rb", "swift",
  "kt", "scala", "r", "lua", "pl", "ex", "exs", "clj", "hs", "erl",
]);

function isTextFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return TEXT_EXTENSIONS.has(ext);
}

export async function processFiles(files: File[]): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];

  for (const file of files) {
    if (file.name.endsWith(".zip")) {
      const zipResults = await processZip(file);
      results.push(...zipResults);
    } else if (isTextFile(file.name)) {
      const content = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
      results.push({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        content,
        language: ext,
      });
    }
  }

  return results;
}

async function processZip(file: File): Promise<ProcessedFile[]> {
  const zip = await JSZip.loadAsync(file);
  const results: ProcessedFile[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const filename = path.split("/").pop() || path;
    if (!isTextFile(filename)) continue;

    const content = await entry.async("string");
    const ext = filename.split(".").pop()?.toLowerCase() || "txt";
    results.push({ name: filename, path, content, language: ext });
  }

  return results;
}

export async function processImageOCR(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text;
}
