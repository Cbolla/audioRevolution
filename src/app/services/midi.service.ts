/// <reference types="webmidi" />
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MidiService {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  public inputs = signal<WebMidi.MIDIInput[]>([]);
  public messages = signal<any>(null); // For UI Monitoring only
  public status = signal<string>('Esperando...');
  
  private messageCallback: ((msg: any) => void) | null = null;

  constructor() {
    this.initMidi();
  }

  onMessage(cb: (msg: any) => void) {
    this.messageCallback = cb;
  }

  private async initMidi() {
    try {
      if (navigator.requestMIDIAccess) {
        this.midiAccess = await navigator.requestMIDIAccess();
        this.status.set('Pronto');
        this.updateInputs();
        
        this.midiAccess.onstatechange = () => {
          this.updateInputs();
        };
      } else {
        this.status.set('Web MIDI não suportado');
      }
    } catch (err) {
      this.status.set('Erro ao acessar MIDI');
    }
  }

  private updateInputs() {
    if (!this.midiAccess) return;
    const inputs: WebMidi.MIDIInput[] = [];
    this.midiAccess.inputs.forEach((input: WebMidi.MIDIInput) => {
      inputs.push(input);
      input.onmidimessage = (event: WebMidi.MIDIMessageEvent) => this.handleMidiMessage(event);
    });
    this.inputs.set(inputs);
  }

  private handleMidiMessage(event: WebMidi.MIDIMessageEvent) {
    const [status, data1, data2] = event.data;
    const type = status & 0xf0;
    const channel = status & 0x0f;

    const msg = {
      type,
      channel,
      note: data1,
      velocity: data2,
      timestamp: event.timeStamp
    };

    if (this.messageCallback) {
      this.messageCallback(msg);
    }
    this.messages.set(msg);
  }
}
