import { registerPlugin } from '@capacitor/core';

export interface AudioEnginePlugin {
  initialize(): Promise<void>;
  
  /**
   * Carrega um arquivo SF2 do sistema de arquivos nativo ou via dados Base64
   */
  loadSF2(options: { path?: string, data?: string }): Promise<{ success: boolean, sfId?: number }>;
  
  /**
   * Envia evento Note On
   */
  noteOn(options: { channel: number, note: number, velocity: number }): Promise<void>;
  
  /**
   * Envia evento Note Off
   */
  noteOff(options: { channel: number, note: number }): Promise<void>;
  
  /**
   * Ajusta o volume de um canal específico
   */
  setVolume(options: { channel: number, volume: number }): Promise<void>;
  
  /**
   * Ajusta o Pan
   */
  setPan(options: { channel: number, pan: number }): Promise<void>;
  
  /**
   * Ajusta o Reverb
   */
  setReverb(options: { channel: number, value: number }): Promise<void>;

  loadSoundFont(options: { base64: string, channel: number, path?: string }): Promise<{ sfId: number }>;

  /**
   * Seleciona o programa/patch para um canal
   */
  setProgram(options: { channel: number, sfId: number, bank: number, program: number }): Promise<void>;

  controlChange(options: { channel: number, controller: number, value: number }): Promise<void>;

  /**
   * Desliga todas as notas
   */
  allNotesOff(): Promise<void>;
}

const AudioEngine = registerPlugin<AudioEnginePlugin>('AudioEngine');
export default AudioEngine;
