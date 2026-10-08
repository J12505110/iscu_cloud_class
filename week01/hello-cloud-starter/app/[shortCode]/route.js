import { findUrlByShortCode } from "../../lib/db";
import { recordClick } from "../../lib/stats";

export async function GET(request, { params }) {
  const { shortCode } = await params;

  const originalUrl = await findUrlByShortCode(shortCode);

  // TODO
  // originalUrl이 존재하지 않는 경우
  // 404 Not Found 응답을 반환하세요.
  try {
    await recordClick(shortCode);
  } catch (error) {
    console.error("Failed to record click", { shortCode });
  }
  
  if (!originalUrl) {
    console.warn("Short URL not found", { shortCode });

    return new Response("Not Found", { status: 404 });
  }
  
  return new Response(null, {
    status: 307,
    headers: {
      Location: originalUrl,
      "Cache-Control": "no-store",
    },
  });
}