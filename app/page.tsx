"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DesktopPet, type PetStatus } from "@/components/desktop-pet";
import { FileUpload } from "@/components/file-upload";
import { LearningPlanDesigner } from "@/components/learning-plan-designer";
import {
  Hero,
  PreparationGuide,
  PreparationGuideLink,
  ProgressNav,
  SiteFooter,
  SiteHeader,
} from "@/components/site-chrome";
import { getProvider, ProviderId, providers } from "@/config/providers";
import { siteConfig } from "@/config/site";
import { getSubject, SubjectId, subjects } from "@/config/subjects";
import {
  CourseMapSnapshot,
  extractSourceClues,
  PreviewSnapshot,
  requestDistillation,
  stripSourceClues,
} from "@/lib/distillation-client";
import { downloadBlob, safeFileName } from "@/lib/download";
import { withBasePath } from "@/lib/base-path";
import {
  buildCourseCorpus,
  MaterialFile,
  MaterialKind,
  MaterialRole,
  readIncomingFiles,
} from "@/lib/materials";

type RunStatus =
  | "idle"
  | "previewing"
  | "previewed"
  | "running"
  | "done"
  | "error";

export default function Home() {
  const resultRef = useRef<HTMLElement>(null);
  const [learningPlanOpen, setLearningPlanOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialFile[]>([]);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const [subject, setSubject] = useState<SubjectId | "">("");
  const [prompt, setPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [providerId, setProviderId] = useState<ProviderId>("deepseek");
  const [model, setModel] = useState<string>(providers[0].model);
  const [apiKey, setApiKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [statusText, setStatusText] = useState("");
  const [previewResult, setPreviewResult] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const [courseMapSnapshot, setCourseMapSnapshot] =
    useState<CourseMapSnapshot | null>(null);
  const [previewSnapshot, setPreviewSnapshot] =
    useState<PreviewSnapshot | null>(null);
  const [petSuccess, setPetSuccess] = useState(false);
  const petSuccessTimer = useRef<number | null>(null);
  const [error, setError] = useState("");

  const selectedProvider = useMemo(
    () => getProvider(providerId) ?? providers[0],
    [providerId],
  );

  const courseSource = useMemo(() => buildCourseCorpus(materials), [materials]);

  const hasTranscript = materials.some((file) => file.role === "transcript");

  const sourceSignature = useMemo(
    () =>
      materials
        .map((file) => `${file.id}:${file.role}:${file.text.length}`)
        .sort()
        .join("|"),
    [materials],
  );

  const sourceClues = useMemo(
    () => extractSourceClues(finalResult),
    [finalResult],
  );

  const cleanFinalResult = useMemo(
    () => stripSourceClues(finalResult),
    [finalResult],
  );

  const previewIsReusable =
    Boolean(previewSnapshot) &&
    previewSnapshot?.prompt === prompt &&
    previewSnapshot?.sourceSignature === sourceSignature;

  const courseMapIsReusable =
    Boolean(courseMapSnapshot) &&
    courseMapSnapshot?.prompt === prompt &&
    courseMapSnapshot?.sourceSignature === sourceSignature &&
    courseMapSnapshot?.providerId === providerId &&
    courseMapSnapshot?.model === model.trim();

  const readyToRun =
    Boolean(materials.length) &&
    Boolean(subject) &&
    Boolean(prompt.trim()) &&
    Boolean(apiKey.trim()) &&
    Boolean(model.trim()) &&
    !promptLoading &&
    Boolean(courseSource.trim()) &&
    (providerId !== "custom" || Boolean(customUrl.trim())) &&
    status !== "previewing" &&
    status !== "running";

  const petStatus: PetStatus =
    status === "previewing" || status === "running"
      ? "processing"
      : petSuccess
        ? "success"
        : "idle";

  useEffect(() => {
    if (!subject) return;

    let cancelled = false;
    const promptPath = getSubject(subject)?.promptPath;
    if (!promptPath) return;

    fetch(withBasePath(promptPath))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("提示词加载失败");
        }
        const loadedPrompt = await response.text();
        if (!loadedPrompt.trim()) throw new Error("提示词内容为空");
        if (!cancelled) {
          setPrompt(loadedPrompt);
          setDefaultPrompt(loadedPrompt);
          setPromptLoading(false);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setPromptLoading(false);
          setError(loadError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subject]);

  useEffect(
    () => () => {
      if (petSuccessTimer.current) {
        window.clearTimeout(petSuccessTimer.current);
      }
    },
    [],
  );

  function clearPetSuccess() {
    if (petSuccessTimer.current) {
      window.clearTimeout(petSuccessTimer.current);
      petSuccessTimer.current = null;
    }
    setPetSuccess(false);
  }

  function showPetSuccess() {
    clearPetSuccess();
    setPetSuccess(true);
    petSuccessTimer.current = window.setTimeout(() => {
      setPetSuccess(false);
      petSuccessTimer.current = null;
    }, 2_000);
  }

  function resetGeneratedResults() {
    clearPetSuccess();
    setCourseMapSnapshot(null);
    setPreviewResult("");
    setPreviewSnapshot(null);
    setFinalResult("");
    setStatus("idle");
    setStatusText("");
    setError("");
  }

  async function addFiles(files: FileList | File[], kind: MaterialKind) {
    const { accepted, rejected } = await readIncomingFiles(files, kind);
    setMaterials((current) => {
      const existing = new Set(current.map((file) => file.id));
      return [...current, ...accepted.filter((file) => !existing.has(file.id))];
    });
    setFileWarnings(rejected);
    resetGeneratedResults();
  }

  function removeFile(id: string) {
    setMaterials((current) => current.filter((file) => file.id !== id));
    resetGeneratedResults();
  }

  function changeMaterialRole(id: string, role: MaterialRole) {
    setMaterials((current) =>
      current.map((file) => (file.id === id ? { ...file, role } : file)),
    );
    resetGeneratedResults();
  }

  function changeProvider(nextId: ProviderId) {
    const next = getProvider(nextId) ?? providers[0];
    setProviderId(nextId);
    setModel(next.model);
    resetGeneratedResults();
  }

  async function distill(
    mode: "map" | "preview" | "full",
    courseMap = "",
  ) {
    const expectedSubject = getSubject(subject)?.expectedSubject ?? "";
    return requestDistillation({
      provider: providerId,
      model: model.trim(),
      apiKey: apiKey.trim(),
      customUrl: customUrl.trim(),
      prompt,
      source: courseSource,
      courseMap,
      mode,
      expectedSubject,
    });
  }

  async function ensureCourseMap() {
    if (courseMapIsReusable && courseMapSnapshot) {
      return courseMapSnapshot.result;
    }

    setStatusText("第一步：模型正在通读全部资料并形成课程地图…");
    const result = await distill("map");
    const snapshot: CourseMapSnapshot = {
      prompt,
      sourceSignature,
      providerId,
      model: model.trim(),
      result,
    };
    setCourseMapSnapshot(snapshot);
    return result;
  }

  async function runPreview() {
    if (!readyToRun) return;
    clearPetSuccess();
    setStatus("previewing");
    setStatusText("第一步：模型正在通读全部资料并形成课程地图…");
    setError("");
    setFinalResult("");

    try {
      const courseMap = await ensureCourseMap();
      setStatusText("第二步：正在按课程地图定位代表性单元并试蒸馏…");
      const result = await distill("preview", courseMap);
      setPreviewResult(result);
      setPreviewSnapshot({ prompt, sourceSignature, result });
      setStatus("previewed");
      setStatusText(
        "课程地图和试蒸馏样本已经完成。请重点检查老师的判断链和个人方法是否被保留。",
      );
      window.setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch (runError) {
      setStatus("error");
      setError(runError instanceof Error ? runError.message : "试蒸馏失败");
    }
  }

  async function runFull() {
    if (!readyToRun) return;
    clearPetSuccess();
    setStatus("running");
    setError("");
    setFinalResult("");

    try {
      const courseMap = await ensureCourseMap();
      setStatusText(
        "第二步：模型正在依据完整课程地图，对整节课进行一次性全局蒸馏…",
      );
      const result = await distill("full", courseMap);
      setFinalResult(result);
      setStatus("done");
      showPetSuccess();
      setStatusText("全部整理完成。结果由完整资料和课程地图统一生成，可以下载。");
      window.setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch (runError) {
      setStatus("error");
      setError(runError instanceof Error ? runError.message : "全量蒸馏失败");
    }
  }

  function downloadMarkdown() {
    if (!finalResult) return;
    const subjectTitle = getSubject(subject)?.title ?? "网课";
    downloadBlob(
      new Blob([cleanFinalResult], { type: "text/markdown;charset=utf-8" }),
      `${safeFileName(subjectTitle)}课程蒸馏报告.md`,
    );
  }

  function downloadCourseMap() {
    if (!courseMapSnapshot) return;
    const subjectTitle = getSubject(subject)?.title ?? "网课";
    downloadBlob(
      new Blob([courseMapSnapshot.result], {
        type: "text/markdown;charset=utf-8",
      }),
      `${safeFileName(subjectTitle)}-课程地图.md`,
    );
  }

  async function downloadWord() {
    if (!finalResult) return;
    setError("");
    try {
      const subjectTitle = getSubject(subject)?.title ?? "网课";
      const { createWordBlob } = await import("@/lib/word-export");
      downloadBlob(
        await createWordBlob(
          cleanFinalResult,
          `${subjectTitle}课程蒸馏报告`,
        ),
        `${safeFileName(subjectTitle)}课程蒸馏报告.docx`,
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "Word 文件生成失败",
      );
    }
  }

  return (
  <main>
    <SiteHeader />
    <Hero onOpenLearningPlan={() => setLearningPlanOpen(true)} />
    <ProgressNav />
    <DesktopPet key={petStatus} status={petStatus} />

    <LearningPlanDesigner
      open={learningPlanOpen}
      onClose={() => setLearningPlanOpen(false)}
    />

    <div className="workspace">
        <section className="work-card" id="materials">
          <div className="section-heading">
            <div>
              <div>
                <h2>上传资料</h2>
                <p>按资料作用分开放，系统整理时更容易分清依据。</p>
              </div>
            </div>
          </div>

          <div className="upload-grid">
            <FileUpload
              kind="course"
              title="课程主要资料"
              description="推荐：PPT/讲义转换后的文字版、逐字稿或字幕"
              files={materials.filter((file) => file.kind === "course")}
              onAdd={addFiles}
              onRemove={removeFile}
              onRoleChange={changeMaterialRole}
            />
            <FileUpload
              kind="supplement"
              title="题本、答案、笔记等补充资料"
              description="用于补全题目、核对答案和保留个人记录"
              files={materials.filter((file) => file.kind === "supplement")}
              onAdd={addFiles}
              onRemove={removeFile}
              onRoleChange={changeMaterialRole}
            />
          </div>

          {materials.some((file) => file.kind === "course") && (
            <div
              className={`notice ${hasTranscript ? "success" : "warning"}`}
              role="status"
            >
              {hasTranscript ? (
                <>
                  <strong>已识别到逐字稿或字幕。</strong>
                  <span>
                    蒸馏时会先把课件片段与对应讲解组成教学单元，再提炼老师的判断链和个人方法。
                  </span>
                </>
              ) : (
                <>
                  <strong>还没有识别到逐字稿或字幕。</strong>
                  <span>
                    仍然可以整理课程框架，但无法充分还原老师的个人思路。如果识别错误，请在文件右侧修改资料类型。
                  </span>
                </>
              )}
            </div>
          )}

          {fileWarnings.length > 0 && (
            <div className="notice warning" role="status">
              <strong>这些文件暂时没有加入：</strong>
              {fileWarnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          )}

          <PreparationGuideLink />
        </section>

        <section className="work-card" id="subject">
          <div className="section-heading">
            <div>
              <div>
                <h2>选择科目</h2>
                <p>系统会自动加载我们整理好的标准蒸馏提示词。</p>
              </div>
            </div>
          </div>

          <div className="subject-grid">
            {subjects.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={[
                  subject === item.id ? "is-selected" : "",
                  item.isTemplate ? "is-pending" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setSubject(item.id);
                  setPromptOpen(item.openPromptByDefault);
                  setPrompt("");
                  setDefaultPrompt("");
                  setPromptLoading(true);
                  resetGeneratedResults();
                }}
              >
                <small>{String(index + 1).padStart(2, "0")}</small>
                {item.badge && <em>{item.badge}</em>}
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <i aria-hidden="true">{subject === item.id ? "✓" : "＋"}</i>
              </button>
            ))}
          </div>

          {subject && (
            <div className="prompt-panel">
              <button
                className="prompt-summary"
                type="button"
                onClick={() => setPromptOpen((current) => !current)}
                aria-expanded={promptOpen}
              >
                <span>
                  <i aria-hidden="true">提</i>
                  <span>
                    <strong>
                      {promptLoading
                        ? "正在加载标准提示词…"
                        : getSubject(subject)?.isTemplate
                          ? "通用模板已加载：请按科目自定义"
                          : `已加载：${
                              getSubject(subject)?.title
                            }标准蒸馏方案`}
                    </strong>
                    <small>
                      {getSubject(subject)?.isTemplate
                        ? "该科目标准方案待更新，你可以直接修改下方提示词"
                        : "普通用户可以直接使用，也可以修改本次要求"}
                    </small>
                  </span>
                </span>
                <b>{promptOpen ? "收起" : "查看并修改"}</b>
              </button>

              {promptOpen && (
                <div className="prompt-editor">
                  <textarea
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      resetGeneratedResults();
                    }}
                    aria-label="本次蒸馏提示词"
                    spellCheck={false}
                  />
                  <div>
                    <span>
                      修改提示词后，已经生成的试跑结果需要重新验证。
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(defaultPrompt);
                        resetGeneratedResults();
                      }}
                      disabled={prompt === defaultPrompt}
                    >
                      恢复标准版本
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="work-card" id="model">
          <div className="section-heading">
            <div>
              <div>
                <h2>配置模型</h2>
                <p>只有点击试蒸馏或全量蒸馏以后，才会产生模型费用。</p>
              </div>
            </div>
            <span className="local-note">API Key 不保存</span>
          </div>

          <div className="provider-tabs" role="tablist" aria-label="模型平台">
            {providers.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={providerId === item.id}
                className={providerId === item.id ? "is-selected" : ""}
                onClick={() => changeProvider(item.id)}
              >
                <strong>{item.label}</strong>
                <small>{item.shortLabel}</small>
              </button>
            ))}
          </div>

          <div className="model-form">
            {providerId === "custom" && (
              <label className="wide-field">
                <span>接口地址</span>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                  placeholder="例如：https://example.com/v1/chat/completions"
                />
              </label>
            )}
            <label>
              <span>模型名称</span>
              <input
                type="text"
                value={model}
                onChange={(event) => {
                  setModel(event.target.value);
                  resetGeneratedResults();
                }}
                placeholder="填写平台控制台中的模型名称"
              />
              <small>{selectedProvider.note}</small>
            </label>
            <label>
              <span>API Key</span>
              <span className="password-field">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="粘贴你自己的 API Key"
                  autoComplete="off"
                />
                <button type="button" onClick={() => setShowKey(!showKey)}>
                  {showKey ? "隐藏" : "显示"}
                </button>
              </span>
              <small>仅用于本次调用，不写入数据库或浏览器存储</small>
            </label>
          </div>
          <p className="model-cost-note">
            按当前内测的一节常规课程资料量估算，使用 DeepSeek
            完成一次蒸馏约 0.2 元起，实际费用以模型平台账单为准。
          </p>
        </section>

        <section className="work-card run-card" id="run">
          <div className="section-heading">
            <div>
              <div>
                <h2>先看一小段，再决定是否全部整理</h2>
                <p>确认结构、方法和细节合适以后，再处理剩余课程。</p>
              </div>
            </div>
          </div>

          <div className="run-layout">
            <div className="run-explanation">
              <div>
                <span>试蒸馏</span>
                <strong>先通读全课，再选代表性单元</strong>
                <p>模型先形成课程地图，再从完整资料中定位样本。</p>
              </div>
              <div>
                <span>全量蒸馏</span>
                <strong>整节课一次性全局整理</strong>
                <p>依据课程地图统一生成，不再分片生成和机械拼接。</p>
              </div>
            </div>

            <div className="run-actions">
              {status === "running" ? (
                <button className="primary-action" type="button" disabled>
                  正在整理全部资料…
                </button>
              ) : (
                <>
                  <button
                    className="primary-action"
                    type="button"
                    disabled={!readyToRun}
                    onClick={runPreview}
                  >
                    {status === "previewing"
                      ? "正在试蒸馏…"
                      : "先试蒸馏一部分"}
                    <span>推荐</span>
                  </button>
                  <button
                    className="secondary-action"
                    type="button"
                    disabled={!readyToRun}
                    onClick={() => void runFull()}
                  >
                    {previewIsReusable
                      ? "效果满意，继续蒸馏全部"
                      : "跳过预览，直接全量蒸馏"}
                  </button>
                </>
              )}
              {!readyToRun &&
                status !== "previewing" &&
                status !== "running" && (
                  <small>请先完成资料、科目和模型配置。</small>
                )}
              {status === "running" && (
                <small>模型会持续处理，完成后自动显示完整结果。</small>
              )}
            </div>
          </div>

          {(statusText || error) && (
            <div
              className={`notice ${error ? "error" : "success"}`}
              role="status"
            >
              {statusText && !error && <strong>{statusText}</strong>}
              {error && <strong>{error}</strong>}
              {previewSnapshot && !previewIsReusable && !error && (
                <span>
                  资料或提示词已经变化，下一次运行会重新生成课程地图。
                </span>
              )}
            </div>
          )}

          {courseMapSnapshot && courseMapIsReusable && (
            <section className="course-map-result">
              <div className="course-map-heading">
                <strong>课程地图已生成</strong>
                <button type="button" onClick={downloadCourseMap}>
                  <span>M↓</span>下载课程地图
                </button>
              </div>
              <details>
                <summary>展开查看系统生成的课程地图</summary>
                <pre>{courseMapSnapshot.result}</pre>
              </details>
            </section>
          )}
        </section>

        {(previewResult || finalResult) && (
          <section className="work-card result-card" ref={resultRef}>
            <div className="result-heading">
              <div>
                <span className="result-status">
                  {finalResult ? "全量蒸馏完成" : "试蒸馏结果"}
                </span>
                <h2>
                  {finalResult
                    ? `${
                        getSubject(subject)?.title
                      }课程蒸馏报告`
                    : "先检查这一段是否符合预期"}
                </h2>
              </div>
              {finalResult && (
                <div className="download-actions">
                  <button type="button" onClick={downloadWord}>
                    <span>W</span>下载 Word
                  </button>
                  <button type="button" onClick={downloadMarkdown}>
                    <span>M↓</span>下载 Markdown
                  </button>
                </div>
              )}
            </div>

            {finalResult ? (
              <div className="result-review-layout">
                <section className="result-product">
                  <div>
                    <strong>蒸馏成品</strong>
                    <small>可直接阅读或下载</small>
                  </div>
                  <pre className="result-content">{cleanFinalResult}</pre>
                </section>
                <aside className="source-clues">
                  <div>
                    <strong>来源线索</strong>
                    <small>用于回到题本或逐字稿快速核对</small>
                  </div>
                  {sourceClues.length ? (
                    <div className="source-clue-list">
                      {sourceClues.map((clue, index) => (
                        <article key={`${clue}-${index}`}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            {clue.split(/[｜|]/).map((part, partIndex) => (
                              <p key={`${part}-${partIndex}`}>{part.trim()}</p>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="source-clue-empty">
                      <strong>暂未生成来源线索</strong>
                      <p>
                        新完成的蒸馏会标注文件名、题号或题干关键词，方便回到原资料核对。
                      </p>
                    </div>
                  )}
                  <p className="source-clue-note">
                    来源只做粗定位，不追求精确到页码或逐字稿行号。
                  </p>
                </aside>
              </div>
            ) : (
              <pre className="result-content">
                {stripSourceClues(previewResult)}
              </pre>
            )}

            {finalResult && (
              <div className="learning-system-entry">
                <div>
                  <span>下一步</span>
                  <strong>把这份知识库放进专注学习网页</strong>
                  <p>
                    后续接入后，可直接携带本次蒸馏结果进入 AI 学习系统。
                  </p>
                </div>
                {siteConfig.learningSystem.url ? (
                  <a
                    href={siteConfig.learningSystem.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {siteConfig.learningSystem.linkLabel}
                  </a>
                ) : (
                  <button type="button" disabled>
                    {siteConfig.learningSystem.pendingLabel}
                  </button>
                )}
              </div>
            )}

            {!finalResult && (
              <div className="preview-footer">
                <p>
                  如果内容方向不对，可以展开上方提示词修改后再试一次；如果满意，就继续处理全部资料。
                </p>
                <button
                  type="button"
                  disabled={!readyToRun}
                  onClick={() => void runFull()}
                >
                  效果满意，继续蒸馏全部
                </button>
              </div>
            )}
          </section>
        )}

        <PreparationGuide />
      </div>

      <SiteFooter />
    </main>
  );
}
