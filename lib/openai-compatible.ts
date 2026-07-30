export function normalizeChatCompletionsUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function extractModelText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .join("\n")
    .trim();
}

export function extractModelError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as {
    error?: { message?: string } | string;
    message?: string;
  };
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error.message === "string") {
    return data.error.message;
  }
  return typeof data.message === "string" ? data.message : "";
}
