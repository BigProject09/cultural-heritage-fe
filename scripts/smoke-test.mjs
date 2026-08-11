#!/usr/bin/env node
// 백엔드 연동 스모크 테스트.
//
// 기본 실행(npm run smoke)은 조회성 엔드포인트만 확인한다(가벼움, LLM 호출 없음).
// --full을 붙이면 보존가이드 /tasks/{taskId}/start까지 실제로 호출해
// LangGraph/LLM 파이프라인 전체가 살아있는지 확인한다(느리고 LLM 비용 발생).
//
// 사용법:
//   node scripts/smoke-test.mjs             # 기본 점검
//   node scripts/smoke-test.mjs --full       # 보존가이드 start까지 포함
//   node scripts/smoke-test.mjs --base=http://<EKS 엔드포인트>:8080
//
// VITE_API_BASE_URL은 .env / .env.local에서 읽는다(없으면 http://localhost:8080).
// --base로 넘기면 .env보다 우선한다 — 새 EKS 엔드포인트를 .env에 반영하기 전에
// 먼저 이 스크립트로 확인만 해보고 싶을 때 쓴다.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnvFile(filePath, target) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    target[key] = value;
  }
}

const fileEnv = {};
loadEnvFile(path.join(rootDir, ".env"), fileEnv);
loadEnvFile(path.join(rootDir, ".env.local"), fileEnv);

const args = process.argv.slice(2);
const runFull = args.includes("--full");
const baseArg = args.find((arg) => arg.startsWith("--base="))?.split("=")[1];

const API_BASE = (
  baseArg ||
  process.env.VITE_API_BASE_URL ||
  fileEnv.VITE_API_BASE_URL ||
  "http://localhost:8080"
).replace(/\/+$/, "");

const TIMEOUT_MS = 8000;

async function timedFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const ms = Date.now() - startedAt;
    return { response, ms };
  } finally {
    clearTimeout(timer);
  }
}

async function readBodySafe(response) {
  const contentType = response.headers.get("content-type") || "";
  try {
    return contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    return null;
  }
}

const results = [];

async function check(name, fn) {
  try {
    const { ok, detail, ms } = await fn();
    results.push({ name, ok, detail, ms });
  } catch (error) {
    const ms = null;
    const isAbort = error?.name === "AbortError";
    results.push({
      name,
      ok: false,
      detail: isAbort ? `타임아웃(${TIMEOUT_MS}ms)` : error.message,
      ms,
    });
  }
}

// 1. Spring 서버 자체가 떠 있는지 (X-RAY 헬스체크 엔드포인트를 공용 헬스체크로 사용)
await check("Spring 헬스체크 (GET /api/xray/health)", async () => {
  const { response, ms } = await timedFetch(`${API_BASE}/api/xray/health`);
  const body = await readBodySafe(response);
  return {
    ok: response.ok,
    ms,
    detail: response.ok
      ? `HTTP ${response.status} ${JSON.stringify(body)}`
      : `HTTP ${response.status}`,
  };
});

// 2. 공개 조회 API 두 개 (인증 불필요, DB까지 왕복 확인)
await check("공지사항 목록 (GET /api/notices)", async () => {
  const { response, ms } = await timedFetch(`${API_BASE}/api/notices`);
  const body = await readBodySafe(response);
  return {
    ok: response.ok && Array.isArray(body),
    ms,
    detail: response.ok
      ? `HTTP ${response.status}, ${Array.isArray(body) ? body.length : "?"}건`
      : `HTTP ${response.status}`,
  };
});

await check("게시판 목록 (GET /api/posts?size=1)", async () => {
  const { response, ms } = await timedFetch(`${API_BASE}/api/posts?size=1`);
  const body = await readBodySafe(response);
  return {
    ok: response.ok && typeof body?.totalElements === "number",
    ms,
    detail: response.ok
      ? `HTTP ${response.status}, totalElements=${body?.totalElements}`
      : `HTTP ${response.status}`,
  };
});

// 3. (--full) 보존가이드 파이프라인 전체 - 실제 LLM 호출 발생
if (runFull) {
  await check(
    "보존가이드 시작 (POST /tasks/{id}/start, LLM 호출 발생)",
    async () => {
      const taskId = `smoke-${Date.now()}`;
      const { response, ms } = await timedFetch(`${API_BASE}/tasks/${taskId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: "스모크 테스트",
          taskManager: "smoke-test",
          relicInfo: {
            name: "스모크 테스트용 유물",
            material: "토기",
            period: "삼국시대",
            condition: "표면 균열 있음",
          },
          relicPhoto: [],
          flow: ["disassembly"],
        }),
      });
      const body = await readBodySafe(response);
      const hasExpectedShape =
        response.ok && typeof body?.status === "string" && "interrupt" in body;

      return {
        ok: hasExpectedShape,
        ms,
        detail: response.ok
          ? `HTTP ${response.status}, status=${body?.status}, interrupt keys=[${Object.keys(body?.interrupt || {}).join(", ")}]`
          : `HTTP ${response.status} ${JSON.stringify(body).slice(0, 300)}`,
      };
    },
  );
} else {
  console.log(
    "ℹ 보존가이드 /tasks/start 전체 파이프라인(LLM 호출)은 건너뜁니다. --full로 실행하면 포함됩니다.\n",
  );
}

// 결과 출력
console.log(`API_BASE = ${API_BASE}\n`);

let allOk = true;
for (const result of results) {
  const icon = result.ok ? "✅" : "❌";
  const timing = result.ms != null ? ` (${result.ms}ms)` : "";
  console.log(`${icon} ${result.name}${timing}`);
  console.log(`   ${result.detail}`);
  if (!result.ok) allOk = false;
}

console.log(`\n${allOk ? "모든 점검을 통과했습니다." : "실패한 항목이 있습니다."}`);
process.exit(allOk ? 0 : 1);
