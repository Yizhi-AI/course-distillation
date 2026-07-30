export type MaterialKind = "course" | "supplement";
export type MaterialRole = "structure" | "transcript" | "supplement";

export type MaterialFile = {
  id: string;
  kind: MaterialKind;
  role: MaterialRole;
  name: string;
  size: number;
  text: string;
};

export const readableExtensions = ["md", "txt", "json", "csv", "srt", "vtt"];

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function detectMaterialRole(
  file: File,
  text: string,
  kind: MaterialKind,
): MaterialRole {
  if (kind === "supplement") return "supplement";
  const extension = extensionOf(file.name);
  const signal = `${file.name}\n${text.slice(0, 2400)}`.toLowerCase();
  if (
    extension === "srt" ||
    extension === "vtt" ||
    /逐字稿|转写|字幕|录音稿|听悟|妙记|transcript|speaker\s*\d|-->|(?:^|\n)\s*\d{1,2}:\d{2}(?::\d{2})?/i.test(
      signal,
    )
  ) {
    return "transcript";
  }
  return "structure";
}

const roleTitles: Record<MaterialRole, string> = {
  structure: "课件、讲义或题本依据",
  transcript: "逐字稿或字幕",
  supplement: "题本、答案、笔记等补充资料",
};

export function buildCourseCorpus(materials: MaterialFile[]) {
  const sections = (Object.keys(roleTitles) as MaterialRole[]).flatMap(
    (role) => {
      const files = materials.filter((file) => file.role === role);
      if (!files.length) return [];
      return [
        [
          `# ${roleTitles[role]}`,
          ...files.map(
            (file, index) =>
              `## 文件 ${index + 1}：${file.name}\n\n${file.text.trim()}`,
          ),
        ].join("\n\n"),
      ];
    },
  );

  return sections.join("\n\n---\n\n");
}

export async function readIncomingFiles(
  incoming: FileList | File[],
  kind: MaterialKind,
) {
  const accepted: MaterialFile[] = [];
  const rejected: string[] = [];

  for (const file of Array.from(incoming)) {
    const extension = extensionOf(file.name);
    if (!readableExtensions.includes(extension)) {
      rejected.push(`${file.name}：请先转换为 MD、TXT 或 JSON`);
      continue;
    }
    const text = await file.text();
    if (!text.trim()) {
      rejected.push(`${file.name}：没有读取到文字`);
      continue;
    }
    accepted.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${kind}`,
      kind,
      role: detectMaterialRole(file, text, kind),
      name: file.name,
      size: file.size,
      text,
    });
  }

  return { accepted, rejected };
}
