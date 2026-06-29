// --- VARIABEL GLOBAL ---
let elemenTampilan = document.getElementById("tampilanWaktu");
let waktuMenit = document.getElementById("menit");
let waktuDetik = document.getElementById("detik");
let hitungMenit = document.getElementById("totalWaktu");
let btnMain = document.getElementById("btnMain");

// Input Settings
let inputWorkTime = document.getElementById("inputWorkTime");
let inputRestTime = document.getElementById("inputRestTime");
let inputVolume = document.getElementById("inputVolume"); // Slider Volume

let refTampilan = null;
let beepBerulang = null;
let totalMenitFokus = 0; 

let targetWaktu = 0;
let sisaWaktuSimpan = 0;
let pesanGlobal = "";
let isPaused = false;
let isRunning = false; 
let isRinging = false; 
let currentMode = "WORK"; 

let currentSessionDuration = 0; 

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

if(Notification.permission !== "granted"){ Notification.requestPermission(); }

// --- FUNGSI AUDIO (UPDATED) ---
function beep(){
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Ambil nilai volume dari slider (0 - 100) lalu bagi 100 agar jadi 0.0 - 1.0
    let volumeLevel = inputVolume.value / 100;

    let oscillator = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    // Set Volume
    gainNode.gain.value = volumeLevel;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
}

// Event listener agar audio context aktif saat user geser volume
inputVolume.addEventListener('input', function() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
});

function actionMainButton() {
    if (isRinging) { resetTimer(); return; }
    if (!isRunning && !isPaused) { timer_Work(); } 
    else if (isRunning) { togglePause(); } 
    else if (isPaused) { togglePause(); }
}

function updateButtonUI() {
    if (isRinging) {
        btnMain.textContent = "STOP ALARM";
        btnMain.style.backgroundColor = "#ff6b6b"; btnMain.style.color = "#fff";
    } else if (isRunning) {
        btnMain.textContent = "Pause";
        btnMain.style.backgroundColor = "#ffcad4"; btnMain.style.color = "#5e503f";
    } else if (isPaused) {
        btnMain.textContent = "Resume";
        btnMain.style.backgroundColor = "#ffe599"; btnMain.style.color = "#5e503f";
    } else {
        btnMain.textContent = "Start Work";
        btnMain.style.backgroundColor = "#cae9ff"; btnMain.style.color = "#5e503f";
    }
}

function updateTampilan(){
    const sisaWaktuMs = targetWaktu - Date.now();
    sisaWaktuSimpan = sisaWaktuMs;
    if(sisaWaktuMs <= 0){ finishTimer(); return; }
    const sisaMenit = Math.floor(sisaWaktuMs / 60000);
    const sisaDetik = Math.floor((sisaWaktuMs % 60000) / 1000);
    waktuMenit.textContent = (sisaMenit < 10 ? "0" : "") + sisaMenit;
    waktuDetik.textContent = (sisaDetik < 10 ? "0" : "") + sisaDetik;
}

function finishTimer() {
    stopTimer(); 
    waktuMenit.textContent = "00"; waktuDetik.textContent = "00";
    isRunning = false; isPaused = false; isRinging = true; 
    
    if(currentMode === "WORK") {
        totalMenitFokus += currentSessionDuration; 
        hitungMenit.textContent = totalMenitFokus; 
        addHistory(currentSessionDuration * 60 * 1000);
    }
    
    if(Notification.permission === "granted"){ new Notification("Time is Up!", { body: pesanGlobal }); }
    beep(); 
    beepBerulang = setInterval(beep, 1000);
    updateButtonUI(); 
}

function mulaiTimer(menit, detik, pesan, mode){
    stopTimer(); 
    if (audioCtx.state === 'suspended') audioCtx.resume();
    elemenTampilan.innerHTML = `<span id="menit"></span>:<span id="detik"></span>`;
    waktuMenit = document.getElementById("menit"); waktuDetik = document.getElementById("detik");  
    
    pesanGlobal = pesan; 
    currentMode = mode;
    
    if(mode === "WORK") {
        currentSessionDuration = menit;
    }

    sisaWaktuSimpan = (menit * 60 * 1000) + (detik * 1000) + 999;
    isRunning = true; isPaused = false; isRinging = false; 
    jalankanInterval(); updateButtonUI(); 
}

function jalankanInterval(){
    targetWaktu = Date.now() + sisaWaktuSimpan;
    updateTampilan(); refTampilan = setInterval(updateTampilan, 1000);
}

function togglePause(){
    if(!isRunning && !isPaused) return; 
    if(isPaused){ isPaused = false; isRunning = true; jalankanInterval(); } 
    else { isPaused = true; isRunning = false; if(refTampilan) clearInterval(refTampilan); refTampilan = null; }
    updateButtonUI(); 
}

function stopTimer(){
    if(refTampilan) clearInterval(refTampilan);
    if(beepBerulang) clearInterval(beepBerulang);
    refTampilan = null; beepBerulang = null;
}

function resetTimer(){
    stopTimer(); 
    isRunning = false; isPaused = false; isRinging = false; 
    
    let workVal = parseInt(inputWorkTime.value) || 25;
    waktuMenit.textContent = (workVal < 10 ? "0" : "") + workVal;
    waktuDetik.textContent = "00";
    
    updateButtonUI();
}

function timer_Work(){ 
    let duration = parseInt(inputWorkTime.value);
    if(!duration || duration < 1) duration = 25;
    mulaiTimer(duration, 0, "Time to rest!", "WORK"); 
}

function timer_Rest(){ 
    let duration = parseInt(inputRestTime.value);
    if(!duration || duration < 1) duration = 5;
    mulaiTimer(duration, 0, "Back to work!", "REST"); 
}

// --- DRAG AND DROP ---
function attachDragEvents(li) {
    li.setAttribute('draggable', true);
    li.addEventListener('dragstart', () => { li.classList.add('dragging'); });
    li.addEventListener('dragend', () => { li.classList.remove('dragging'); });
}

document.querySelectorAll('.draggable-container').forEach(container => {
    container.addEventListener('dragover', e => {
        e.preventDefault(); 
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) { container.appendChild(draggable); } 
        else { container.insertBefore(draggable, afterElement); }
    });
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } 
        else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- LIST LOGIC ---
let distractionInput = document.getElementById("inputDistraction");
let distractionList = document.getElementById("listDistraction");
distractionInput.addEventListener("keypress", function(event) { if (event.key === "Enter") { addDistraction(); } });
function addDistraction() {
    let text = distractionInput.value.trim(); if(text === "") return;
    let li = document.createElement("li");
    li.innerHTML = `<span>${text}</span><button class="btn-delete" onclick="this.parentElement.remove()">x</button>`;
    attachDragEvents(li); distractionList.appendChild(li); distractionInput.value = "";
}

let todoInput = document.getElementById("inputTodo");
let todoList = document.getElementById("listTodo");
todoInput.addEventListener("keypress", function(event) { if (event.key === "Enter") { addTodo(); } });
function addTodo() {
    let text = todoInput.value.trim(); if(text === "") return;
    let li = document.createElement("li"); li.className = "todo-item";
    li.innerHTML = `<input type="checkbox" onchange="toggleTodo(this)"><span class="todo-text" onclick="clickText(this)">${text}</span><button class="btn-delete" onclick="this.parentElement.remove()">x</button>`;
    attachDragEvents(li); todoList.appendChild(li); todoInput.value = "";
}

function toggleTodo(checkbox) {
    let li = checkbox.parentElement; let ul = li.parentElement;
    if(checkbox.checked) {
        li.classList.add("completed"); li.classList.add("moving");
        setTimeout(() => { ul.appendChild(li); li.classList.remove("moving"); }, 300);
    } else {
        li.classList.remove("completed"); li.classList.add("moving");
        setTimeout(() => { ul.prepend(li); li.classList.remove("moving"); }, 300);
    }
}
function clickText(span) {
    let checkbox = span.parentElement.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked; toggleTodo(checkbox);
}

// =============================================
// --- STOPWATCH MODE ---
// =============================================

let currentAppMode = "pomodoro"; // "pomodoro" atau "stopwatch"

// Stopwatch variables
let swInterval = null;
let swElapsed = 0;       // total ms yang sudah berlalu
let swStartTime = 0;     // timestamp saat stopwatch mulai/resume
let swRunning = false;
let swPaused = false;

let btnStopwatchMain = document.getElementById("btnStopwatchMain");
let swJam = document.getElementById("swJam");
let swMenit = document.getElementById("swMenit");
let swDetik = document.getElementById("swDetik");

// Lap variables
let laps = [];
let lapsList = document.getElementById("lapsList");
let lapsContainer = document.getElementById("lapsContainer");

// History variables
let stopwatchHistory = JSON.parse(localStorage.getItem("stopwatchHistory")) || [];
let customCategories = JSON.parse(localStorage.getItem("customCategories")) || ["Work", "Study", "Coding", "Exercise"];
let historyList = document.getElementById("historyList");
let historyContainer = document.getElementById("historyContainer");
let pomoHistoryList = document.getElementById("pomoHistoryList");
let pomoHistoryContainer = document.getElementById("pomoHistoryContainer");
let reportChartInstance = null;
let currentReportFilter = "day";

function switchMode(mode) {
    currentAppMode = mode;
    let btnPomo = document.getElementById("btnPomodoro");
    let btnSw = document.getElementById("btnStopwatch");
    let btnRep = document.getElementById("btnReport");
    let pomodoroDiv = document.getElementById("pomodoroMode");
    let stopwatchDiv = document.getElementById("stopwatchMode");
    let reportDiv = document.getElementById("reportMode");

    btnPomo.classList.remove("active");
    btnSw.classList.remove("active");
    btnRep.classList.remove("active");

    pomodoroDiv.style.display = "none";
    stopwatchDiv.style.display = "none";
    reportDiv.style.display = "none";

    if (mode === "pomodoro") {
        btnPomo.classList.add("active");
        pomodoroDiv.style.display = "block";
        restartStopwatch();
    } else if (mode === "stopwatch") {
        btnSw.classList.add("active");
        stopwatchDiv.style.display = "block";
        resetTimer();
        renderHistory();
    } else if (mode === "report") {
        btnRep.classList.add("active");
        reportDiv.style.display = "block";
        restartStopwatch();
        resetTimer();
        initReport();
    }
}

function actionStopwatchButton() {
    if (!swRunning && !swPaused) {
        // START dari 0
        startStopwatch();
    } else if (swRunning) {
        // PAUSE
        pauseStopwatch();
    } else if (swPaused) {
        // RESUME
        resumeStopwatch();
    }
}

function startStopwatch() {
    swElapsed = 0;
    swStartTime = Date.now();
    swRunning = true;
    swPaused = false;
    swInterval = setInterval(updateStopwatch, 100);
    btnStopwatchMain.textContent = "Pause";
    btnStopwatchMain.style.backgroundColor = "#ffcad4";
    btnStopwatchMain.style.color = "#5e503f";
}

function pauseStopwatch() {
    swElapsed += Date.now() - swStartTime;
    clearInterval(swInterval);
    swInterval = null;
    swRunning = false;
    swPaused = true;
    btnStopwatchMain.textContent = "Resume";
    btnStopwatchMain.style.backgroundColor = "#ffe599";
    btnStopwatchMain.style.color = "#5e503f";
}

function resumeStopwatch() {
    swStartTime = Date.now();
    swRunning = true;
    swPaused = false;
    swInterval = setInterval(updateStopwatch, 100);
    btnStopwatchMain.textContent = "Pause";
    btnStopwatchMain.style.backgroundColor = "#ffcad4";
    btnStopwatchMain.style.color = "#5e503f";
}

function updateStopwatch() {
    let totalMs = swElapsed + (Date.now() - swStartTime);
    let totalDetik = Math.floor(totalMs / 1000);
    let jam = Math.floor(totalDetik / 3600);
    let menit = Math.floor((totalDetik % 3600) / 60);
    let detik = totalDetik % 60;

    swJam.textContent = (jam < 10 ? "0" : "") + jam;
    swMenit.textContent = (menit < 10 ? "0" : "") + menit;
    swDetik.textContent = (detik < 10 ? "0" : "") + detik;
}

function restartStopwatch() {
    let currentMs = getCurrentStopwatchMs();
    if (currentMs > 0) {
        addHistory(currentMs);
    }

    if (swInterval) clearInterval(swInterval);
    swInterval = null;
    swElapsed = 0;
    swRunning = false;
    swPaused = false;

    if (swJam) swJam.textContent = "00";
    if (swMenit) swMenit.textContent = "00";
    if (swDetik) swDetik.textContent = "00";

    if (btnStopwatchMain) {
        btnStopwatchMain.textContent = "Start";
        btnStopwatchMain.style.backgroundColor = "#cae9ff";
        btnStopwatchMain.style.color = "#5e503f";
    }

    clearLaps();
}

// --- LAP FUNCTIONS ---
function getCurrentStopwatchMs() {
    if (swRunning) {
        return swElapsed + (Date.now() - swStartTime);
    }
    return swElapsed;
}

function formatMsToTime(ms) {
    let totalDetik = Math.floor(ms / 1000);
    let jam = Math.floor(totalDetik / 3600);
    let menit = Math.floor((totalDetik % 3600) / 60);
    let detik = totalDetik % 60;
    return (jam < 10 ? "0" : "") + jam + ":" + (menit < 10 ? "0" : "") + menit + ":" + (detik < 10 ? "0" : "") + detik;
}

function addLap() {
    if (!swRunning && !swPaused) return; // Jangan bisa lap kalau belum mulai

    let currentMs = getCurrentStopwatchMs();
    let lastLapMs = laps.length > 0 ? laps[laps.length - 1] : 0;
    let diffMs = currentMs - lastLapMs;
    laps.push(currentMs);

    let lapNumber = laps.length;
    let li = document.createElement("li");
    li.className = "lap-item";
    li.innerHTML = `<span class="lap-number">${lapNumber}</span><span class="lap-diff">+${formatMsToTime(diffMs)}</span><span class="lap-time">${formatMsToTime(currentMs)}</span>`;

    // Sisipkan di atas agar lap terbaru selalu di paling atas
    lapsList.insertBefore(li, lapsList.firstChild);
    lapsContainer.style.display = "block";
}

function clearLaps() {
    laps = [];
    if (lapsList) lapsList.innerHTML = "";
    if (lapsContainer) lapsContainer.style.display = "none";
}

// --- HISTORY FUNCTIONS ---
function addHistory(ms) {
    let entry = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        ms: ms,
        category: "Uncategorized",
        timestamp: Date.now()
    };
    stopwatchHistory.push(entry);
    localStorage.setItem("stopwatchHistory", JSON.stringify(stopwatchHistory));
    renderHistory();
}

function deleteHistory(id) {
    stopwatchHistory = stopwatchHistory.filter(item => item.id !== id);
    localStorage.setItem("stopwatchHistory", JSON.stringify(stopwatchHistory));
    renderHistory();
}

function updateHistoryCategory(id, selectElement) {
    let newCategory = selectElement.value;
    if (newCategory === "__add_new__") {
        let name = prompt("Enter new category name:");
        if (name && name.trim()) {
            name = name.trim();
            if (!customCategories.includes(name)) {
                customCategories.push(name);
                localStorage.setItem("customCategories", JSON.stringify(customCategories));
            }
            newCategory = name;
        } else {
            let item = stopwatchHistory.find(item => item.id === id);
            selectElement.value = item ? item.category : "Uncategorized";
            return;
        }
    }
    
    let item = stopwatchHistory.find(item => item.id === id);
    if (item) {
        item.category = newCategory;
        localStorage.setItem("stopwatchHistory", JSON.stringify(stopwatchHistory));
    }
    renderHistory();
}

function renderHistory() {
    renderHistoryForList(historyList, historyContainer);
    renderHistoryForList(pomoHistoryList, pomoHistoryContainer);
}

function renderHistoryForList(listElement, containerElement) {
    if (!listElement || !containerElement) return;
    
    listElement.innerHTML = "";
    if (stopwatchHistory.length === 0) {
        containerElement.style.display = "none";
        return;
    }

    for (let i = stopwatchHistory.length - 1; i >= 0; i--) {
        let item = stopwatchHistory[i];
        let ms = typeof item === 'object' ? item.ms : item;
        let id = typeof item === 'object' ? item.id : i;
        let currentCat = typeof item === 'object' ? item.category : "Uncategorized";
        
        let historyNumber = i + 1;
        let li = document.createElement("li");
        li.className = "history-item";
        
        let optionsHtml = `<option value="Uncategorized" ${currentCat === 'Uncategorized' ? 'selected' : ''}>Uncategorized</option>`;
        customCategories.forEach(cat => {
            if (cat !== "Uncategorized") {
                optionsHtml += `<option value="${cat}" ${currentCat === cat ? 'selected' : ''}>${cat}</option>`;
            }
        });
        optionsHtml += `<option value="__add_new__">+ Add New...</option>`;

        li.innerHTML = `
            <span class="history-number">${historyNumber}</span>
            <span class="history-time">${formatMsToTime(ms)}</span>
            <select class="category-select" onchange="updateHistoryCategory('${id}', this)">
                ${optionsHtml}
            </select>
            <button class="btn-delete-history" onclick="deleteHistory('${id}')">x</button>
        `;
        listElement.appendChild(li);
    }
    containerElement.style.display = "block";
}

// --- REPORT FUNCTIONS ---
function filterReport(period) {
    currentReportFilter = period;
    document.querySelectorAll(".btn-filter").forEach(btn => {
        btn.classList.remove("active");
    });
    event.target.classList.add("active");
    initReport();
}

function initReport() {
    let now = Date.now();
    let limitMs = 0;
    
    if (currentReportFilter === "day") {
        limitMs = 24 * 60 * 60 * 1000;
    } else if (currentReportFilter === "week") {
        limitMs = 7 * 24 * 60 * 60 * 1000;
    } else if (currentReportFilter === "month") {
        limitMs = 30 * 24 * 60 * 60 * 1000;
    } else if (currentReportFilter === "year") {
        limitMs = 365 * 24 * 60 * 60 * 1000;
    }
    
    let filteredHistory = stopwatchHistory.filter(item => {
        let ts = item.timestamp || now;
        return (now - ts) <= limitMs;
    });
    
    let categorySums = {};
    filteredHistory.forEach(item => {
        let cat = item.category || "Uncategorized";
        let ms = item.ms || 0;
        categorySums[cat] = (categorySums[cat] || 0) + ms;
    });
    
    let labels = Object.keys(categorySums);
    let dataPoints = labels.map(cat => Math.round((categorySums[cat] / 60000) * 100) / 100);

    let chartCanvas = document.getElementById("reportChart");
    let emptyMessage = document.getElementById("reportEmptyMessage");
    
    if (labels.length === 0) {
        chartCanvas.style.display = "none";
        emptyMessage.style.display = "block";
        if (reportChartInstance) {
            reportChartInstance.destroy();
            reportChartInstance = null;
        }
        return;
    }
    
    chartCanvas.style.display = "block";
    emptyMessage.style.display = "none";
    
    let ctx = chartCanvas.getContext("2d");
    
    if (reportChartInstance) {
        reportChartInstance.destroy();
    }
    
    reportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Minutes Spent',
                data: dataPoints,
                backgroundColor: [
                    'rgba(255, 202, 212, 0.7)',
                    'rgba(176, 196, 177, 0.7)',
                    'rgba(202, 233, 255, 0.7)',
                    'rgba(255, 244, 117, 0.7)',
                    'rgba(94, 80, 63, 0.5)'
                ],
                borderColor: '#5e503f',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minutes',
                        font: {
                            family: 'Gaegu',
                            size: 14
                        },
                        color: '#5e503f'
                    },
                    ticks: {
                        font: {
                            family: 'Gaegu',
                            size: 12
                        },
                        color: '#5e503f'
                    },
                    grid: {
                        color: 'rgba(94, 80, 63, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Gaegu',
                            size: 12
                        },
                        color: '#5e503f'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    titleFont: {
                        family: 'Gaegu'
                    },
                    bodyFont: {
                        family: 'Gaegu'
                    }
                }
            }
        }
    });
}

// Initial rendering of history on script load
renderHistory();
