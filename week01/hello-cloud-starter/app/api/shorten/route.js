import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_URL_LENGTH = 2048;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function createShortCode(originalUrl, length = 6) {
  const hex = createHash("sha256").update(originalUrl).digest("hex");
  let code = "";

  for (let i = 0; i < length; i++) {
    const value = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    code += ALPHABET[value % ALPHABET.length];
  }

  return code;
}

export async function POST(request) {
  try {
    // 1. request body의 JSON 읽기
    const body = await request.json().catch(() => null);
    const raw = body?.originalUrl;
    const originalUrl = typeof raw === "string" ? raw.trim() : "";

    // 2. originalUrl 확인 (빈 값 검증)
    if (!originalUrl) {
      return NextResponse.json(
        { error: { code: "MISSING_URL", message: "Original URL is required." } },
        { status: 400 }
      );
    }

    // 3. URL 길이 확인
    if (originalUrl.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: "URL_TOO_LONG",
            message: `URL must be ${MAX_URL_LENGTH} characters or fewer.`,
          },
        },
        { status: 400 }
      );
    }

    // 4. URL 형식 확인
    let parsedUrl;
    try {
      parsedUrl = new URL(originalUrl);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "URL must start with http:// or https://." } },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "URL must start with http:// or https://." } },
        { status: 400 }
      );
    }

    // 5. shortCode 생성 & JSON 응답 반환
    const shortCode = createShortCode(originalUrl);
    const baseUrl = new URL(request.url).origin;

    return NextResponse.json(
      {
        shortCode,
        shortUrl: `${baseUrl}/${shortCode}`,
        originalUrl,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create short URL." } },
      { status: 500 }
    );
  }
}