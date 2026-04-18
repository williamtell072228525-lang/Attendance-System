
/**
Copyright (C) 2025 0J (Lin Jie / 0rigin1856)

This file is part of 0riginAttendance-System.

0riginAttendance-System is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or
(at your option) any later version.

0riginAttendance-System is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with 0riginAttendance-System. If not, see <https://www.gnu.org/licenses/>.
Please credit "0J (Lin Jie / 0rigin1856)" when redistributing or modifying this project.
 */
// ===================================
// #region 1. 月曆
// ===================================

// 渲染日曆的函式
async function renderCalendar(date, isrefresh = false) {
    const monthTitle = document.getElementById('month-title');
    const calendarGrid = document.getElementById('calendar-grid');
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();

    // 生成 monthKey
    const monthkey = currentMonthDate.getFullYear() + "-" + String(currentMonthDate.getMonth() + 1).padStart(2, "0");

    // 檢查快取中是否已有該月份資料
    if (monthDataCache[monthkey] && !isrefresh) {
        // 如果有，直接從快取讀取資料並渲染
        const records = monthDataCache[monthkey];
        renderCalendarWithData(year, month, today, records, calendarGrid, monthTitle);
    } else {
        // 如果沒有，才發送 API 請求
        // 清空日曆，顯示載入狀態，並確保置中
        calendarGrid.innerHTML = '<div data-i18n="LOADING" class="col-span-full text-center text-gray-500 py-4">正在載入...</div>';
        renderTranslations(calendarGrid);
        try {
            //const res = await callApifetch(`getAttendanceDetails&month=${monthkey}&userId=${userId}`);
            const res = await callApifetch({
                action: 'getAttendanceDetails',
                month: monthkey,
                userId: userId
            })
            if (res.ok) {
                // 將資料存入快取，支援兩種回傳結構
                const records = Array.isArray(res.records)
                    ? res.records
                    : (res.records && Array.isArray(res.records.dailyStatus) ? res.records.dailyStatus : []);
                monthDataCache[monthkey] = records;

                // 收到資料後，清空載入訊息
                calendarGrid.innerHTML = '';

                renderCalendarWithData(year, month, today, records, calendarGrid, monthTitle);
            } else {
                console.error("Failed to fetch attendance records:", res.msg);
                showNotification(t("ERROR_FETCH_RECORDS"), "error");
            }
        } catch (err) {
            console.error(err);
        }
    }
}

// 新增一個獨立的渲染函式，以便從快取或 API 回應中調用
function renderCalendarWithData(year, month, today, records, calendarGrid, monthTitle, isForAdmin = false) {
    // 確保日曆網格在每次渲染前被清空
    calendarGrid.innerHTML = '';
    monthTitle.textContent = t("MONTH_YEAR_TEMPLATE", {
        year: year,
        month: month + 1
    });

    // 移除舊的累計時數行
    const existingTotalRows = calendarGrid.parentNode.querySelectorAll('.total-hours-row');
    existingTotalRows.forEach(row => row.remove());

    // 計算本月累計時數
    const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    let totalHours = 0;
    records.forEach(r => {
        if (r.date.startsWith(currentMonthKey)) {
            totalHours += parseFloat(r.hours || 0);
        }
    });
    totalHours = totalHours.toFixed(2);

    // 取得該月第一天是星期幾
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 填補月初的空白格子
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell';
        calendarGrid.appendChild(emptyCell);
    }

    // 根據資料渲染每一天的顏色
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        const cellDate = new Date(year, month, i);
        dayCell.textContent = i;
        let dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let dateClass = 'normal-day';

        const todayRecords = records.filter(r => r.date === dateKey);
        const isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate());
        // 初始化假日判斷，預設為 false
        let isHoliday = false;

        if (todayRecords.length > 0) {
            const record = todayRecords[0];
            const reason = record.reason;

            // 🌟 新增：取得假日狀態 🌟
            // 假設 isHoliday 來自 checkAttendance 處理後的 dailyStatus 結構
            isHoliday = record.isHoliday || false;

            // 設定背景顏色 (根據打卡狀態)
            if (reason === '正常') {
                dateClass = 'normal-day';
            } else if (reason === '請假') {
                dateClass = 'day-off';
            } else if (reason === '補卡通過') {
                dateClass = 'approved-virtual';
            } else if (reason === '有補卡(審核中)') {
                dateClass = 'pending-virtual';
            } else if (reason && reason !== '') {
                dateClass = 'abnormal-day';
            }
        } else if (cellDate < today || isToday) {
            // 如果該日期已過去或是今天，但沒有打卡紀錄，標記為異常
            dateClass = 'abnormal-day';
        }
        if (isHoliday) {
            // 由於是假日，將日期文字設為紅色 (需在 CSS 中定義 .holiday-text)
            dayCell.classList.add('holiday-text');
        }

        if (isToday) {
            dayCell.classList.add('today');
        }
        if (cellDate > today) {
            dayCell.classList.add('future-day');
            dayCell.style.pointerEvents = 'none'; // 未來日期不可點擊
        } else {
            dayCell.classList.add(dateClass);
        }

        dayCell.classList.add('day-cell');
        dayCell.dataset.date = dateKey;
        dayCell.dataset.records = JSON.stringify(todayRecords); // 儲存當天資料

        // 🌟 關鍵：新增點擊事件監聽器 🌟
        dayCell.addEventListener('click', function () {
            // 排除未來日期
            if (cellDate > today) return;

            // 判斷是否為管理員日曆
            if (isForAdmin && adminSelectedUserId) {
                // 如果是管理員日曆，呼叫管理員專用的紀錄渲染函式
                renderAdminDailyRecords(this.dataset.date, adminSelectedUserId);
            } else if (!isForAdmin) {
                // 如果是員工自己的日曆，呼叫員工專用的紀錄渲染函式
                renderDailyRecords(this.dataset.date);
            }
        });

        calendarGrid.appendChild(dayCell);
    }

    // 填補月末的空白格子，使日曆填滿完整的行數
    const cellsAdded = firstDayOfMonth + daysInMonth;
    const rowsNeeded = Math.ceil(cellsAdded / 7);
    const totalCells = rowsNeeded * 7;
    const remainingCells = totalCells - cellsAdded;

    for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendarGrid.appendChild(emptyCell);
    }

    // 在日曆最下面一行顯示本月累計時數（作為獨立的全寬行）
    const totalRow = document.createElement('div');
    totalRow.className = 'total-hours-row mt-2 p-2 bg-gray-100 dark:bg-gray-700 text-center rounded-lg';
    totalRow.innerHTML = `
        <span data-i18n="MONTH_TOTAL_HOURS_PREFIX">本月累計時數：</span>
        ${totalHours} 小時
    `;
    calendarGrid.parentNode.appendChild(totalRow);
    renderTranslations(totalRow); // 如果有翻譯需求，渲染翻譯
}

// 新增：渲染每日紀錄的函式 (修正非同步問題)
async function renderDailyRecords(dateKey) {
    const dailyRecordsCard = document.getElementById('daily-records-card');
    const dailyRecordsTitle = document.getElementById('daily-records-title');
    const dailyRecordsList = document.getElementById('daily-records-list');
    const dailyRecordsEmpty = document.getElementById('daily-records-empty');
    const recordsLoading = document.getElementById("records-loading");

    dailyRecordsTitle.textContent = t("DAILY_RECORDS_TITLE", {
        dateKey: dateKey
    });

    dailyRecordsList.innerHTML = '';
    dailyRecordsEmpty.style.display = 'none';
    recordsLoading.style.display = 'block';

    const dateObject = new Date(dateKey);
    const month = dateObject.getFullYear() + "-" + String(dateObject.getMonth() + 1).padStart(2, "0");
    const userId = localStorage.getItem("sessionUserId");

    // 檢查快取
    if (monthDataCache[month] && Array.isArray(monthDataCache[month])) {
        renderRecords(monthDataCache[month]);
        recordsLoading.style.display = 'none';
    } else {
        // 否則從 API 取得資料
        try {
            //const res = await callApifetch(`getAttendanceDetails&month=${month}&userId=${userId}`);
            const res = await callApifetch({
                action: 'getAttendanceDetails',
                month: month,
                userId: userId
            })
            recordsLoading.style.display = 'none';
            if (res.ok) {
                // 檢查回應資料是否有效
                let recordsData = null;
                if (res.records) {
                    if (Array.isArray(res.records)) {
                        recordsData = res.records;
                    } else if (res.records.dailyStatus && Array.isArray(res.records.dailyStatus)) {
                        recordsData = res.records.dailyStatus;
                    }
                }
                if (recordsData) {
                    // 將資料存入快取
                    console.log(recordsData);
                    monthDataCache[month] = recordsData;
                    renderRecords(recordsData);
                } else {
                    console.error("Invalid API response data:", res.records);
                    showNotification(t("ERROR_FETCH_RECORDS"), "error");
                }
            } else {
                console.error("Failed to fetch attendance records:", res.msg);
                showNotification(t("ERROR_FETCH_RECORDS"), "error");
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * 渲染指定月份的出席記錄，過濾出所選日期的紀錄，並在畫面上顯示。
     * 每個打卡記錄獨立渲染成一張卡片，上班與下班使用不同顏色。
     * 系統判斷與當日工作時數顯示在卡片列表外部。
     * @param {Array} records - 出席記錄陣列，每個元素包含 date, record, reason, hours 等資訊。
     */
    function renderRecords(records) {
        // 檢查 records 是否為有效陣列
        if (!records || !Array.isArray(records)) {
            console.error("Invalid records data:", records);
            dailyRecordsEmpty.style.display = 'block';
            dailyRecordsCard.style.display = 'block';
            return;
        }

        // 從該月份的所有紀錄中，過濾出所選日期的紀錄
        const dailyRecords = records.filter(record => {
            return record.date === dateKey;
        });

        // 清空現有列表
        dailyRecordsList.innerHTML = '';

        // 移除舊的 externalInfo（假設 className 為 'daily-summary' 以便識別）
        const existingSummaries = dailyRecordsList.parentNode.querySelectorAll('.daily-summary');
        existingSummaries.forEach(summary => summary.remove());

        if (dailyRecords.length > 0) {
            dailyRecordsEmpty.style.display = 'none';

            // 假設 dailyRecords 通常只有一個（單一日期），但以 forEach 處理可能多個
            dailyRecords.forEach(dailyRecord => {
                // 為每個打卡記錄創建獨立卡片
                dailyRecord.record.forEach(r => {
                    const li = document.createElement('li');
                    li.className = 'p-3 rounded-lg';

                    // 根據 type 設定不同顏色
                    if (r.type === '上班') {
                        li.classList.add('bg-blue-50', 'dark:bg-blue-700'); // 上班顏色（藍色系）
                    } else if (r.type === '下班') {
                        li.classList.add('bg-green-50', 'dark:bg-green-700'); // 下班顏色（綠色系）
                    } else {
                        li.classList.add('bg-gray-50', 'dark:bg-gray-700'); // 其他類型（灰色系）
                    }

                    // 根據 r.type 的值來選擇正確的label
                    const typeLabel = r.type === '上班'
                        ? t('PUNCH_IN')
                        : r.type === '下班'
                            ? t('PUNCH_OUT')
                            : r.type;

                    // 產生單一打卡記錄的 HTML
                    li.innerHTML = `
                    <p class="font-medium text-gray-800 dark:text-white">${r.time} - ${typeLabel}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${r.location}</p>
                    <p data-i18n="RECORD_NOTE_PREFIX" class="text-sm text-gray-500 dark:text-gray-400">備註：${r.note}</p>
                `;

                    dailyRecordsList.appendChild(li);
                    renderTranslations(li);  // 渲染翻譯
                });

                // 在卡片列表外部顯示系統判斷與時數
                const externalInfo = document.createElement('div');
                externalInfo.className = 'daily-summary mt-4 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg';

                let hoursHtml = '';
                if (dailyRecord.hours > 0) {
                    hoursHtml = `
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        <span data-i18n="RECORD_HOURS_PREFIX">當日工作時數：</span>
                        ${dailyRecord.hours} 小時
                    </p>
                `;
                }

                externalInfo.innerHTML = `
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    <span data-i18n="RECORD_REASON_PREFIX">系統判斷：</span>
                    ${t(dailyRecord.reason)}
                </p>
                ${hoursHtml}
            `;

                // append 到 dailyRecordsList 後面
                dailyRecordsList.parentNode.appendChild(externalInfo);
                renderTranslations(externalInfo);  // 渲染翻譯
            });
        } else {
            dailyRecordsEmpty.style.display = 'block';
        }
        dailyRecordsCard.style.display = 'block';
    }
}

// #endregion
// ===================================

// UI切換邏輯
const switchTab = (tabId) => {
    const tabs = ['dashboard-view', 'monthly-view', 'location-view', 'Form-view', 'admin-view'];
    const btns = ['tab-dashboard-btn', 'tab-monthly-btn', 'tab-location-btn', 'tab-Form-btn', 'tab-admin-btn'];

    // 1. 移除舊的 active 類別和 CSS 屬性
    tabs.forEach(id => {
        const tabElement = document.getElementById(id);
        tabElement.style.display = 'none'; // 隱藏內容
        tabElement.classList.remove('active'); // 移除 active 類別
    });

    // 2. 移除按鈕的選中狀態
    btns.forEach(id => {
        const btnElement = document.getElementById(id);
        btnElement.classList.replace('bg-indigo-600', 'bg-gray-200');
        btnElement.classList.replace('text-white', 'text-gray-600');
    });

    // 3. 顯示新頁籤並新增 active 類別
    const newTabElement = document.getElementById(tabId);
    newTabElement.style.display = 'block'; // 顯示內容
    newTabElement.classList.add('active'); // 新增 active 類別

    // 4. 設定新頁籤按鈕的選中狀態
    const newBtnElement = document.getElementById(`tab-${tabId.replace('-view', '-btn')}`);
    newBtnElement.classList.replace('bg-gray-200', 'bg-indigo-600');
    newBtnElement.classList.replace('text-gray-600', 'text-white');

    // 5. 根據頁籤 ID 執行特定動作
    if (tabId === 'monthly-view') {
        renderCalendar(currentMonthDate);
    } else if (tabId === 'location-view' || tabId === 'dashboard-view') {
        initLocationMap(); // <-- 這行保持不變
    } else if (tabId === 'admin-view') {
        fetchAndRenderReviewRequests();
    }
};

function generalButtonState(button, state, loadingText = '處理中...') {
    if (!button) return;
    const loadingClasses = 'opacity-50 cursor-not-allowed';

    if (state === 'processing') {
        // --- 進入處理中狀態 ---

        // 1. 儲存原始文本 (用於恢復)
        button.dataset.originalText = button.textContent;

        // 2. 儲存原始類別 (用於恢復樣式)
        // 這是為了在恢復時移除我們為了禁用而添加的類別
        button.dataset.loadingClasses = 'opacity-50 cursor-not-allowed';

        // 3. 禁用並設置處理中文字
        button.disabled = true;
        button.textContent = loadingText; // 使用傳入的 loadingText

        // 4. 添加視覺反饋 (禁用時的樣式)
        button.classList.add(...loadingClasses.split(' '));

        // 可選：移除 hover 效果，防止滑鼠移動時顏色變化
        // 假設您的按鈕有 hover:opacity-100 之類的類別，這裡需要調整

    } else {
        // --- 恢復到原始狀態 ---

        // 1. 移除視覺反饋
        if (button.dataset.loadingClasses) {
            button.classList.remove(...button.dataset.loadingClasses.split(' '));
        }

        // 2. 恢復禁用狀態
        button.disabled = false;

        // 3. 恢復原始文本
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText; // 清除儲存，讓它在下一次點擊時再次儲存
        }
    }
}