class MentalRotationExperiment {
    constructor() {
        this.participantData = {};
        this.trials = [];
        this.currentTrial = 0;
        this.practiceTrials = [];
        this.isPractice = true;
        this.startTime = null;
        this.responses = [];
        
        this.angles = [0, 60, 120, 180, 240, 300];
        this.totalTrials = 60;
        this.practiceCount = 6;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.generateTrials();
        this.generatePracticeTrials();
        this.showScreen('welcome-screen');
        this.updateTrialCount();
    }
    
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.collectDemographics()) {
                this.showScreen('practice-instructions');
            } else {
                alert('请填写所有必填信息');
            }
        });
        
        document.getElementById('practice-start-btn').addEventListener('click', () => {
            this.startPractice();
        });
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.startNextHalf();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });
        
        document.getElementById('download-csv-btn').addEventListener('click', () => {
            this.downloadCSVData();
        });
        
        document.getElementById('download-json-btn').addEventListener('click', () => {
            this.downloadJSONData();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && document.getElementById('practice-instructions').classList.contains('active')) {
                this.startPractice();
            }
            
            if (e.key === ' ' && document.getElementById('break-screen').classList.contains('active')) {
                this.startNextHalf();
            }
            
            if (document.getElementById('experiment-screen').classList.contains('active')) {
                if (e.key === 'f' || e.key === 'F') {
                    this.recordResponse('normal');
                } else if (e.key === 'j' || e.key === 'J') {
                    this.recordResponse('mirrored');
                }
            }
        });
    }
    
    collectDemographics() {
        const participantId = document.getElementById('participant-id').value.trim();
        const age = document.getElementById('age').value;
        const gender = document.querySelector('input[name="gender"]:checked');
        const handedness = document.querySelector('input[name="handedness"]:checked');
        const education = document.getElementById('education').value;
        
        // 验证必填字段
        if (!participantId) {
            alert('请填写参与者编号');
            return false;
        }
        
        if (!age || age < 1 || age > 120) {
            alert('请输入有效的年龄（1-120岁）');
            return false;
        }
        
        if (!gender) {
            alert('请选择性别');
            return false;
        }
        
        if (!handedness) {
            alert('请选择利手');
            return false;
        }
        
        if (!education) {
            alert('请选择教育程度');
            return false;
        }
        
        this.participantData = {
            id: participantId,
            age: parseInt(age),
            gender: gender.value,
            handedness: handedness.value,
            education: education,
            startTime: new Date().toISOString()
        };
        
        return true;
    }
    
    generatePracticeTrials() {
        this.practiceTrials = [];
        for (let i = 0; i < this.practiceCount; i++) {
            const isNormal = Math.random() > 0.5;
            const angle = this.angles[Math.floor(Math.random() * this.angles.length)];
            this.practiceTrials.push({ isNormal, angle });
        }
    }
    
    generateTrials() {
        this.trials = [];
        const trialsPerAngle = this.totalTrials / this.angles.length;
        
        this.angles.forEach(angle => {
            for (let i = 0; i < trialsPerAngle; i++) {
                const isNormal = Math.random() > 0.5;
                this.trials.push({ isNormal, angle });
            }
        });
        
        this.trials = this.shuffleArray(this.trials);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    startPractice() {
        this.isPractice = true;
        this.currentTrial = 0;
        this.responses = [];
        this.showScreen('experiment-screen');
        this.updateProgress();
        this.runTrial(this.practiceTrials[0]);
    }
    
    startExperiment() {
        this.isPractice = false;
        this.currentTrial = 0;
        this.responses = [];
        this.showScreen('experiment-screen');
        this.updateProgress();
        this.runTrial(this.trials[0]);
    }
    
    startNextHalf() {
        if (this.currentTrial >= this.trials.length / 2) {
            this.endExperiment();
        } else {
            this.showScreen('experiment-screen');
            this.updateProgress();
            this.runTrial(this.trials[this.currentTrial]);
        }
    }
    
    runTrial(trial) {
        const fixation = document.getElementById('fixation');
        const letterDisplay = document.getElementById('letter-display');
        const feedback = document.getElementById('feedback');
        
        feedback.textContent = '';
        feedback.className = 'feedback';
        
        fixation.style.display = 'block';
        letterDisplay.style.display = 'none';
        
        setTimeout(() => {
            fixation.style.display = 'none';
            letterDisplay.style.display = 'block';
            
            letterDisplay.textContent = 'R';
            letterDisplay.style.color = 'black';
            letterDisplay.style.transform = `rotate(${trial.angle}deg) scaleX(${trial.isNormal ? 1 : -1})`;
            
            this.startTime = Date.now();
            
        }, 1000);
    }
    
    recordResponse(response) {
        if (!this.startTime) return;
        
        const reactionTime = Date.now() - this.startTime;
        const trial = this.isPractice ? this.practiceTrials[this.currentTrial] : this.trials[this.currentTrial];
        
        const isCorrect = (response === 'normal' && trial.isNormal) || 
                         (response === 'mirrored' && !trial.isNormal);
        
        const responseData = {
            trialNumber: this.currentTrial + 1,
            isPractice: this.isPractice,
            angle: trial.angle,
            isNormal: trial.isNormal,
            response: response,
            isCorrect: isCorrect,
            reactionTime: reactionTime,
            timestamp: new Date().toISOString()
        };
        
        this.responses.push(responseData);
        
        this.showFeedback(isCorrect);
        this.updateProgress();
        
        setTimeout(() => {
            this.currentTrial++;
            
            if (this.isPractice) {
                if (this.currentTrial < this.practiceTrials.length) {
                    this.runTrial(this.practiceTrials[this.currentTrial]);
                } else {
                    this.showScreen('practice-instructions');
                    document.getElementById('practice-instructions').innerHTML = `
                        <h1>练习完成</h1>
                        <div class="instructions">
                            <p>练习阶段已完成！</p>
                            <p>准备好后，请点击按钮开始正式实验。</p>
                        </div>
                        <button id="start-experiment-btn" class="btn">开始正式实验</button>
                    `;
                    document.getElementById('start-experiment-btn').addEventListener('click', () => {
                        this.startExperiment();
                    });
                }
            } else {
                if (this.currentTrial < this.trials.length) {
                    if (this.currentTrial === Math.floor(this.trials.length / 2)) {
                        this.showBreakScreen();
                    } else {
                        this.runTrial(this.trials[this.currentTrial]);
                    }
                } else {
                    this.endExperiment();
                }
            }
        }, 1000);
    }
    
    showFeedback(isCorrect) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = isCorrect ? '✓ 正确' : '✗ 错误';
        feedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    }
    
    updateProgress() {
        const progress = this.isPractice ? 
            (this.currentTrial + 1) / this.practiceTrials.length * 100 :
            (this.currentTrial + 1) / this.trials.length * 100;
        
        document.getElementById('current-trial').textContent = this.currentTrial + 1;
        
        if (!this.isPractice) {
            document.getElementById('total-trial-count').textContent = this.trials.length;
            document.getElementById('accuracy').textContent = this.calculateAccuracy();
        }
    }
    
    calculateAccuracy() {
        if (this.responses.length === 0) return 0;
        const correctResponses = this.responses.filter(r => r.isCorrect && !r.isPractice).length;
        const practiceResponses = this.responses.filter(r => r.isPractice).length;
        const totalResponses = this.responses.length - practiceResponses;
        
        if (totalResponses === 0) return 0;
        return Math.round((correctResponses / totalResponses) * 100);
    }
    
    showBreakScreen() {
        document.getElementById('completed-trials').textContent = this.currentTrial;
        document.getElementById('current-accuracy').textContent = this.calculateAccuracy();
        this.showScreen('break-screen');
    }
    
    endExperiment() {
        this.showScreen('end-screen');
        
        // 获取正式实验数据
        const formalResponses = this.responses.filter(r => !r.isPractice);
        const totalTrials = formalResponses.length;
        const correctTrials = formalResponses.filter(r => r.isCorrect).length;
        const accuracy = totalTrials > 0 ? Math.round((correctTrials / totalTrials) * 100) : 0;
        
        // 计算反应时统计
        const validResponses = formalResponses.filter(r => r.isCorrect);
        const reactionTimes = validResponses.map(r => r.reactionTime);
        const avgRT = reactionTimes.length > 0 ? 
            Math.round(reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length) : 0;
        const minRT = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;
        const maxRT = reactionTimes.length > 0 ? Math.max(...reactionTimes) : 0;
        
        // 显示汇总统计
        document.getElementById('result-total').textContent = totalTrials;
        document.getElementById('result-correct').textContent = correctTrials;
        document.getElementById('result-accuracy').textContent = `${accuracy}%`;
        document.getElementById('result-rt').textContent = `${avgRT}ms`;
        document.getElementById('result-min-rt').textContent = `${minRT}ms`;
        document.getElementById('result-max-rt').textContent = `${maxRT}ms`;
        
        // 显示参与者信息
        document.getElementById('result-participant-id').textContent = this.participantData.id;
        document.getElementById('result-age').textContent = this.participantData.age;
        
        // 转换性别显示
        const genderMap = {
            'male': '男',
            'female': '女',
            'other': '其他',
            'prefer_not_to_say': '不愿透露'
        };
        document.getElementById('result-gender').textContent = genderMap[this.participantData.gender] || this.participantData.gender;
        
        // 转换利手显示
        const handednessMap = {
            'right': '右利手',
            'left': '左利手',
            'both': '双手皆可'
        };
        document.getElementById('result-handedness').textContent = handednessMap[this.participantData.handedness] || this.participantData.handedness;
        
        // 转换教育程度显示
        const educationMap = {
            'high_school': '高中/中专及以下',
            'bachelor': '本科/大专',
            'master': '硕士',
            'phd': '博士'
        };
        document.getElementById('result-education').textContent = educationMap[this.participantData.education] || this.participantData.education;
        
        // 生成详细数据表格
        this.generateDetailedTable();
        
        // 生成角度统计表格
        this.generateAngleTable();
    }
    
    generateDetailedTable() {
        const tableBody = document.getElementById('detailed-data');
        tableBody.innerHTML = '';
        
        // 只显示正式实验数据
        const formalResponses = this.responses.filter(r => !r.isPractice);
        
        formalResponses.forEach(response => {
            const row = document.createElement('tr');
            
            // 刺激类型转换
            const stimulusType = response.isNormal ? '正常R' : '镜像R';
            
            // 被试反应转换
            const participantResponse = response.response === 'normal' ? '正常R' : '镜像R';
            
            // 是否正确
            const correctText = response.isCorrect ? '是' : '否';
            
            row.innerHTML = `
                <td>${response.trialNumber}</td>
                <td>${response.angle}°</td>
                <td>${stimulusType}</td>
                <td>${participantResponse}</td>
                <td>${correctText}</td>
                <td>${response.reactionTime}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    generateAngleTable() {
        const tableBody = document.getElementById('angle-data');
        tableBody.innerHTML = '';
        
        // 只分析正式实验数据
        const formalResponses = this.responses.filter(r => !r.isPractice);
        
        this.angles.forEach(angle => {
            const angleResponses = formalResponses.filter(r => r.angle === angle);
            const total = angleResponses.length;
            
            if (total > 0) {
                const correctResponses = angleResponses.filter(r => r.isCorrect);
                const correctCount = correctResponses.length;
                const accuracy = Math.round((correctCount / total) * 100);
                
                const avgRT = correctResponses.length > 0 ? 
                    Math.round(correctResponses.reduce((sum, r) => sum + r.reactionTime, 0) / correctResponses.length) : 0;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${angle}°</td>
                    <td>${total}</td>
                    <td>${accuracy}%</td>
                    <td>${avgRT}ms</td>
                `;
                tableBody.appendChild(row);
            }
        });
    }
    
    downloadCSVData() {
        // 创建CSV内容
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // 添加参与者信息
        csvContent += "参与者信息\n";
        csvContent += `参与者编号,${this.participantData.id}\n`;
        csvContent += `年龄,${this.participantData.age}\n`;
        csvContent += `性别,${this.participantData.gender}\n`;
        csvContent += `利手,${this.participantData.handedness}\n`;
        csvContent += `教育程度,${this.participantData.education}\n`;
        csvContent += `实验开始时间,${this.participantData.startTime}\n\n`;
        
        // 添加汇总统计
        csvContent += "实验结果汇总\n";
        const formalResponses = this.responses.filter(r => !r.isPractice);
        const totalTrials = formalResponses.length;
        const correctTrials = formalResponses.filter(r => r.isCorrect).length;
        const accuracy = totalTrials > 0 ? Math.round((correctTrials / totalTrials) * 100) : 0;
        
        const validResponses = formalResponses.filter(r => r.isCorrect);
        const reactionTimes = validResponses.map(r => r.reactionTime);
        const avgRT = reactionTimes.length > 0 ? 
            Math.round(reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length) : 0;
        const minRT = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;
        const maxRT = reactionTimes.length > 0 ? Math.max(...reactionTimes) : 0;
        
        csvContent += `总试次数,${totalTrials}\n`;
        csvContent += `正确试次数,${correctTrials}\n`;
        csvContent += `正确率,${accuracy}%\n`;
        csvContent += `平均反应时,${avgRT}ms\n`;
        csvContent += `最短反应时,${minRT}ms\n`;
        csvContent += `最长反应时,${maxRT}ms\n\n`;
        
        // 添加详细数据表头
        csvContent += "详细试次数据\n";
        csvContent += "试次,角度,刺激类型,被试反应,是否正确,反应时(ms)\n";
        
        // 添加详细数据（只包括正式实验）
        const detailedResponses = this.responses.filter(r => !r.isPractice);
        detailedResponses.forEach(response => {
            const stimulusType = response.isNormal ? '正常R' : '镜像R';
            const participantResponse = response.response === 'normal' ? '正常R' : '镜像R';
            const correctText = response.isCorrect ? '是' : '否';
            
            csvContent += `${response.trialNumber},${response.angle},${stimulusType},${participantResponse},${correctText},${response.reactionTime}\n`;
        });
        
        csvContent += "\n各角度表现\n";
        csvContent += "角度,试次数,正确率,平均反应时\n";
        
        // 添加角度统计
        this.angles.forEach(angle => {
            const angleResponses = formalResponses.filter(r => r.angle === angle);
            const total = angleResponses.length;
            
            if (total > 0) {
                const correctResponses = angleResponses.filter(r => r.isCorrect);
                const correctCount = correctResponses.length;
                const accuracy = Math.round((correctCount / total) * 100);
                
                const avgRT = correctResponses.length > 0 ? 
                    Math.round(correctResponses.reduce((sum, r) => sum + r.reactionTime, 0) / correctResponses.length) : 0;
                
                csvContent += `${angle},${total},${accuracy}%,${avgRT}\n`;
            }
        });
        
        // 创建下载链接
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `心理旋转实验_${this.participantData.id}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    downloadJSONData() {
        const experimentData = {
            participant: this.participantData,
            trials: this.responses,
            summary: {
                totalTrials: this.responses.filter(r => !r.isPractice).length,
                correctTrials: this.responses.filter(r => !r.isPractice && r.isCorrect).length,
                accuracy: this.calculateAccuracy(),
                endTime: new Date().toISOString()
            }
        };
        
        const filename = `心理旋转实验_${this.participantData.id}_${new Date().getTime()}.json`;
        const dataStr = JSON.stringify(experimentData, null, 2);
        
        localStorage.setItem('mentalRotationData', dataStr);
        
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    updateTrialCount() {
        document.getElementById('total-trials').textContent = this.totalTrials;
        document.getElementById('practice-count').textContent = this.practiceCount;
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MentalRotationExperiment();
});