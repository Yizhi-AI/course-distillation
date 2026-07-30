import {
  getProvider,
  isProviderId,
  type ProviderId,
} from "@/config/providers";
import { buildDistillationMessages } from "@/lib/distillation-instructions";
import {
  extractModelError,
  extractModelText,
  normalizeChatCompletionsUrl,
} from "@/lib/openai-compatible";

export type DistillationMode = "map" | "preview" | "full";

export type CourseMapSnapshot = {
  prompt: string;
  sourceSignature: string;
  providerId: ProviderId;
  model: string;
  result: string;
};

export type PreviewSnapshot = {
  prompt: string;
  sourceSignature: string;
  result: string;
};

export type DistillationRequest = {
  provider: ProviderId;
  model: string;
  apiKey: string;
  customUrl: string;
  prompt: string;
  source: string;
  courseMap?: string;
  mode: DistillationMode;
  expectedSubject: string;
};

export async function requestDistillation(input: DistillationRequest) {
  const {
    provider,
    model,
    apiKey,
    customUrl,
    prompt,
    source,
    courseMap = "",
    mode,
    expectedSubject,
  } = input;

  if (!provider || !model || !apiKey || !prompt || !source) {
    throw new Error("资料、提示词或模型配置不完整");
  }

  if (!isProviderId(provider)) {
    throw new Error("模型平台不受支持");
  }

  if (provider === "custom" && !customUrl) {
    throw new Error("请填写自定义接口地址");
  }

  if (!["map", "preview", "full"].includes(mode)) {
    throw new Error("无法识别这次蒸馏步骤");
  }

  if (mode !== "map" && !courseMap.trim()) {
    throw new Error("课程地图尚未生成，请先让模型通读完整资料");
  }

  const providerConfig = getProvider(provider);
  const endpoint =
    provider === "custom"
      ? normalizeChatCompletionsUrl(customUrl)
      : providerConfig?.endpoint ?? "";

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
    if (parsedEndpoint.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error("接口地址必须是有效的 HTTPS 地址");
  }

  const { systemPrompt, userContent } = buildDistillationMessages({
    mode,
    prompt,
    source,
    courseMap,
    expectedSubject,
  });

  const requestBody: Record<string, unknown> = {
    model,
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  if (providerConfig?.maxOutputTokens) {
    requestBody.max_tokens = providerConfig.maxOutputTokens;
  }

  let response: Response;
  try {
    response = await fetch(parsedEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new Error(
      "浏览器无法连接模型接口。请检查网络、接口地址，或确认该平台允许网页直接调用。",
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = extractModelError(payload);
    throw new Error(
      providerMessage
        ? `模型平台返回错误：${providerMessage}`
        : `模型平台请求失败（${response.status}）`,
    );
  }

  const result = extractModelText(payload);
  if (!result) {
    throw new Error("模型返回成功，但没有找到可用正文");
  }

  const mismatch = result.match(
    /\[\[SUBJECT_MISMATCH\s*:\s*([^\]]+)\]\]/i,
  );
  if (mismatch) {
    const detectedSubject = mismatch[1].trim();
    throw new Error(
      `检测到上传资料更接近“${detectedSubject}”，但当前选择的是“${expectedSubject}”。请确认科目后重新试蒸馏。`,
    );
  }

  return result.replace(/\[\[SUBJECT_OK\]\]\s*/i, "").trim();
}

export function extractSourceClues(markdown: string) {
  const hidden = Array.from(
    markdown.matchAll(/<!--\s*SOURCE:\s*(.*?)\s*-->/gi),
    (match) => match[1].trim(),
  );
  const visible = Array.from(
    markdown.matchAll(/^来源线索[:：]\s*(.+)$/gim),
    (match) => match[1].trim(),
  );
  return Array.from(new Set([...hidden, ...visible])).filter(Boolean);
}

export function stripSourceClues(markdown: string) {
  return markdown
    .replace(/\n?<!--\s*SOURCE:\s*.*?\s*-->\n?/gi, "\n")
    .replace(/^来源线索[:：]\s*.+$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
