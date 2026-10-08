import { findUrlByShortCode } from "../../lib/db";
import { recordClick } from "../../lib/stats";

export async function GET(request, { params }) {
  const { shortCode } = await params;

  // 1. DB에서 원본 URL 조회
  const originalUrl = await findUrlByShortCode(shortCode);

  // 2. 존재하지 않는 단축 코드인 경우 즉시 404 반환
  if (!originalUrl) {
    console.warn("Short URL not found", { shortCode });
    return new Response("Not Found", { status: 404 });
  }

  // 3. 클릭 수 갱신 (실패하더라도 리다이렉트는 차단되지 않음)
  try {
    await recordClick(shortCode);
  } catch (error) {
    console.error("Failed to record click", { shortCode });
  }

  // 4. 정상 307 리다이렉트 응답 반환
  return new Response(null, {
    status: 307,
    headers: {
      Location: originalUrl,
      "Cache-Control": "no-store",
    },
  });
}