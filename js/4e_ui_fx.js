let particleCtx = null;
let particles = [];

function updateCrackStage() {
    if(!gameState || !gameState.user) return;
    const hp = gameState.user.hp;
    const box = document.getElementById("questionBox");
    if(!box) return;

    box.className = "question-box"; 
    if (hp <= 80 && hp > 60) box.classList.add("crack-stage-1");
    else if (hp <= 60 && hp > 40) box.classList.add("crack-stage-2");
    else if (hp <= 40 && hp > 20) box.classList.add("crack-stage-3");
    else if (hp <= 20 && hp > 0) box.classList.add("crack-stage-4");
    else if (hp <= 0) box.classList.add("crack-stage-5");
}

function resizeCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

function createParticle(x, y, color, type) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
        x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1.0, color: color, type: type, size: Math.random() * 5 + 2
    });
}

function createBurst(x, y, color, count, type = 'spark', power = 5) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * power + 1.5;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.random() * 0.4 + 0.65,
            color: color,
            type: type,
            size: Math.random() * 6 + 2
        });
    }
}

function fireBeam(startX, startY, endX, endY, color) {
    const steps = 28;
    for (let i = 0; i < steps; i++) {
        setTimeout(() => {
            const progress = i / steps;
            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;
            for(let j=0; j<8; j++) {
                particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    life: 0.85,
                    color: j % 3 === 0 ? '#fff2b0' : color,
                    type: j % 3 === 0 ? 'spark' : 'beam',
                    size: j % 3 === 0 ? 2 : Math.random() * 4 + 4
                });
            }
        }, i * 10);
    }
}

function createFixedVFX(className, x, y, duration = 650) {
    const node = document.createElement('div');
    node.className = className;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.setAttribute('aria-hidden', 'true');
    document.body.appendChild(node);
    setTimeout(() => node.remove(), duration);
}

function createBeamVFX(startX, startY, endX, endY, className, duration = 560) {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const beam = document.createElement('div');
    beam.className = className;
    beam.style.left = `${startX}px`;
    beam.style.top = `${startY}px`;
    beam.style.width = `${distance}px`;
    beam.style.transform = `rotate(${angle}rad)`;
    beam.setAttribute('aria-hidden', 'true');
    document.body.appendChild(beam);
    setTimeout(() => beam.remove(), duration);
}

function flashDamageOverlay() {
    const overlay = document.getElementById('damageOverlay');
    if (!overlay) return;
    overlay.classList.remove('damage-pulse');
    void overlay.offsetWidth;
    overlay.classList.add('damage-pulse');
}

function playPlayerHitVFX(startX, startY, endX, endY) {
    const boss = document.getElementById("bossImage");
    if (!boss) return;

    if ([startX, startY, endX, endY].some(value => typeof value !== 'number' || Number.isNaN(value))) {
        const box = document.getElementById("questionBox");
        const bossRect = boss.getBoundingClientRect();
        const boxRect = box ? box.getBoundingClientRect() : bossRect;
        startX = boxRect.left + boxRect.width / 2;
        startY = boxRect.top + Math.min(38, boxRect.height * 0.28);
        endX = bossRect.left + bossRect.width / 2;
        endY = bossRect.top + bossRect.height * 0.48;
    }

    triggerAnimation(boss, "boss-hit-impact");
    createBeamVFX(startX, startY, endX, endY, 'player-energy-beam', 620);
    fireBeam(startX, startY, endX, endY, '#4dd8ff');

    setTimeout(() => {
        createFixedVFX('player-impact-burst', endX, endY, 720);
        createBurst(endX, endY, '#4dd8ff', 28, 'spark', 8);
        createBurst(endX, endY, '#ffffff', 18, 'spark', 5);
        createBurst(endX, endY, '#f1c40f', 10, 'spark', 6);
    }, 260);
}

function playDragonAttackVFX(startX, startY, endX, endY) {
    fireBeam(startX, startY, endX, endY, '#e74c3c');
    setTimeout(() => {
        createFixedVFX('dragon-impact-burst', endX, endY, 700);
        createBurst(endX, endY, '#ff4d4d', 32, 'ember', 9);
        createBurst(endX, endY, '#ffffff', 10, 'spark', 5);
        flashDamageOverlay();
    }, 260);
}

function loopParticles() {
    if(!particleCtx) return;
    particleCtx.clearRect(0, 0, particleCtx.canvas.width, particleCtx.canvas.height);
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.type === 'ember' ? 0.03 : 0.01;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= p.type === 'beam' ? 0.035 : 0.025;
        particleCtx.globalAlpha = p.life;
        particleCtx.shadowBlur = p.type === 'beam' ? 18 : 10;
        particleCtx.shadowColor = p.color;
        particleCtx.fillStyle = p.color;
        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, Math.max(1, (p.size || 4) * (p.type === 'beam' ? 1 : p.life)), 0, Math.PI * 2);
        particleCtx.fill();
    }
    particleCtx.shadowBlur = 0;
    particleCtx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
    requestAnimationFrame(loopParticles);
}
function triggerAnimation(element, className) {
    if(!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}
