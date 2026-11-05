import "./globals.css";

export const metadata = {
  title: "URL Shortener",
  description: "URL 입력값 검증 실습",
  icons: {
    icon: 'data:,', // 빈 데이터 URI를 전달하여 404 및 디코딩 오류 방지
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}