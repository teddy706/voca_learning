import type { Metadata, Viewport } from "next";
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
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS Safari는 manifest만으로는 "홈 화면에 추가"를 완전히 인식하지 못해서(PRD 4.5)
  // apple-mobile-web-app-* 메타 태그를 별도로 필요로 한다.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "단어콕",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f9fc",
  // 노치/홈 인디케이터에 버튼이 가리지 않도록 — PRD 4.5 세이프 에어리어 요건.
  viewportFit: "cover",
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
