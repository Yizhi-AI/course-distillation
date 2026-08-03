"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob, safeFileName } from "@/lib/download";

type Choice = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  content: string;
};

const stages: Choice[] = [
  {
    id: "first-learning",
    title: "第一次学习",
    shortTitle: "第一次学习",
    description: "先理解课程，再开始做题",
    content: `1. 先简要说明这部分课程主要学习什么、解决什么问题。
2. 按课程原有顺序，每次讲解一个方法或知识点。
3. 每讲完一部分，用一个简单问题检查理解。
4. 用户基本理解后，再使用课程中的题目进行练习。

核心原则：

> 先理解课程框架和老师的方法，再进入做题。`,
  },
  {
    id: "practice",
    title: "已经学过，开始刷题",
    shortTitle: "开始刷题",
    description: "先独立作答，再针对性纠错",
    content: `1. 不重新完整讲课，直接从课程中选择题目。
2. 先让用户独立作答，并说明判断理由。
3. 用户作答后，对比用户思路与课程中的老师思路。
4. 找出出现偏差的步骤，并进行针对性讲解或练习。

核心原则：

> 先暴露真实思路，再进行纠错。`,
  },
  {
    id: "review",
    title: "复习与查漏补缺",
    shortTitle: "复习查漏",
    description: "先检查掌握情况，只补不会的",
    content: `1. 先通过提问检查用户还记得什么。
2. 已经掌握的内容快速跳过。
3. 对答错、答不完整或明显犹豫的内容重新讲解。
4. 讲解后换一道题或换一种问法再次检查。

核心原则：

> 先检查，只补真正不会的内容。`,
  },
];

const goals: Choice[] = [
  {
    id: "understand",
    title: "理解方法",
    shortTitle: "理解方法",
    description: "弄清方法何时用、怎么用",
    content: `学习过程中重点讲清：

- 这个方法解决什么问题；
- 什么情况下应该使用；
- 判断入口是什么；
- 基本步骤是什么；
- 最后让用户用自己的话复述。

不要额外扩展课程中没有出现的方法。`,
  },
  {
    id: "accuracy",
    title: "提高正确率",
    shortTitle: "提高正确率",
    description: "找出做错的具体步骤",
    content: `学习过程中重点观察：

- 用户选择答案的理由；
- 用户思路与老师思路在哪一步不同；
- 错误发生在识别题型、选择方法还是执行步骤；
- 针对错误步骤继续练习。

不要只判断答案对错，要指出具体偏差。`,
  },
  {
    id: "weaknesses",
    title: "查找薄弱点",
    shortTitle: "查找薄弱点",
    description: "记录反复出现的问题",
    content: `学习过程中重点记录：

- 经常答错的内容；
- 回答不完整的内容；
- 多次犹豫或无法说明理由的内容。

优先处理重复出现的问题，最后输出一份简短的薄弱点清单。`,
  },
];

const hintStyles: Choice[] = [
  {
    id: "independent",
    title: "尽量独立完成",
    shortTitle: "尽量独立完成",
    description: "答错后再让AI介入",
    content: `- 用户作答前不主动提示。
- 回答错误时，先让用户自己检查一次。
- 用户再次作答后，再进行讲解和纠错。`,
  },
  {
    id: "progressive",
    title: "逐步提示",
    shortTitle: "逐步提示",
    description: "每次只提供一级提示",
    content: `用户答不出来时，按照以下顺序逐级提示：

1. 提醒相关知识点；
2. 提醒题目的判断入口；
3. 提示老师解题的第一步；
4. 最后再展示完整讲解。

每次只提供一级提示，并等待用户继续回答。`,
  },
  {
    id: "direct",
    title: "直接讲解",
    shortTitle: "直接讲解",
    description: "先讲清楚，再检查理解",
    content: `- 直接依据课程中的老师思路进行讲解。
- 说明判断入口、基本步骤和易错点。
- 讲完后提出一个简单问题检查理解。`,
  },
];

function getChoice(choices: Choice[], id: string) {
  return choices.find((choice) => choice.id === id);
}

function buildLearningPlan(stage: Choice, goal: Choice, hintStyle: Choice) {
  return `# AI学习方案

学习方案由三个维度组成：

> **学习阶段＋学习目标＋提示方式**

---

## 一、学习阶段

### ${stage.title}

${stage.content}

---

## 二、学习目标

### ${goal.title}

${goal.content}

---

## 三、提示方式

### ${hintStyle.title}

${hintStyle.content}
`;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function LearningPlanDesigner({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stageId, setStageId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [hintStyleId, setHintStyleId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const stage = useMemo(() => getChoice(stages, stageId), [stageId]);
  const goal = useMemo(() => getChoice(goals, goalId), [goalId]);
  const hintStyle = useMemo(
    () => getChoice(hintStyles, hintStyleId),
    [hintStyleId],
  );
  const isComplete = Boolean(stage && goal && hintStyle);
  const selectedCount = [stage, goal, hintStyle].filter(Boolean).length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (stage && goal && hintStyle) {
      setMarkdown(buildLearningPlan(stage, goal, hintStyle));
      setCopyStatus("idle");
    } else {
      setMarkdown("");
    }
  }, [stage, goal, hintStyle]);

  function selectChoice(
    setter: (id: string) => void,
    id: string,
  ) {
    setter(id);
    setCopyStatus("idle");
  }

  async function handleCopy() {
    if (!markdown) return;
    try {
      await copyText(markdown);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  function handleDownload() {
    if (!markdown || !stage || !goal || !hintStyle) return;
    const fileName = safeFileName(
      `AI学习方案-${stage.shortTitle}-${goal.shortTitle}-${hintStyle.shortTitle}`,
    );
    downloadBlob(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      `${fileName}.md`,
    );
  }

  function renderChoices(
    choices: Choice[],
    selectedId: string,
    setter: (id: string) => void,
  ) {
    return (
      <div className="learning-plan-options">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className={selectedId === choice.id ? "is-selected" : ""}
            aria-pressed={selectedId === choice.id}
            onClick={() => selectChoice(setter, choice.id)}
          >
            <strong>{choice.title}</strong>
            <span>{choice.description}</span>
            <i aria-hidden="true">
              {selectedId === choice.id ? "✓" : ""}
            </i>
          </button>
        ))}
      </div>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="learning-plan-dialog"
      aria-labelledby="learning-plan-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="learning-plan-shell">
        <header className="learning-plan-heading">
          <div>
            <small>AI 学习方案</small>
            <h2 id="learning-plan-title">设计你的学习方式</h2>
            <p>选择学习阶段、学习目标和提示方式，网页会自动生成提示词。</p>
          </div>
          <button
            className="learning-plan-close"
            type="button"
            aria-label="关闭学习方案设计"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="learning-plan-fields">
          <fieldset>
            <legend>
              <span>1</span>
              <strong>你现在学到哪一步？</strong>
            </legend>
            {renderChoices(stages, stageId, setStageId)}
          </fieldset>

          <fieldset>
            <legend>
              <span>2</span>
              <strong>你现在最想解决什么？</strong>
            </legend>
            {renderChoices(goals, goalId, setGoalId)}
          </fieldset>

          <fieldset>
            <legend>
              <span>3</span>
              <strong>你希望AI怎么帮助你？</strong>
            </legend>
            {renderChoices(hintStyles, hintStyleId, setHintStyleId)}
          </fieldset>
        </div>

        <section className="learning-plan-result" aria-live="polite">
          {isComplete && stage && goal && hintStyle ? (
            <>
              <div className="learning-plan-result-heading">
                <div>
                  <small>已自动生成</small>
                  <strong>你的学习方案</strong>
                </div>
                <div className="learning-plan-tags" aria-label="当前选择">
                  <span>{stage.shortTitle}</span>
                  <span>{goal.shortTitle}</span>
                  <span>{hintStyle.shortTitle}</span>
                </div>
              </div>

              <textarea
                value={markdown}
                onChange={(event) => {
                  setMarkdown(event.target.value);
                  setCopyStatus("idle");
                }}
                aria-label="可编辑的学习方案 Markdown"
                spellCheck={false}
              />

              <div className="learning-plan-result-footer">
                <p>
                  可以继续修改；复制和下载的都是当前编辑后的版本。重新选择会重置修改内容。
                </p>
                <div>
                  <button
                    className="learning-plan-copy"
                    type="button"
                    onClick={() => void handleCopy()}
                  >
                    {copyStatus === "copied"
                      ? "已复制"
                      : copyStatus === "error"
                        ? "复制失败，请手动复制"
                        : "复制提示词"}
                  </button>
                  <button
                    className="learning-plan-download"
                    type="button"
                    onClick={handleDownload}
                  >
                    下载 Markdown
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="learning-plan-empty">
              <strong>选择三项后自动生成</strong>
              <span>还需要选择 {3 - selectedCount} 项</span>
            </div>
          )}
        </section>
      </div>
    </dialog>
  );
}
