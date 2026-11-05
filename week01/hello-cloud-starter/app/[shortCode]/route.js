import { findUrlByShortCode } from "../../lib/db";
import { recordClick } from "../../lib/stats";
import { redis } from "../../lib/redis"; // 1. Upstash Redis 클라이언트 임포트

export async function GET(request, { params }) {
  const { shortCode } = await params;

  const tStart = performance.now();
  let originalUrl = null;
  let cacheHit = false;
  let tLookupEnd = performance.now();

  // 1. Redis 캐시 먼저 확인 (Cache-Aside 패턴)
  try {
    originalUrl = await redis.get(shortCode);
    if (originalUrl) {
      cacheHit = true;
      tLookupEnd = performance.now();
      console.log(`[Cache Hit] Redis에서 즉시 조회 완료 (${shortCode})`);
    }
  } catch (error) {
    console.error("Redis Cache Lookup Error:", error);
  }

  // 2. Cache Miss인 경우에만 DB에서 원본 URL 조회 및 Redis에 저장
  if (!originalUrl) {
    const t0 = performance.now();
    originalUrl = await findUrlByShortCode(shortCode);
    const t1 = performance.now();
    tLookupEnd = t1;

    console.log(`DB 조회 소요 시간: ${(t1 - t0).toFixed(1)} ms`);

    // 2.1 존재하지 않는 단축 코드인 경우 즉시 404 반환
    if (!originalUrl) {
      console.warn("Short URL not found", { shortCode });
      return new Response("Not Found", { status: 404 });
    }

    // DB에서 찾은 원본 URL을 Redis에 캐싱 (TTL: 3600초 = 1시간)
    try {
      await redis.set(shortCode, originalUrl, { ex: 3600 });
    } catch (error) {
      console.error("Redis Cache Set Error:", error);
    }
  }

  // 3. 클릭 수 갱신 (recordClick) 및 소요 시간 측정
  const tUpdateStart = performance.now();
  try {
    await recordClick(shortCode);
  } catch (error) {
    console.error("Failed to record click", { shortCode });
  }
  const t2 = performance.now();

  // 3.1 구간별 소요 시간 구조화 로그 출력
  console.log({
    cacheHit,
    lookupMs: (tLookupEnd - tStart).toFixed(1),
    updateMs: (t2 - tUpdateStart).toFixed(1),
    totalMs: (t2 - tStart).toFixed(1),
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