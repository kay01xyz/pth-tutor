document.addEventListener('DOMContentLoaded', () => {

    // --- 元素選擇 ---
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
    
    // --- 變數定義 ---
    let mediaRecorder;
    let audioChunks = [];
    let savedWords = JSON.parse(localStorage.getItem('savedWords')) || [];

    // --- 粵普轉換詞典 (簡化版) ---
    const cantoToMandoDict = {
        "搞掂": "搞定",
        "搞定": "办妥",
        "食咗": "吃了",
        "未": "没有",
        "飯": "饭",
        "晏晝": "下午",
        "今日": "今天",
        "尋日": "昨天",
        "聽日": "明天",
        "好開心": "很开心",
        "係": "是",
        "唔係": "不是",
        "喺": "在",
        "邊度": "哪里",
        "乜嘢": "什么",
        "點解": "为什么",
        "幾多": "多少",
        "嘅": "的",
        "啲": "些",
        "我": "我",
        "你": "你",
        "佢": "他",
        "哋": "们"
    };

    // --- 功能1: 粵普轉換邏輯 ---
    function convertCantoToMando(text) {
        let convertedText = text;
        // 為了簡單演示，我們從長到短替換詞語
        const sortedKeys = Object.keys(cantoToMandoDict).sort((a, b) => b.length - a.length);
        sortedKeys.forEach(key => {
            const regex = new RegExp(key, "g");
            convertedText = convertedText.replace(regex, cantoToMandoDict[key]);
        });
        return convertedText;
    }

    // --- 事件監聽 ---
    convertBtn.addEventListener('click', () => {
        const inputText = cantoInput.value.trim();
        if (!inputText) {
            alert("請先輸入廣東話內容！");
            return;
        }

        const mandarinText = convertCantoToMando(inputText);
        mandarinOutput.textContent = mandarinText;

        // --- 功能2: 拼音轉換 ---
        const pinyinText = pinyinPro.pinyin(mandarinText, { toneType: 'num', v: true });
        pinyinOutput.textContent = pinyinText;

        resultArea.classList.remove('hidden');
        document.querySelector('.recorder-section').classList.remove('hidden');
    });

    // --- 功能3: 語音朗讀 ---
    speakBtn.addEventListener('click', () => {
        const textToSpeak = mandarinOutput.textContent;
        if (!textToSpeak) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'zh-CN'; // 指定語言為普通話
        utterance.rate = 0.9; // 可調整語速
        window.speechSynthesis.speak(utterance);
    });

    // --- 功能4 & 5: 錄音與回放 ---
    async function setupAudio() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayback.src = audioUrl;
                    audioPlayback.classList.remove('hidden');
                    audioChunks = []; // 清空以便下次錄音
                };
            } catch (err) {
                console.error("無法獲取麥克風權限:", err);
                recordingStatus.textContent = "錯誤：無法獲取麥克風權限。請檢查瀏覽器設定。";
            }
        } else {
            recordingStatus.textContent = "抱歉，您的瀏覽器不支持錄音功能。";
        }
    }

    recordBtn.addEventListener('click', () => {
        if (!mediaRecorder) {
            alert('錄音功能尚未準備好或不被支持。');
            return;
        }
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


    // --- 功能6: 儲存字詞 ---
    saveBtn.addEventListener('click', () => {
        const canto = cantoInput.value.trim();
        const mandarin = mandarinOutput.textContent;
        const pinyin = pinyinOutput.textContent;

        if (!canto || !mandarin || !pinyin) return;
        
        // 檢查是否已存在
        const isDuplicate = savedWords.some(word => word.mandarin === mandarin);
        if (isDuplicate) {
            alert("此句已收藏！");
            return;
        }

        savedWords.push({ canto, mandarin, pinyin });
        localStorage.setItem('savedWords', JSON.stringify(savedWords));
        alert("收藏成功！");
        renderReviewList();
    });

    // --- 功能7: 溫習與篩選 ---
    function renderReviewList(filter = 'all') {
        reviewList.innerHTML = '';
        
        let filteredWords = savedWords;
        
        if (filter !== 'all') {
            const conditions = {
                'z_zh': ['z', 'zh'], 's_sh': ['s', 'sh'], 'c_ch': ['c', 'ch'],
                'n_l': ['n', 'l'], 'ing_in': ['ing', 'in']
            };
            const patterns = conditions[filter];
            if (patterns) {
                filteredWords = savedWords.filter(word => {
                    const pinyinSimple = word.pinyin.replace(/[0-9]/g, ''); // 移除音調數字
                    return patterns.some(p => pinyinSimple.includes(p));
                });
            }
        }

        if (filteredWords.length === 0) {
            reviewList.innerHTML = `<p>沒有符合篩選條件的收藏。</p>`;
        } else {
            filteredWords.forEach((word, index) => {
                const item = document.createElement('div');
                item.className = 'review-item';
                item.innerHTML = `
                    <div>
                        <div class="mandarin">${word.mandarin}</div>
                        <div class="pinyin">${word.pinyin}</div>
                        <div class="canto">原文: ${word.canto}</div>
                    </div>
                    <div class="actions">
                        <button class="delete-btn" data-index="${index}">刪除</button>
                    </div>
                `;
                reviewList.appendChild(item);
            });
        }
        
        // 更新收藏數量
        savedCount.textContent = savedWords.length;

        // 綁定刪除按鈕事件
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToDelete = parseInt(e.target.dataset.index, 10);
                // 這裡需要從原始數組中找到並刪除
                const itemToDelete = filteredWords[indexToDelete];
                const originalIndex = savedWords.findIndex(w => w.mandarin === itemToDelete.mandarin);
                if (originalIndex > -1) {
                    savedWords.splice(originalIndex, 1);
                    localStorage.setItem('savedWords', JSON.stringify(savedWords));
                    renderReviewList(filter); // 重新渲染當前篩選列表
                }
            });
        });
    }
    
    // 篩選按鈕事件
    filterControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderReviewList(e.target.dataset.filter);
        }
    });

    // --- 初始化 ---
    function init() {
        setupAudio();
        renderReviewList();
        filterControls.querySelector('[data-filter="all"]').classList.add('active');
    }

    init();
});