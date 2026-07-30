import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("保留完整课程蒸馏流程与国内模型入口", async () => {
  const [page, subjects, providers, instructions] = await Promise.all([
    read("app/page.tsx"),
    read("config/subjects.ts"),
    read("config/providers.ts"),
    read("lib/distillation-instructions.ts"),
  ]);
  const source = `${page}\n${subjects}\n${providers}\n${instructions}`;

  for (const text of [
    "课程主要资料",
    "题本、答案、笔记等补充资料",
    "言语理解",
    "资料分析",
    "判断推理",
    "其他科目",
    "DeepSeek",
    "通义千问",
    "豆包大模型",
    "智谱 GLM",
    "先试蒸馏一部分",
    "效果满意，继续蒸馏全部",
    "课程地图",
    "SUBJECT_MISMATCH",
    "SOURCE:",
  ]) {
    assert.match(source, new RegExp(text));
  }
});

test("模型由浏览器直接调用，不再经过本项目后端", async () => {
  const [client, page, packageJson] = await Promise.all([
    read("lib/distillation-client.ts"),
    read("app/page.tsx"),
    read("package.json"),
  ]);

  assert.match(client, /fetch\(parsedEndpoint/);
  assert.match(client, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(client, /buildDistillationMessages/);
  assert.match(client, /extractModelError/);
  assert.match(client, /SUBJECT_MISMATCH/);
  assert.doesNotMatch(client, /fetch\(["']\/api\/distill/);
  assert.doesNotMatch(page, /\/api\/distill/);
  assert.doesNotMatch(packageJson, /wrangler|vinext|cloudflare:build/);

  await Promise.all([
    assert.rejects(access(new URL("app/api/distill/route.ts", root))),
    assert.rejects(access(new URL("app/api/export/word/route.ts", root))),
  ]);
});

test("API Key 只存在当前页面状态，不写入浏览器存储", async () => {
  const [page, client] = await Promise.all([
    read("app/page.tsx"),
    read("lib/distillation-client.ts"),
  ]);
  const source = `${page}\n${client}`;

  assert.match(page, /useState\(""\)/);
  assert.doesNotMatch(source, /localStorage.*api|sessionStorage.*api/i);
  assert.doesNotMatch(source, /NEXT_PUBLIC_.*KEY|process\.env\..*KEY/i);
});

test("Word、Markdown 与课程地图均在浏览器端下载", async () => {
  const [page, wordExport, download] = await Promise.all([
    read("app/page.tsx"),
    read("lib/word-export.ts"),
    read("lib/download.ts"),
  ]);

  assert.match(page, /下载 Word/);
  assert.match(page, /下载 Markdown/);
  assert.match(page, /下载课程地图/);
  assert.match(page, /import\("@\/lib\/word-export"\)/);
  assert.doesNotMatch(page, /\/api\/export\/word/);
  assert.match(wordExport, /Packer\.toBlob/);
  assert.match(download, /URL\.createObjectURL/);
});

test("Next.js 以静态模式构建并适配 GitHub Pages 子路径", async () => {
  const [config, workflow, basePath, chrome, pet, subjects, page] =
    await Promise.all([
      read("next.config.ts"),
      read(".github/workflows/deploy-pages.yml"),
      read("lib/base-path.ts"),
      read("components/site-chrome.tsx"),
      read("components/desktop-pet.tsx"),
      read("config/subjects.ts"),
      read("app/page.tsx"),
    ]);

  assert.match(config, /output: "export"/);
  assert.match(config, /trailingSlash: true/);
  assert.match(config, /basePath/);
  assert.match(config, /unoptimized: true/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(workflow, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(workflow, /path: \.\/out/);
  assert.match(basePath, /configuredBasePath/);
  assert.match(chrome, /withBasePath/);
  assert.match(pet, /withBasePath/);
  assert.match(subjects, /promptPath/);
  assert.match(page, /fetch\(withBasePath\(promptPath\)\)/);
});

test("科目由单一配置驱动，新增科目不会要求修改页面", async () => {
  const [subjectsSource, page] = await Promise.all([
    read("config/subjects.ts"),
    read("app/page.tsx"),
  ]);

  const ids = Array.from(
    subjectsSource.matchAll(/\bid:\s*"([^"]+)"/g),
    (match) => match[1],
  );
  const promptPaths = Array.from(
    subjectsSource.matchAll(/\bpromptPath:\s*"([^"]+)"/g),
    (match) => match[1],
  );

  assert.ok(ids.length >= 4);
  assert.equal(new Set(ids).size, ids.length, "科目 id 不得重复");
  assert.equal(promptPaths.length, ids.length, "每个科目都必须配置提示词");

  for (const promptPath of promptPaths) {
    const prompt = await read(`public${promptPath}`);
    assert.ok(prompt.trim(), `${promptPath} 不能为空`);
  }

  assert.match(page, /subjects\.map\(\(item, index\)/);
  assert.match(page, /item\.openPromptByDefault/);
  assert.match(page, /expectedSubject/);
  assert.doesNotMatch(page, /subject === "(?:verbal|data|judgment|custom)"/);
  await access(new URL("public/prompts/_subject-template.txt", root));
});

test("公众号教程、二维码和本地宠物素材全部保留", async () => {
  const [site, chrome, copyButton, pet] = await Promise.all([
    read("config/site.ts"),
    read("components/site-chrome.tsx"),
    read("components/copy-link-button.tsx"),
    read("components/desktop-pet.tsx"),
  ]);

  assert.match(site, /mp\.weixin\.qq\.com\/s\/5BmyD26MxQUNGQFzvWAC5Q/);
  assert.match(chrome, /直接打开教程/);
  assert.match(chrome, /<CopyLinkButton/);
  assert.match(copyButton, /navigator\.clipboard\.writeText/);
  assert.match(copyButton, /已复制，去微信打开/);
  assert.match(pet, /PetStatus = "idle" \| "processing" \| "success"/);

  await Promise.all([
    access(new URL("public/contact/yizhi-ai-map-qrcode.jpg", root)),
    ...[
      "idle.webp",
      "peek.webp",
      "smile.webp",
      "grooming.webp",
      "sleep.webp",
      "processing.webp",
      "success.webp",
    ].map((file) => access(new URL(`public/pet/${file}`, root))),
  ]);
});

test("资料保持整节课全局蒸馏，不在网页内强制分片", async () => {
  const [materials, instructions, client] = await Promise.all([
    read("lib/materials.ts"),
    read("lib/distillation-instructions.ts"),
    read("lib/distillation-client.ts"),
  ]);
  const source = `${instructions}\n${client}`;

  assert.doesNotMatch(materials, /unitPartSize|splitLongText|maxFileSize|12MB/);
  assert.doesNotMatch(source, /8192|AbortSignal\.timeout|maxDuration/);
  assert.match(client, /providerConfig\?\.maxOutputTokens/);
  assert.match(source, /完整课程资料/);
  assert.match(source, /不得把各片段机械拼接/);
});

test("开源发布必需文件已经就位", async () => {
  await Promise.all([
    access(new URL("README.md", root)),
    access(new URL("LICENSE", root)),
    access(new URL(".github/workflows/deploy-pages.yml", root)),
    access(new URL("public/.nojekyll", root)),
    access(new URL("docs/ARCHITECTURE.zh-CN.md", root)),
  ]);
});
