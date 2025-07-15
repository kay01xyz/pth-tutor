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

    // --- 【新增功能】: 生成 Ruby HTML 的核心函數 ---
    function createRubyHtml(chinese, pinyinStr) {
        // 使用 pinyin-pro 提供的 'all' 類型來獲取更詳細的資訊
        const pinyinResult = pinyinPro.pinyin(chinese, { type: 'all', toneType: 'symbol' });
        let html = '';
        pinyinResult.forEach(item => {
            if (item.isZh) {
                html += `<ruby>${item.origin}<rt>${item.pinyin}</rt></ruby>`;
            } else {
                // 對於非中文字符，直接顯示
                html += `<span>${item.origin}</span>`;
            }
        });
        return html;
    }

    // --- 【新增功能】: 文字轉語音的通用函數 ---
    function speakText(text) {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
    
    // --- 【修改點 1】: 主轉換按鈕的邏輯 ---
    convertBtn.addEventListener('click', () => {
        const inputText = cantoInput.value.trim();
        if (!inputText) {
            alert("請先輸入您要處理的普通話內容！");
            return;
        }

        const mandarinText = inputText;
        mandarinOutput.textContent = mandarinText;
        
        // 舊的拼音生成方式: pinyinOutput.textContent = pinyinText;
        // 新的拼音生成方式，直接生成帶有 ruby 標籤的 HTML
        pinyinOutput.innerHTML = createRubyHtml(mandarinText);

        resultArea.classList.remove('hidden');
        document.querySelector('.recorder-section').classList.remove('hidden');
    });

    // --- 【修改點 2】: 主朗讀按鈕調用通用函數 ---
    speakBtn.addEventListener('click', () => {
        speakText(mandarinOutput.textContent);
    });

    // --- 功能4 & 5: 錄音與回放 (無變化) ---
    async function setupAudio() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayback.src = audioUrl;
                    audioPlayback.classList.remove('hidden');
                    audioChunks = [];
                };
            } catch (err) {
                recordingStatus.textContent = "錯誤：無法獲取麥克風。請檢查瀏覽器設定。";
                recordBtn.disabled = true;
            }
        } else {
            recordingStatus.textContent = "抱歉，您的瀏覽器不支持錄音功能。";
            recordBtn.disabled = true;
        }
    }
    recordBtn.addEventListener('click', () => {
        if (!mediaRecorder) { alert('錄音功能尚未準備好或不被支持。'); return; }
        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        audioPlayback.classList.add('hidden');
        recordingStatus.textContent = "錄音中... 🔴";
    });
    stopBtn.addEventListener('click', () => {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        recordingStatus.textContent = "錄音已停止。點擊播放器試聽。";
    });

    // --- 功能6: 儲存字詞 (儲存原始拼音字串) ---
    saveBtn.addEventListener('click', () => {
        const mandarin = mandarinOutput.textContent;
        // 我們需要一個純文字版的拼音來做篩選，所以要生成它
        const pinyinText = pinyinPro.pinyin(mandarin, { toneType: 'num', v: true });

        if (!mandarin) return;
        
        const isDuplicate = savedWords.some(word => word.mandarin === mandarin);
        if (isDuplicate) { alert("此句已收藏！"); return; }
        
        // 儲存原始文本和用於篩選的拼音
        savedWords.push({ mandarin, pinyin: pinyinText });
        localStorage.setItem('savedWords', JSON.stringify(savedWords));
        alert("收藏成功！");
        renderReviewList();
    });

    // --- 【修改點 3】: 全面重寫溫習列表的渲染邏輯 ---
    function renderReviewList(filter = 'all') {
        reviewList.innerHTML = '';
        
        let wordsToRender = savedWords;
        
        if (filter !== 'all') {
            const conditions = {
                'z_zh': ['z', 'zh'], 's_sh': ['s', 'sh'], 'c_ch': ['c', 'ch'],
                'n_l': ['n', 'l'], 'ing_in': ['ing', 'in']
            };
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
                
                // 使用 Ruby HTML 顯示收藏的詞條，並加上朗讀和刪除按鈕
                item.innerHTML = `
                    <div class="review-text-container ruby-container">
                        ${createRubyHtml(word.mandarin)}
                    </div>
                    <div class="actions">
                        <button class="review-speak-btn" title="朗讀此句" data-text="${word.mandarin}">🔊</button>
                        <button class="delete-btn" title="刪除此句" data-index="${originalIndex}">❌</button>
                    </div>
                `;
                reviewList.appendChild(item);
            });
        }
        
        savedCount.textContent = savedWords.length;
    }

    // --- 【新增功能】: 為收藏列表中的按鈕添加事件監聽（事件委派） ---
    reviewList.addEventListener('click', e => {
        const target = e.target;
        // 點擊了朗讀按鈕
        if (target.classList.contains('review-speak-btn')) {
            speakText(target.dataset.text);
        }
        // 點擊了刪除按鈕
        if (target.classList.contains('delete-btn')) {
            const indexToDelete = parseInt(target.dataset.index, 10);
            savedWords.splice(indexToDelete, 1);
            localStorage.setItem('savedWords', JSON.stringify(savedWords));
            const currentFilter = document.querySelector('.filter-btn.active').dataset.filter;
            renderReviewList(currentFilter);
        }
    });
    
    // --- 篩選按鈕事件 (無變化) ---
    filterControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderReviewList(e.target.dataset.filter);
        }
    });

    // --- 初始化 (無變化) ---
    function init() {
        setupAudio();
        renderReviewList();
        const activeButton = filterControls.querySelector('.filter-btn.active') || filterControls.querySelector('[data-filter="all"]');
        if(activeButton) activeButton.classList.add('active');
    }

    init();
});
