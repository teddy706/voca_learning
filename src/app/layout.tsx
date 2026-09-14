import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 리딩버디와 동일하게 프리텐다드(Pretendard) 가변 폰트를 셀프 호스팅한다 — 한글 가독성 확보,
// 별도 CDN 요청 없이 빌드에 포함.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "단어콕 - 영단어 스펠링 암기",
  description: "사진으로 등록하고 게임처럼 반복하는 우리 아이 영단어 스펠링 점검 PWA",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#f7f9fc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} antialiased`}>{children}</body>
    </html>
  );
}
