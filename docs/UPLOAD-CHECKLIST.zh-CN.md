# GitHub 上传与发布清单

## 一、上传原则

必须上传整个项目并保留目录结构，不能把各文件夹中的文件全部放到 GitHub 仓库首页。

例如：

```text
components/site-chrome.tsx
config/subjects.ts
public/contact/yizhi-ai-map-qrcode.jpg
```

必须分别位于 `components`、`config`、`public/contact` 中。

## 二、必须上传

```text
.github/
app/
components/
config/
docs/
lib/
public/
tests/
.gitignore
LICENSE
README.md
eslint.config.mjs
next.config.ts
package.json
package-lock.json
tsconfig.json
```

## 三、不要上传

```text
node_modules/
.next/
out/
.env
.env.local
.DS_Store
*.pem
```

`out/` 由 GitHub Actions 自动构建，不需要手动上传。

## 四、不再需要的 Cloudflare 文件

开源静态版本不应包含：

```text
worker/
wrangler.jsonc
vite.config.ts
app/api/distill/
app/api/export/word/
```

## 五、首次开启 GitHub Pages

1. 确保仓库为公开仓库；
2. 打开 `Settings > Pages`；
3. 将 Source 设置为 `GitHub Actions`；
4. 打开 `Actions`；
5. 运行或等待“发布 GitHub Pages”；
6. 所有步骤变绿后，回到 `Settings > Pages` 查看网址。

## 六、每次更新

1. 只修改正确目录中的源文件；
2. 提交到 `main`；
3. 等待 GitHub Actions 变绿；
4. 打开正式网页强制刷新；
5. 检查修改是否出现。

不要在仓库首页重新上传一份同名文件；那不会覆盖子目录中的真实文件。

## 七、增加科目

需要上传：

```text
public/prompts/<新科目>-v1.txt
config/subjects.ts
```

如果同时改了测试或说明，再上传对应文件。正常情况下不需要修改页面和发布工作流。

## 八、发布前检查

- `npm test` 通过；
- `npm run build` 通过并生成 `out/`；
- 没有真实 API Key；
- 没有 `.env`；
- 没有无权公开的课程材料；
- 二维码和图片允许公开；
- 四个国内模型完成低成本浏览器直连测试；
- Word、Markdown 和课程地图均能下载；
- 不开 VPN 的手机网络可以打开正式地址。
