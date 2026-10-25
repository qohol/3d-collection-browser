# 🧊 3D Collection Browser

[English](README.md) | [日本語 (Japanese)](README_ja.md)

[Hugging Face データセット **scenario-labs/3d-collection**](https://huggingface.co/datasets/scenario-labs/3d-collection)(全 1,342 件の 3D アセット)を、サムネイル付きで確認しながらワンクリックでダウンロードできるローカル Web サイトです。

- サーバー・ビルド不要。`index.html` をブラウザで開くだけで動作します
- データの取得もすべてブラウザ側で完結(外部にデータを送信しません)

## 公開(GitHub Pages)

このサイトは完全に静的なので、GitHub Pages で無料公開できます。

1. GitHub 上でリポジトリを作成(owner/<名前>の Public リポジトリ)
2. ここをリモートに登録してプッシュ:

   ```bash
   git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

3. GitHub 上で設定を有効化
   - **Settings → Pages → Source:「Deploy from a branch」→ Branch:`main` / `/(root)`** → Save
   - 1〜2 分待つと `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます

補足:

- 公開に必要なのは `index.html` と `data/index.js`(と README)だけ。`3d_data/`(ローカルの blend)は `.gitignore` で除外済み
- アセット(モデル・サムネイル)はすべて各利用者のブラウザから Hugging Face CDN に直接取得されるため、ホスティングには重量データを置かない
- データセット更新時は手元で `node build_index.mjs` を再実行 → `data/index.js` をコミットして push すれば反映される

---

## ファイル構成

| ファイル | 内容 |
|---|---|
| `index.html` | ギャラリーサイト本体(単一ファイル・vanilla JS・依存ライブラリなし) |
| `build_index.mjs` | メタデータ生成スクリプト(Node.js 18+・依存パッケージなし) |
| `data/index.js` | 生成物:全レコードのメタデータの静的インデックス |

## 使い方

### 1. 最低 1 回だけ:インデックス生成

```bash
node build_index.mjs
```

- HF 公式の datasets-server rows API から全 1,342 件をページング取得します(約 1 分)
- レート制限 (429/5xx) には指数バックオフで自動リトライします
- 結果は `data/index.js` に `window.DATA = [...]` 形式で出力されます
- データセットが更新されたら、このコマンドを再実行するだけで再同期できます

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

### 3D プレビュー (glb / gltf / ply)

- **サムネイルクリックで 3D モデルをその場でプレビュー**
  - 出力に `glb` / `gltf` / `ply` を持つレコード(1,300 件以上)は、サムネイルに「👁 3D プレビュー」バッジが表示され、クリックするとフルスクリーンの 3D ビューアでモデルを開ける
  - 操作: **ドラッグ=回転 / 右・中ドラッグ=移動(パン) / ホイール=ズーム / ダブルクリック=初期視点に戻す**、`Esc` または「✕ 閉じる」で終了
  - モデルはバウンディングボックスに合わせてカメラ自動フィット + 地面グリッド表示
  - PBR マテリアル対応(RoomEnvironment による環境光 + トーンマッピング)、**DRACO 圧縮 glb** にも対応
  - 読み込みは進捗バーで表示、失敗時はエラー内容を表示
  - `ply` はメッシュなら面表示、面データのないポイントクラウドなら点群表示
- 対応外のフォーマット (`spz` / `fbx` / `vox` / `blend`) はブラウザで直接描画できないため、サムネイルクリックは従来どおりの選択トグル動作になります

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
- **`.blend` ファイルには Blender で Python スクリプトを埋め込める形式があります。Blender の `Automatically Run Python Scripts` に相当する設定はデフォルトで無効のためそのままの状態では安全ですが、無闇に有効化しないでください**
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

- **コード** (`index.html` / `build_index.mjs` 等): [MIT License](LICENSE)
- **`data/index.js`**: [scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection) (CC-BY-4.0) 由来の派生物。データおよび取得したアセットを利用する場合は CC-BY-4.0 の条件 (出典表示など) を遵守してください
- **Three.js**: MIT License(CDN 経由で読み込みます)

---

## 謝辞

このツールは以下に依存しています。両者に感謝します。

- [scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection) — 公開データセット
- [Three.js](https://github.com/mrdoob/three.js) — 3D ビューア実装
