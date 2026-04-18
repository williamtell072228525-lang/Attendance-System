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
// js/punch.js
// 依賴: state.js (全域變數), core.js (API/翻譯/通知), ui.js (generalButtonState)
// ===================================

// ===================================
// #region 1. 核心打卡邏輯
// ===================================

async function doPunch(type) {
    const punchButtonId = type === '上班' ? 'punch-in-btn' : 'punch-out-btn';

    // 🌟 修正點：使用全域變數，而非 document.getElementById 🌟
    // punchInBtn 和 punchOutBtn 已在 state.js 宣告並在 app.js 中賦值
    const button = (punchButtonId === 'punch-in-btn' ? punchInBtn : punchOutBtn);
    const loadingText = t('LOADING') || '處理中...';

    if (!button) return;

    // A. 進入處理中狀態 (generalButtonState 來自 ui.js)
    generalButtonState(button, 'processing', loadingText);

    if (!navigator.geolocation) {
        showNotification(t("ERROR_GEOLOCATION", { msg: "您的瀏覽器不支援地理位置功能。" }), "error");
        generalButtonState(button, 'idle');
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        // --- 定位成功：執行 API 請求 ---
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
            const res = await callApifetch({ // callApifetch 來自 core.js
                action: 'punch',
                type: type,
                lat: lat,
                lng: lng,
                note: navigator.userAgent
            });
            const msg = t(res.code || "UNKNOWN_ERROR", res.params || {});
            showNotification(msg, res.ok ? "success" : "error"); // showNotification 來自 core.js

            // D. 退出點 2: API 成功後
            generalButtonState(button, 'idle');

            // 💡 建議：打卡成功後檢查當日異常紀錄
            if (res.ok) {
                checkAbnormal(); // 檢查異常紀錄
            }

        } catch (err) {
            console.error(err);
            generalButtonState(button, 'idle');
        }

    }, (err) => {
        // --- 定位失敗：處理權限錯誤等 ---
        showNotification(t("ERROR_GEOLOCATION", { msg: err.message }), "error");
        generalButtonState(button, 'idle');
    });
}
// #endregion

// ===================================
// #region 2. 自動打卡
// ===================================

/**
 * 檢查 URL 參數，若有 ?action=punch 則自動觸發打卡。
 */
function checkAutoPunch() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    // 🌟 修正點：使用全域變數 🌟
    let targetButton = null;

    if (action === 'in' && punchInBtn) { // punchInBtn 來自 state.js
        targetButton = punchInBtn;
    } else if (action === 'out' && punchOutBtn) { // punchOutBtn 來自 state.js
        targetButton = punchOutBtn;
    }

    if (targetButton) {
        // sessionToken 是在 app.js 的登入流程中設置的，這裡直接檢查即可
        if (localStorage.getItem("sessionToken")) {
            showNotification(t("PUNCH_AUTO_TRIGGERED") || '正在自動打卡...', "info");

            setTimeout(() => {
                // 觸發目標打卡按鈕的點擊事件
                targetButton.click();
                // 清除 URL 參數
                history.replaceState(null, '', window.location.pathname);
            }, 500);

        } else {
            showNotification(t("PUNCH_REQUIRE_LOGIN") || '請先登入才能自動打卡！', "warning");
        }
    }
}

async function handleLeaveRequest() {
    if (!leaveDateInput || !leaveSubmitBtn) return;

    const selectedDate = leaveDateInput.value;
    const reason = leaveReasonInput?.value?.trim() || "請假";
    const feedback = leaveFeedback;

    if (!selectedDate) {
        showNotification("請選擇請假日期", "error");
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (selected <= today) {
        showNotification("請假日期需為未來日期", "error");
        return;
    }

    leaveSubmitBtn.disabled = true;
    leaveSubmitBtn.textContent = "送出中...";
    if (feedback) feedback.textContent = "";

    try {
        const res = await callApifetch({
            action: 'markLeave',
            date: selectedDate,
            reason: reason
        });

        if (res.ok) {
            showNotification("請假已標記，等待系統更新。", "success");
            if (feedback) {
                feedback.textContent = `已標記 ${selectedDate} 為請假。`;
                feedback.className = "mt-3 text-sm text-green-600";
            }
            leaveReasonInput.value = "";
        } else {
            showNotification(res.msg || "請假標記失敗，請稍後再試。", "error");
            if (feedback) {
                feedback.textContent = res.msg || "請假標記失敗。";
                feedback.className = "mt-3 text-sm text-red-600";
            }
        }
    } catch (err) {
        console.error(err);
        showNotification("網路錯誤，請稍後再試。", "error");
        if (feedback) {
            feedback.textContent = "網路錯誤，請稍後再試。";
            feedback.className = "mt-3 text-sm text-red-600";
        }
    } finally {
        leaveSubmitBtn.disabled = false;
        leaveSubmitBtn.textContent = "標記請假";
    }
}
// #endregion

// ===================================
// #region 3. 異常紀錄檢查
// ===================================

async function checkAbnormal() {
    const now = new Date();
    const month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const userId = localStorage.getItem("sessionUserId");

    const recordsLoading = recordsLoadingEl;

    if (!recordsLoading) return;

    recordsLoading.style.display = 'block';

    try {
        // 檢查快取是否有資料，如果沒有則主動加載
        let calendarRecords = monthDataCache[month];

        if (!calendarRecords) {
            console.log("Month cache empty, fetching from API");
            const res = await callApifetch({
                action: 'getAttendanceDetails',
                month: month,
                userId: userId
            });

            if (res.ok) {
                calendarRecords = Array.isArray(res.records)
                    ? res.records
                    : (res.records && Array.isArray(res.records.dailyStatus) ? res.records.dailyStatus : []);
                monthDataCache[month] = calendarRecords;
            } else {
                console.error("Failed to fetch calendar records:", res.msg);
                calendarRecords = [];
            }
        }

        recordsLoading.style.display = 'none';

        // 計算當月所有日期（從第 1 天到今天）
        const year = parseInt(month.split('-')[0]);
        const monthNum = parseInt(month.split('-')[1]);
        const today = new Date();
        const lastDay = (monthNum === today.getMonth() + 1 && year === today.getFullYear())
            ? today.getDate()
            : new Date(year, monthNum, 0).getDate();

        // 建立已有記錄的日期集合
        const recordedDates = new Set();
        (calendarRecords || []).forEach(record => {
            recordedDates.add(record.date);
        });

        // 篩選出異常紀錄（包括有記錄但異常的，以及完全沒記錄的）
        const abnormalRecords = [];

        // 1. 先加入有記錄但異常的日期
        (calendarRecords || []).forEach(record => {
            if (record.reason && record.reason !== '正常' && record.reason !== '請假') {
                abnormalRecords.push(record);
            }
        });

        // 2. 再加入完全沒有記錄的日期（今天除外）
        for (let day = 1; day < lastDay; day++) {
            const dateStr = `${month}-${String(day).padStart(2, '0')}`;
            if (!recordedDates.has(dateStr)) {
                abnormalRecords.push({
                    date: dateStr,
                    reason: '未打上班卡, 未打下班卡',
                    id: `missing-${day}`
                });
            }
        }

        // 按日期排序
        abnormalRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

        const abnormalRecordsSection = abnormalRecordsSectionEl;
        const abnormalList = abnormalListEl;
        const recordsEmpty = recordsEmptyEl;

        console.log("Abnormal records found:", abnormalRecords.length);

        if (abnormalRecords.length > 0) {
            abnormalRecordsSection.style.display = 'block';
            recordsEmpty.style.display = 'none';
            abnormalList.innerHTML = '';
            abnormalRecords.forEach(record => {
                console.log("Abnormal Record:", record.reason);
                const li = document.createElement('li');
                li.className = 'p-3 bg-gray-50 rounded-lg flex justify-between items-center dark:bg-gray-700';
                li.innerHTML = `
                    <div>
                        <p class="font-medium text-gray-800 dark:text-white">${record.date}</p>
                        <p class="text-sm text-red-600 dark:text-red-400"
                           data-i18n-dynamic="true"
                           data-i18n-key="${record.reason}">
                       </p>
                    </div>
                    <button data-i18n="ADJUST_BUTTON_TEXT" data-date="${record.date}" data-reason="${record.reason}" 
                            class="adjust-btn text-sm font-semibold 
                                   text-indigo-600 dark:text-indigo-400 
                                   hover:text-indigo-800 dark:hover:text-indigo-300">
                        補打卡
                    </button>
                `;
                abnormalList.appendChild(li);
                renderTranslations(li);
            });

        } else {
            abnormalRecordsSection.style.display = 'block';
            recordsEmpty.style.display = 'block';
            abnormalList.innerHTML = '';
        }
    } catch (err) {
        console.error("checkAbnormal error:", err);
        if (recordsLoading) recordsLoading.style.display = 'none';
    }
}
// #endregion


// ===================================
// #region 4. 補打卡 UI 與 API 邏輯
// ===================================

function validateAdjustTime(value) {
    const selected = new Date(value);
    const now = new Date();
    // 這裡我們只檢查選取的時間是否在當前月份內且不晚於今天
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // 設置到今天最後一秒

    if (selected < monthStart) {
        showNotification(t("ERR_BEFORE_MONTH_START"), "error");
        return false;
    }
    // 不允許選今天以後
    if (selected > today) {
        showNotification(t("ERR_AFTER_TODAY"), "error");
        return false;
    }
    return true;
}

/**
 * 集中綁定所有與打卡、異常相關的事件
 * 供 app.js 的 bindEvents 呼叫
 */
function bindPunchEvents() {

    // 1. 處理補打卡表單 (點擊 '補打卡' 按鈕)
    // abnormalList 已在 state.js 宣告並在 app.js 中賦值
    if (abnormalList && adjustmentFormContainer) {
        abnormalList.addEventListener('click', (e) => {
            if (e.target.classList.contains('adjust-btn')) {
                const date = e.target.dataset.date;
                const reason = e.target.dataset.reason;
                const hideIn = reason.includes("STATUS_PUNCH_OUT_MISSING");  // 如果缺下班卡，則隱藏補上班卡
                const hideOut = reason.includes("STATUS_PUNCH_IN_MISSING"); // 如果缺上班卡，則隱藏補下班卡
                const formHtml = `
                    <div class="p-4 border-t border-gray-200 fade-in ">
                        <p data-i18n="ADJUST_BUTTON_TEXT" class="font-semibold mb-2">補打卡：<span class="text-indigo-600">${date}</span></p>
                        <div class="form-group mb-3">
                            <label for="adjustDateTime" data-i18n="SELECT_DATETIME_LABEL" class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">選擇日期與時間：</label>
                            <input id="adjustDateTime" 
                                type="datetime-local" 
                                class="w-full p-2 
                                        border border-gray-300 dark:border-gray-600 
                                        rounded-md shadow-sm 
                                        dark:bg-gray-700 dark:text-white
                                        focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button data-type="in" data-i18n="BTN_ADJUST_IN" 
                                    class="submit-adjust-btn w-full py-2 px-4 rounded-lg font-bold btn-secondary"
                                    style="display: ${hideIn ? 'none' : 'block'};"> // 🌟 關鍵修正 1
                                補上班卡
                            </button>
                            <button data-type="out" data-i18n="BTN_ADJUST_OUT" 
                                    class="submit-adjust-btn w-full py-2 px-4 rounded-lg font-bold btn-secondary"
                                    style="display: ${hideOut ? 'none' : 'block'};"> // 🌟 關鍵修正 2
                                補下班卡
                            </button>
                        </div>
                    </div>
                `;
                adjustmentFormContainer.innerHTML = formHtml;
                renderTranslations(adjustmentFormContainer); // 來自 core.js

                const adjustDateTimeInput = document.getElementById("adjustDateTime"); // 這裡使用 ID 獲取是正確的
                let defaultTime = "09:00";
                if (reason.includes("STATUS_PUNCH_OUT_MISSING")) {
                    defaultTime = "18:00";
                }
                adjustDateTimeInput.value = `${date}T${defaultTime}`;
            }
        });

        // 2. 處理補打卡表單的提交
        adjustmentFormContainer.addEventListener('click', async (e) => {
            const button = e.target.closest('.submit-adjust-btn');

            if (button) {
                const loadingText = t('LOADING') || '處理中...';

                // 這裡使用 ID 獲取是正確的
                const datetime = document.getElementById("adjustDateTime").value;
                const type = button.dataset.type;

                if (!datetime) {
                    showNotification("請選擇補打卡日期時間", "error");
                    return;
                }
                if (!validateAdjustTime(datetime)) return;

                // 步驟 A: 進入處理中狀態 (generalButtonState 來自 ui.js)
                generalButtonState(button, 'processing', loadingText);

                // ------------------ API 邏輯 ------------------
                const dateObj = new Date(datetime);
                const lat = 0; // 補卡不需精確 GPS 
                const lng = 0;

                try {
                    const res = await callApifetch({ // callApifetch 來自 core.js
                        action: 'adjustPunch',
                        type: type === 'in' ? "上班" : "下班",
                        lat: lat,
                        lng: lng,
                        datetime: dateObj.toISOString(),
                        note: encodeURIComponent(navigator.userAgent)
                    }, "loadingMsg");
                    const msg = t(res.code || "UNKNOWN_ERROR", res.params || {});
                    showNotification(msg, res.ok ? "success" : "error");

                    if (res.ok) {
                        adjustmentFormContainer.innerHTML = '';
                        checkAbnormal(); // 補打卡成功後，重新檢查異常紀錄
                    }

                } catch (err) {
                    console.error(err);
                    showNotification(t('NETWORK_ERROR') || '網絡錯誤', 'error');

                } finally {
                    // 恢復按鈕狀態，只有在表單容器沒有被清空時才需要（即請求失敗）
                    if (adjustmentFormContainer.innerHTML !== '') {
                        generalButtonState(button, 'idle');
                    }
                }
            }
        });
    }
}
// #endregion