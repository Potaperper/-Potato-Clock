
// Simple audio synthesizer to avoid external asset dependencies
let activeOscillators: AudioNode[] = [];

const stopAllSynthesizedSounds = () => {
  activeOscillators.forEach(node => {
    try {
      if (node instanceof OscillatorNode) {
        node.stop();
        node.disconnect();
      } else if (node instanceof GainNode) {
        node.disconnect();
      }
    } catch (e) {
      // Ignore errors if already stopped
    }
  });
  activeOscillators = [];
};

export const stopSound = () => {
  stopAllSynthesizedSounds();
};

export const playSound = (type: 'tick' | 'alarm' | 'start' | 'relax', volume: number) => {
  if (volume <= 0) return;
  
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.connect(ctx.destination);
  osc.connect(gain);

  const vol = volume / 100;
  const now = ctx.currentTime;

  // Track for cleanup
  activeOscillators.push(osc);
  activeOscillators.push(gain);
  osc.onended = () => {
    activeOscillators = activeOscillators.filter(n => n !== osc && n !== gain);
  };

  if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(vol * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'start') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'alarm') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(vol * 0.3, now);
    
    // Beep beep beep
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.setValueAtTime(0, now + 0.2);
    gain.gain.setValueAtTime(vol * 0.3, now + 0.3);
    gain.gain.setValueAtTime(0, now + 0.5);
    gain.gain.setValueAtTime(vol * 0.3, now + 0.6);
    gain.gain.linearRampToValueAtTime(0, now + 1.2);
    
    osc.start(now);
    osc.stop(now + 1.2);
  } else if (type === 'relax') {
    // A soft ambient chord
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol * 0.2, now + 1);
    gain.gain.linearRampToValueAtTime(0, now + 10); // Extend for microbreak default
    osc.start(now);
    osc.stop(now + 10);
    
    // Add a second oscillator for harmony
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    activeOscillators.push(osc2);
    activeOscillators.push(gain2);
    osc2.onended = () => {
      activeOscillators = activeOscillators.filter(n => n !== osc2 && n !== gain2);
    };

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(450, now);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(vol * 0.15, now + 1.5);
    gain2.gain.linearRampToValueAtTime(0, now + 10);
    osc2.start(now);
    osc2.stop(now + 10);
  }
};
