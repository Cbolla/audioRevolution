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

      <main class="content" [class.sidebar-hidden]="!sidebarVisible()">
        <!-- Sidebar: Global & Master Effects -->
        <aside class="sidebar" [class.collapsed]="!sidebarVisible()">
          <button class="sidebar-toggle-btn" (click)="sidebarVisible.set(!sidebarVisible())">
             <i class="fas" [class.fa-chevron-left]="sidebarVisible()" [class.fa-chevron-right]="!sidebarVisible()"></i>
             {{ sidebarVisible() ? 'OCULTAR MASTER' : 'MOSTRAR MASTER' }}
          </button>

          <section class="master-panel glass">
            <div class="panel-header">
              <h3><i class="fas fa-sliders-h"></i> Master</h3>
            </div>
            
            <div class="knob-grid">
               <div class="knob-item">
                  <div class="knob-header">
                    <label>Volume</label>
                    <button class="mini-learn" [class.active]="isLearning('master', 'masterGain')" (click)="startLearning('master', 'masterGain')">
                      <i class="fas fa-bolt"></i>
                    </button>
                  </div>
                  <input type="range" class="vertical-range" min="0" max="2" step="0.1" value="1" (input)="onMasterParam('masterGain', $event)">
               </div>
               <div class="knob-item">
                  <div class="knob-header">
                    <label>Reverb Lvl</label>
                    <button class="mini-learn" [class.active]="isLearning('master', 'reverbGain')" (click)="startLearning('master', 'reverbGain')">
                      <i class="fas fa-bolt"></i>
                    </button>
                  </div>
                  <input type="range" class="vertical-range" min="0" max="10" step="0.1" value="0.5" (input)="onMasterParam('reverbGain', $event)">
               </div>
               <div class="knob-item">
                  <div class="knob-header">
                    <label>Reverb Time</label>
                    <button class="mini-learn" [class.active]="isLearning('master', 'reverbTime')" (click)="startLearning('master', 'reverbTime')">
                      <i class="fas fa-bolt"></i>
                    </button>
                  </div>
                  <input type="range" class="vertical-range" min="0" max="127" step="1" value="64" (input)="onReverbTimeChange($event)">
               </div>
               <div class="knob-item">
                  <div class="knob-header">
                    <label>Eco/Delay</label>
                    <button class="mini-learn" [class.active]="isLearning('master', 'delayGain')" (click)="startLearning('master', 'delayGain')">
                      <i class="fas fa-bolt"></i>
                    </button>
                  </div>
                  <input type="range" class="vertical-range" min="0" max="5" step="0.1" value="0.5" (input)="onDelayChange($event)">
               </div>
            </div>

            <div class="sustain-section">
               <button class="btn-sustain" [class.on]="sustain()" (click)="toggleSustain(!sustain())">
                  <i class="fas fa-lock"></i> SUSTAIN {{ sustain() ? 'ON' : 'OFF' }}
               </button>
            </div>

            <div class="file-section">
               <button class="btn-upload" (click)="fileInput.click()">
                 <i class="fas fa-file-audio"></i> 
                 {{ audioService.currentSoundFont() ? 'Trocar SF2' : 'Carregar SF2' }}
               </button>
               <input #fileInput type="file" (change)="onFileSelected($event)" accept=".sf2" hidden>
            </div>
          </section>

          <section class="midi-monitor glass">
              <div class="panel-header">
                <h3><i class="fas fa-terminal"></i> MIDI Monitor</h3>
              </div>
              <div class="log-mini">
                @if (midiService.messages(); as msg) {
                  <div class="msg">Note: {{ msg.note }} | Vel: {{ msg.velocity }}</div>
                } @else {
                  <div class="muted">Waiting...</div>
                }
              </div>
          </section>
        </aside>

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
                 <div class="mixer-channel" [class.muted]="!layer.enabled">
                    <div class="level-meter">
                       <div class="meter-bar" [style.height.%]="layer.enabled ? 40 + (layer.volume * 30) : 0"></div>
                    </div>
                    <div class="slider-wrapper">
                       <input type="range" class="mixer-slider" [value]="layer.volume" min="0" max="2" step="0.01" (input)="onLayerVol(layer, $event)">
                    </div>
                    <button class="mute-btn" (click)="audioService.updateLayer(layer.id, {enabled: !layer.enabled})">
                       {{ layer.enabled ? 'ON' : 'MUTE' }}
                    </button>
                    <div class="channel-label">{{ layer.name }}</div>
                    <div class="ch-id">CH {{ layer.channel + 1 }}</div>
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
      gap: 20px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #666;
      font-family: monospace;
    }

    .stat-item.high-load {
      color: #ff3e3e;
      text-shadow: 0 0 10px rgba(255, 62, 62, 0.4);
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

    /* Layout Base */
    .content {
      display: grid;
      grid-template-columns: 320px 1fr;
      flex-grow: 1;
      height: 0;
      transition: all 0.3s ease;
    }

    .sidebar {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      border-right: 1px solid var(--border);
      overflow-y: auto;
      background: rgba(5, 5, 20, 0.4);
    }

    /* Mobile Adaptations */
    @media (max-width: 992px) {
      .content {
        grid-template-columns: 1fr;
        height: auto;
        overflow-y: auto;
      }

      .content.sidebar-hidden {
        grid-template-rows: auto 1fr;
      }

      .sidebar {
        border-right: none;
        border-bottom: 1px solid var(--border);
        height: auto;
        max-height: 400px;
        transition: max-height 0.3s ease;
      }

      .sidebar.collapsed {
        max-height: 50px;
        padding: 5px 20px;
        overflow: hidden;
      }

      .sidebar-toggle-btn {
        display: flex;
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid #333;
        color: #888;
        padding: 8px;
        border-radius: 6px;
        justify-content: center;
        align-items: center;
        gap: 10px;
        font-size: 10px;
        letter-spacing: 1px;
        cursor: pointer;
      }

      .header {
        padding: 5px 10px;
        gap: 8px;
      }

      .header-actions {
        gap: 5px;
      }

      .logo h1 { font-size: 16px; margin-bottom: 5px; }
      
      .btn-save { padding: 5px 10px; font-size: 11px; }
      .view-toggle, .performance-toggle { padding: 4px 8px; font-size: 8px; }
    }

    /* Landscape Mode */
    @media (max-height: 500px) and (orientation: landscape) {
       .header { display: none; } /* Hide header on small landscape to save space */
       .piano-footer { height: 70px; }
       .sidebar { max-height: 100vh; width: 200px; grid-row: 1 / span 2; position: fixed; left: 0; z-index: 1000; }
       .sidebar.collapsed { width: 40px; }
       .content { margin-left: 40px; }
       .content:not(.sidebar-hidden) { margin-left: 200px; }
       .mixer-board { padding: 5px; gap: 5px; }
       .mixer-slider { height: 100px; }
    }

    /* Piano Footer Mobile */
    .piano-footer {
      height: 120px;
      background: #000;
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      align-items: flex-end;
      border-top: 2px solid var(--primary);
      box-shadow: 0 -5px 25px rgba(0, 242, 255, 0.1);
    }

    .piano-container {
      display: flex;
      height: 100%;
      min-width: 1200px; /* Force scrollable on mobile */
      position: relative;
    }

    .key {
      flex: 1;
      border: 1px solid #ddd;
      background: white;
      min-width: 30px;
      height: 100%;
      border-radius: 0 0 4px 4px;
      position: relative;
      cursor: pointer;
      transition: background 0.1s;
    }

    .key.black {
      background: #111;
      height: 60%;
      z-index: 2;
      margin-left: -15px;
      margin-right: -15px;
      min-width: 20px;
      border-color: #333;
    }

    .key.active {
      background: var(--primary) !important;
      box-shadow: 0 0 20px var(--primary);
    }

    /* Custom Select & Inputs mobile */
    .input-with-learn {
      flex-grow: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    @media (max-width: 480px) {
       .layers-grid {
         grid-template-columns: 1fr;
         padding: 10px;
       }
       
       .layer-card {
         padding: 15px;
       }

       .header-stats {
         display: grid;
         grid-template-columns: 1fr 1fr;
         width: 100%;
         gap: 5px;
       }

       .performance-toggle {
         width: 100%;
         justify-content: center;
       }
    }

    .panel-header h3 {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #888;
    }

    /* Knobs / Scrollers */
    .knob-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }

    .knob-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .knob-item label {
      font-size: 10px;
      color: #666;
    }

    .knob-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mini-learn {
      background: transparent;
      border: none;
      color: #444;
      font-size: 10px;
      cursor: pointer;
      padding: 0;
    }

    .mini-learn.active { color: var(--primary); animation: pulse-midi 1s infinite; }

    .vertical-range {
      appearance: none;
      width: 60px;
      height: 60px;
      background: var(--panel-bg);
      border-radius: 50%;
      border: 4px solid var(--border);
      transform: rotate(-90deg);
      cursor: pointer;
    }

    .vertical-range::-webkit-slider-thumb {
      appearance: none;
      width: 15px;
      height: 15px;
      background: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--primary);
    }

    .btn-sustain {
      width: 100%;
      padding: 12px;
      background: rgba(0,0,0,0.4);
      border: 1px solid var(--border);
      color: #777;
      border-radius: 8px;
      font-weight: 800;
      cursor: pointer;
    }

    .btn-sustain.on {
      background: var(--accent);
      color: white;
      box-shadow: 0 0 20px var(--accent);
    }

    .btn-upload {
      width: 100%;
      padding: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px dashed #444;
      color: #aaa;
      border-radius: 6px;
      cursor: pointer;
    }

    .log-mini {
      font-family: monospace;
      font-size: 10px;
      padding: 10px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
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

    /* Mixer Board */
    .mixer-board {
      display: flex;
      gap: 15px;
      padding: 20px;
      overflow-x: auto;
      border-radius: 12px;
    }

    .mixer-channel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      min-width: 80px;
      padding: 15px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
    }

    .mixer-channel.muted { opacity: 0.5; }

    .level-meter {
      height: 100px;
      width: 10px;
      background: #111;
      position: relative;
      border-radius: 5px;
      overflow: hidden;
    }

    .meter-bar {
      position: absolute;
      bottom: 0;
      width: 100%;
      background: var(--primary);
      transition: height 0.1s;
    }

    .mixer-slider {
      writing-mode: bt-lr;
      appearance: slider-vertical;
      width: 8px;
      height: 150px;
    }

    .mute-btn {
      background: #333;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
    }

    .channel-label { font-size: 11px; font-weight: bold; }
    .ch-id { font-size: 9px; color: #666; }

    /* Piano */
    .piano-footer {
      height: 120px;
      background: #000;
      padding: 5px;
    }

    .piano-container {
      display: flex;
      height: 100%;
      gap: 1px;
    }

    .key {
      flex: 1;
      background: #eee;
      border-radius: 0 0 5px 5px;
      transition: background 0.1s;
    }

    .key.black {
      background: #222;
      flex: 0.7;
      height: 60%;
      z-index: 2;
      margin: 0 -0.5%;
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
  sidebarVisible = signal(true);

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
