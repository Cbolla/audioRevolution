import { Injectable, signal, computed, effect } from '@angular/core';
import { WorkletSynthesizer } from 'spessasynth_lib';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import AudioEngine, { AudioEnginePlugin } from '../core/plugins/audio-engine.plugin';

export interface SynthLayer {
  id: string;
  name: string;
  program: number;
  bankMSB: number;
  bankLSB: number;
  volume: number;
  reverb: number;
  chorus: number;
  pan: number;
  transpose: number;
  enabled: boolean;
  channel: number;
  soundFontName?: string;
  icon?: string;
  midiMappings?: {
    volumeCC?: number;
    reverbCC?: number;
    panCC?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private synthesizer: WorkletSynthesizer | null = null;
  private isNative = Capacitor.getPlatform() === 'android';
  
  public isInitialized = signal(false);
  public currentSoundFont = signal<string | null>(null);
  public activeNotes = signal<Set<number>>(new Set());
  public presets = signal<any[]>([]);
  public activeVoices = signal<number>(0);
  public performanceMode = signal<boolean>(false);
  public viewMode = signal<'home' | 'mixer' | 'library' | 'effects'>('home');
  public currentPresetName = signal('Show Domingo');
  public midiConnected = signal(false);
  
  // Progress & View Management
  public isCopying = signal(false);
  public copyProgress = signal(0);
  public isImmersiveMode = signal(false);
  public nativeDebugMsg = signal<string | null>(null);

  // Master Mappings
  public masterMidiMappings = signal<{ [key: string]: number }>({});
  
  // MIDI Learning state
  public isLearning = signal<{ layerId: string | 'master', param: string } | null>(null);
  
  public layers = signal<SynthLayer[]>([
    { id: '1', name: 'Camada 1', program: 0, bankMSB: 0, bankLSB: 0, volume: 1, reverb: 0.5, chorus: 0.2, pan: 0, transpose: 0, enabled: true, channel: 0 }
  ]);

  // Mapping of fileName to bank offset to prevent overlaps
  public libraryFiles = signal<{name: string, data: ArrayBuffer, sfId?: number, path?: string}[]>([]);
  private fontOffsets = new Map<string, number>();
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB().then(() => {
      this.loadSavedProject();
      this.loadFilesFromDB();
    });
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AudioRevolutionDB', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('soundfonts')) {
          db.createObjectStore('soundfonts', { keyPath: 'name' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject();
    });
  }

  private async saveFileToDB(name: string, data: ArrayBuffer) {
    if (!this.db) return;
    const tx = this.db.transaction('soundfonts', 'readwrite');
    const store = tx.objectStore('soundfonts');
    store.put({ name, data });
  }

  private async saveNativeRefToDB(name: string, path: string) {
    if (!this.db) return;
    const tx = this.db.transaction('soundfonts', 'readwrite');
    const store = tx.objectStore('soundfonts');
    store.put({ name, path, data: new ArrayBuffer(0) });
  }

  private async loadFilesFromDB() {
    if (!this.db) return;
    const tx = this.db.transaction('soundfonts', 'readonly');
    const store = tx.objectStore('soundfonts');
    const request = store.getAll();
    request.onsuccess = async () => {
      const files = request.result;
      this.libraryFiles.set(files);
      // No início, não carregamos automaticamente para não pesar
    };
  }

  public async deleteFileFromDB(name: string) {
    if (!this.db) return;
    const tx = this.db.transaction('soundfonts', 'readwrite');
    const store = tx.objectStore('soundfonts');
    store.delete(name);
    this.libraryFiles.update(files => files.filter(f => f.name !== name));
  }

  private loadSavedProject() {
    const saved = localStorage.getItem('audio_revolution_project');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.layers) this.layers.set(data.layers);
        if (data.masterMidiMappings) this.masterMidiMappings.set(data.masterMidiMappings);
      } catch (e) {
        console.error('Failed to load project', e);
      }
    }
  }

  public saveProject() {
    const data = {
      layers: this.layers(),
      masterMidiMappings: this.masterMidiMappings()
    };
    localStorage.setItem('audio_revolution_project', JSON.stringify(data));
    alert('Configuração salva com sucesso!');
  }

  async initialize() {
    if (this.isInitialized()) return;

    if (this.isNative) {
      try {
        await AudioEngine.initialize();
        this.isInitialized.set(true);
        console.log('Native Audio Engine initialized');
        return;
      } catch (e) {
        console.error('Failed to initialize native engine, falling back to Web', e);
      }
    }

    this.audioContext = new AudioContext({ latencyHint: 'interactive' });
    try {
      await this.audioContext.audioWorklet.addModule('/spessasynth_processor.min.js');
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      this.isInitialized.set(true);
      setInterval(() => {
        if (this.synthesizer) this.activeVoices.set((this.synthesizer as any).voicesAmount || 0);
      }, 200);
      if (this.synthesizer) this.applyAllLayers();
    } catch (e) {
      console.error('Failed to load AudioWorklet module', e);
    }
  }

  public async pickNativeFile() {
    if (!this.isNative) return;
    try {
      // FORÇAR BARRA DE PROGRESSO ANTES DO PICKER (Para o usuário saber que começou)
      this.isCopying.set(true);
      this.copyProgress.set(5);
      this.nativeDebugMsg.set('Abrindo Seletor de Arquivos...');

      const result = await FilePicker.pickFiles({ types: ['application/octet-stream', '.sf2'], readData: false });
      
      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        this.nativeDebugMsg.set(`Preparando importação: ${file.name}`);
        this.copyProgress.set(15);

        // Simulamos o progresso enquanto enviamos o comando nativo
        const interval = setInterval(() => {
           if (this.copyProgress() < 90) this.copyProgress.set(this.copyProgress() + 5);
        }, 500);

        const newSF = { name: file.name, data: new ArrayBuffer(0), path: file.path };
        this.libraryFiles.update(files => [...files, newSF as any]);
        this.saveNativeRefToDB(file.name, file.path!);
        
        await this.loadSoundFont(new ArrayBuffer(0), file.name, 0, file.path!);
        
        clearInterval(interval);
        this.copyProgress.set(100);
        this.nativeDebugMsg.set('Timbre Carregado!');
        setTimeout(() => {
          this.isCopying.set(false);
          this.nativeDebugMsg.set(null);
        }, 1500);
      } else {
        this.isCopying.set(false);
        this.nativeDebugMsg.set(null);
      }
    } catch (e) {
      console.error('Erro ao selecionar arquivo nativo:', e);
      this.isCopying.set(false);
      this.nativeDebugMsg.set('Erro ao selecionar arquivo');
    }
  }

  public async testAudio() {
     if (this.isNative) {
        this.nativeDebugMsg.set('Disparando Nota de Teste (60)...');
        // Usamos o plugin nativo para tocar uma nota direta
        await AudioEngine.noteOn({ channel: 0, note: 60, velocity: 100 });
        setTimeout(() => AudioEngine.noteOff({ channel: 0, note: 60 }), 1000);
        setTimeout(() => this.nativeDebugMsg.set(null), 2000);
     }
  }

  public async loadSoundFont(data: ArrayBuffer, fileName: string, channel: number = 0, nativePath?: string) {
    if (!this.isInitialized()) await this.initialize();

    if (this.isNative) {
      try {
        let result;
        if (nativePath) {
          result = await AudioEngine.loadSoundFont({ path: nativePath, base64: '', channel });
        } else {
          const base64 = this.arrayBufferToBase64(data);
          result = await AudioEngine.loadSoundFont({ base64, channel });
        }
        if (result && result.sfId !== undefined) {
          await AudioEngine.setProgram({ channel, sfId: result.sfId, bank: 0, program: 0 });
          await AudioEngine.controlChange({ channel, controller: 7, value: 127 });
          await AudioEngine.controlChange({ channel, controller: 11, value: 127 });
        }
        this.currentSoundFont.set(fileName);
        return result;
      } catch (e) {
        console.error('Erro nativo:', e);
        return null;
      }
    }

    if (!this.synthesizer) {
      this.synthesizer = new WorkletSynthesizer(this.audioContext!, { interpolationType: 1, voiceCap: 64 } as any);
      this.synthesizer.connect(this.audioContext!.destination);
    }
    const offset = this.fontOffsets.get(fileName) || (this.fontOffsets.size * 100);
    this.fontOffsets.set(fileName, offset);
    // @ts-ignore
    await this.synthesizer.loadSoundFont(data, offset);
    return { sfId: offset };
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  addLayer() {
    const nextIdx = (this.layers().length + 1).toString();
    const newLayer: SynthLayer = {
      id: nextIdx,
      name: `Camada ${nextIdx}`,
      program: 0,
      bankMSB: 0,
      bankLSB: 0,
      volume: 1,
      reverb: 0.5,
      chorus: 0.2,
      pan: 0,
      transpose: 0,
      enabled: true,
      channel: this.layers().length
    };
    this.layers.update(l => [...l, newLayer]);
  }

  removeLayer(id: string) {
    this.layers.update(l => l.filter(layer => layer.id !== id));
  }

  setMasterParam(param: string, value: number) {
    if (this.isNative) {
      if (param === 'masterGain') AudioEngine.setVolume({ channel: -1, volume: value });
    }
  }

  private applyAllLayers() {
    if (!this.synthesizer) return;
    this.layers().forEach(l => {
      // @ts-ignore
      this.synthesizer?.setChannelVolume(l.channel, l.enabled ? l.volume : 0);
      // @ts-ignore
      this.synthesizer?.setChannelPan(l.channel, l.pan);
    });
  }

  updateLayer(id: string, updates: Partial<SynthLayer>) {
    this.layers.update(list => list.map(l => l.id === id ? { ...l, ...updates } : l));
    const layer = this.layers().find(l => l.id === id);
    if (this.isNative && layer) {
       if (updates.volume !== undefined) AudioEngine.setVolume({ channel: layer.channel, volume: updates.volume });
       if (updates.pan !== undefined) AudioEngine.setPan({ channel: layer.channel, pan: updates.pan });
    }
  }

  noteOn(note: number, velocity: number = 100) {
    if (this.isNative) {
      AudioEngine.noteOn({ channel: 0, note, velocity });
    } else if (this.synthesizer) {
      // @ts-ignore
      this.synthesizer.noteOn(0, note, velocity);
    }
  }

  noteOff(note: number) {
    if (this.isNative) {
      AudioEngine.noteOff({ channel: 0, note });
    } else if (this.synthesizer) {
      // @ts-ignore
      this.synthesizer.noteOff(0, note);
    }
  }

  setSustain(isOn: boolean) {
    if (this.isNative) {
      AudioEngine.controlChange({ channel: 0, controller: 64, value: isOn ? 127 : 0 });
    } else if (this.synthesizer) {
      // @ts-ignore
      this.synthesizer.stopNote(0, 0); // Simplified sustain for web
    }
  }
}
