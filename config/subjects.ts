export const subjects = [
  {
    id: "verbal",
    title: "言语理解",
    description: "片段阅读、逻辑填空、语句表达",
    promptPath: "/prompts/verbal-v1.txt",
    badge: "",
    expectedSubject: "言语理解",
    openPromptByDefault: false,
    isTemplate: false,
  },
  {
    id: "data",
    title: "资料分析",
    description: "材料识别、公式方法、速算与陷阱",
    promptPath: "/prompts/data-v1.txt",
    badge: "",
    expectedSubject: "资料分析",
    openPromptByDefault: false,
    isTemplate: false,
  },
  {
    id: "judgment",
    title: "判断推理",
    description: "定义、类比、逻辑与文字型判断题",
    promptPath: "/prompts/judgment-text-v1.txt",
    badge: "",
    expectedSubject: "判断推理",
    openPromptByDefault: false,
    isTemplate: false,
  },
  {
    id: "custom",
    title: "其他科目",
    description: "使用通用模板并自定义本次蒸馏要求",
    promptPath: "/prompts/custom-v1.txt",
    badge: "自由填写",
    expectedSubject: "",
    openPromptByDefault: true,
    isTemplate: true,
  },
] as const;

export type SubjectId = (typeof subjects)[number]["id"];

export function getSubject(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId);
}
