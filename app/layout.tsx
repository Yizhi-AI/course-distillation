import type { Metadata } from "next";
import "./globals.css";

const title = "网课蒸馏｜把学习资料变成你的 AI 伴学系统";
const description =
  "上传讲义、逐字稿和题本，提炼老师的思路、方法、例题和易错点，接入你的专注学习网页。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
