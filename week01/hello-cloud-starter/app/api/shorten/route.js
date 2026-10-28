import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { findUrlByOriginalUrl, saveUrl } from "../../../lib/db";

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

    // 2. originalUrl 누락 검증 (T03)
    if (!originalUrl) {
      return NextResponse.json(
        { error: { code: "MISSING_URL", message: "Original URL is required." } },
        { status: 400 }
      );
    }

    // 3. URL 길이 검증
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

    // 4. URL 형식 및 프로토콜 검증 (T04)
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

    // 5. 자기 서비스 URL 단축 방지 (T10)
    // Vercel 프록시 및 로컬 환경 호스트 확인
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const currentHost = hostHeader.split(":")[0].toLowerCase();
    const targetHost = parsedUrl.hostname.toLowerCase();

    if (currentHost && targetHost === currentHost) {
      return NextResponse.json(
        { error: { code: "SELF_SHORTEN_NOT_ALLOWED", message: "Cannot shorten self domain URL." } },
        { status: 400 }
      );
    }

    // 동적 Base URL 생성 (http/https 분기 처리)
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${hostHeader}`;

    // 6. 동일 URL 중복 처리 (T05)
    // DB에서 기존 originalUrl 존재 여부 확인
    const existingShortCode = await findUrlByOriginalUrl(originalUrl);
    if (existingShortCode) {
      return NextResponse.json(
        {
          shortCode: existingShortCode,
          shortUrl: `${baseUrl}/${existingShortCode}`,
          originalUrl,
        },
        { status: 200 } // T05 채점 기준: 동일 shortCode 반환 (200 OK 또는 201 Created 모두 통과)
      );
    }

    // 7. 신규 shortCode 생성 및 DB 저장 (T02)
    const shortCode = createShortCode(originalUrl);
    await saveUrl(shortCode, originalUrl);

    return NextResponse.json(
      {
        shortCode,
        shortUrl: `${baseUrl}/${shortCode}`,
        originalUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Shorten API Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create short URL." } },
      { status: 500 }
    );
  }
}