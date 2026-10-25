# 🧊 3D Collection Browser

[English](README.md) | [日本語 (Japanese)](README_ja.md)

A local web viewer for the [Hugging Face dataset **scenario-labs/3d-collection**](https://huggingface.co/datasets/scenario-labs/3d-collection) (1,342 3D assets), letting you browse assets with thumbnails and download them with one click.

- No server or build step required — just open `index.html` in a browser and it works
- All data fetching happens entirely in the browser (no data is sent externally)

## Publishing (GitHub Pages)

Since the site is fully static, you can publish it for free with GitHub Pages.

1. Create a repository on GitHub (a public repository under `owner/<name>`)
2. Register it as a remote and push:

   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. Enable Pages in the GitHub settings:
   - **Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `/(root)`** → Save
   - After 1–2 minutes the site will be live at `https://<username>.github.io/<repo-name>/`

Notes:

- Only `index.html` and `data/index.js` (plus the README) are needed for publishing. `3d_data/` (local blend files) is already excluded by `.gitignore`
- Assets (models / thumbnails) are fetched directly from the Hugging Face CDN by each user's browser, so no heavy data is hosted
- When the dataset updates, run `node build_index.mjs` locally again → commit the updated `data/index.js` and push to reflect the changes

---

## File structure

| File | Description |
|---|---|
| `index.html` | The gallery site itself (single file, vanilla JS, no dependencies) |
| `build_index.mjs` | Metadata generation script (Node.js 18+, no packages) |
| `data/index.js` | Generated: a static index of metadata for all records |

## Usage

### 1. One-time only: generate the index

```bash
node build_index.mjs
```

- Fetches all 1,342 records with paging from the official HF datasets-server rows API (approx. 1 minute)
- Automatically retries rate limits (429/5xx) with exponential backoff
- Output is written to `data/index.js` in the `window.DATA = [...]` format
- If the dataset updates, simply re-run this command to re-sync

### 2. Open in a browser

```bash
# Pattern A: start a local static server (run inside the site folder)
python3 -m http.server 8765
# → open http://localhost:8765

# Pattern B: open the file directly (index.js is a classic script, so file:// works too)
xdg-open index.html
```

> **Tip**: If you see `OSError: [Errno 98] Address already in use`,
> port 8765 is already in use by another process.
> - Identify the process with `ss -tlnp | grep 8765` and stop it
> - Or use another port (e.g. `python3 -m http.server 9000`)
> - Note that `python3 -m http.server` (without a port) defaults to port 8000,
>   in which case open **http://localhost:8000**

---

## Features

### Gallery

- **Card grid with thumbnails**
  - Images are lazy-loaded and drawn in chunks of 120 (scroll down to load more)
  - Cards display `asset_id`, the generation model name, the prompt, and a format badge
- **Filters**
  - Drop-downs for model (52 types: Meshy / Tripo / TRELLIS / Rodin / Direct3D / SAM-3D / SPARC3D, etc.), workflow (image-to-3d / image-to-splat), and format (glb / spz / fbx / ply / vox / blend)
  - Keyword search over prompts and asset IDs
  - "Select all shown", "Deselect all", and "Clear filters" buttons

### 3D Preview (glb / gltf / ply)

- **Click a thumbnail to preview the 3D model in place**
  - Records with `glb` / `gltf` / `ply` outputs (over 1,300) show a "👁 3D Preview" badge on the thumbnail; clicking opens the model in a full-screen 3D viewer
  - Controls: **drag = rotate / right- or middle-drag = pan / wheel = zoom / double-click = reset to the initial view**, `Esc` or "✕ Close" to exit
  - Models are auto-fitted to the camera based on the bounding box, with a ground grid displayed
  - PBR materials supported (RoomEnvironment-based ambient lighting + tone mapping); **DRACO-compressed glb** files also supported
  - Loading shows a progress bar; errors display the reason on failure
  - `ply` files render as faces if the mesh has face data, or as a point cloud if not
- For unsupported formats (`spz` / `fbx` / `vox` / `blend`), which can't be rendered directly in the browser, clicking a thumbnail keeps the previous select-toggle behavior

### Download

- **Individual download**: the "⬇ Download" button on each card
  - Fetches via `fetch → Blob` and saves with a friendly name like `asset_<id>.glb` (using the official resolve URL with `?download=true`)
  - If fetching fails due to CORS restrictions or network errors, automatically falls back to the browser's default direct-link save behavior
- **Batch download**: select records with checkboxes and click "⬇ Download selected"
  - Downloads one at a time in sequence, showing progress (`3 / 10: asset_xxx.glb — 52.1 MB received…`)
  - A "Stop" button halts the batch mid-way (`AbortController` used)
- **Multiple output files supported**
  - Records with multiple outputs, such as glb + native.blend (158 records), show links to the extra formats (`.blend too`) on the card

### Notes

- On batch download, Chrome shows the "Allow downloading multiple files?" dialog the first time. Once allowed, subsequent batches run smoothly
- In Firefox, programmatic consecutive downloads can be blocked by the popup blocker. If so, enable download permission for this site (origin) in the settings
- **`.blend` files are a format that can embed Python scripts in Blender. Blender's equivalent of `Automatically Run Python Scripts` is disabled by default and safe as-is, but do not enable it carelessly**
- Thumbnails / source data are all fetched directly from the official Hugging Face CDN, so the first page load requires network access (only the metadata is kept locally)
- Some formats such as `spz` (Gaussian Splat format) cannot be previewed directly in the browser; for those only the thumbnail display is available

---

## How it works

```
Dataset structure (1,342 rows)
  ├─ id                     e.g. scenario:asset_13ERkWLBHdsJ2bNxNp5k6jw7
  ├─ model                  e.g. model_meshy-img23d
  ├─ workflow               e.g. image-to-3d / image-to-splat
  ├─ formats                e.g. glb (or multiple values such as "blend, glb")
  ├─ prompt                 the generation prompt (may be absent)
  ├─ inputs / input_files   input images used for generation (PNG/JPG)
  ├─ outputs                output file info (path / format / sha256 / role)
  └─ preview_file           path to the thumbnail (preview.jpg)
```

Key points

- **Thumbnails**: a direct, signature-free URL is built from `preview_file.path` (`https://huggingface.co/datasets/scenario-labs/3d-collection/resolve/main/{path}`) — the response is already CORS-permissive (`Access-Control-Allow-Origin: *`, verified)
- **One-click download**: adding `?download=true` to the resolve URL returns `Content-Disposition: attachment`, so the browser's default behavior saves the file immediately
- **Pre-built index**: all metadata is statically stored in `data/index.js` (a classic script), giving fast operation unaffected by runtime API failures

## License

- **Code** (`index.html` / `build_index.mjs`, etc.): [MIT License](LICENSE)
- **`data/index.js`**: a derivative of [scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection) (CC-BY-4.0). When using the data or the assets obtained, please comply with the CC-BY-4.0 terms (attribution, etc.)
- **Three.js**: MIT License (loaded via CDN)

---

## Acknowledgments

This tool depends on the following. Many thanks to both.

- [scenario-labs/3d-collection](https://huggingface.co/datasets/scenario-labs/3d-collection) — the public dataset
- [Three.js](https://github.com/mrdoob/three.js) — the 3D viewer implementation
