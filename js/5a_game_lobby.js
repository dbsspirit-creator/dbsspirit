async function handleLogin() {
    const studentId = document.getElementById("inputStudentId").value.trim();
    const password = document.getElementById("inputPassword").value.trim();

    if (!studentId) return alert("請輸入學生 ID");

    if (!window.godModeActive) {
        if (gameState.lastSaveTime && Date.now() < gameState.lastSaveTime) {
            alert("時空秩序崩壞！系統檢測到時間回溯，請校準你的裝置時間後再嘗試登入。");
            return;
        }

        const runTimeDate = Date.now() - window._acTime;
        const runTimePerf = performance.now() - window._acPerf;
        const drift = Math.abs(runTimeDate - runTimePerf);

        if (drift > 43200000) {
             alert("時空秩序崩壞！系統檢測到時間流逝異常（運行時鐘不同步），請刷新頁面重新登入。");
             return;
        }
    }

    try {
        const res = await fetch(`/.netlify/functions/student_data?student_id=${encodeURIComponent(studentId)}&password=${encodeURIComponent(password)}`);

        if (res.status === 401) {
            alert("密碼不正確");
            return;
        }

        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();

        if (!data.student_id) {
            alert("找不到此學生 ID！");
            return;
        }

        if (data.game_data) {
             try {
                const parsed = JSON.parse(data.game_data);
                applyGameData(parsed);
             } catch(e) {
                 console.error("Failed to parse game data", e);
             }
        } else {
             // Reset to default for new user
             gameState.user = {
                 name: "", class: "", hp: 100, xp: 0, level: 1, title: "初心新手",
                 energy: 100, unlockedReplayXP: false, coins: 50,
                 lastLoginDate: "", inventorySlots: 5, studentId: studentId
             };
             gameState.stats = { totalCorrect: 0, srCorrect: 0, consecutivePerfect: 0, mixWinCount: 0, mixWinCount5: 0, mixWinCount10: 0, mixWinCount16: 0, mixPerfect16: 0, randomWinCount: 0, totalStudyMins: 0, energyRecovered: 0, totalPlayTime: 0, tryCount: 0, wrongCountTotal: 0, totalClicks: 0, perfectHistory: [], perfectChapterIds: [], perfectFullHpChapterIds: [], lastPerfectChapter: "" };
             gameState.inventory = [];
             gameState.pets = [];
             gameState.dailyTasks = [];
             gameState.masteredChapters = [];
             gameState.solvedQuestionIds = [];
             gameState.solvedSrQuestionIds = [];
             gameState.unlockedAchievements = [];
             gameState.chapterLastPlayed = {};
             gameState.chapterFirstPerfect = {};
             gameState.collectionDates = {};
             gameState.questionStats = {};
             gameState.dailyWinCounts = { date: "", counts: {} };
             gameState.lastSaveTime = 0;
             gameState.dailyPlayTime = 0;
        }

        // Apply student info from DB
        if (data.name_cn || data.name_en || data.class || data.class_no) {
             const n_cn = data.name_cn || "";
             const n_en = data.name_en || "";
             const cls = data.class || "";
             const cls_no = data.class_no || "";
             gameState.user.name = `${n_cn}/${n_en}/${cls}/${cls_no}`;
             if (data.class) gameState.user.class = data.class;
        }

    } catch (e) {
        console.error(e);
        alert("登入失敗，請檢查網絡連接");
        return;
    }

    gameState.user.studentId = studentId;

    const now = new Date();
    const todayStr = now.toDateString();
    const lastLoginTime = gameState.user.lastLoginDate ? new Date(gameState.user.lastLoginDate).getTime() : 0;
    const todayTime = new Date(todayStr).getTime();

    if (todayTime > lastLoginTime) {
        gameState.dailyPlayTime = 0;
        gameState.user.lastLoginDate = todayStr;
        gameState.dailyTasks = [];

        for(let i=1; i<=5; i++) {
            gameState.dailyTasks.push({ id: i, progress: 0, complete: false, claimed: false });
        }

        const db = window.questionsDB || {};
        const keys = Object.keys(db);
        if(keys.length > 0) {
            const randomKey1 = keys[Math.floor(Math.random() * keys.length)];
            const randomKey2 = keys[Math.floor(Math.random() * keys.length)];
            const randomKeyStudy = keys[Math.floor(Math.random() * keys.length)];

            let task2 = gameState.dailyTasks.find(t => t.id === 2);
            if(task2) task2.targetKey = randomKeyStudy;

            gameState.dailyTasks.push({ id: 6, progress: 0, complete: false, claimed: false, targetKey: randomKey1 });
            gameState.dailyTasks.push({ id: 7, progress: 0, complete: false, claimed: false, targetKey: randomKey2 });
        }

        const hour = now.getHours();
        if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20)) {
            setTimeout(() => {
                if (typeof triggerDrop === 'function') triggerDrop('LOGIN_MOMENT_BONUS');
            }, 1000);
        }
    }

    if (!window.godModeActive) {
        if (gameState.dailyPlayTime >= 180 && gameState.user.lastLoginDate === todayStr) {
            alert("精力已耗盡！\n\n系統檢測到你今日累積修煉已超過180分鐘。\n過度修煉恐走火入魔，請明日養足精神再來挑戰！");
            return;
        }
    }

    playMusic('theme');

    let loginTask = gameState.dailyTasks.find(t => t.id === 1);
    if(loginTask && loginTask.progress < 1) loginTask.progress = 1;

    let t2 = gameState.dailyTasks.find(t => t.id === 2);
    if(t2 && !t2.targetKey) {
        const db = window.questionsDB || {};
        const keys = Object.keys(db);
        if(keys.length > 0) t2.targetKey = keys[Math.floor(Math.random() * keys.length)];
    }

    saveGame();
    updateUserDisplay();

    setTimeout(() => {
        resetMenu();
        switchScreen("screen-menu");
    }, 10);
}

function updateLevel() {
    const newLevel = Math.floor(gameState.user.xp / 100) + 1;
    gameState.user.level = newLevel > GAME_CONFIG.MAX_LEVEL ? GAME_CONFIG.MAX_LEVEL : newLevel;
    if (gameState.user.level === GAME_CONFIG.MAX_LEVEL && gameState.user.xp >= GAME_CONFIG.MAX_XP) {
        gameState.user.title = "龍脈•降龍無悔";
    } else {
        let titleIndex = Math.floor((gameState.user.level - 1) / 5.5);
        if (titleIndex >= TITLES.length) titleIndex = TITLES.length - 1;
        gameState.user.title = TITLES[titleIndex];
    }
    if (gameState.user.level >= 99) {
        gameState.user.unlockedReplayXP = true;
    }
    checkAchievements();
    saveGame();
    updateUserDisplay();
    updateBars();
}

function confirmSingleGame() {
    if (!pendingSingleChapterKey) return;
    initGame('single');
}

function confirmMixMode() {
    const count = document.querySelectorAll("#mixChapterList input:checked").length;
    if (count < 2) return alert("請至少選擇 2 篇範文！");

    gameState.mixSelectedKeys = [];
    document.querySelectorAll("#mixChapterList input:checked").forEach(chk => {
        gameState.mixSelectedKeys.push(chk.value);
    });
    initGame('mix');
}
