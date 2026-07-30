import Image from "next/image";
import { CopyLinkButton } from "@/components/copy-link-button";
import { siteConfig } from "@/config/site";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { withBasePath } from "@/lib/base-path";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label={`${siteConfig.brandName}平台首页`}>
        <span className="brand-seal">AI</span>
        <span>
          <strong>{siteConfig.brandName}</strong>
          <small>把课程变成可复习的方法</small>
        </span>
      </a>
      <div className="header-tools">
        <ThemeSwitcher />
        <div className="header-badge">
          <i aria-hidden="true" />
          国内模型可用
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">AI LEARNING COMPANION · {siteConfig.editionName}</p>
        <h1>
          把学习资料，
          <span>变成你的 AI 伴学系统</span>
        </h1>
        <p className="hero-description">
          上传讲义、逐字稿和题本，提炼老师的思路、方法、例题和易错点，接入你的专注学习网页。
        </p>
        <div className="hero-actions">
          <a className="hero-primary" href="#materials">
            开始上传资料
          </a>
          <a className="hero-secondary hero-contact" href="#contact-footer">
            <span>
              帮助咨询 / 私人定制
              <b aria-hidden="true">→</b>
              易知的 AI 地图
            </span>
            <span className="hero-qr-popover" aria-hidden="true">
              <Image
                src={withBasePath("/contact/yizhi-ai-map-qrcode.jpg")}
                alt=""
                width={258}
                height={258}
                unoptimized
              />
              <small>微信扫码关注「易知的 AI 地图」</small>
            </span>
          </a>
        </div>
      </div>
      <aside className="distillation-preview" id="distillation-preview">
        <div className="preview-card-heading">
          <span>从资料到 AI 伴学</span>
          <i>完整链路</i>
        </div>
        <div className="preview-source">
          <small>原始资料</small>
          <div>
            <span>课程讲义</span>
            <span>逐字稿</span>
            <span>配套题本</span>
          </div>
        </div>
        <div className="preview-transform">
          <i aria-hidden="true">↓</i>
          <span>匹配讲解 · 提炼方法 · 保留老师思路</span>
        </div>
        <div className="preview-output">
          <small>蒸馏后的结构化知识库</small>
          <div>
            <span><i>01</i>老师思路</span>
            <span><i>02</i>方法步骤</span>
            <span><i>03</i>典型例题</span>
            <span><i>04</i>易错提醒</span>
          </div>
        </div>
        <div className="preview-handoff">
          <i aria-hidden="true">↓</i>
          <span>一键接入专注学习网页</span>
        </div>
        <div className="learning-preview">
          <div className="learning-preview-heading">
            <span><i aria-hidden="true" />AI 伴学系统</span>
            <small>本节进度 3 / 8</small>
          </div>
          <p>这道题为什么先判断题型，而不是直接计算？</p>
          <blockquote>
            因为老师先看到了两个条件。我们按课程里的判断步骤重新走一遍。
          </blockquote>
          <div>
            <span>追问老师思路</span>
            <span>生成针对练习</span>
            <span>记录易错点</span>
          </div>
        </div>
      </aside>
    </section>
  );
}

export function ProgressNav() {
  return (
    <nav className="progress-nav" aria-label="使用步骤">
      <a href="#materials" aria-current="step">
        <span>1</span>
        <b>上传资料</b>
      </a>
      <i />
      <a href="#subject">
        <span>2</span>
        <b>选择科目</b>
      </a>
      <i />
      <a href="#model">
        <span>3</span>
        <b>配置模型</b>
      </a>
      <i />
      <a href="#run">
        <span>4</span>
        <b>试跑并下载</b>
      </a>
    </nav>
  );
}

export function PreparationGuideLink() {
  return (
    <a
      className="guide-link"
      href={siteConfig.preparationGuide.url || "#prepare-guide"}
      target={siteConfig.preparationGuide.url ? "_blank" : undefined}
      rel={siteConfig.preparationGuide.url ? "noreferrer" : undefined}
    >
      <span>没有文字版资料？</span>
      {siteConfig.preparationGuide.linkLabel}
      <b aria-hidden="true">→</b>
    </a>
  );
}

export function PreparationGuide() {
  return (
    <section className="guide-placeholder" id="prepare-guide">
      <span>资料准备教程</span>
      <div>
        <h2>课程文件还没有变成文字？</h2>
        <p>
          查看完整教程，学习PPT/PDF文字提取、网页课程录音和视频逐字稿的准备方法。
        </p>
      </div>
      {siteConfig.preparationGuide.url ? (
        <div className="guide-actions">
          <a
            className="guide-button"
            href={siteConfig.preparationGuide.url}
            target="_blank"
            rel="noreferrer"
          >
            直接打开教程
          </a>
          <CopyLinkButton url={siteConfig.preparationGuide.url} />
        </div>
      ) : (
        <button type="button" disabled>
          {siteConfig.preparationGuide.pendingLabel}
        </button>
      )}
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact-footer">
      <div className="footer-contact-copy">
        <small>
          {siteConfig.brandName} · {siteConfig.editionName}
        </small>
        <strong>视频转文字教程、学习网页设计、更多 AI 考公技巧</strong>
        <p>都在「易知的 AI 地图」</p>
      </div>
      <div className="footer-qrcode">
        <Image
          src={withBasePath("/contact/yizhi-ai-map-qrcode.jpg")}
          alt="易知的 AI 地图微信公众号二维码"
          width={258}
          height={258}
          unoptimized
        />
        <span>微信扫码关注 · 手机端可长按识别</span>
      </div>
    </footer>
  );
}
