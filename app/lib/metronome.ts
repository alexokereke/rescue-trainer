export class Metronome {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(bpm = 110) {
    this.stop();
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const intervalMs = 60000 / bpm; // 110 BPM = 545ms

    const click = () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    };

    click();
    this.intervalId = setInterval(click, intervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.ctx) this.ctx.close();
    this.ctx = null;
    this.intervalId = null;
  }
}