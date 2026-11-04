# Personal Studio — 個人網站

獨立於 Control Room 的對外網站。內容和版面分開：**改內容只要改 `public/content/`，push 到 GitHub 就會自動部署。**
Control Room／GPO 仍是私人工作系統，本站不讀取任何私人 JSON 或自然語料。

## 改內容

| 檔案 | 內容 |
| --- | --- |
| `public/content/ideas.json` | 想法圖：視角、想法（status: observe / research / prototype / published）、成果，以及它們之間的關係。只畫這裡明寫的關係。 |
| `public/content/cases.json` | 案例：問題、方法、證據、流程、限制、連結。`featured: true` 會出現在首頁。 |
| `public/content/writing.json` | 札記清單。`file` 填 `xxx.md` 並把文章放在 `public/content/writing/xxx.md`；`null` 會顯示「撰寫中」。 |

札記支援簡單 Markdown：`## 標題`、段落、`> 引用`、`- 清單`、`**粗體**`、`[連結](https://...)`。

## 結構

- `public/index.html` 首頁（想法圖＋精選案例＋想法日誌）
- `public/work/`、`public/work/view/?id=` 案例列表與詳細頁
- `public/writing/`、`public/writing/view/?id=` 札記
- `public/about/` 關於與合作
- `public/assets/` 共用樣式、頁首頁尾、想法圖；`particles.js` 移植自 control-room `royal-particles.js`

## 本機預覽

```bash
npx wrangler dev --port 8788
```

## 部署

push 到 `main` 由 Cloudflare Workers Builds 自動部署（worker：`personal-studio`）。手動部署：`npx wrangler deploy`。
