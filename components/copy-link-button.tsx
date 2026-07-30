"use client";

import { useRef, useState } from "react";

type CopyLinkButtonProps = {
  url: string;
};

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => setCopied(false), 2600);
    } catch {
      window.prompt("请复制下面的链接，在微信中打开：", url);
    }
  }

  return (
    <button className="guide-copy-button" type="button" onClick={copyLink}>
      {copied ? "已复制，去微信打开" : "复制链接，去微信打开"}
    </button>
  );
}
