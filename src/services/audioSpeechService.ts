/**
 * Serviço de Leitura em Voz Alta (Áudio e Velocidade de Leitura)
 *
 * Utiliza a API padrão Web Speech Synthesis com suporte a idioma português,
 * controle de velocidade (0.75x a 1.75x), pausa, retomada e leitura contínua.
 */

export type AudioSpeedRate = 0.75 | 1.0 | 1.25 | 1.5 | 1.75;

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentParagraphIndex: number;
  rate: AudioSpeedRate;
  isSupported: boolean;
}

type StateChangeListener = (state: AudioPlaybackState) => void;

class AudioSpeechService {
  private paragraphs: string[] = [];
  private currentParagraphIndex = 0;
  private rate: AudioSpeedRate = 1.0;
  private isPlaying = false;
  private isPaused = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<StateChangeListener> = new Set();
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Prioriza português do Brasil (pt-BR) ou qualquer português
    const ptVoice =
      voices.find((v) => v.lang.includes('pt-BR') || v.lang === 'pt_BR') ||
      voices.find((v) => v.lang.startsWith('pt'));
    if (ptVoice) {
      this.voice = ptVoice;
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): AudioPlaybackState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentParagraphIndex: this.currentParagraphIndex,
      rate: this.rate,
      isSupported: this.isSupported(),
    };
  }

  public loadParagraphs(paragraphs: string[], startIndex = 0) {
    this.stop();
    this.paragraphs = paragraphs;
    this.currentParagraphIndex = Math.max(0, Math.min(startIndex, paragraphs.length - 1));
    this.notify();
  }

  public play(fromIndex?: number) {
    if (!this.isSupported()) return;

    if (this.isPaused && (fromIndex === undefined || fromIndex === this.currentParagraphIndex)) {
      window.speechSynthesis.resume();
      this.isPaused = false;
      this.isPlaying = true;
      this.notify();
      return;
    }

    if (fromIndex !== undefined) {
      this.currentParagraphIndex = fromIndex;
    }

    this.speakCurrentParagraph();
  }

  public pause() {
    if (!this.isSupported()) return;
    window.speechSynthesis.pause();
    this.isPlaying = false;
    this.isPaused = true;
    this.notify();
  }

  public stop() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.notify();
  }

  public setRate(newRate: AudioSpeedRate) {
    this.rate = newRate;
    if (this.isPlaying) {
      // Reinicia parágrafo atual na nova velocidade
      this.speakCurrentParagraph();
    } else {
      this.notify();
    }
  }

  public nextParagraph() {
    if (this.currentParagraphIndex < this.paragraphs.length - 1) {
      this.currentParagraphIndex += 1;
      this.speakCurrentParagraph();
    } else {
      this.stop();
    }
  }

  public previousParagraph() {
    if (this.currentParagraphIndex > 0) {
      this.currentParagraphIndex -= 1;
      this.speakCurrentParagraph();
    }
  }

  private speakCurrentParagraph() {
    if (!this.isSupported() || this.paragraphs.length === 0) return;

    window.speechSynthesis.cancel();

    // Filtra marcadores cênicos como '---'
    while (
      this.currentParagraphIndex < this.paragraphs.length &&
      this.paragraphs[this.currentParagraphIndex].trim() === '---'
    ) {
      this.currentParagraphIndex += 1;
    }

    if (this.currentParagraphIndex >= this.paragraphs.length) {
      this.stop();
      return;
    }

    const textToSpeak = this.paragraphs[this.currentParagraphIndex];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.lang = 'pt-BR';
    utterance.rate = this.rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (this.isPlaying && this.currentParagraphIndex < this.paragraphs.length - 1) {
        this.currentParagraphIndex += 1;
        this.speakCurrentParagraph();
      } else {
        this.stop();
      }
    };

    utterance.onerror = (e) => {
      console.warn('[AudioSpeechService] Evento de áudio finalizado/interrompido:', e);
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        this.stop();
      }
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    this.isPaused = false;
    this.notify();

    window.speechSynthesis.speak(utterance);
  }
}

export const audioSpeechService = new AudioSpeechService();
