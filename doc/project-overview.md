# 專案架構與狀態報告

## 專案概述

**專案名稱**: 0riginAttendance-System  
**版本**: 1.0.0  
**描述**: 這是一個開源的考勤管理系統，幫助小型團隊輕鬆管理出勤與工時，提供直覺化介面與模組化功能。系統基於 LINE Login 和 Google Apps Script，使用者可透過 LINE 帳號登入並使用手機 GPS 進行打卡。  
**授權**: GNU General Public License v2 (GPLv2)  
**作者**: 0J (Lin Jie / 0rigin1856)  
**倉庫**: https://github.com/0rigind1865-bit/Attendance-System

## 主要功能

- **LINE 帳號登入**: 透過 LINE Login 認證使用者身份。
- **GPS 定位打卡**: 利用瀏覽器地理位置 API 取得經緯度，進行上班與下班打卡。
- **補打卡功能**: 可手動選擇日期時間，補登過去的打卡紀錄。
- **異常紀錄檢視**: 自動檢查並標示異常打卡紀錄。
- **多國語系支援**: 依瀏覽器語言自動切換介面語系（繁體中文、日文、英文等）。

## 專案架構

專案採用模組化設計，主要分為前端網頁應用和後端 Google Apps Script 腳本。

### 根目錄結構

- **index.html**: 主頁面 HTML 文件。
- **style.css**: 自訂樣式文件。
- **tailwind.config.js**: Tailwind CSS 配置檔案。
- **package.json**: Node.js 專案配置，包含依賴和腳本。
- **package-lock.json**: 鎖定依賴版本。
- **README.md**: 專案說明文件。
- **LICENSE**: 授權文件。
- **.gitignore**: Git 忽略檔案列表。
- **0rigin.ico** 和 **0rigin.png**: 圖標檔案。
- **.git/**: Git 版本控制目錄。
- **.github/**: GitHub 配置目錄，包含 ISSUE_TEMPLATE/。
- **node_modules/**: Node.js 依賴模組。
- **dist/**: 建置輸出目錄，包含編譯後的 CSS 文件 (compiled.css)。

### 前端模組 (js/)

- **app.js**: 主應用程式邏輯。
- **admin.js**: 管理員功能。
- **config.js**: 配置設定。
- **core.js**: 核心功能。
- **location.js**: 地理位置處理。
- **punch.js**: 打卡功能。
- **state.js**: 狀態管理。
- **ui.js**: 使用者介面元件。

### 後端腳本 (GS/)

- **Main.gs**: 主入口腳本。
- **Constants.gs**: 常數定義。
- **DbOperations.gs**: 資料庫操作。
- **Handlers.gs**: 請求處理器。
- **LineApi.gs**: LINE API 整合。
- **Utils.gs**: 工具函數。

### 國際化 (i18n/)

- **en-US.json**: 英文翻譯。
- **id.json**: 印尼文翻譯。
- **ja.json**: 日文翻譯。
- **vi.json**: 越南文翻譯。
- **zh-TW.json**: 繁體中文翻譯。

## 技術棧

- **前端**: HTML, CSS (Tailwind CSS), JavaScript
- **後端**: Google Apps Script
- **認證**: LINE Login
- **資料儲存**: Google Sheets
- **定位**: 瀏覽器 Geolocation API
- **建置工具**: Tailwind CSS CLI

## 專案狀態

- **Git 狀態**: 工作目錄乾淨，無未提交變更。
- **錯誤檢查**: 無編譯或語法錯誤。
- **建置狀態**: Tailwind CSS 已編譯輸出至 dist/compiled.css。
- **測試**: 無測試腳本配置。

## 貢獻與使用

請參考 README.md 了解詳細使用說明和貢獻指引。系統支援多語系，可根據瀏覽器語言自動切換介面。

---

*報告生成日期: 2026年4月18日*