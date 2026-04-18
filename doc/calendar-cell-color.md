# 月曆日期格子顏色定義

本文件說明目前專案中日曆格子的狀態顏色與條件對應，包含員工日曆與管理員員工月曆共用的 `renderCalendarWithData()` 邏輯。

## 顏色對應條件

日曆格子會根據 `record.reason` 的值設定不同 class：

- `normal-day`
  - 條件：`reason === '正常'`
  - 含義：該日打卡正常

- `day-off`
  - 條件：`reason === '請假'`
  - 含義：休假日、請假狀態

- `approved-virtual`
  - 條件：`reason === '補卡通過'`
  - 含義：補卡已核准

- `pending-virtual`
  - 條件：`reason === '有補卡(審核中)'`
  - 含義：補打卡待審核

- `abnormal-day`
  - 條件：`reason` 為非空值，且不屬於以下狀態：`正常`、`請假`、`補卡通過`、`有補卡(審核中)`
  - 含義：異常打卡或缺卡狀態
  - 備註：若該日也是今天，則會同時套用 `today` 與 `abnormal-day`

- `future-day`
  - 條件：日期大於今天
  - 含義：未來日期，不可點擊

- `today`
  - 條件：日期等於今天
  - 含義：目前日期

- `holiday-text`
  - 條件：`record.isHoliday` 為 truthy
  - 含義：額外標示假日，將日期文字變紅
  - 備註：屬於附加 class，可與其他狀態 class 同時出現（例如 `today`）

## API 回傳資料格式

在 `renderCalendar()` 中，當 API 回傳結構有兩種形式時，會做以下處理：

- 如果 `res.records` 是陣列，直接使用
- 否則若 `res.records.dailyStatus` 是陣列，則使用該欄位

最終傳給 `renderCalendarWithData()` 的 `records` 陣列，會包含每個日期的日常狀態物件。

## 主要 CSS 類別與顏色

### 亮色模式

- `.day-cell.normal-day`
  - 背景：`#f3f4f6`
  - 文字：`#1f2937`

- `.day-cell.abnormal-day`
  - 背景：`#fecaca`
  - 文字：`#ef4444`

- `.day-cell.pending-adjustment`
  - 背景：`#fde68a`
  - 文字：`#d97706`

- `.day-cell.pending-virtual`
  - 背景：`#e9d5ff`
  - 文字：`#9333ea`

- `.day-cell.approved-virtual`
  - 背景：`#bfdbfe`
  - 文字：`#2563eb`

- `.day-cell.day-off`
  - 背景：`#ccfbf1`
  - 文字：`#0d9488`

- `.day-cell.today`
  - 背景：`#86efac`
  - 文字：`#166534`
  - 字重：`bold`

- `.day-cell.future-day`
  - 背景：`#d1d5db`
  - 文字：`#4b5563`

- `.day-cell.holiday-text`
  - 文字：`red`
  - 字重：`underline`

### 暗黑模式

- `.day-cell.normal-day`
  - 背景：`#1f2937`
  - 文字：`#d1d5db`

- `.day-cell.abnormal-day`
  - 背景：`#991b1b`
  - 文字：`#fecaca`

- `.day-cell.pending-adjustment`
  - 背景：`#92400e`
  - 文字：`#fde68a`

- `.day-cell.pending-virtual`
  - 背景：`#581c87`
  - 文字：`#e9d5ff`

- `.day-cell.approved-virtual`
  - 背景：`#1e40af`
  - 文字：`#bfdbfe`

- `.day-cell.day-off`
  - 背景：`#065f46`
  - 文字：`#ccfbf1`

- `.day-cell.today`
  - 背景：`#15803d`
  - 文字：`#bbf7d0`

- `.day-cell.future-day`
  - 背景：`#374151`
  - 文字：`#9ca3af`

- `.day-cell.holiday-text`
  - 文字：`#ff0000`
  - 字重：`underline`

## 使用範圍

目前這套顏色定義同時適用於：

- 員工個人月曆
- 管理員查看員工月曆

兩者都使用 `renderCalendarWithData()` 來建立日曆格子，因此顏色定義一致。
