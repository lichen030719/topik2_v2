# 新韓檢字彙 TOPIK II 單字卡

TOPIK II 中高級 60天單字學習網頁，支援滑卡記憶、複習池、考前小叮嚀。

## 📁 專案結構

```
topik2-vocab/
├── index.html              # 主頁面
├── css/
│   └── style.css           # 所有樣式
├── js/
│   └── app.js              # 應用邏輯
├── data/
│   ├── index.json          # 章節總覽（必須）
│   ├── part01/
│   │   ├── day01.json
│   │   ├── day02.json
│   │   └── ...
│   ├── part02/
│   │   └── ...
│   └── ... (part01–part12)
└── README.md
```

## 📝 JSON 格式

### data/index.json
每個 Part 的基本資訊清單（不含單字內容）：
```json
[
  {
    "part": 1,
    "partName": "광고·도표",
    "partNameZh": "廣告·圖表",
    "days": [1, 2, 3, 4, 5],
    "folder": "part01"
  }
]
```

### data/partXX/dayYY.json
每天的單字與考前小叮嚀：
```json
{
  "day": 1,
  "words": [
    {
      "id": "001",
      "korean": "경우",
      "pronunciation": null,
      "pos": "명",
      "meanings": [
        {
          "chinese": "情況",
          "exampleKr": "학생들이 많을 경우 반을 두 개로 나누려고 한다.",
          "exampleZh": "學生很多的情況，打算要分兩個班。"
        },
        {
          "chinese": "場合",
          "exampleKr": "공식적인 경우에는 정장을 입어야 한다.",
          "exampleZh": "在正式場合必須穿正裝。"
        }
      ]
    }
  ],
  "tip": {
    "title": "-적",
    "titleZh": "-的、-上、-性（質）的",
    "description": "接在名詞的後面，表示該名詞的性質",
    "table": [
      { "kr": "개인적", "zh": "個人的" },
      { "kr": "기본적", "zh": "基本上" }
    ]
  }
}
```

### 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 三位數字串，如 `"001"` |
| `korean` | string | ✅ | 韓文單字 |
| `pronunciation` | string\|null | | 發音標示，無則填 `null` |
| `pos` | string | ✅ | 詞性：`명`、`동`、`형`、`부`、`관` |
| `meanings` | array | ✅ | 一或多個意思（含例句） |
| `tip.table` | array | ✅ | 每格含 `kr` + `zh`，每列3組排列 |

## 🚀 部署到 GitHub Pages

1. 建立 GitHub Repository（Public）
2. 上傳所有檔案
3. 前往 `Settings → Pages → Branch: main → Save`
4. 網址：`https://你的帳號.github.io/topik2-vocab/`

> ⚠️ **注意**：必須透過 HTTP 伺服器開啟（GitHub Pages 或本機 Live Server），
> 直接雙擊 `index.html` 無法載入 JSON（CORS 限制）。

## 功能說明

| 功能 | 說明 |
|------|------|
| 🃏 滑卡 | 左滑 = 不會（加入複習池）、右滑 = 我會了 |
| 🔄 翻牌 | 點卡片查看詞性、中文意思、例句 |
| 💡 考前小叮嚀 | 獨立頁面，三欄韓中對照表 |
| 📋 單字總覽 | 顯示每個單字的學習狀態 |
| 🔁 複習池 | 當天 / 全部複習池，支援複習滑卡 |
| 💾 持久保存 | 所有學習進度存於 localStorage |
