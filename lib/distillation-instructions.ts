import type { DistillationMode } from "@/lib/distillation-client";

const mapInstruction = `请完整阅读下面的全部课程资料，先形成一份供后续蒸馏使用的“课程地图”，此时不要输出正式蒸馏报告。

课程地图必须包含：
1. 课程的章节、知识点、题目或案例层级；
2. 每个知识单元在课件、逐字稿和补充资料中的定位关键词；
3. 逐字稿与课件、题目之间的对应关系；不能确认时明确标注，不得强行匹配；
4. 老师反复强调的方法、判断依据、推理步骤、例题和易错点；
5. 资料缺失、顺序冲突或疑似识别错误；
6. 指定一个最适合试蒸馏的代表性知识单元，并说明其定位关键词。

课程地图是索引，不是摘要。不得因为内容重复、口语化或暂时无法归类而提前删去可能承载老师思路的信息。`;

const previewInstruction = `你已经获得完整课程资料和课程地图。请根据课程地图指定的代表性知识单元，在完整资料中定位其课件、题目、逐字稿和补充内容，只输出这个单元的正式试蒸馏结果。

必须保留老师从条件识别、判断、排除到得出结论的完整思路；不要把老师的过程压缩成只有结论的知识点。不要解释试跑流程，也不要输出课程地图。

在本单元的代表性题目或主要方法后，另起一行添加粗粒度来源标记：
<!-- SOURCE: 上传文件名｜题号或题干关键词｜逐字稿文件名＋定位关键词或时间（如有） -->
只能使用原资料中真实存在的文件名、题号、关键词或时间；不能确认时写：
<!-- SOURCE: 暂未定位 -->`;

const fullInstruction = `你已经获得完整课程资料和课程地图。请把整节课作为一个整体，一次性生成可直接交付的完整蒸馏报告。

必须逐项覆盖课程地图中的全部知识单元，保留老师的判断链、方法选择依据、例题讲解、易错点和个人表达中真正增加理解的信息。统一术语、层级和格式，处理跨章节联系，合并真正重复的内容，但不得把各片段机械拼接，也不得因追求精简而删除老师的思考过程。不要输出课程地图、处理说明或模型工作过程。

来源线索只按“代表性题目或主要方法/知识单元”标注，不要给每个小段落都标注。每完成一个需要核对的主要部分后，另起一行添加：
<!-- SOURCE: 上传文件名｜题号或题干关键词｜逐字稿文件名＋定位关键词或时间（如有） -->

来源标记必须遵守：
1. 只使用原资料中真实存在的文件名；
2. 优先写题号；没有题号时写能够在题本中搜索到的题干关键词；
3. 有逐字稿时，补充能搜索到老师讲解的定位关键词；原文有时间再写时间；
4. 不得编造页码、题号、时间或关键词；不能确认时写：
<!-- SOURCE: 暂未定位 -->`;

const taskInstructions: Record<DistillationMode, string> = {
  map: mapInstruction,
  preview: previewInstruction,
  full: fullInstruction,
};

function buildSubjectGuard(expectedSubject: string) {
  if (!expectedSubject) return "";
  return `【科目核验｜最高优先级】
在开始蒸馏前，先判断下面资料的主体科目是否为“${expectedSubject}”。

- 如果主体科目明显不是“${expectedSubject}”，立即停止，不得强行套用当前提示词。只输出一行：
[[SUBJECT_MISMATCH:这里填写资料更可能所属的科目]]
- 如果资料主体属于“${expectedSubject}”，先输出：
[[SUBJECT_OK]]
然后紧接着输出正式蒸馏结果。
- 如果样本信息暂不足以判断，但没有明显冲突，按通过处理。`;
}

export function buildDistillationMessages({
  mode,
  prompt,
  source,
  courseMap,
  expectedSubject,
}: {
  mode: DistillationMode;
  prompt: string;
  source: string;
  courseMap: string;
  expectedSubject: string;
}) {
  const systemPrompt =
    mode === "map"
      ? `${buildSubjectGuard(expectedSubject)}

你是课程结构分析与教学内容索引专家。你的任务是先建立可靠的课程地图，为下一步高质量蒸馏提供全局结构。

下面是本课程正式蒸馏时将使用的学科要求。此阶段仅参考它来识别重要信息，不要提前执行它规定的最终报告格式：

${prompt}`.trim()
      : prompt;

  const userContent = [
    taskInstructions[mode],
    courseMap ? `【已经形成的课程地图】\n${courseMap}` : "",
    `【完整课程资料】\n${source}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userContent };
}
