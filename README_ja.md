# 🧊 3D Collection Browser

[English](README.md) | [日本語 (Japanese)](README_ja.md)

[Hugging Face データセット **scenario-labs/3d-collection**](https://huggingface.co/datasets/scenario-labs/3d-collection)(全 1,342 件の 3D アセット)を、サムネイル付きで確認しながらワンクリックでダウンロードできるローカル Web サイトです。

- サーバー・ビルド不要。`index.html` をブラウザで開くだけで動作します
- データの取得もすべてブラウザ側で完結(外部にデータを送信しません)

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

### 注意点・免責事項

- **生成元サービス・モデルのライセンス順守**: 本データセット内のアセットは各種 3D AI 生成サービス・モデル（Tripo、Meshy、TRELLIS、Rodin 等）により作成されています。取得したアセットの二次利用・商用利用・再配布等を行う際は、**データセット自体のライセンス（CC-BY-4.0）に加えて、必ず各生成元サービス・モデルの利用規約およびライセンス条件（商用利用可否、クレジット表記等）を確認・順守してください**。
- **データセットのクレジット表記**: アセットやデータを利用・公開する場合は、CC-BY-4.0 の条件に従い、原典（[scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection)）の適切な表記・帰属表示を行ってください。
- **Hugging Face CDN とレート制限**: サムネイルおよび 3D アセットはすべて Hugging Face 公式 CDN から直接取得されます。Hugging Face 側の仕様変更やネットワーク障害、一時的なアクセス集中（429エラー等）によって表示やダウンロードに影響が出る場合があります。
- **ネットワーク帯域とストレージ容量**: 3D アセット（大容量 GLB や `.blend` ファイル等）のサイズは非常に大きくなる場合があります。一括ダウンロード時はネットワーク帯域やローカルストレージの空き容量に十分ご注意ください。
- **ブラウザの挙動**: 一括 DL 時、Chrome では初回のみ「複数ファイルのダウンロードを許可しますか?」の確認ダイアログが出ます。Firefox ではポップアップブロックにより連続ダウンロードが妨げられることがあるため、設定からダウンロードの許可を行ってください。
- **`.blend` ファイルのセキュリティ**: `.blend` ファイルには Blender 上で Python スクリプトを埋め込める仕組みがあります。Blender の `Automatically Run Python Scripts` 設定はデフォルトで無効のため安全ですが、信頼できないファイルを読み込む際に不用意に有効化しないでください。
- **プレビュー非対応フォーマット**: `spz`(Gaussian Splat 形式)などはブラウザで直接プレビューできないため、サムネイル確認のみとなります。

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
- **`data/index.js` およびアセットデータ**: [scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection) (CC-BY-4.0) 由来の派生物。データおよび取得したアセットを利用する場合は、CC-BY-4.0 の条件 (出典表示など) に加え、生成元モデル/サービス (Tripo, Meshy 等) の利用条件も確認し遵守してください。
- **Three.js**: MIT License(CDN 経由で読み込みます)

---

## 謝辞

このツールは以下に依存しています。両者に感謝します。

- [scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection) — 公開データセット
- [Three.js](https://github.com/mrdoob/three.js) — 3D ビューア実装