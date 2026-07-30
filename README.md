# 网课蒸馏

一个开源、纯前端的课程资料整理工具。用户可以上传讲义、逐字稿、题本和笔记，使用自己的大模型 API Key，先生成课程地图，再完成试蒸馏和整节课蒸馏。

项目可以直接发布到 GitHub Pages，不需要自建服务器、Cloudflare Worker 或数据库。

## 主要功能

- 按课程资料和补充资料分别上传；
- 自动区分课件、逐字稿、题本和笔记；
- 先通读完整课程并建立课程地图；
- 用代表性单元进行低成本试蒸馏；
- 按课程地图完成整节课全局整理；
- 保留老师的判断链、方法、例题、易错点和来源线索；
- 下载课程地图、Markdown 和 Word；
- 支持 DeepSeek、通义千问、豆包、智谱及兼容 Chat Completions 的自定义接口；
- 支持继续增加新科目。

## 数据与 API Key

- API Key 只存在于当前浏览器页面状态中，不写入数据库、`localStorage` 或项目配置；
- 上传资料只在用户点击蒸馏后，由用户浏览器直接发送给所选模型平台；
- 本项目维护者不接收、不保存用户资料和 API Key；
- 刷新页面后，上传资料、API Key 和蒸馏结果不会自动保存；
- 请勿上传身份证、账号密码或无权处理的敏感、受限资料；
- 模型调用费用由用户与所选模型平台结算。

浏览器直连模型依赖模型平台允许网页跨域请求。如果出现“浏览器无法连接模型接口”，请检查网络、接口地址，并确认所选平台是否允许浏览器直接调用。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址即可。

## 本地检查

```bash
npm test
npm run build
```

构建成功后，静态网页位于：

```text
out/
```

## 发布到 GitHub Pages

1. 创建一个公开 GitHub 仓库；
2. 将本项目全部文件按原目录结构上传，不能把文件都放到仓库首页；
3. 打开仓库的 `Settings`；
4. 进入 `Pages`；
5. 将发布来源设置为 `GitHub Actions`；
6. 推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动测试、构建并发布；
7. 在仓库 `Actions` 页面确认“发布 GitHub Pages”显示绿色；
8. 在 `Settings > Pages` 查看正式网址。

工作流会自动识别仓库子路径，所以普通项目仓库和 `<用户名>.github.io` 仓库都可以使用。

## 增加科目

普通新科目只需要两步。

### 1. 增加提示词

复制：

```text
public/prompts/_subject-template.txt
```

例如保存为：

```text
public/prompts/essay-v1.txt
```

### 2. 增加科目配置

在 `config/subjects.ts` 的 `subjects` 数组中加入：

```ts
{
  id: "essay",
  title: "申论",
  description: "归纳概括、综合分析、文章写作",
  promptPath: "/prompts/essay-v1.txt",
  badge: "",
  expectedSubject: "申论",
  openPromptByDefault: false,
  isTemplate: false,
}
```

页面编号、科目卡片、提示词加载、科目核验和下载文件名都会自动处理。测试会检查科目 ID 是否重复、提示词是否存在以及内容是否为空。

如果新增功能改变了整个流程，例如图片识别、申论评分或长期学习记录，则属于新功能模块，不只是新增科目。

## 项目结构

```text
app/                         页面
components/                  页面组件
config/                      科目、模型和站点配置
lib/                         资料处理、模型调用与本地导出
public/prompts/              各科目提示词
public/contact/              公众号二维码
public/pet/                  页面宠物素材
tests/                       自动检查
.github/workflows/           GitHub Pages 自动发布
```

更详细的维护说明见：

- `docs/ARCHITECTURE.zh-CN.md`
- `docs/UPLOAD-CHECKLIST.zh-CN.md`

## 开源许可

本项目采用 `AGPL-3.0-only`。修改后通过网络向用户提供服务时，也需要按许可证要求提供对应源代码。
