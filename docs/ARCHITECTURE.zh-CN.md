# 网课蒸馏静态版架构

## 一、运行边界

项目是可以发布到 GitHub Pages 的纯前端应用。

```text
用户浏览器
├── 读取用户选择的本地文字资料
├── 加载当前科目的提示词
├── 直接调用用户选择的模型平台
├── 保存当前页面会话中的课程地图和结果
└── 在浏览器生成 Markdown 与 Word 下载
```

项目不包含：

- 自建后端接口；
- Cloudflare Worker；
- 数据库；
- 登录系统；
- API Key 持久化；
- 用户资料持久化。

## 二、核心流程

### 1. 资料处理

`lib/materials.ts` 负责读取可支持的文字文件、判断资料角色，并组成完整课程语料。项目不在浏览器内按字符强制切片。

### 2. 科目提示词

`config/subjects.ts` 是科目的唯一配置入口，提示词正文放在 `public/prompts/`。

页面只加载当前选择科目的提示词，不会把其他科目提示词发送给模型。

### 3. 课程地图

模型先通读完整资料并形成课程地图，用于：

- 建立章节、知识点、题目和案例层级；
- 匹配课件、题本与逐字稿；
- 定位老师的方法、判断链、例题和易错点；
- 检查科目是否选错；
- 选择代表性试蒸馏单元。

### 4. 试蒸馏与全量蒸馏

试蒸馏从完整资料中定位课程地图指定的代表性单元。全量蒸馏再次使用完整资料和课程地图，生成整节课统一报告。

### 5. 来源线索与下载

模型返回的粗粒度来源标记由 `lib/distillation-client.ts` 分离。Markdown 通过 Blob 下载；Word 由 `lib/word-export.ts` 在浏览器生成。

## 三、代码分层

| 层级 | 主要文件 | 职责 |
| --- | --- | --- |
| 页面编排 | `app/page.tsx` | 串联上传、科目、模型、蒸馏和下载 |
| 页面组件 | `components/` | 上传区、首屏、页尾、主题和宠物 |
| 产品配置 | `config/` | 科目、模型、公众号和学习系统入口 |
| 模型调用 | `lib/distillation-client.ts` | 浏览器直连模型、校验与解析错误 |
| 蒸馏规则 | `lib/distillation-instructions.ts` | 课程地图、试蒸馏和全量蒸馏要求 |
| 模型兼容 | `lib/openai-compatible.ts` | 兼容 Chat Completions 返回结构 |
| 资料处理 | `lib/materials.ts` | 文件读取和完整课程语料组合 |
| Word 导出 | `lib/word-export.ts` | 浏览器生成 Word Blob |
| 静态路径 | `lib/base-path.ts` | 兼容 GitHub Pages 仓库子路径 |
| 自动发布 | `.github/workflows/deploy-pages.yml` | 测试、构建并发布 Pages |

## 四、页面状态与隐私

以下内容只保存在当前页面内存中：

- 上传文件；
- 当前科目和提示词；
- 当前模型配置和 API Key；
- 课程地图；
- 试蒸馏和全量结果。

资料、提示词、科目或模型变化时，`resetGeneratedResults()` 会统一清除旧地图和结果，避免错误复用。

API Key 不进入 `localStorage`、`sessionStorage` 或环境变量。

## 五、科目扩展规则

新增普通科目时：

1. 复制 `public/prompts/_subject-template.txt`；
2. 在 `public/prompts/` 保存新提示词；
3. 在 `config/subjects.ts` 增加配置；
4. 运行 `npm test`。

科目配置字段：

| 字段 | 作用 |
| --- | --- |
| `id` | 稳定且唯一的英文标识 |
| `title` | 页面显示名称和下载文件名 |
| `description` | 科目卡片说明 |
| `promptPath` | 对应提示词静态路径 |
| `badge` | 可选角标，空字符串表示不显示 |
| `expectedSubject` | 科目核验名称；自由模板填空字符串 |
| `openPromptByDefault` | 选择后是否自动展开提示词 |
| `isTemplate` | 是否为通用自定义模板 |

页面编号按数组顺序自动生成，不在配置中手工维护。

## 六、GitHub Pages 路径

普通仓库通常发布在：

```text
https://<用户名>.github.io/<仓库名>/
```

工作流读取 GitHub Pages 的 `base_path`，构建时写入 `NEXT_PUBLIC_BASE_PATH`。所有二维码、宠物图片和提示词路径统一通过 `withBasePath()` 处理。

## 七、常见维护操作

### 更新提示词

替换 `public/prompts/` 中对应文件，不需要改页面。

### 更新模型

修改 `config/providers.ts` 中的模型名称、说明、接口地址和输出上限。发布前应以模型厂商控制台为准。

### 更换公众号

替换 `public/contact/yizhi-ai-map-qrcode.jpg`，并按需要修改 `config/site.ts`。

### 接入学习网页

在 `config/site.ts` 的 `learningSystem.url` 填写真实地址，入口会自动变为可点击链接。

### 部署到其他静态托管

运行 `npm run build` 后上传 `out/`。部署在域名根目录时不需要设置 `NEXT_PUBLIC_BASE_PATH`；部署在子目录时，应在构建阶段设置相应路径。
