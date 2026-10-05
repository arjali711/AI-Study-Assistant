// Web Audio API ambient noise & study alert synthesizer
class StudyAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private currentType: string = 'none';

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play gentle completion chime
  playCompletionChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Pleasant major chord (C5 -> E5 -> G5)
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.35);

      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.setValueAtTime(329.63, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  }

  // Ambient focus noise generator
  startAmbient(type: 'rain' | 'whitenoise' | 'binaural' | 'warm', volume: number = 0.15) {
    try {
      this.stopAmbient();
      this.initContext();
      if (!this.ctx) return;

      this.currentType = type;
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      if (type === 'binaural') {
        // 40Hz Gamma frequency beat (200Hz Left, 240Hz Right)
        const oscL = this.ctx.createOscillator();
        const oscR = this.ctx.createOscillator();
        const merger = this.ctx.createChannelMerger(2);

        oscL.type = 'sine';
        oscL.frequency.value = 210;
        oscR.type = 'sine';
        oscR.frequency.value = 250; // 40Hz delta

        oscL.connect(merger, 0, 0);
        oscR.connect(merger, 0, 1);
        merger.connect(this.gainNode);

        oscL.start();
        oscR.start();
        this.noiseNode = merger;
      } else {
        // Buffer-based noise (Brown/Pink/White)
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'rain') {
            // Brown noise approximation (filtered for rain/water sound)
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          } else if (type === 'warm') {
            // Pink noise
            output[i] = (lastOut + (0.05 * white)) / 1.05;
            lastOut = output[i];
            output[i] *= 2.5;
          } else {
            // White noise
            output[i] = white * 0.3;
          }
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        if (type === 'rain' || type === 'warm') {
          // Low-pass filter for cozy ambient sound
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = type === 'rain' ? 800 : 450;
          whiteNoise.connect(filter);
          filter.connect(this.gainNode);
          this.noiseNode = filter;
        } else {
          whiteNoise.connect(this.gainNode);
          this.noiseNode = whiteNoise;
        }

        whiteNoise.start();
      }
    } catch (e) {
      console.warn('Ambient sound failed:', e);
    }
  }

  setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  stopAmbient() {
    if (this.noiseNode) {
      try {
        if ('stop' in this.noiseNode && typeof (this.noiseNode as any).stop === 'function') {
          (this.noiseNode as any).stop();
        }
        this.noiseNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.noiseNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.currentType = 'none';
  }

  getCurrentType(): string {
    return this.currentType;
  }
}

export const studyAudio = new StudyAudioSynthesizer();
