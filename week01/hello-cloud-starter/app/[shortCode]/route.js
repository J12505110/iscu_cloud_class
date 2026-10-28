import { findUrlByShortCode } from "../../lib/db";
import { recordClick } from "../../lib/stats";

export async function GET(request, { params }) {
  const { shortCode } = await params;

  // 1. DB에서 원본 URL 조회 및 DB 조회 소요 시간 측정 시작(t0 -> t1)
  const t0 = performance.now();
  const originalUrl = await findUrlByShortCode(shortCode);
  const t1 = performance.now();
  console.log(`DB 조회 소요 시간: ${t1 - t0} ms`);

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
  // 3.1 클릭 수 갱신 소요 시간 측정 시작(t2 -> t3)
  const t2 = performance.now();

  //3.2 구간별 소요 시간 구조화 로그 출력
  console.log({
    lookupMs: (t1 - t0).toFixed(1),
    updateMs: (t2 - t1).toFixed(1),
    totalMs: (t2 - t0).toFixed(1),
  });

  // 4. 정상 307 리다이렉트 응답 반환
  return new Response(null, {
    status: 307,
    headers: {
      Location: originalUrl,
      "Cache-Control": "no-store",
    },
  });
}