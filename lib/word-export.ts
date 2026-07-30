import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

function inlineRuns(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    return new TextRun({
      text: bold ? part.slice(2, -2) : part,
      bold,
      font: "Microsoft YaHei",
      size: 22,
    });
  });
}

function isTableDivider(line: string) {
  const cells = line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
  return (
    cells.length > 1 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  );
}

function tableCells(line: string) {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function makeTable(lines: string[]) {
  const parsedRows = lines
    .filter((_, index) => index !== 1 || !isTableDivider(lines[index]))
    .map(tableCells);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: parsedRows.map(
      (cells, rowIndex) =>
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                shading:
                  rowIndex === 0
                    ? {
                        type: ShadingType.CLEAR,
                        color: "auto",
                        fill: "E6EEE8",
                      }
                    : undefined,
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: inlineRuns(cell),
                    spacing: { after: 0 },
                  }),
                ],
              }),
          ),
        }),
    ),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CBC4B6" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBC4B6" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CBC4B6" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CBC4B6" },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "DDD7CB",
      },
      insideVertical: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "DDD7CB",
      },
    },
  });
}

function markdownChildren(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const children: Array<Paragraph | Table> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      isTableDivider(lines[index + 1].trim())
    ) {
      const tableLines = [line, lines[index + 1].trim()];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      index -= 1;
      children.push(makeTable(tableLines));
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      continue;
    }

    if (!line || line === "---") {
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const levels = [
        HeadingLevel.TITLE,
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
      ];
      children.push(
        new Paragraph({
          heading: levels[Math.min(heading[1].length - 1, levels.length - 1)],
          children: inlineRuns(heading[2]),
          spacing: { before: 220, after: 110 },
        }),
      );
      continue;
    }

    const bullet = line.match(/^[-*+]\s+(.+)$/);
    if (bullet) {
      children.push(
        new Paragraph({
          children: inlineRuns(bullet[1]),
          bullet: { level: 0 },
          spacing: { after: 70 },
        }),
      );
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      children.push(
        new Paragraph({
          children: inlineRuns(quote[1]),
          indent: { left: 420 },
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: "F0EDE5",
          },
          spacing: { before: 80, after: 100 },
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({
        children: inlineRuns(line),
        spacing: { after: 100, line: 360 },
      }),
    );
  }

  return children;
}

export async function createWordBlob(markdown: string, title: string) {
  const cleanMarkdown = markdown.trim();
  const cleanTitle = title.trim() || "课程蒸馏报告";

  if (!cleanMarkdown) {
    throw new Error("没有可导出的蒸馏结果");
  }

  if (cleanMarkdown.length > 2_000_000) {
    throw new Error("内容过长，暂时无法生成 Word 文件");
  }

  const documentFile = new Document({
    creator: "网课蒸馏平台",
    title: cleanTitle,
    description: "由网课蒸馏平台生成的课程整理结果",
    styles: {
      default: {
        document: {
          run: {
            font: "Microsoft YaHei",
            size: 22,
            color: "26322C",
          },
          paragraph: {
            spacing: { line: 360, after: 100 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1200,
              right: 1200,
              bottom: 1200,
              left: 1200,
            },
          },
        },
        children: [
          new Paragraph({
            text: cleanTitle,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
          }),
          ...markdownChildren(cleanMarkdown),
        ],
      },
    ],
  });

  return Packer.toBlob(documentFile);
}
