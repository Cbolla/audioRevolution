import { Injectable, signal } from '@angular/core';
import { WorkletSynthesizer } from 'spessasynth_lib';

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
  
  public isInitialized = signal(false);
  public currentSoundFont = signal<string | null>(null);
  public activeNotes = signal<Set<number>>(new Set());
  public presets = signal<any[]>([]);
  public activeVoices = signal<number>(0);
  public performanceMode = signal<boolean>(false);
  public viewMode = signal<'cards' | 'mixer'>('cards');
  
  // Master Mappings
  public masterMidiMappings = signal<{ [key: string]: number }>({});
  
  // MIDI Learning state
  public isLearning = signal<{ layerId: string | 'master', param: string } | null>(null);
  
  public layers = signal<SynthLayer[]>([
    { id: '1', name: 'Camada 1', program: 0, bankMSB: 0, bankLSB: 0, volume: 1, reverb: 0.5, chorus: 0.2, pan: 0, transpose: 0, enabled: true, channel: 0 }
  ]);

  // Mapping of fileName to bank offset to prevent overlaps
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

  private async loadFilesFromDB() {
    if (!this.db) return;
    const tx = this.db.transaction('soundfonts', 'readonly');
    const store = tx.objectStore('soundfonts');
    const request = store.getAll();
    request.onsuccess = async () => {
      const files = request.result;
      for (const file of files) {
        await this.loadSoundFont(file.data, file.name, false); // false = don't re-save
      }
    };
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

    // Use 'interactive' for maximum compatibility (low latency but stable)
    this.audioContext = new AudioContext({
      latencyHint: 'interactive'
    });

    try {
      await this.audioContext.audioWorklet.addModule('/spessasynth_processor.min.js');
      
      // Auto-resume context on any interaction 
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized.set(true);
      
      // Voice & Performance monitoring loop
      setInterval(() => {
        if (this.synthesizer) {
           this.activeVoices.set((this.synthesizer as any).voicesAmount || 0);
        }
      }, 200);

      if (this.synthesizer) this.applyAllLayers();
    } catch (e) {
      console.error('Failed to load AudioWorklet module', e);
    }
  }

  async loadSoundFont(arrayBuffer: ArrayBuffer, fileName: string, save = true) {
    if (!this.audioContext || !this.isInitialized()) {
      await this.initialize();
    }
    
    if (!this.synthesizer) {
      this.synthesizer = new WorkletSynthesizer(this.audioContext!, {
        interpolationType: this.performanceMode() ? 0 : 2, // 0 = linear (turbo), 2 = hermite (hi-fi)
        voiceCap: 64
      } as any);
      this.synthesizer.connect(this.audioContext!.destination);
    }

    if (save) {
      await this.saveFileToDB(fileName, arrayBuffer);
    }

    // Determine bank offset
    let offset = 0;
    if (this.fontOffsets.has(fileName)) {
      offset = this.fontOffsets.get(fileName)!;
    } else {
      offset = this.fontOffsets.size * 128; // Each SF2 gets its own bank range
      this.fontOffsets.set(fileName, offset);
    }
    
    await this.synthesizer.soundBankManager.addSoundBank(arrayBuffer, fileName, offset);
    
    // Tiny delay to let the manager update the preset list
    await new Promise(r => setTimeout(r, 100));

    const presetList = this.synthesizer.presetList;
    if (presetList && presetList.length > 0) {
       this.presets.set(presetList);
    } else {
       this.presets.set((this.synthesizer as any).presets || []);
    }
    
    this.currentSoundFont.set(fileName);
    this.applyAllLayers();
  }

  private applyAllLayers() {
    if (!this.synthesizer) return;
    this.layers().forEach(layer => {
      this.applyLayerSettings(layer);
    });
  }

  private applyLayerSettings(layer: SynthLayer) {
    if (!this.synthesizer) return;
    const ch = layer.channel;
    
    this.synthesizer.controllerChange(ch, 0, layer.bankMSB);
    this.synthesizer.controllerChange(ch, 32, layer.bankLSB);
    
    this.synthesizer.programChange(ch, layer.program);
    
    // MIDI CCs are 0-127. 
    // If volume is 1.0 (gain), we send 100 on CC 7. If 1.2, we send 127.
    // For SpessaSynth, CC 7 is standard channel volume.
    const volVal = Math.min(127, Math.floor(layer.volume * 100)); // Standard scale
    this.synthesizer.controllerChange(ch, 7, volVal);
    
    this.synthesizer.controllerChange(ch, 91, Math.floor(layer.reverb * 127));
    this.synthesizer.controllerChange(ch, 93, Math.floor(layer.chorus * 127));
    this.synthesizer.controllerChange(ch, 10, Math.floor(((layer.pan + 1) / 2) * 127));
  }

  updateLayer(id: string, partial: Partial<SynthLayer>) {
    this.layers.update(ls => ls.map(l => {
      if (l.id === id) {
        const updated = { ...l, ...partial };
        this.applyLayerSettings(updated);
        return updated;
      }
      return l;
    }));
  }

  addLayer() {
    const nextChannel = this.layers().length % 15;
    const newLayer: SynthLayer = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Camada ${this.layers().length + 1}`,
      program: 0,
      bankMSB: 0,
      bankLSB: 0,
      volume: 1,
      reverb: 0.5,
      chorus: 0.2,
      pan: 0,
      transpose: 0,
      enabled: true,
      channel: nextChannel
    };
    this.layers.update(l => [...l, newLayer]);
    this.saveProject();
    this.applyLayerSettings(newLayer);
  }

  removeLayer(id: string) {
    this.layers.update(ls => ls.filter(l => l.id !== id));
  }

  async noteOn(note: number, velocity: number) {
    if (!this.isInitialized()) {
       await this.initialize();
    }
    if (!this.synthesizer) return;
    
    // Safety: ensure context is running
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.layers().forEach(layer => {
      if (layer.enabled) {
        this.synthesizer!.noteOn(layer.channel, note + layer.transpose, velocity);
      }
    });
    
    this.activeNotes.update(notes => {
      const newNotes = new Set(notes);
      newNotes.add(note);
      return newNotes;
    });
  }

  noteOff(note: number) {
    if (!this.synthesizer) return;
    
    this.layers().forEach(layer => {
      if (layer.enabled) {
        this.synthesizer!.noteOff(layer.channel, note + layer.transpose);
      }
    });

    this.activeNotes.update(notes => {
      const newNotes = new Set(notes);
      newNotes.delete(note);
      return newNotes;
    });
  }

  public handleMidiCC(cc: number, value: number) {
    const learning = this.isLearning();
    const normalized = value / 127;

    if (learning) {
      if (learning.layerId === 'master') {
        this.masterMidiMappings.update(m => ({ ...m, [`${learning.param}CC`]: cc }));
      } else {
        this.updateLayer(learning.layerId, {
          midiMappings: {
            ...this.layers().find(l => l.id === learning.layerId)?.midiMappings,
            [`${learning.param}CC`]: cc
          }
        });
      }
      this.isLearning.set(null);
      return;
    }

    // Process Master Mappings
    const masterMaps = this.masterMidiMappings();
    if (cc === masterMaps['masterGainCC']) this.setVolume(normalized * 2);
    if (cc === masterMaps['reverbGainCC']) this.setMasterParam('reverbGain', normalized * 10);
    if (cc === masterMaps['reverbTimeCC']) this.setReverbTime(value);
    if (cc === masterMaps['delayGainCC']) this.setDelay(normalized * 5);

    // Process Layer Mappings
    this.layers().forEach(layer => {
      const maps = layer.midiMappings;
      if (!maps) return;

      if (cc === maps.volumeCC) {
        this.updateLayer(layer.id, { volume: normalized * 2 });
      } else if (cc === maps.reverbCC) {
        this.updateLayer(layer.id, { reverb: normalized });
      } else if (cc === maps.panCC) {
        this.updateLayer(layer.id, { pan: (normalized * 2) - 1 });
      }
    });

    if (cc === 7 && Object.keys(masterMaps).length === 0) {
       this.setVolume(normalized * 2);
    }
  }

  setMasterParam(param: string, value: any) {
    if (!this.synthesizer) return;
    this.synthesizer.setMasterParameter(param as any, value);
  }

  setReverbTime(value: number) {
    if (!this.synthesizer) return;
    const v = Math.floor(value);
    const addr = [0x40, 0x01, 0x34];
    const data = [v];
    let sum = 0;
    addr.forEach(b => sum += b);
    data.forEach(b => sum += b);
    let checksum = 128 - (sum % 128);
    if (checksum === 128) checksum = 0;
    const sysex = [0x41, 0x10, 0x42, 0x12, ...addr, ...data, checksum, 0xF7];
    this.synthesizer.systemExclusive(sysex);
  }

  setSustain(on: boolean) {
    if (!this.synthesizer) return;
    this.layers().forEach(layer => {
      if (layer.enabled) {
        this.synthesizer!.controllerChange(layer.channel, 64, on ? 127 : 0);
      }
    });
  }

  setDelay(value: number) {
    if (!this.synthesizer) return;
    this.synthesizer.setMasterParameter('delayGain', value);
  }

  setVolume(volume: number) {
    if (!this.synthesizer) return;
    this.synthesizer.setMasterParameter('masterGain', volume);
  }

  togglePerformance() {
    const isTurbo = !this.performanceMode();
    this.performanceMode.set(isTurbo);
    if (this.synthesizer) {
       // 0 = Linear (Fast), 2 = Hermite/Cubic (High quality)
       this.synthesizer.setMasterParameter('interpolationType' as any, isTurbo ? 0 : 2);
    }
  }
}
