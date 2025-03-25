document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.querySelector('.upload-button');

    // ドラッグ＆ドロップのイベントハンドラ
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#2980b9';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#3498db';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#3498db';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // ファイル選択ボタンのイベントハンドラ
    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // ファイル処理関数
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            const fileType = file.type;
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileType.startsWith('audio/') || fileExtension === 'mp3') {
                analyzeAudio(file);
            } else if (fileType.startsWith('video/') || fileExtension === 'mp4') {
                analyzeVideo(file);
            } else if (fileExtension === 'csv') {
                analyzeCSV(file);
            }
        });
    }

    // 音声ファイルの分析
    function analyzeAudio(file) {
        const audioResult = document.querySelector('#audioResult .result-content');
        audioResult.innerHTML = `
            <div class="preview-container">
                <div class="preview-header">
                    <h4>プレビュー</h4>
                    <div class="file-info">
                        <p>ファイル名: ${file.name}</p>
                        <p>サイズ: ${formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div class="preview-content">
                    <div id="waveform" class="waveform-container"></div>
                    <div class="audio-controls">
                        <button id="playButton" class="control-button">
                            <span class="icon">▶</span> 再生
                        </button>
                        <button id="pauseButton" class="control-button">
                            <span class="icon">⏸</span> 一時停止
                        </button>
                        <button id="stopButton" class="control-button">
                            <span class="icon">⏹</span> 停止
                        </button>
                        <div class="time-display">
                            <span id="currentTime">0:00</span> / <span id="totalTime">0:00</span>
                        </div>
                    </div>
                </div>
                <div class="analysis-section">
                    <h4>会話分析</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <h5>会話速度</h5>
                            <div id="speechRate" class="analysis-value">0 単語/分</div>
                        </div>
                        <div class="analysis-card">
                            <h5>質問回数</h5>
                            <div id="questionCount" class="analysis-value">0 回</div>
                        </div>
                        <div class="analysis-card">
                            <h5>フィラー回数</h5>
                            <div id="fillerCount" class="analysis-value">0 回</div>
                        </div>
                        <div class="analysis-card">
                            <h5>話者比率</h5>
                            <div id="speakerRatio" class="analysis-value">A: 0% / B: 0%</div>
                        </div>
                    </div>
                </div>
                <div class="transcription-section">
                    <h4>音声認識結果</h4>
                    <div id="transcriptionResult" class="transcription-box">
                        <p>音声ファイルを再生すると分析が開始されます</p>
                    </div>
                </div>
            </div>
        `;

        // 音声波形の表示
        const wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#3498db',
            progressColor: '#2980b9',
            height: 100,
            normalize: true,
            barWidth: 2,
            barGap: 1,
            cursorWidth: 1,
            cursorColor: '#2c3e50'
        });

        const audioUrl = URL.createObjectURL(file);
        wavesurfer.load(audioUrl);

        // 時間表示の更新
        const currentTimeEl = document.getElementById('currentTime');
        const totalTimeEl = document.getElementById('totalTime');

        wavesurfer.on('ready', () => {
            totalTimeEl.textContent = formatTime(wavesurfer.getDuration());
        });

        wavesurfer.on('audioprocess', () => {
            currentTimeEl.textContent = formatTime(wavesurfer.getCurrentTime());
        });

        // 音声コントロール
        const playButton = document.getElementById('playButton');
        const pauseButton = document.getElementById('pauseButton');
        const stopButton = document.getElementById('stopButton');

        playButton.addEventListener('click', () => {
            wavesurfer.play();
            playButton.classList.add('active');
            pauseButton.classList.remove('active');
        });

        pauseButton.addEventListener('click', () => {
            wavesurfer.pause();
            pauseButton.classList.add('active');
            playButton.classList.remove('active');
        });

        stopButton.addEventListener('click', () => {
            wavesurfer.stop();
            playButton.classList.remove('active');
            pauseButton.classList.remove('active');
        });

        // 音声認識の開始
        startTranscription(audioUrl);
    }

    // 音声認識の開始
    function startTranscription(audioUrl) {
        if (!('webkitSpeechRecognition' in window)) {
            console.error('音声認識がサポートされていません');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ja-JP';

        let totalWords = 0;
        let totalDuration = 0;
        let questions = 0;
        let fillers = 0;
        let speakerSegments = [];
        let currentSpeaker = 1;
        let lastSpeechTime = Date.now();
        const fillerWords = new Set(['えーと', 'あの', 'まあ', 'えっと', 'その', 'なんか', 'まぁ', 'えー', 'あのー', 'うーん']);

        recognition.onresult = (event) => {
            const results = event.results;
            const lastResult = results[results.length - 1];
            const transcript = lastResult.transcript;
            const isFinal = lastResult.isFinal;
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastSpeechTime) / 1000;

            // 話者の切り替わりを検出（5秒以上の無音で話者が切り替わる）
            if (timeDiff > 5) {
                currentSpeaker = currentSpeaker === 1 ? 2 : 1;
            }

            // 単語数のカウント
            const words = transcript.split(/\s+/).length;
            totalWords += words;

            // 質問の検出
            if (transcript.includes('?') || transcript.includes('？')) {
                questions++;
            }

            // フィラーワードの検出
            fillerWords.forEach(filler => {
                if (transcript.includes(filler)) {
                    fillers++;
                }
            });

            // 話者セグメントの記録
            speakerSegments.push({
                speaker: currentSpeaker,
                duration: timeDiff
            });

            lastSpeechTime = currentTime;

            // 音声認識結果の表示
            const transcriptionBox = document.querySelector('.transcription-box');
            if (isFinal) {
                transcriptionBox.innerHTML += `<div class="final">話者${currentSpeaker}: ${transcript}</div>`;
            } else {
                transcriptionBox.innerHTML = `<div class="interim">話者${currentSpeaker}: ${transcript}</div>`;
            }

            // 分析結果の更新
            updateAnalysisResults(totalWords, totalDuration, questions, fillers, speakerSegments);
        };

        recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            const transcriptionBox = document.querySelector('.transcription-box');
            transcriptionBox.innerHTML += `<div class="error">エラー: ${event.error}</div>`;
        };

        recognition.start();
    }

    // 分析結果の更新
    function updateAnalysisResults(totalWords, totalDuration, questions, fillers, speakerSegments) {
        const analysisResults = document.querySelector('.analysis-results');
        const wordsPerMinute = totalDuration > 0 ? Math.round((totalWords / totalDuration) * 60) : 0;
        const speakerRatio = calculateSpeakerRatio(speakerSegments);

        analysisResults.innerHTML = `
            <div class="analysis-card">
                <h5>会話速度</h5>
                <div class="analysis-value">${wordsPerMinute} 文字/分</div>
            </div>
            <div class="analysis-card">
                <h5>質問回数</h5>
                <div class="analysis-value">${questions} 回</div>
            </div>
            <div class="analysis-card">
                <h5>フィラー回数</h5>
                <div class="analysis-value">${fillers} 回</div>
            </div>
            <div class="analysis-card">
                <h5>話者比率</h5>
                <div class="analysis-value">話者1: ${speakerRatio.speaker1}%<br>話者2: ${speakerRatio.speaker2}%</div>
            </div>
        `;
    }

    // 話者比率の計算
    function calculateSpeakerRatio(segments) {
        const stats = { speaker1: 0, speaker2: 0 };
        let totalDuration = 0;

        segments.forEach(segment => {
            stats[`speaker${segment.speaker}`] += segment.duration;
            totalDuration += segment.duration;
        });

        if (totalDuration > 0) {
            stats.speaker1 = Math.round((stats.speaker1 / totalDuration) * 100);
            stats.speaker2 = Math.round((stats.speaker2 / totalDuration) * 100);
        }

        return stats;
    }

    // 動画ファイルの分析
    function analyzeVideo(file) {
        const videoResult = document.querySelector('#videoResult .result-content');
        videoResult.innerHTML = `
            <div class="preview-container">
                <div class="preview-header">
                    <h4>プレビュー</h4>
                    <div class="file-info">
                        <p>ファイル名: ${file.name}</p>
                        <p>サイズ: ${formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div class="preview-content">
                    <div class="video-container">
                        <video id="videoPreview" controls></video>
                        <div class="video-info">
                            <p>再生時間: <span id="videoDuration">0:00</span></p>
                            <p>解像度: <span id="videoResolution">-</span></p>
                            <p>フレームレート: <span id="videoFps">-</span></p>
                        </div>
                    </div>
                </div>
                <div class="analysis-section">
                    <h4>会話分析</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <h5>会話速度</h5>
                            <div id="videoSpeechRate" class="analysis-value">0 単語/分</div>
                        </div>
                        <div class="analysis-card">
                            <h5>質問回数</h5>
                            <div id="videoQuestionCount" class="analysis-value">0 回</div>
                        </div>
                        <div class="analysis-card">
                            <h5>フィラー回数</h5>
                            <div id="videoFillerCount" class="analysis-value">0 回</div>
                        </div>
                        <div class="analysis-card">
                            <h5>話者比率</h5>
                            <div id="videoSpeakerRatio" class="analysis-value">A: 0% / B: 0%</div>
                        </div>
                    </div>
                </div>
                <div class="transcription-section">
                    <h4>音声認識結果</h4>
                    <div id="videoTranscriptionResult" class="transcription-box">
                        <p>動画を再生すると分析が開始されます</p>
                    </div>
                </div>
            </div>
        `;

        const videoUrl = URL.createObjectURL(file);
        const video = document.getElementById('videoPreview');
        video.src = videoUrl;

        // 動画の詳細情報を取得
        video.addEventListener('loadedmetadata', () => {
            const duration = video.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            
            document.getElementById('videoDuration').textContent = `${minutes}分${seconds}秒`;
            document.getElementById('videoResolution').textContent = `${video.videoWidth}x${video.videoHeight}`;
        });

        // フレームレートの計算
        let frameCount = 0;
        let startTime = performance.now();
        
        video.addEventListener('timeupdate', () => {
            frameCount++;
            const currentTime = performance.now();
            const elapsedTime = (currentTime - startTime) / 1000;
            
            if (elapsedTime >= 1) {
                const fps = Math.round(frameCount / elapsedTime);
                document.getElementById('videoFps').textContent = `${fps}fps`;
                
                frameCount = 0;
                startTime = currentTime;
            }
        });

        // 動画の音声分析を開始
        startVideoTranscription(videoUrl);
    }

    // 動画の音声認識機能
    function startVideoTranscription(videoUrl) {
        const transcriptionResult = document.getElementById('videoTranscriptionResult');
        transcriptionResult.innerHTML = '<p>音声分析を開始します...</p>';

        // 分析用の変数の初期化
        let totalWords = 0;
        let questionCount = 0;
        let fillerCount = 0;
        let speakerSegments = [];
        let currentSpeaker = 'A';
        let lastTimestamp = 0;
        let isAnalyzing = false;
        let analysisStartTime = 0;
        let transcriptText = '';
        
        // 音量の履歴を保持する配列
        const volumeHistory = new Array(10).fill(0);
        let volumeHistoryIndex = 0;

        // 音声コンテキストの作成
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const video = document.getElementById('videoPreview');
        const source = audioContext.createMediaElementSource(video);
        const analyser = audioContext.createAnalyser();
        
        // 音声分析の設定
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        // 接続
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // 音声分析の実行
        function analyzeVideoAudioData() {
            if (!isAnalyzing) return;

            analyser.getFloatTimeDomainData(dataArray);
            
            // 音量レベルの計算と平滑化
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) {
                sum += Math.abs(dataArray[i]);
            }
            const currentVolume = sum / bufferLength;
            
            // 音量履歴の更新
            volumeHistory[volumeHistoryIndex] = currentVolume;
            volumeHistoryIndex = (volumeHistoryIndex + 1) % volumeHistory.length;
            
            // 平均音量の計算
            const averageVolume = volumeHistory.reduce((a, b) => a + b) / volumeHistory.length;

            // 経過時間の計算（秒）
            const elapsedTime = (Date.now() - analysisStartTime) / 1000;
            
            // 無音区間の検出（閾値: 0.005）
            if(averageVolume < 0.005) {
                if(Date.now() - lastTimestamp > 2000) {  // 2秒以上の無音で話者切り替え
                    currentSpeaker = currentSpeaker === 'A' ? 'B' : 'A';
                    speakerSegments.push({
                        speaker: currentSpeaker,
                        duration: elapsedTime,
                        words: Math.max(1, Math.round(totalWords * (averageVolume * 100)))
                    });
                    lastTimestamp = Date.now();
                }
            } else {
                // 音声区間の処理
                if(averageVolume > 0.01) {
                    totalWords = Math.max(1, Math.round(elapsedTime * 2));
                    
                    if(averageVolume > 0.02) {  // 質問の可能性
                        questionCount = Math.max(1, Math.round(totalWords * 0.1));
                    }
                    
                    if(averageVolume > 0.015 && averageVolume < 0.02) {  // フィラーの可能性
                        fillerCount = Math.max(1, Math.round(totalWords * 0.05));
                    }
                }
            }

            // 分析結果の更新（1秒ごと）
            if(elapsedTime % 1 < 0.1) {
                updateVideoAnalysisResults(
                    totalWords,
                    elapsedTime,
                    questionCount,
                    fillerCount,
                    speakerSegments,
                    transcriptText
                );
            }

            // 次のフレームの分析をスケジュール
            requestAnimationFrame(analyzeVideoAudioData);
        }

        // 音声認識の設定
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    transcriptText += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // トランスクリプションの表示
            if (finalTranscript) {
                transcriptionResult.innerHTML += `<p class="final">${currentSpeaker}: ${finalTranscript}</p>`;
            }
            if (interimTranscript) {
                transcriptionResult.innerHTML += `<p class="interim">${currentSpeaker}: ${interimTranscript}</p>`;
            }
        };

        // 動画の再生開始時に分析を開始
        video.addEventListener('play', () => {
            audioContext.resume();
            isAnalyzing = true;
            analysisStartTime = Date.now();
            lastTimestamp = analysisStartTime;
            analyzeVideoAudioData();
            recognition.start();
        });

        // 動画の一時停止時の処理
        video.addEventListener('pause', () => {
            isAnalyzing = false;
            recognition.stop();
        });

        // エラー処理
        video.addEventListener('error', (error) => {
            isAnalyzing = false;
            transcriptionResult.innerHTML += `<p class="error">エラーが発生しました: ${error.message}</p>`;
        });

        recognition.onerror = (event) => {
            transcriptionResult.innerHTML += `<p class="error">音声認識エラー: ${event.error}</p>`;
        };

        // 動画の再生終了時の処理
        video.addEventListener('ended', () => {
            isAnalyzing = false;
            recognition.stop();
            transcriptionResult.innerHTML += '<p>分析が終了しました。</p>';
        });
    }

    // 動画の分析結果の更新
    function updateVideoAnalysisResults(totalWords, totalDuration, questionCount, fillerCount, speakerSegments, transcriptText) {
        // 会話速度の計算（1分あたりの単語数）
        const speechRate = totalDuration > 0 ? Math.round((totalWords / totalDuration) * 60) : 0;
        document.getElementById('videoSpeechRate').textContent = `${speechRate} 単語/分`;

        // 質問回数の表示
        document.getElementById('videoQuestionCount').textContent = `${questionCount} 回`;

        // フィラー回数の表示
        document.getElementById('videoFillerCount').textContent = `${fillerCount} 回`;

        // 話者比率の計算と表示
        const speakerStats = calculateSpeakerRatio(speakerSegments);
        document.getElementById('videoSpeakerRatio').textContent = 
            `A: ${speakerStats.A}% / B: ${speakerStats.B}%`;

        // キーワード分析の更新
        if (transcriptText) {
            const keywords = analyzeKeywords(transcriptText);
            const keywordsElement = document.getElementById('initialVideoKeywords');
            updateKeywords(keywordsElement, keywords);
        }
    }

    // CSVファイルの分析
    function analyzeCSV(file) {
        const csvResult = document.querySelector('#csvResult .result-content');
        const csvInfo = csvResult.querySelector('.csv-info');
        csvInfo.innerHTML = `
            <p>ファイル名: ${file.name}</p>
            <p>サイズ: ${formatFileSize(file.size)}</p>
            <p>分析中...</p>
        `;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvData = e.target.result;
            const rows = csvData.split('\n').filter(row => row.trim());
            const headers = rows[0].split(',');
            
            // CSVデータの解析
            const data = rows.slice(1).map(row => {
                const values = row.split(',');
                return {
                    user: values[0],
                    callCount1: parseInt(values[1]) || 0,
                    callCount2: parseInt(values[2]) || 0,
                    duration1: parseInt(values[3]) || 0,
                    duration2: parseInt(values[4]) || 0,
                    speakerRatio1: parseInt(values[5]) || 0,
                    speakerRatio2: parseInt(values[6]) || 0,
                    speechRate1: parseInt(values[7]) || 0,
                    speechRate2: parseInt(values[8]) || 0
                };
            });

            csvInfo.innerHTML = `
                <p>ファイル名: ${file.name}</p>
                <p>サイズ: ${formatFileSize(file.size)}</p>
                <p>データ件数: ${data.length}件</p>
            `;

            // グラフの描画
            createCallCountChart(data);
            createCallDurationChart(data);
            createSpeakerRatioChart(data);
            createSpeechRateChart(data);
        };
        reader.readAsText(file);
    }

    // コール総数比較グラフの作成
    function createCallCountChart(data) {
        const ctx = document.getElementById('callCountChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.user),
                datasets: [
                    {
                        label: '対象コール数①',
                        data: data.map(d => d.callCount1),
                        backgroundColor: 'rgba(52, 152, 219, 0.5)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '対象コール数②',
                        data: data.map(d => d.callCount2),
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'コール数'
                        }
                    }
                }
            }
        });
    }

    // コール合計時間比較グラフの作成
    function createCallDurationChart(data) {
        const ctx = document.getElementById('callDurationChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.user),
                datasets: [
                    {
                        label: '合計時間①',
                        data: data.map(d => d.duration1),
                        backgroundColor: 'rgba(52, 152, 219, 0.5)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '合計時間②',
                        data: data.map(d => d.duration2),
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '時間（分）'
                        }
                    }
                }
            }
        });
    }

    // 話者比率比較グラフの作成
    function createSpeakerRatioChart(data) {
        const ctx = document.getElementById('speakerRatioChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.user),
                datasets: [
                    {
                        label: '話者比率①',
                        data: data.map(d => d.speakerRatio1),
                        backgroundColor: 'rgba(52, 152, 219, 0.5)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '話者比率②',
                        data: data.map(d => d.speakerRatio2),
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '比率（%）'
                        }
                    }
                }
            }
        });
    }

    // 話速差比較グラフの作成
    function createSpeechRateChart(data) {
        const ctx = document.getElementById('speechRateChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.user),
                datasets: [
                    {
                        label: '話速①',
                        data: data.map(d => d.speechRate1),
                        backgroundColor: 'rgba(52, 152, 219, 0.5)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '話速②',
                        data: data.map(d => d.speechRate2),
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '話速（文字/分）'
                        }
                    }
                }
            }
        });
    }

    // ファイルサイズのフォーマット
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 時間フォーマット関数
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // キーワード分析の実行
    function analyzeKeywords(text) {
        // 形態素解析のための簡易的な実装
        // 実際の環境では形態素解析ライブラリを使用することを推奨
        const words = text.split(/[\s,。、！？!?]+/);
        const wordCount = {};
        
        // ストップワード（除外する語）
        const stopWords = ['は', 'が', 'の', 'に', 'を', 'で', 'と', 'も', 'な', 'です', 'ます'];
        
        words.forEach(word => {
            if (word.length > 1 && !stopWords.includes(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        // 出現回数でソートして上位5件を取得
        const sortedWords = Object.entries(wordCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return sortedWords;
    }

    // キーワード表示の更新
    function updateKeywords(keywordsElement, keywords) {
        if (keywords.length === 0) {
            keywordsElement.innerHTML = '<span class="no-keywords">未検出</span>';
            return;
        }

        keywordsElement.innerHTML = keywords.map(([word, count]) => `
            <span class="keyword-tag">
                ${word}<span class="keyword-count">(${count})</span>
            </span>
        `).join('');
    }
}); 