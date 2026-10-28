import { findUrlByShortCode } from "../../lib/db";
import { recordClick } from "../../lib/stats";

export async function GET(request, { params }) {
  const { shortCode } = await params;

  // 1. DB에서 원본 URL 조회 및 DB 조회 소요 시간 측정 (t0 -> t1)
  const t0 = performance.now();
  const originalUrl = await findUrlByShortCode(shortCode);
  const t1 = performance.now();

  // 문법 오류 수정: `console.log("DB 조회 소요 시간: ...")`
  console.log(`DB 조회 소요 시간: ${(t1 - t0).toFixed(1)} ms`);

  // 2. 존재하지 않는 단축 코드인 경우 즉시 404 반환 (T07 대응)
  if (!originalUrl) {
    console.warn("Short URL not found", { shortCode });
    return new Response("Not Found", { status: 404 });
  }

  // 3. 클릭 수 갱신 및 소요 시간 측정 (t1 -> t2)
  try {
    await recordClick(shortCode);
  } catch (error) {
    console.error("Failed to record click", { shortCode });
  }
  
  // t2 측정 위치를 클릭 기록 갱신(recordClick) 완료 후로 배치
  const t2 = performance.now();

  // 3.1 구간별 소요 시간 구조화 로그 출력
  console.log({
    lookupMs: (t1 - t0).toFixed(1),
    updateMs: (t2 - t1).toFixed(1),
    totalMs: (t2 - t0).toFixed(1),
  });

  // 4. 정상 307 리다이렉트 응답 반환 (T06, T08 대응)
  return new Response(null, {
    status: 307,
    headers: {
      Location: originalUrl,
      "Cache-Control": "no-store",
    },
  });
}