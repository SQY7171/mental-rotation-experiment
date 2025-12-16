// 实验参数配置
const EXPERIMENT_CONFIG = {
    characters: ['R', 'J', 'G', '2', '5', '7'],
    angles: [0, 60, 120, 180, 240, 300],
    practiceTrials: 12,
    experimentalTrials: 72,
    timing: {
        fixation: 500,
        maxResponse: 3000,
        feedback: 500
    },
    keys: {
        normal: 'f',
        mirror: 'j'
    }
};

// 实验状态
let experimentState = {
    phase: 'practice',
    isRunning: false,
    isPaused: false,
    currentTrial: 0,
    totalTrials: 0,
    trials: [],
    startTime: null,
    correctCount: 0,
    totalRT: 0,
    data: [],
    
    // 新增：计时器引用
    timers: {
        fixationTimer: null,
        responseTimer: null,
        feedbackTimer: null
    },
    
    // 新增：状态锁，防止重复触发
    stateLock: false
};

// DOM元素
const pages = {
    instructions: document.getElementById('instructions-page'),
    experiment: document.getElementById('experiment-page'),
    results: document.getElementById('results-page')
};

// 清除所有计时器
function clearAllTimers() {
    if (experimentState.timers.fixationTimer) {
        clearTimeout(experimentState.timers.fixationTimer);
        experimentState.timers.fixationTimer = null;
    }
    if (experimentState.timers.responseTimer) {
        clearTimeout(experimentState.timers.responseTimer);
        experimentState.timers.responseTimer = null;
    }
    if (experimentState.timers.feedbackTimer) {
        clearTimeout(experimentState.timers.feedbackTimer);
        experimentState.timers.feedbackTimer = null;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定开始实验按钮
    document.getElementById('start-experiment').addEventListener('click', startExperiment);
    
    // 绑定控制按钮
    document.getElementById('pause-btn').addEventListener('click', pauseExperiment);
    document.getElementById('quit-btn').addEventListener('click', showPauseModal);
    document.getElementById('resume-btn').addEventListener('click', resumeExperiment);
    document.getElementById('confirm-quit-btn').addEventListener('click', quitExperiment);
    
    // 绑定结果页面按钮
    document.getElementById('download-btn').addEventListener('click', downloadData);
    document.getElementById('restart-btn').addEventListener('click', restartExperiment);
    
    // 初始化图表
    initCharts();
    
    // 键盘事件监听
    document.addEventListener('keydown', handleKeyPress);
    
    console.log('实验系统初始化完成');
});

// 开始实验
function startExperiment() {
    // 确认开始
    if (!confirm('实验即将开始！\n\n请确认您已理解以下要求：\n1. 判断字符是正常(F键)还是镜像(J键)\n2. 忽略字符的旋转角度\n3. 尽量快速且准确地反应\n\n准备好后点击"确定"开始练习阶段。')) {
        return;
    }
    
    // 切换到实验页面
    showPage('experiment');
    
    // 初始化实验状态
    experimentState = {
        phase: 'practice',
        isRunning: false,
        isPaused: false,
        currentTrial: 0,
        totalTrials: EXPERIMENT_CONFIG.practiceTrials,
        trials: [],
        startTime: Date.now(),
        correctCount: 0,
        totalRT: 0,
        data: [],
        
        // 新增：计时器引用
        timers: {
            fixationTimer: null,
            responseTimer: null,
            feedbackTimer: null
        },
        
        // 新增：状态锁
        stateLock: false
    };
    
    // 生成练习试次
    generateTrials(true);
    
    // 更新UI
    updateExperimentInfo();
    updatePhaseIndicator();
    
    // 开始第一个试次
    startTrial();
}

// 生成试次
function generateTrials(isPractice) {
    experimentState.trials = [];
    const trialCount = isPractice ? EXPERIMENT_CONFIG.practiceTrials : EXPERIMENT_CONFIG.experimentalTrials;
    
    // 创建平衡的试次序列
    let trialsPool = [];
    
    // 创建所有可能的组合
    for (let char of EXPERIMENT_CONFIG.characters) {
        for (let angle of EXPERIMENT_CONFIG.angles) {
            for (let version of ['normal', 'mirror']) {
                trialsPool.push({
                    character: char,
                    angle: angle,
                    version: version
                });
            }
        }
    }
    
    // 随机打乱顺序
    for (let i = trialsPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trialsPool[i], trialsPool[j]] = [trialsPool[j], trialsPool[i]];
    }
    
    // 选择前trialCount个试次
    for (let i = 0; i < Math.min(trialCount, trialsPool.length); i++) {
        const trial = trialsPool[i];
        experimentState.trials.push({
            trialNumber: i + 1,
            character: trial.character,
            angle: trial.angle,
            version: trial.version,
            expected: null,
            condition: 'N',
            response: null,
            responseTime: null,
            isCorrect: null,
            timestamp: null
        });
    }
}

// 开始一个试次
function startTrial() {
    if (experimentState.currentTrial >= experimentState.totalTrials) {
        finishPhase();
        return;
    }
    
    // 清除之前的计时器
    clearAllTimers();
    
    // 重置状态锁
    experimentState.stateLock = false;
    
    experimentState.isRunning = true;
    experimentState.currentTrial++;
    
    // 更新UI
    updateTrialCounter();
    updateProgress();
    
    // 显示注视点，隐藏其他
    document.getElementById('fixation').style.display = 'block';
    document.getElementById('stimulus').style.display = 'none';
    document.getElementById('feedback').style.display = 'none';
    
    // 设置注视点计时器
    experimentState.timers.fixationTimer = setTimeout(() => {
        if (!experimentState.isPaused) {
            showStimulus();
        }
    }, EXPERIMENT_CONFIG.timing.fixation);
}

// 显示刺激
function showStimulus() {
    // 如果状态被锁定，不执行
    if (experimentState.stateLock) return;
    
    const trial = experimentState.trials[experimentState.currentTrial - 1];
    
    // 隐藏注视点，显示刺激
    document.getElementById('fixation').style.display = 'none';
    document.getElementById('stimulus').style.display = 'block';
    document.getElementById('feedback').style.display = 'none';
    
    // 显示字符
    const charDisplay = document.getElementById('character-display');
    charDisplay.textContent = trial.character;
    
    // 应用变换：如果是镜像版本，先水平翻转再旋转
    let transform = '';
    if (trial.version === 'mirror') {
        transform += 'scaleX(-1) ';
    }
    transform += `rotate(${trial.angle}deg)`;
    charDisplay.style.transform = transform;
    
    // 记录刺激开始时间
    experimentState.stimulusStartTime = Date.now();
    
    // 设置反应超时计时器
    experimentState.timers.responseTimer = setTimeout(() => {
        if (!experimentState.stateLock) {
            recordResponse(null);
        }
    }, EXPERIMENT_CONFIG.timing.maxResponse);
}

// 处理按键
function handleKeyPress(event) {
    // 如果实验暂停或没有运行，不处理按键
    if (!experimentState.isRunning || experimentState.isPaused) return;
    
    // 如果状态被锁定，不处理按键
    if (experimentState.stateLock) return;
    
    const key = event.key.toLowerCase();
    let response = null;
    
    // 只处理F和J键
    if (key === EXPERIMENT_CONFIG.keys.normal) {
        response = 'normal';
    } else if (key === EXPERIMENT_CONFIG.keys.mirror) {
        response = 'mirror';
    } else {
        return;
    }
    
    // 防止重复按键
    if (experimentState.stateLock) return;
    
    // 锁定状态，防止重复处理
    experimentState.stateLock = true;
    
    // 清除响应超时计时器
    if (experimentState.timers.responseTimer) {
        clearTimeout(experimentState.timers.responseTimer);
        experimentState.timers.responseTimer = null;
    }
    
    // 记录响应
    recordResponse(response);
}

// 记录响应
function recordResponse(response) {
    const trial = experimentState.trials[experimentState.currentTrial - 1];
    
    // 计算反应时间（确保至少有一定延迟）
    const now = Date.now();
    const stimulusStartTime = experimentState.stimulusStartTime || now;
    const responseTime = Math.max(50, now - stimulusStartTime); // 确保至少有50ms
    
    // 确定是否正确
    const isCorrect = (response === trial.version);
    
    // 确保response不为null
    response = response || 'timeout';
    
    // 更新试次数据
    trial.response = response;
    trial.responseTime = responseTime;
    trial.isCorrect = isCorrect;
    trial.timestamp = new Date().toISOString();
    
    // 更新统计
    if (isCorrect && response !== 'timeout') {
        experimentState.correctCount++;
        experimentState.totalRT += responseTime;
    }
    
    // 保存到数据数组
    experimentState.data.push({
        trial: experimentState.currentTrial,
        character: trial.character,
        angle: trial.angle,
        version: trial.version,
        response: response,
        responseTime: responseTime,
        isCorrect: isCorrect,
        phase: experimentState.phase,
        timestamp: trial.timestamp
    });
    
    // 更新UI
    updateAccuracy();
    
    // 显示反馈
    showFeedback(isCorrect, responseTime);
}

// 显示反馈
function showFeedback(isCorrect, responseTime) {
    // 隐藏刺激，显示反馈
    document.getElementById('stimulus').style.display = 'none';
    document.getElementById('feedback').style.display = 'block';
    
    const icon = document.getElementById('feedback-icon');
    const message = document.getElementById('feedback-message');
    const rtDisplay = document.getElementById('reaction-time-display');
    
    // 设置反馈内容
    if (isCorrect) {
        icon.textContent = '✓';
        icon.style.color = '#000000';
        message.textContent = '正确！';
        message.style.color = '#000000';
    } else {
        icon.textContent = '✗';
        icon.style.color = '#666666';
        message.textContent = '错误';
        message.style.color = '#666666';
    }
    
    rtDisplay.textContent = `反应时: ${responseTime}ms`;
    
    // 设置反馈计时器，确保至少显示500ms
    experimentState.timers.feedbackTimer = setTimeout(() => {
        startTrial();
    }, EXPERIMENT_CONFIG.timing.feedback);
}

// 完成当前阶段
function finishPhase() {
    experimentState.isRunning = false;
    experimentState.stateLock = false;
    clearAllTimers();
    
    if (experimentState.phase === 'practice') {
        // 练习结束，询问是否开始正式实验
        const accuracy = calculateAccuracy();
        const avgRT = calculateAverageRT();
        
        if (confirm('练习阶段结束！\n\n您的表现：\n' +
                   `正确率: ${accuracy}%\n` +
                   `平均反应时: ${avgRT}ms\n\n` +
                   '您准备好开始正式实验了吗？')) {
            // 切换到正式实验
            experimentState.phase = 'experiment';
            experimentState.currentTrial = 0;
            experimentState.totalTrials = EXPERIMENT_CONFIG.experimentalTrials;
            experimentState.correctCount = 0;
            experimentState.totalRT = 0;
            experimentState.data = []; // 清空练习数据
            
            // 生成正式实验试次
            generateTrials(false);
            
            // 更新UI
            updatePhaseIndicator();
            updateTrialCounter();
            updateAccuracy();
            updateProgress();
            
            // 开始正式实验
            startTrial();
        } else {
            quitExperiment();
        }
    } else {
        // 正式实验结束，显示结果
        showResults();
    }
}

// 显示结果页面
function showResults() {
    showPage('results');
    
    // 计算统计数据
    const accuracy = calculateAccuracy();
    const avgRT = calculateAverageRT();
    const totalTrials = experimentState.data.length;
    const duration = Math.floor((Date.now() - experimentState.startTime) / 1000);
    
    // 更新结果页面
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;
    document.getElementById('final-avg-rt').textContent = `${avgRT}ms`;
    document.getElementById('total-trials').textContent = totalTrials;
    document.getElementById('experiment-time').textContent = `${duration}s`;
    
    // 填充数据表格
    populateDataTable();
    
    // 更新图表
    updateCharts();
}

// 计算准确率
function calculateAccuracy() {
    if (experimentState.data.length === 0) return 0;
    const correctTrials = experimentState.data.filter(trial => trial.isCorrect).length;
    return Math.round((correctTrials / experimentState.data.length) * 100);
}

// 计算平均反应时
function calculateAverageRT() {
    if (experimentState.data.length === 0) return 0;
    const correctTrials = experimentState.data.filter(trial => trial.isCorrect && trial.responseTime);
    if (correctTrials.length === 0) return 0;
    const totalRT = correctTrials.reduce((sum, trial) => sum + trial.responseTime, 0);
    return Math.round(totalRT / correctTrials.length);
}

// 暂停实验
function pauseExperiment() {
    experimentState.isPaused = true;
    clearAllTimers();
    document.getElementById('pause-modal').style.display = 'flex';
}

// 显示暂停模态框
function showPauseModal() {
    pauseExperiment();
}

// 继续实验
function resumeExperiment() {
    experimentState.isPaused = false;
    document.getElementById('pause-modal').style.display = 'none';
    
    // 如果实验正在运行，重新开始当前试次
    if (experimentState.isRunning) {
        startTrial();
    }
}

// 退出实验
function quitExperiment() {
    if (confirm('确定要退出实验吗？所有数据将丢失。')) {
        clearAllTimers();
        showPage('instructions');
    }
}

// 重新开始实验
function restartExperiment() {
    if (confirm('确定要重新开始实验吗？当前数据将丢失。')) {
        clearAllTimers();
        showPage('instructions');
    }
}

// 下载数据
function downloadData() {
    // 准备CSV数据
    const headers = ['试次', '字符', '角度', '版本', '反应', '正确', '反应时(ms)', '阶段', '时间戳'];
    const rows = experimentState.data.map(trial => [
        trial.trial,
        trial.character,
        trial.angle,
        trial.version,
        trial.response || '无反应',
        trial.isCorrect ? '正确' : '错误',
        trial.responseTime || '',
        trial.phase,
        trial.timestamp
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `心理旋转实验_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 更新UI函数
function showPage(pageName) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    pages[pageName].classList.add('active');
}

function updatePhaseIndicator() {
    document.getElementById('phase-indicator').textContent = 
        experimentState.phase === 'practice' ? '练习阶段' : '正式实验';
    document.getElementById('current-phase').textContent = 
        experimentState.phase === 'practice' ? '练习' : '正式';
}

function updateTrialCounter() {
    document.getElementById('trial-counter').textContent = 
        `${experimentState.currentTrial}/${experimentState.totalTrials}`;
}

function updateAccuracy() {
    const accuracy = experimentState.data.length > 0 ? 
        Math.round((experimentState.correctCount / experimentState.data.length) * 100) : 0;
    const avgRT = experimentState.correctCount > 0 ? 
        Math.round(experimentState.totalRT / experimentState.correctCount) : 0;
    
    document.getElementById('accuracy-display').textContent = `${accuracy}%`;
    document.getElementById('average-rt').textContent = `${avgRT}ms`;
}

function updateProgress() {
    const progress = (experimentState.currentTrial / experimentState.totalTrials) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-percent').textContent = Math.round(progress);
}

function updateExperimentInfo() {
    document.getElementById('trial-counter').textContent = `0/${experimentState.totalTrials}`;
    document.getElementById('accuracy-display').textContent = '0%';
    document.getElementById('average-rt').textContent = '0ms';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-percent').textContent = '0';
}

// 初始化图表
function initCharts() {
    // 反应时图表
    const rtCtx = document.getElementById('rt-chart').getContext('2d');
    window.rtChart = new Chart(rtCtx, {
        type: 'line',
        data: {
            labels: EXPERIMENT_CONFIG.angles,
            datasets: [{
                label: '反应时 (ms)',
                data: [],
                borderColor: '#000000',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '反应时 (ms)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '旋转角度 (°)'
                    }
                }
            }
        }
    });
    
    // 正确率图表
    const accCtx = document.getElementById('accuracy-chart').getContext('2d');
    window.accChart = new Chart(accCtx, {
        type: 'bar',
        data: {
            labels: ['正常版本', '镜像版本'],
            datasets: [{
                label: '正确率 (%)',
                data: [0, 0],
                backgroundColor: ['#333333', '#666666']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '正确率 (%)'
                    }
                }
            }
        }
    });
}

// 更新图表
function updateCharts() {
    // 按角度计算平均反应时
    const angleData = {};
    EXPERIMENT_CONFIG.angles.forEach(angle => {
        angleData[angle] = { sum: 0, count: 0 };
    });
    
    experimentState.data.forEach(trial => {
        if (trial.isCorrect && trial.responseTime) {
            angleData[trial.angle].sum += trial.responseTime;
            angleData[trial.angle].count++;
        }
    });
    
    const rtData = EXPERIMENT_CONFIG.angles.map(angle => {
        const data = angleData[angle];
        return data.count > 0 ? Math.round(data.sum / data.count) : 0;
    });
    
    // 按版本计算正确率
    const versionData = { normal: { correct: 0, total: 0 }, mirror: { correct: 0, total: 0 } };
    
    experimentState.data.forEach(trial => {
        versionData[trial.version].total++;
        if (trial.isCorrect) {
            versionData[trial.version].correct++;
        }
    });
    
    const normalAccuracy = versionData.normal.total > 0 ? 
        Math.round((versionData.normal.correct / versionData.normal.total) * 100) : 0;
    const mirrorAccuracy = versionData.mirror.total > 0 ? 
        Math.round((versionData.mirror.correct / versionData.mirror.total) * 100) : 0;
    
    // 更新图表
    if (window.rtChart) {
        window.rtChart.data.datasets[0].data = rtData;
        window.rtChart.update();
    }
    
    if (window.accChart) {
        window.accChart.data.datasets[0].data = [normalAccuracy, mirrorAccuracy];
        window.accChart.update();
    }
}

// 填充数据表格
function populateDataTable() {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';
    
    experimentState.data.forEach((trial, index) => {
        const row = document.createElement('tr');
        
        // 试次号
        const trialCell = document.createElement('td');
        trialCell.textContent = index + 1;
        row.appendChild(trialCell);
        
        // 字符
        const charCell = document.createElement('td');
        charCell.textContent = trial.character;
        row.appendChild(charCell);
        
        // 角度
        const angleCell = document.createElement('td');
        angleCell.textContent = `${trial.angle}°`;
        row.appendChild(angleCell);
        
        // 版本
        const versionCell = document.createElement('td');
        versionCell.textContent = trial.version === 'normal' ? '正常' : '镜像';
        row.appendChild(versionCell);
        
        // 反应
        const responseCell = document.createElement('td');
        responseCell.textContent = trial.response ? 
            (trial.response === 'normal' ? '正常' : trial.response === 'mirror' ? '镜像' : '超时') : '超时';
        row.appendChild(responseCell);
        
        // 正确性
        const correctCell = document.createElement('td');
        correctCell.textContent = trial.isCorrect ? '正确' : '错误';
        correctCell.style.color = trial.isCorrect ? '#000000' : '#666666';
        row.appendChild(correctCell);
        
        // 反应时
        const rtCell = document.createElement('td');
        rtCell.textContent = trial.responseTime ? `${trial.responseTime}ms` : '超时';
        row.appendChild(rtCell);
        
        tbody.appendChild(row);
    });
}