# 🧊 3D Collection Browser

[Hugging Face データセット **scenario-labs/3d-collection**](https://huggingface.co/datasets/scenario-labs/3d-collection)(全 1,342 件の 3D アセット)を、サムネイル付きで確認しながらワンクリックでダウンロードできるローカル Web サイトです。

- サーバー・ビルド不要。`index.html` をブラウザで開くだけで動作します
- データの取得もすべてブラウザ側で完結(外部にデータを送信しません)

---

## ファイル構成

| ファイル | 内容 |
|---|---|
| `index.html` | ギャラリーサイト本体(単一ファイル・vanilla JS・依存ライブラリなし) |
| `build_index.mjs` | メタデータ生成スクリプト(Node.js 18+・依存パッケージなし) |
| `data/index.js` | 生成物:全レコードのメタデータの静的インデックス |
| `run_index.sh` | ローカルでインデックスを再生成するスクリプト(`node build_index.mjs` のラッパー)— 現状は動作用コメントのみ |
| `run_serve.sh` | ローカル静的サーバーを起動するスクリプト(`python3 -m http.server 8765`) |
| `.github/workflows/rebuild.yml` | GitHub 上でインデックスを再生成するワークフロー(**手動実行のみ・定期実行なし**) |

## 使い方

### 0. GitHub Pages で公開する(おすすめ)

GitHub だけでホスティングでき、PC に Node.js / Python は不要です:

- 公開 URL:**https://qoohl7.github.io/3d-collection-browser/**
- **Settings → Pages → Source:「Deploy from a branch」→ Branch:`main` / `(root)`** を選んで保存するだけ
- データセットの再同期は自動実行しません。更新が必要な場合は
  「Actions → Rebuild index」から手動で実行してください

※ リポジトリをプライベートのまま公開するには有料プランが必要です(パブリックなら無料)。

### 1. 最低 1 回だけ:インデックス生成

```bash
node build_index.mjs
```

- HF 公式の datasets-server rows API から全 1,342 件をページング取得します(約 1 分)
- レート制限 (429/5xx) には指数バックオフで自動リトライします
- 結果は `data/index.js` に `window.DATA = [...]` 形式で出力されます
- データセットが更新されたら、このコマンドを再実行するだけで再同期できます
  (GitHub 上に公開している場合は「Actions → Rebuild index → Run workflow」でも実行可能)

### 2. ブラウザで開く

```bash
# パターン A: ローカル静的サーバーで起動 (サイトのフォルダ内で実行)
python3 -m http.server 8765
# → http://localhost:8765 を開く

# パターン B: そのまま開く(index.js が classic script なので file:// でも動作)
xdg-open index.html
```

> **ヒント**:`OSError: [Errno 98] Address already in use` が出た場合は、
> ポート 8765 が別のプロセスに使用されています。
> - `ss -tlnp | grep 8765` で占有プロセスを特定して停止する
> - または別のポート (例: `python3 -m http.server 9000`) を使う
> - なお `python3 -m http.server` (ポート指定なし) は既定の 8000 番で起動するため、
>   その場合は **http://localhost:8000** を開いてください

---

## 機能

### ギャラリー

- **サムネイル付きカードグリッド**
  - 画像は遅延読み込み + 120 件ずつのチャンク描画(下にスクロールすると続きを読み込み)
  - カードには `asset_id`、生成モデル名、プロンプト、フォーマットバッジを表示
- **フィルター**
  - モデル(52 種:Meshy / Tripo / TRELLIS / Rodin / Direct3D / SAM-3D / SPARC3D など)、workflow(image-to-3d / image-to-splat)、フォーマット(glb / spz / fbx / ply / vox / blend)のドロップダウン
  - プロンプト・asset ID のキーワード検索
  - 「表示中を全選択」「選択解除」「フィルタ解除」

### ダウンロード

- **個別 DL**:カードの「⬇ ダウンロード」ボタン
  - `fetch → Blob` で取得し、`asset_<id>.glb` のような分かりやすいファイル名で保存(`?download=true` 付きの公式 resolve URL を使用)
  - CORS 制限やネットワークエラーで取得できない場合は、ブラウザ既定挙動の直接リンク保存へ自動フォールバック
- **一括 DL**:チェックボックスで選択して「⬇ 選択を一括ダウンロード」
  - 1 件ずつ順次ダウンロードし、進捗(`3 / 10: asset_xxx.glb — 52.1 MB 送信中…`)を表示
  - 「中断」ボタンで途中停止可能(`AbortController` 使用)
- **複数出力ファイルへの対応**
  - glb + native.blend のように複数出力を持つレコード(158 件)は、追加フォーマットのリンク(`.blend も`)をカードに表示

### 注意点

- 一括 DL 時、Chrome は初回のみ「複数ファイルのダウンロードを許可しますか?」の確認ダイアログが出ます。「許可」を選択すると以後はスムーズに連続保存されます
- Firefox の場合、プログラムからの連続ダウンロードがポップアップブロックで妨げられることがあります。その場合は設定でこのサイト(origin)のダウンロード許可を有効にしてください
- サムネイル / 元データはすべて Hugging Face 公式 CDN から直接取得するため、初回表示にはネットワークが必要です(メタデータ自体はローカル保持)
- `spz`(Gaussian Splat 形式)など一部フォーマットはブラウザで直接プレビューできないため、確認はサムネイルの表示のみとなります

---

## 仕組み

```
データセットの構造 (1,342 rows)
  ├─ id                     例: scenario:asset_13ERkWLBHdsJ2bNxNp5k6jw7
  ├─ model                  例: model_meshy-img23d
  ├─ workflow               例: image-to-3d / image-to-splat
  ├─ formats                例: glb (または "blend, glb" のような複数値)
  ├─ prompt                 生成プロンプト(ない場合もある)
  ├─ inputs / input_files   生成元の入力画像 (PNG/JPG)
  ├─ outputs                出力ファイル情報 (path / format / sha256 / role)
  └─ preview_file           サムネイル (preview.jpg) のパス
```

キーポイント

- **サムネイル**: `preview_file.path` から署名不要の直接 URL( `https://huggingface.co/datasets/scenario-labs/3d-collection/resolve/main/{path}` )を構築(レスポンスは CORS 許可済み `Access-Control-Allow-Origin: *` の確認済み)
- **ワンクリック DL**: resolve URL に `?download=true` を付けると `Content-Disposition: attachment` が返るため、ブラウザの既定挙動で即保存される
- **事前インデックス**: 全メタデータを `data/index.js`(classic script)として静的持ちすることで、実行時の API 障害に影響されず高速に動作する

## ライセンス

データセット自体は **CC-BY-4.0** です(各レコードに `license` 列あり)。利用時はそのライセンス上の条件(出典表示など)を遵守してください。
