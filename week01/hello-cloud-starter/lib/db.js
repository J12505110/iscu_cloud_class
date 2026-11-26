import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// 1. URL 신규 저장 (Contract 단계: destination_url만 저장)
export async function saveUrl(shortCode, originalUrl) {
  await sql`
    INSERT INTO urls (short_code, destination_url)
    VALUES (${shortCode}, ${originalUrl})
  `;
}

// 2. shortCode로 원본 URL 조회
export async function findUrlByShortCode(shortCode) {
  const rows = await sql`
    SELECT destination_url
    FROM urls
    WHERE short_code = ${shortCode}
    LIMIT 1
  `;

  return rows?.destination_url ?? null;
}

// 3. originalUrl로 기존 shortCode 조회
export async function findUrlByOriginalUrl(originalUrl) {
  const rows = await sql`
    SELECT short_code
    FROM urls
    WHERE destination_url = ${originalUrl}
    LIMIT 1
  `;

  return rows?.short_code ?? null;
}