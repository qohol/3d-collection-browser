#!/usr/bin/env node
/**
 * HF データセット "scenario-labs/3d-collection" の全メタデータを取得し、
 * ブラウザ用の静的インデックス (data/index.js) を生成するスクリプト。
 *
 * 実行: node build_index.mjs
 * 依存: なし (Node.js 18+ の標準 fetch を使用)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATASET = "scenario-labs/3d-collection";
/** 既定のリポジトリ上のパス → ここへ署名なしで直接アクセスできることを確認済み */
const RESOLVE_BASE = `https://huggingface.co/datasets/${DATASET}/resolve/main/`;
const ROWS_API = "https://datasets-server.huggingface.co/rows";
const PAGE = 100;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** レート制限 (HTTP 429 / 5xx) に対応した指数バックオフ付き fetch */
async function fetchJson(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "3d-collection-browser/1.0" } });
    if (res.status === 429 || res.status >= 500) {
      throw new Error(`server status ${res.status}`);
    }
    if (!res.ok) throw new Error(`unexpected status ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const waitMs = 1500 * 2 ** attempt; // 1.5s, 3s, 6s, 12s
    console.warn(`  ! retry ${attempt + 1}/${MAX_RETRIES} (${err.message}) - ${waitMs / 1000}s 待機`);
    await sleep(waitMs);
    return fetchJson(url, attempt + 1);
  }
}

async function main() {
  console.log(`Fetching: ${DATASET}`);
  const rows = [];
  let offset = 0;
  let total = null;

  while (total === null || offset < total) {
    const url = `${ROWS_API}?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${PAGE}`;
    const j = await fetchJson(url);
    if (total === null) {
      total = j.num_rows_total;
      console.log(`total rows: ${total}`);
    }
    const batch = j.rows ?? [];
    if (batch.length === 0) break; // 念のため無限ループ防止
    for (const { row } of batch) rows.push(row);
    offset += batch.length;
    console.log(`  fetched ${rows.length}/${total}`);
    // レート制限回避のため少し待機
    await sleep(250);
  }

  // 必要な列だけを取り出してコンパクトに整形
  const data = rows.map((r) => {
    const assetId = r.id.replace(/^scenario:/, "");
    const out = r.outputs?.find((o) => o.role === "output") ?? null;
    return {
      id: assetId,
      model: r.model ?? null,
      workflow: r.workflow ?? null,
      format: r.formats ?? out?.format ?? null,
      prompt: r.prompt || r.inputs?.prompt || null,
      /* サムネイル: 署名不要のリポジトリ直 URL (CORS 許可済み) */
      preview: r.preview_file?.path ? RESOLVE_BASE + r.preview_file.path : null,
      /* 3D 元ファイル (?download=true 付きで取得)。
       glb + native.blend のように複数出力を持つレコードがあるため全件保持 */
      outputs: (Array.isArray(r.outputs) ? r.outputs : [])
        .filter((o) => o && typeof o.path === "string")
        .map((o) => ({ p: o.path, f: o.format ?? null, r: o.role ?? null })),
      /* 生成元の入力画像 */
      inputs: Array.isArray(r.input_files) ? r.input_files : [],
      license: r.license ?? null,
    };
  });

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "data");
  mkdirSync(outDir, { recursive: true });

  const js = `// このファイルは build_index.mjs により自動生成されます。手動編集しないでください。
// generator: scenario-labs/3d-collection (${data.length} items, built ${new Date().toISOString()})
window.DATA = ${JSON.stringify(data)};
`;
  const outPath = join(outDir, "index.js");
  writeFileSync(outPath, js);

  // 統計表示
  const byModel = {};
  const byFormat = {};
  for (const d of data) {
    byModel[d.model ?? "(unknown)"] = (byModel[d.model ?? "(unknown)"] ?? 0) + 1;
    byFormat[d.format ?? "(unknown)"] = (byFormat[d.format ?? "(unknown)"] ?? 0) + 1;
  }
  console.log("\n--- models ---");
  for (const [k, v] of Object.entries(byModel)) console.log(`  ${k}: ${v}`);
  console.log("--- formats ---");
  for (const [k, v] of Object.entries(byFormat)) console.log(`  ${k}: ${v}`);
  console.log(`\n✔ wrote ${outPath} (${(js.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error("failed:", err);
  process.exit(1);
});
