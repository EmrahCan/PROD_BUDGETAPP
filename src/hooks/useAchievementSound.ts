import { useCallback } from 'react';

// Achievement/celebration sound using Web Audio API
export function useAchievementSound() {
  const playAchievementSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a more celebratory multi-note melody
      const notes = [
        { freq: 523.25, start: 0, duration: 0.15 },      // C5
        { freq: 659.25, start: 0.12, duration: 0.15 },   // E5
        { freq: 783.99, start: 0.24, duration: 0.15 },   // G5
        { freq: 1046.50, start: 0.36, duration: 0.3 },   // C6 (longer)
      ];

      notes.forEach(({ freq, start, duration }) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + start);
        
        // Smooth envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + start + duration);
        
        oscillator.start(audioContext.currentTime + start);
        oscillator.stop(audioContext.currentTime + start + duration);
      });

      // Add a shimmer effect with higher frequencies
      const shimmerNotes = [
        { freq: 1318.51, start: 0.1, duration: 0.1 },   // E6
        { freq: 1567.98, start: 0.2, duration: 0.1 },   // G6
        { freq: 2093.00, start: 0.3, duration: 0.15 },  // C7
      ];

      shimmerNotes.forEach(({ freq, start, duration }) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + start);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + start);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + start + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + start + duration);
        
        oscillator.start(audioContext.currentTime + start);
        oscillator.stop(audioContext.currentTime + start + duration);
      });

      // Clean up audio context after sounds finish
      setTimeout(() => {
        audioContext.close();
      }, 1000);
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  }, []);

  return { playAchievementSound };
}
