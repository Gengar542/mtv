/* ==========================================================================
   WEB AUDIO API CANVAS VISUALIZER (MTV STAGE ENGINE)
   ========================================================================== */

class MTVVisualizer {
    constructor(canvasId, audioElement) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audio = audioElement;
        
        this.audioCtx = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.isInitialized = false;

        this.currentMode = 'bars'; // 'bars', 'wave', 'particles', 'pulse'
        this.animationId = null;
        this.particles = [];

        this.initCanvasSize();
        window.addEventListener('resize', () => this.initCanvasSize());
        this.initParticles();
    }

    initCanvasSize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * (window.devicePixelRatio || 1);
        this.canvas.height = rect.height * (window.devicePixelRatio || 1);
        this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }

    setupAudioContext() {
        if (this.isInitialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.source = this.audioCtx.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.isInitialized = true;
        } catch (e) {
            console.warn("AudioContext setup deferred or restricted:", e);
        }
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    start() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (!this.animationId) {
            this.render();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: Math.random() * 800,
                y: Math.random() * 500,
                radius: Math.random() * 4 + 1,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: ['#FF0055', '#00F0FF', '#FFD700', '#1DB954'][Math.floor(Math.random() * 4)]
            });
        }
    }

    render() {
        this.animationId = requestAnimationFrame(() => this.render());

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas with dark gradient
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#050508');
        bgGrad.addColorStop(1, '#12101a');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, width, height);

        if (this.analyser && this.isInitialized) {
            this.analyser.getByteFrequencyData(this.dataArray);
        } else {
            // Simulated data if audio node not active yet
            this.dataArray = new Uint8Array(128);
            for (let i = 0; i < 128; i++) {
                this.dataArray[i] = Math.sin(Date.now() * 0.005 + i * 0.1) * 40 + 50;
            }
        }

        switch (this.currentMode) {
            case 'bars':
                this.drawBars(width, height);
                break;
            case 'wave':
                this.drawWave(width, height);
                break;
            case 'particles':
                this.drawParticles(width, height);
                break;
            case 'pulse':
                this.drawPulse(width, height);
                break;
            default:
                this.drawBars(width, height);
        }
    }

    /* VISUALIZER 1: NEON BARS */
    drawBars(width, height) {
        const barWidth = (width / this.bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * (height * 0.7);

            const grad = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
            grad.addColorStop(0, '#00F0FF');
            grad.addColorStop(0.5, '#FF0055');
            grad.addColorStop(1, '#1DB954');

            this.ctx.fillStyle = grad;
            this.ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

            // Top Glow Cap
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(x, height - barHeight - 4, barWidth - 2, 3);

            x += barWidth;
        }
    }

    /* VISUALIZER 2: OSCILLOSCOPE WAVE */
    drawWave(width, height) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#00F0FF';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00F0FF';
        this.ctx.beginPath();

        const sliceWidth = width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = (v * height) / 3 + height / 3;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // Reset
    }

    /* VISUALIZER 3: PARTICLES TUNNEL */
    drawParticles(width, height) {
        const avgFreq = this.dataArray.reduce((a, b) => a + b, 0) / this.bufferLength;

        this.particles.forEach((p) => {
            p.x += p.vx * (1 + avgFreq * 0.02);
            p.y += p.vy * (1 + avgFreq * 0.02);

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            const radius = p.radius + (avgFreq / 255) * 8;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    /* VISUALIZER 4: MTV CIRCULAR PULSAR */
    drawPulse(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const avgFreq = this.dataArray.reduce((a, b) => a + b, 0) / this.bufferLength;
        const baseRadius = 80 + (avgFreq / 255) * 40;

        for (let r = 3; r >= 1; r--) {
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, baseRadius * (r * 0.4 + 0.6), 0, Math.PI * 2);
            this.ctx.strokeStyle = r === 1 ? '#FF0055' : r === 2 ? '#FFD700' : '#00F0FF';
            this.ctx.lineWidth = r * 2;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // Concentric equalizer rays
        const numRays = 36;
        for (let i = 0; i < numRays; i++) {
            const angle = (i * Math.PI * 2) / numRays;
            const freqVal = this.dataArray[i % this.bufferLength] || 50;
            const rayLen = (freqVal / 255) * 100;

            const x1 = centerX + Math.cos(angle) * baseRadius;
            const y1 = centerY + Math.sin(angle) * baseRadius;
            const x2 = centerX + Math.cos(angle) * (baseRadius + rayLen);
            const y2 = centerY + Math.sin(angle) * (baseRadius + rayLen);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = '#1DB954';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }
}
