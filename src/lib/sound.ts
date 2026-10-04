// ==========================================
// Word Cling - Web Audio API Synthesizer
// Clean, pure browser-native sound generator (zero external mp3 assets)
// ==========================================

class SoundManager {
    private ctx: AudioContext | null = null;
    public enabled: boolean = true;

    constructor() {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("wordsnail_sound_enabled");
            this.enabled = saved !== null ? saved === "true" : true;
        }
    }

    private getContext(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }

    public toggle(): boolean {
        this.enabled = !this.enabled;
        if (typeof window !== "undefined") {
            localStorage.setItem("wordsnail_sound_enabled", String(this.enabled));
        }
        return this.enabled;
    }

    // 1. Tile Nudge / Move: Crisp click
    public playMove(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.045);
    }

    // 2. Tile Lock: A satisfying, heavy wooden thud
    public playLock(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.09);

        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    // 3. Word Flash: An uplifting chime / coin chime chord (C5 -> E5 -> G5)
    public playWordFlash(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + idx * 0.06);
            osc.stop(ctx.currentTime + idx * 0.06 + 0.36);
        });
    }

    // 4. Row Shatter: Deep glass/stone fracture crunch
    public playRowShatter(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // White noise burst
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.22);
        filter.Q.setValueAtTime(3, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.24);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + 0.25);
    }

    // 5. Ceiling Alert: Low heartbeat pulse when entering danger zone (height 7+)
    public playHeartbeat(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        [0, 0.16].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(65, ctx.currentTime + delay);
            osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + delay + 0.1);

            gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.11);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.12);
        });
    }

    // 6. Discard / Recycle Whoosh: Smooth air whoosh with dissolving feel
    public playDiscardWhoosh(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.19);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + 0.2);
    }

    // 7. Victory Fanfare
    public playWin(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        chords.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

            gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + idx * 0.08);
            osc.stop(ctx.currentTime + idx * 0.08 + 0.65);
        });
    }

    // 8. Game Over: Descending somber wobble
    public playGameOver(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const notes = [320, 290, 260, 220];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
            osc.frequency.exponentialRampToValueAtTime(freq - 25, ctx.currentTime + idx * 0.14 + 0.13);

            gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.14);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.14);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + idx * 0.14);
            osc.stop(ctx.currentTime + idx * 0.14 + 0.15);
        });
    }
}

export const sounds = new SoundManager();
