import { Component, inject, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService, SynthLayer } from './services/audio.service';
import { MidiService } from './services/midi.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="app-container">
      <header class="header glass">
        <div class="logo">
          <i class="fas fa-wave-square"></i>
          <h1>AudioRevolution <span class="badge">Enterprise</span></h1>
        </div>
        
        <div class="header-actions">
           <button class="btn-save" (click)="audioService.saveProject()">
              <i class="fas fa-save"></i> Salvar Projeto
           </button>
            <div class="header-stats">
            <button class="view-toggle" (click)="toggleView()">
              <i class="fas" [class.fa-sliders-h]="audioService.viewMode() === 'cards'" [class.fa-th-large]="audioService.viewMode() === 'mixer'"></i>
              {{ audioService.viewMode() === 'mixer' ? 'VER CARDS' : 'ABRIR MIXER' }}
            </button>
            <button class="master-toggle-header" [class.off]="!masterVisible()" (click)="masterVisible.set(!masterVisible())">
               <i class="fas fa-sliders-h"></i> MASTER {{ masterVisible() ? 'ON' : 'OFF' }}
            </button>
            <div class="stat-item" [class.high-load]="audioService.activeVoices() > 80">
                <i class="fas fa-microchip"></i> 
                <span>Vozes: {{ audioService.activeVoices() }}</span>
              </div>
              <button class="performance-toggle" [class.turbo]="audioService.performanceMode()" (click)="audioService.togglePerformance()">
                <i class="fas" [class.fa-tachometer-alt]="!audioService.performanceMode()" [class.fa-bolt]="audioService.performanceMode()"></i>
                {{ audioService.performanceMode() ? 'TURBO ON' : 'HI-FI' }}
              </button>
            </div>
            <div class="status-indicators">
              <div class="indicator" [class.active]="midiService.inputs().length > 0">
                <i class="fas fa-keyboard"></i>
                MIDI: {{ midiService.inputs().length > 0 ? 'ON' : 'OFF' }}
              </div>
              <div class="indicator" [class.active]="audioService.isInitialized()">
                <i class="fas fa-bolt"></i>
                Worklet: {{ audioService.isInitialized() ? 'Ativo' : 'Inativo' }}
              </div>
            </div>
        </div>
      </header>

      <div class="master-strip glass" [class.minimized]="masterMinimized()" *ngIf="masterVisible()">
        <div class="master-header">
           <i class="fas fa-sliders-h"></i> MASTER
           <button class="minimize-btn" (click)="masterMinimized.set(!masterMinimized())">
              <i class="fas" [class.fa-chevron-up]="!masterMinimized()" [class.fa-chevron-down]="masterMinimized()"></i>
           </button>
        </div>
        
        <div class="master-content-wrapper" *ngIf="!masterMinimized()">
          <div class="master-controls">
             <div class="m-knob">
                <label>VOLUME</label>
                <div class="m-input">
                  <input type="range" min="0" max="2" step="0.1" value="1" (input)="onMasterParam('masterGain', $event)">
                  <button class="mini-learn" [class.active]="isLearning('master', 'masterGain')" (click)="startLearning('master', 'masterGain')">
                    <i class="fas fa-bolt"></i>
                  </button>
                </div>
             </div>
             
             <div class="m-knob">
                <label>REVERB LVL</label>
                <div class="m-input">
                  <input type="range" min="0" max="10" step="0.1" value="0.5" (input)="onMasterParam('reverbGain', $event)">
                  <button class="mini-learn" [class.active]="isLearning('master', 'reverbGain')" (click)="startLearning('master', 'reverbGain')">
                    <i class="fas fa-bolt"></i>
                  </button>
                </div>
             </div>

             <div class="m-knob">
                <label>REV TIME</label>
                <div class="m-input">
                  <input type="range" min="0" max="127" step="1" value="64" (input)="onReverbTimeChange($event)">
                  <button class="mini-learn" [class.active]="isLearning('master', 'reverbTime')" (click)="startLearning('master', 'reverbTime')">
                    <i class="fas fa-bolt"></i>
                  </button>
                </div>
             </div>

             <div class="m-knob">
                <label>DELAY</label>
                <div class="m-input">
                  <input type="range" min="0" max="5" step="0.1" value="0.5" (input)="onDelayChange($event)">
                  <button class="mini-learn" [class.active]="isLearning('master', 'delayGain')" (click)="startLearning('master', 'delayGain')">
                    <i class="fas fa-bolt"></i>
                  </button>
                </div>
             </div>
          </div>

          <div class="master-actions">
             <button class="btn-sustain-mini" [class.on]="sustain()" (click)="toggleSustain(!sustain())">
                <i class="fas fa-lock"></i> SUSTAIN {{ sustain() ? 'ON' : 'OFF' }}
             </button>
             <button class="btn-upload-mini" (click)="fileInput.click()">
               <i class="fas fa-file-audio"></i> SF2
             </button>
             <input #fileInput type="file" (change)="onFileSelected($event)" accept=".sf2" hidden>
          </div>

          <div class="master-midi">
             <div class="midi-led" [class.active]="midiService.messages()"></div>
             <div class="midi-msg">
                @if (midiService.messages(); as msg) {
                  <span>N: {{ msg.note }} V: {{ msg.velocity }}</span>
                } @else {
                  <span class="muted">MIDI IDLE</span>
                }
             </div>
          </div>
        </div>
      </div>

      <main class="content">

        <!-- Main Area: Layers or Mixer -->
        <section class="layers-area">
          <div class="area-header">
            <h2>
              <i class="fas" [class.fa-layer-group]="audioService.viewMode() === 'cards'" [class.fa-sliders-v]="audioService.viewMode() === 'mixer'"></i>
              {{ audioService.viewMode() === 'mixer' ? 'Mixer Live' : 'Camadas de Som (Layers)' }}
            </h2>
            <div class="header-btns">
              <button class="btn-add" (click)="audioService.addLayer()" *ngIf="audioService.viewMode() === 'cards'">
                <i class="fas fa-plus"></i> Adicionar Camada
              </button>
            </div>
          </div>

          @if (audioService.viewMode() === 'mixer') {
            <div class="mixer-board glass">
               @for (layer of audioService.layers(); track layer.id) {
                 <div class="mixer-channel" [class.muted-state]="!layer.enabled">
                    <div class="slider-wrapper">
                       <input type="range" class="mixer-slider" [value]="layer.volume" min="0" max="2" step="0.01" (input)="onLayerVol(layer, $event)" orient="vertical">
                    </div>
                    <button class="mixer-toggle" [class.active]="layer.enabled" (click)="audioService.updateLayer(layer.id, {enabled: !layer.enabled})">
                       {{ layer.enabled ? 'ON' : 'OFF' }}
                    </button>
                    <div class="channel-info">
                       <div class="channel-label">{{ layer.name }}</div>
                       <div class="ch-id">CHANNEL {{ layer.channel + 1 }}</div>
                    </div>
                 </div>
               }
            </div>
          } @else {
            <!-- Original Layers Grid -->
            <div class="layers-grid">
              @for (layer of audioService.layers(); track layer.id) {
                <div class="layer-card glass" [class.disabled]="!layer.enabled" [class.learning]="audioService.isLearning()?.layerId === layer.id">
                  <div class="layer-header">
                    <div class="layer-id">CH {{ layer.channel + 1 }}</div>
                    <input class="layer-name" [(ngModel)]="layer.name" (blur)="audioService.updateLayer(layer.id, {name: layer.name})">
                    <div class="layer-actions">
                      <button class="icon-btn" (click)="audioService.updateLayer(layer.id, {enabled: !layer.enabled})">
                        <i class="fas" [class.fa-eye]="layer.enabled" [class.fa-eye-slash]="!layer.enabled"></i>
                      </button>
                      <button class="icon-btn delete" (click)="audioService.removeLayer(layer.id)">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div class="layer-body">
                    <div class="patch-selector">
                      <label>Instrumento</label>
                      <select class="custom-select" (change)="onPatchChange(layer, $event)" [disabled]="!audioService.presets().length">
                        @if (!audioService.presets().length) {
                          <option>Aguardando SoundFont...</option>
                        }
                        @for (p of audioService.presets(); track p.program + '-' + p.bankMSB + '-' + p.bankLSB) {
                          <option [value]="p.program + ',' + p.bankMSB + ',' + p.bankLSB" [selected]="p.program === layer.program && p.bankMSB === layer.bankMSB">
                            {{ p.name }} (B: {{ p.bankMSB }})
                          </option>
                        }
                      </select>
                        <button class="subir-timbre-btn" (click)="layerFile.click()">
                           <i class="fas fa-upload"></i> Subir Timbre (SF2)
                        </button>
                        <input #layerFile type="file" (change)="onFileSelected($event, layer)" accept=".sf2" hidden>
                     </div>
                     @if (layer.soundFontName) {
                        <div class="sf-badge">SF2: {{ layer.soundFontName }}</div>
                     }

                    <div class="layer-controls">
                      <div class="control-group">
                         <label>Vol</label>
                         <div class="input-with-learn">
                           <input type="range" [value]="layer.volume" min="0" max="2" step="0.05" (input)="onLayerVol(layer, $event)">
                           <button class="learn-btn" [class.active]="isLearning(layer.id, 'volume')" (click)="startLearning(layer.id, 'volume')">
                             <i class="fas fa-bolt"></i>
                           </button>
                         </div>
                         <span class="val">{{ layer.volume | number:'1.1-1' }}</span>
                      </div>

                      <div class="control-group">
                         <label>Rev</label>
                         <div class="input-with-learn">
                           <input type="range" [value]="layer.reverb" min="0" max="1" step="0.05" (input)="onLayerRev(layer, $event)">
                           <button class="learn-btn" [class.active]="isLearning(layer.id, 'reverb')" (click)="startLearning(layer.id, 'reverb')">
                             <i class="fas fa-bolt"></i>
                           </button>
                         </div>
                      </div>

                      <div class="control-group">
                         <label>Pan</label>
                         <div class="input-with-learn">
                           <input type="range" [value]="layer.pan" min="-1" max="1" step="0.1" (input)="onLayerPan(layer, $event)">
                           <button class="learn-btn" [class.active]="isLearning(layer.id, 'pan')" (click)="startLearning(layer.id, 'pan')">
                             <i class="fas fa-bolt"></i>
                           </button>
                         </div>
                      </div>

                      <div class="control-group accent">
                         <label>Transp</label>
                         <input type="range" [value]="layer.transpose" min="-24" max="24" step="1" (input)="onLayerTranspose(layer, $event)">
                         <span class="val">{{ layer.transpose > 0 ? '+' : '' }}{{ layer.transpose }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </main>

      <footer class="piano-footer glass">
        <div class="piano-container">
          @for (n of notes; track n) {
            <div class="key" 
                 [class.black]="isBlack(n)"
                 [class.active]="audioService.activeNotes().has(n)"
                 (mousedown)="onKeyStart(n, $event)"
                 (mouseup)="onKeyEnd(n, $event)"
                 (mouseleave)="onKeyEnd(n, $event)"
                 (mouseenter)="onKeyMove(n, $event)">
            </div>
          }
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      --primary: #00f2ff;
      --secondary: #7000ff;
      --accent: #ff00c8;
      --bg-dark: #050510;
      --panel-bg: rgba(20, 20, 35, 0.7);
      --border: rgba(255, 255, 255, 0.1);
    }

    .app-container {
      height: 100vh;
      background: linear-gradient(135deg, #050510 0%, #101025 100%);
      display: flex;
      flex-direction: column;
      color: #e0e0e0;
      overflow: hidden;
    }

    /* Header */
    .header {
      padding: 10px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
    }

    .logo h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      background: linear-gradient(to right, #fff, var(--primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .badge {
      font-size: 10px;
      background: var(--accent);
      padding: 2px 8px;
      border-radius: 4px;
      vertical-align: middle;
      -webkit-text-fill-color: #fff;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .btn-save {
      background: var(--secondary);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-save:hover {
      box-shadow: 0 0 15px var(--secondary);
    }

    .status-indicators {
      display: flex;
      gap: 10px;
    }

    .indicator {
      font-size: 10px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      color: #666;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .indicator.active {
      color: var(--primary);
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 242, 255, 0.2);
    }

    .header-stats {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    @media (max-width: 900px) {
      .header {
        flex-direction: column;
        padding: 10px;
        height: auto;
        gap: 10px;
      }
      
      .logo h1 { font-size: 18px; }
      
      .header-actions {
        width: 100%;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
      }

      .header-stats {
        width: 100%;
        justify-content: center;
      }
    }

    .performance-toggle, .view-toggle {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #777;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .performance-toggle.turbo {
      background: rgba(0, 242, 255, 0.1);
      border-color: var(--primary);
      color: var(--primary);
      box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
    }

    .master-strip {
      padding: 0 30px;
      display: flex;
      align-items: center;
      gap: 30px;
      border-bottom: 1px solid var(--border);
      z-index: 90;
      background: rgba(10, 10, 25, 0.9);
      height: 50px;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .master-strip.minimized {
      height: 30px;
      background: rgba(10, 10, 25, 1);
    }

    .master-content-wrapper {
      display: flex;
      align-items: center;
      gap: 30px;
      flex-grow: 1;
    }

    .master-header {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 2px;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 15px;
      border-right: 1px solid var(--border);
      padding-right: 20px;
      height: 100%;
    }

    .minimize-btn {
      background: transparent;
      border: none;
      color: #555;
      cursor: pointer;
      padding: 5px;
      font-size: 14px;
      transition: 0.3s;
    }

    .minimize-btn:hover { color: var(--primary); }

    .master-toggle-header {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .master-toggle-header.off {
      border-color: #666;
      color: #666;
    }
    
    .master-toggle-header:hover:not(.off) {
      box-shadow: 0 0 15px var(--primary);
    }

    .master-controls {
      display: flex;
      gap: 25px;
      align-items: center;
      flex-grow: 1;
    }

    .m-knob {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    }

    .m-knob label {
      font-size: 8px;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
    }

    @media (max-width: 768px) {
      .master-strip {
        padding: 10px;
        gap: 15px;
        height: auto;
        flex-direction: column;
        align-items: stretch;
      }
      
      .master-header {
        display: none;
      }

      .master-controls {
        flex-direction: column;
        gap: 15px;
        width: 100%;
      }

      .m-knob {
        width: 100%;
      }

      .master-actions {
        padding-left: 0;
        border-left: none;
        justify-content: space-around;
        padding: 10px 0;
        border-top: 1px solid var(--border);
      }

      .master-midi {
        width: 100%;
        justify-content: center;
      }
    }

    .m-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .m-input input[type="range"] {
      flex-grow: 1;
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      accent-color: var(--primary);
      cursor: pointer;
    }

    .master-actions {
      display: flex;
      gap: 10px;
      border-left: 1px solid var(--border);
      padding-left: 20px;
    }

    .btn-sustain-mini {
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      color: #777;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-sustain-mini.on {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
      box-shadow: 0 0 10px var(--accent);
    }

    .btn-upload-mini {
      background: var(--secondary);
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
      cursor: pointer;
    }

    .master-midi {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.3);
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid var(--border);
    }

    .midi-led {
      width: 6px;
      height: 6px;
      background: #333;
      border-radius: 50%;
    }

    .midi-led.active {
      background: var(--primary);
      box-shadow: 0 0 8px var(--primary);
    }

    .midi-msg {
      font-size: 9px;
      font-family: monospace;
      color: #888;
    }

    /* Layout Base */
    .content {
      display: block;
      flex-grow: 1;
      overflow-y: auto;
    }

    /* Layers Area */
    .layers-area {
      padding: 30px;
      overflow-y: auto;
    }

    .area-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .area-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 300;
    }

    .btn-add {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 8px 20px;
      border-radius: 30px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
    }

    .btn-add:hover {
      background: var(--primary);
      color: #000;
      box-shadow: 0 0 20px var(--primary);
    }

    .layers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .layer-card {
      border-radius: 12px;
      position: relative;
      transition: all 0.3s;
      border: 1px solid var(--border);
    }

    .layer-card:hover {
      border-color: var(--primary);
      background: rgba(25, 25, 45, 0.9);
      transform: translateY(-5px);
    }

    .layer-card.disabled {
      opacity: 0.4;
      filter: grayscale(1);
    }

    .layer-header {
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
      border-bottom: 1px solid var(--border);
    }

    .layer-id {
      background: var(--border);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }

    .layer-name {
      background: transparent;
      border: none;
      color: white;
      font-weight: bold;
      outline: none;
      flex-grow: 1;
    }

    .icon-btn {
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 5px;
    }

    .icon-btn:hover { color: var(--primary); }
    .icon-btn.delete:hover { color: var(--accent); }

    .layer-body {
      padding: 20px;
    }

    .patch-selector { margin-bottom: 20px; }
    .patch-selector label { display: block; font-size: 11px; color: #666; margin-bottom: 8px; }

    .subir-timbre-btn {
       margin-top: 10px;
       width: 100%;
       background: rgba(0, 242, 255, 0.05);
       border: 1px dashed rgba(0, 242, 255, 0.2);
       color: var(--primary);
       padding: 6px;
       border-radius: 4px;
       font-size: 11px;
       font-weight: bold;
       cursor: pointer;
    }

    .sf-badge {
       font-size: 9px;
       color: #666;
       margin-top: 5px;
       font-family: monospace;
    }

    .custom-select {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border);
      color: #fff;
      padding: 10px;
      border-radius: 6px;
    }

    .layer-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .control-group label { width: 50px; font-size: 11px; color: #777; }
    .control-group input { flex-grow: 1; accent-color: var(--primary); }
    .control-group.accent input { accent-color: var(--accent); }
    .val { width: 35px; font-size: 11px; text-align: right; font-family: monospace; color: var(--primary); }

    .input-with-learn {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-grow: 1;
    }

    .learn-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #555;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s;
    }

    .learn-btn:hover {
      color: var(--primary);
      border-color: var(--primary);
    }

    .learn-btn.active {
      background: var(--primary);
      color: #000;
      box-shadow: 0 0 15px var(--primary);
      animation: pulse-midi 1s infinite;
    }

    @keyframes pulse-midi {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    .empty-state {
      padding: 60px;
      text-align: center;
      color: #555;
      border: 1px dashed var(--border);
      border-radius: 20px;
    }

    .warning-banner {
      background: rgba(255, 174, 0, 0.1);
      color: #ffae00;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 174, 0, 0.2);
      font-size: 13px;
    }

    .layer-card.learning {
      box-shadow: 0 0 30px rgba(0, 242, 255, 0.1);
      border-color: var(--primary);
    }

    /* Mixer Board Redesign */
    .mixer-board {
      display: flex;
      gap: 20px;
      padding: 40px;
      overflow-x: auto;
      border-radius: 20px;
      min-height: 500px;
      background: rgba(0,0,0,0.4);
      border: 1px solid var(--border);
    }

    @media (max-width: 600px) {
      .mixer-board {
        padding: 20px 10px;
        min-height: 400px;
        gap: 10px;
      }
      
      .mixer-channel {
        min-width: 80px;
        padding: 15px 10px;
      }

      .slider-wrapper {
        height: 200px;
      }

      .mixer-slider {
        height: 180px;
      }
    }
    
    .mixer-channel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      min-width: 100px;
      padding: 25px 15px;
      background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mixer-channel.muted-state {
      opacity: 0.6;
      filter: grayscale(0.5);
    }

    .slider-wrapper {
      position: relative;
      height: 280px;
      width: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.3);
      border-radius: 30px;
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
      overflow: hidden;
    }

    .mixer-slider {
      appearance: none;
      width: 230px; /* Horizontal width that becomes height after rotation */
      height: 6px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
      outline: none;
      transform: rotate(-90deg); /* Rotate to vertical */
      cursor: pointer;
    }

    .mixer-slider::-webkit-slider-runnable-track {
      background: linear-gradient(to right, var(--secondary), var(--primary));
      border-radius: 10px;
      height: 6px;
    }

    .mixer-slider::-webkit-slider-thumb {
      appearance: none;
      width: 40px; /* Knob height (horizontal before rotation) */
      height: 24px; /* Knob width (vertical before rotation) */
      background: #eee;
      border: 2px solid #999;
      border-radius: 4px;
      cursor: pointer;
      margin-top: -9px; /* Align with track */
      box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 0 2px 2px white;
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
    }

    .mixer-toggle {
      width: 60px;
      height: 30px;
      border: none;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 900;
      cursor: pointer;
      transition: all 0.3s;
      background: #4a0000;
      color: #ff4d4d;
      border: 1px solid #ff4d4d22;
      box-shadow: 0 0 10px rgba(255, 77, 77, 0.1);
    }

    .mixer-toggle.active {
      background: #003a20;
      color: #39ff14;
      border-color: #39ff1444;
      box-shadow: 0 0 15px rgba(57, 255, 20, 0.2);
    }

    .channel-info {
       text-align: center;
       display: flex;
       flex-direction: column;
       gap: 5px;
    }

    .channel-label { 
      font-size: 12px; 
      font-weight: 800; 
      color: #fff;
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ch-id { 
      font-size: 9px; 
      color: var(--primary); 
      letter-spacing: 1px;
      font-weight: 900;
      opacity: 0.7;
    }

    /* Piano */
    .piano-footer {
      height: 140px;
      background: #000;
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      align-items: flex-end;
      border-top: 2px solid var(--primary);
      box-shadow: 0 -5px 25px rgba(0, 242, 255, 0.2);
    }

    .piano-container {
      display: flex;
      height: 100%;
      padding-bottom: 5px;
      min-width: max-content; /* Force container to be as wide as keys */
    }

    .key {
      flex: 0 0 45px; /* Fixed width for white keys to prevent squishing */
      background: white;
      height: 100%;
      border-radius: 0 0 4px 4px;
      position: relative;
      cursor: pointer;
      border: 1px solid #ccc;
      transition: background 0.1s;
    }

    .key.black {
      background: #111;
      flex: 0 0 30px;
      height: 60%;
      z-index: 2;
      margin-left: -15px;
      margin-right: -15px;
      border-color: #333;
    }

    .key.active {
      background: var(--primary);
      box-shadow: 0 0 20px var(--primary);
    }

    /* Glass Effects */
    .glass {
      background: var(--panel-bg);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
  `]
})
export class AppComponent {
  audioService = inject(AudioService);
  midiService = inject(MidiService);
  sustain = signal(false);
  masterMinimized = signal(false);
  masterVisible = signal(true);

  notes = Array.from({length: 88}, (_, i) => i + 21); // 88 keys Piano

  constructor() {
    // Optimized MIDI handling via direct callback
    this.midiService.onMessage((msg) => {
      // Auto-resume audio context if it was in sleep mode (common in browsers)
      if (this.audioService.isInitialized()) {
        (this.audioService as any).audioContext?.resume();
      }

      if (msg.type === 0x90 && msg.velocity > 0) {
        this.audioService.noteOn(msg.note, msg.velocity);
      } else if (msg.type === 0x80 || (msg.type === 0x90 && msg.velocity === 0)) {
        this.audioService.noteOff(msg.note);
      } else if (msg.type === 0xB0) { // Control Change
        if (msg.note === 64) { // Sustain
           const isOn = msg.velocity >= 64;
           this.sustain.set(isOn);
           this.audioService.setSustain(isOn);
        } else {
           this.audioService.handleMidiCC(msg.note, msg.velocity);
        }
      }
    });

    // Auto-init audio on first interaction if needed, 
    // but better to leave to the Start button.
  }

  async onFileSelected(event: any, layer?: SynthLayer) {
    const file = event.target.files[0];
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      await this.audioService.loadSoundFont(arrayBuffer, file.name);
      
      if (layer) {
        this.audioService.updateLayer(layer.id, { 
          soundFontName: file.name,
          name: file.name.replace('.sf2', '').replace('.SF2', '')
        });
      }
    }
  }

  toggleSustain(on: boolean) {
    this.sustain.set(on);
    this.audioService.setSustain(on);
  }

  onMasterParam(param: string, event: any) {
    const val = parseFloat(event.target.value);
    this.audioService.setMasterParam(param, val);
  }

  onReverbTimeChange(event: any) {
    const val = parseFloat(event.target.value);
    this.audioService.setReverbTime(val);
  }

  onDelayChange(event: any) {
    const val = parseFloat(event.target.value);
    this.audioService.setDelay(val);
  }

  toggleView() {
    this.audioService.viewMode.update(v => v === 'cards' ? 'mixer' : 'cards');
  }

  // Layer Handlers
  onPatchChange(layer: SynthLayer, event: any) {
    const [prog, msb, lsb] = event.target.value.split(',').map(Number);
    this.audioService.updateLayer(layer.id, { program: prog, bankMSB: msb, bankLSB: lsb });
  }

  onLayerVol(layer: SynthLayer, event: any) {
    this.audioService.updateLayer(layer.id, { volume: parseFloat(event.target.value) });
  }

  onLayerRev(layer: SynthLayer, event: any) {
    this.audioService.updateLayer(layer.id, { reverb: parseFloat(event.target.value) });
  }

  onLayerPan(layer: SynthLayer, event: any) {
    this.audioService.updateLayer(layer.id, { pan: parseFloat(event.target.value) });
  }

  onLayerTranspose(layer: SynthLayer, event: any) {
    this.audioService.updateLayer(layer.id, { transpose: parseInt(event.target.value) });
  }

  isLearning(layerId: string, param: string) {
    const l = this.audioService.isLearning();
    return l?.layerId === layerId && l?.param === param;
  }

  startLearning(layerId: string, param: string) {
    this.audioService.isLearning.set({ layerId, param });
  }

  isBlack(n: number) {
    const keys = [1, 3, 6, 8, 10];
    return keys.includes(n % 12);
  }

  // Piano Interactive logic
  private isMouseDown = false;

  onKeyStart(note: number, event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
    this.audioService.noteOn(note, 100);
  }

  onKeyEnd(note: number, event: MouseEvent) {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    this.audioService.noteOff(note);
  }

  onKeyMove(note: number, event: MouseEvent) {
    if (this.isMouseDown) {
      this.audioService.noteOn(note, 100);
    }
  }
}
