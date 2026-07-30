export const providers = [
  {
    id: "deepseek",
    label: "DeepSeek",
    shortLabel: "DeepSeek",
    model: "deepseek-v4-pro",
    note: "默认使用 DeepSeek 当前高能力 Pro 模型",
    endpoint: "https://api.deepseek.com/chat/completions",
    maxOutputTokens: 384_000,
  },
  {
    id: "qwen",
    label: "通义千问",
    shortLabel: "阿里云",
    model: "qwen3.7-max",
    note: "默认使用百炼当前旗舰模型；使用阿里云百炼 API Key",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    maxOutputTokens: 65_536,
  },
  {
    id: "doubao",
    label: "豆包大模型",
    shortLabel: "火山方舟",
    model: "doubao-seed-2-0-pro-260215",
    note: "默认使用豆包 2.0 Pro；也可以填写控制台中的推理接入点 ID",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    maxOutputTokens: 131_072,
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    shortLabel: "智谱开放平台",
    model: "glm-5.2",
    note: "默认使用智谱当前 1M 上下文旗舰模型",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    maxOutputTokens: 131_072,
  },
  {
    id: "custom",
    label: "自定义兼容接口",
    shortLabel: "兼容模式",
    model: "",
    note: "填写完整服务地址和模型名称",
    endpoint: "",
    maxOutputTokens: null,
  },
] as const;

export type ProviderId = (typeof providers)[number]["id"];

export function getProvider(providerId: string) {
  return providers.find((provider) => provider.id === providerId);
}

export function isProviderId(value: string): value is ProviderId {
  return providers.some((provider) => provider.id === value);
}
