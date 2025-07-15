document.addEventListener('DOMContentLoaded', () => {

    // --- 元素選擇 (無變化) ---
    const cantoInput = document.getElementById('cantoInput');
    const convertBtn = document.getElementById('convertBtn');
    const resultArea = document.getElementById('resultArea');
    const mandarinOutput = document.getElementById('mandarinOutput');
    const pinyinOutput = document.getElementById('pinyinOutput');
    const speakBtn = document.getElementById('speakBtn');
    const saveBtn = document.getElementById('saveBtn');
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const audioPlayback = document.getElementById('audioPlayback');
    const reviewList = document.getElementById('reviewList');
    const savedCount = document.getElementById('savedCount');
    const filterControls = document.querySelector('.filter-controls');
    
    // --- 變數定義 (無變化) ---
    let mediaRecorder;
    let audioChunks = [];
    let savedWords = JSON.parse(localStorage.getItem('savedWords')) || [];

    // --- Ruby HTML 生成函數 (無變化) ---
    function createRubyHtml(chinese) {
        const pinyinResult = pinyinPro.pinyin(chinese, { type: 'all', toneType: 'symbol' });
        let html = '';
        pinyinResult.forEach(item => {
            if (item.isZh) {
                html += `<ruby>${item.origin}<rt>${item.pinyin}</rt></ruby>`;
            } else {
                html += `<span>${item.origin}</span>`;
            }
        });
        return html;
    }

    // --- 文字轉語音函數 (無變化) ---
    function speakText(text) {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
    
    // --- 主轉換按鈕的邏輯 (無變化) ---
    convertBtn.addEventListener('click', () => {
        const inputText = cantoInput.value.trim();
        if (!inputText) {
            alert("請先輸入您要處理的普通話內容！");
            return;
        }
        const mandarinText = inputText;
        mandarinOutput.textContent = mandarinText;
        try {
            if (typeof pinyinPro === 'undefined') {
                throw new Error("拼音轉換庫 (pinyin-pro) 未能成功加載。");
            }
            pinyinOutput.innerHTML = createRubyHtml(mandarinText);
        } catch (error) {
            console.error("生成拼音標註時出錯:", error);
            alert("生成拼音標註時發生錯誤，請檢查輸入內容。");
            return; 
        }
        resultArea.classList.remove('hidden');
        document.querySelector('.recorder-section').classList.remove('hidden');
    });

    // --- 主朗讀按鈕 (無變化) ---
    speakBtn.addEventListener('click', () => {
        speakText(mandarinOutput.textContent);
    });

    // --- 【修復點】: 修改錄音的設定 ---
    async function setupAudio() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // 檢查瀏覽器支援的音訊格式，優先使用 webm
                const options = { mimeType: 'audio/webm' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.log(`${options.mimeType} is not Supported, falling back to ogg`);
                    options.mimeType = 'audio/ogg; codecs=opus';
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                         console.log(`${options.mimeType} is not Supported, falling back to wav`);
                         options.mimeType = 'audio/wav'; // 作為最後的備用方案
                         if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                            console.log(`${options.mimeType} is not Supported`);
                            options.mimeType = '';
                         }
                    }
                }
                
                mediaRecorder = new MediaRecorder(stream, options);

                mediaRecorder.ondataavailable = event => {
                    // 確保有數據才加入
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    if (audioChunks.length === 0) {
                        recordingStatus.textContent = "錄音失敗，未偵測到音訊。";
                        return;
                    }
                    // 使用 audioChunks 裡的第一個元素的 type，確保一致性
                    const audioBlob = new Blob(audioChunks, { type: audioChunks[0].type });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayback.src = audioUrl;
                    audioPlayback.classList.remove('hidden');
                    audioChunks = [];
                };
            } catch (err) {
                console.error("無法獲取麥克風權限:", err);
                recordingStatus.textContent = "錯誤：無法獲取麥克風。請檢查瀏覽器設定。";
                recordBtn.disabled = true;
            }
        } else {
            recordingStatus.textContent = "抱歉，您的瀏覽器不支持錄音功能。";
            recordBtn.disabled = true;
        }
    }
    // --- 錄音的開始和停止按鈕邏輯 (無變化) ---
    recordBtn.addEventListener('click', () => {
        if (!mediaRecorder) { alert('錄音功能尚未準備好或不被支持。'); return; }
        // 每次開始前清空舊的數據
        audioChunks = [];
        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        audioPlayback.classList.add('hidden');
        recordingStatus.textContent = "錄音中... 🔴";
    });
    stopBtn.addEventListener('click', () => {
        if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordBtn.disabled = false;
            stopBtn.disabled = true;
            recordingStatus.textContent = "錄音已停止。點擊播放器試聽。";
        }
    });

    // --- 其他功能 (無變化) ---
    saveBtn.addEventListener('click', () => {
        const mandarin = mandarinOutput.textContent;
        const pinyinText = pinyinPro.pinyin(mandarin, { toneType: 'num', v: true });
        if (!mandarin) return;
        const isDuplicate = savedWords.some(word => word.mandarin === mandarin);
        if (isDuplicate) { alert("此句已收藏！"); return; }
        savedWords.push({ mandarin, pinyin: pinyinText });
        localStorage.setItem('savedWords', JSON.stringify(savedWords));
        alert("收藏成功！");
        renderReviewList();
    });

    function renderReviewList(filter = 'all') {
        reviewList.innerHTML = '';
        let wordsToRender = savedWords;
        if (filter !== 'all') {
            const conditions = { 'z_zh': ['z', 'zh'], 's_sh': ['s', 'sh'], 'c_ch': ['c', 'ch'], 'n_l': ['n', 'l'], 'ing_in': ['ing', 'in'] };
            const patterns = conditions[filter];
            if (patterns) {
                wordsToRender = savedWords.filter(word => {
                    const pinyinSimple = word.pinyin.replace(/\d/g, '');
                    return patterns.some(p => pinyinSimple.includes(p));
                });
            }
        }
        if (wordsToRender.length === 0) {
            reviewList.innerHTML = `<p>暫無收藏。</p>`;
        } else {
            wordsToRender.forEach(word => {
                const originalIndex = savedWords.findIndex(sw => sw.mandarin === word.mandarin);
                const item = document.createElement('div');
                item.className = 'review-item';
                item.innerHTML = `<div class="review-text-container ruby-container">${createRubyHtml(word.mandarin)}</div><div class="actions"><button class="review-speak-btn" title="朗讀此句" data-text="${word.mandarin}">🔊</button><button class="delete-btn" title="刪除此句" data-index="${originalIndex}">❌</button></div>`;
                reviewList.appendChild(item);
            });
        }
        savedCount.textContent = savedWords.length;
    }

    reviewList.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('review-speak-btn')) { speakText(target.dataset.text); }
        if (target.classList.contains('delete-btn')) {
            const indexToDelete = parseInt(target.dataset.index, 10);
            savedWords.splice(indexToDelete, 1);
            localStorage.setItem('savedWords', JSON.stringify(savedWords));
            const currentFilter = document.querySelector('.filter-btn.active').dataset.filter;
            renderReviewList(currentFilter);
        }
    });
    
    filterControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderReviewList(e.target.dataset.filter);
        }
    });

    function init() {
        setupAudio();
        renderReviewList();
        const activeButton = filterControls.querySelector('.filter-btn.active') || filterControls.querySelector('[data-filter="all"]');
        if(activeButton) activeButton.classList.add('active');
    }

    init();
});
