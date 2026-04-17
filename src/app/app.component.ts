import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService, SynthLayer } from './services/audio.service';
import { MidiService } from './services/midi.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="app-container main-layout">
      <!-- Sidebar de Navegação -->
      <nav class="side-nav glass">
        <div class="nav-top">
          <button class="nav-item" [class.active]="audioService.viewMode() === 'home'" 
                  (click)="audioService.viewMode.set('home'); selectedLayerForIcon.set(null)">
            <i class="fas fa-home"></i>
            <span>HOME</span>
          </button>
          <button class="nav-item" [class.active]="audioService.viewMode() === 'mixer'" 
                  (click)="audioService.viewMode.set('mixer'); selectedLayerForIcon.set(null)">
            <i class="fas fa-sliders-h"></i>
            <span>MIXER</span>
          </button>
          <button class="nav-item" [class.active]="audioService.viewMode() === 'effects'" 
                  (click)="audioService.viewMode.set('effects'); selectedLayerForIcon.set(null)">
            <i class="fas fa-wave-square"></i>
            <span>EFEITOS</span>
          </button>
          <button class="nav-item" [class.active]="audioService.viewMode() === 'library'" 
                  (click)="audioService.viewMode.set('library'); selectedLayerForIcon.set(null)">
            <i class="fas fa-book"></i>
            <span>LIBRARY</span>
          </button>
        </div>
        <div class="nav-bottom">
          <button class="nav-item">
            <i class="fas fa-cog"></i>
            <span>CONFIG</span>
          </button>
        </div>
      </nav>

      <div class="main-wrapper">
        <!-- Overlay de Carregamento/Cópia (ESTILO PRO) -->
        @if (audioService.isCopying()) {
          <div class="copy-overlay animate-in">
            <div class="copy-modal glass">
              <i class="fas fa-file-import fa-spin-pulse"></i>
              <h3>Importando Timbre Profissional...</h3>
              <p>Otimizando amostras para performance de baixa latência</p>
              <div class="pro-progress-container">
                <div class="pro-progress-bar" [style.width.%]="audioService.copyProgress()"></div>
              </div>
              <span class="progress-info">{{ audioService.copyProgress() }}%</span>
            </div>
          </div>
        }
        <!-- Header Superior -->
        @if (!audioService.isImmersiveMode()) {
          <header class="main-header animate-in">
            <div class="project-info">
              <div class="dropdown">
                <span class="p-name">Meu Projeto Ao Vivo</span>
                <i class="fas fa-chevron-down"></i>
              </div>
              <span class="badge-live">LIVE</span>
            </div>
            
              <div class="header-actions">
                <button class="btn-live-mode" (click)="testAudio()">
                   <i class="fas fa-volume-up"></i> TESTAR SOM
                </button>
                <button class="btn-live-mode">
                  <i class="fas fa-bolt"></i> MODO AO VIVO
                </button>
              <div class="bpm-control">
                <span class="bpm-val">120 BPM</span>
              </div>
              <button class="icon-btn-circle"><i class="fas fa-cog"></i></button>
              <button class="icon-btn-circle"><i class="fas fa-ellipsis-v"></i></button>
            </div>
          </header>
        }

        <!-- Área de Conteúdo -->
        <main class="content-area">
          <!-- LIBRARY VIEW -->
          @if (audioService.viewMode() === 'library') {
             <div class="library-view">
               <div class="panel-header">
                  <h3>Sua Biblioteca de Timbres (.SF2)</h3>
                  <button class="btn-live-mode" (click)="libFileInput.click()">
                    <i class="fas fa-plus"></i> NOVA SF2
                  </button>
                  <input #libFileInput type="file" (change)="onFileSelected($event)" accept=".sf2" hidden>
               </div>
               
               <div class="library-grid">
                 @for (sf of availableSF2s(); track sf.name) {
                   <div class="sf-card-premium glass-card">
                      <div class="sf-main-info">
                         <div class="sf-status-icon active">
                            <i class="fas fa-file-audio"></i>
                         </div>
                         <div class="sf-text">
                            <span class="sf-filename">{{ sf.name.replace('.sf2', '') }}</span>
                            <span class="sf-meta">SOUNDFONT SF2 • {{ (sf.data.byteLength / 1024 / 1024).toFixed(1) }} MB</span>
                         </div>
                      </div>
                      <div class="sf-card-actions">
                         <button class="btn-sf-delete" (click)="deleteFromLibrary(sf.name)" title="Remover">
                            <i class="fas fa-trash-alt"></i>
                         </button>
                      </div>
                   </div>
                 } @empty {
                   <div class="library-empty-state">
                      <div class="empty-icon-circle">
                         <i class="fas fa-folder-open"></i>
                      </div>
                      <h4>Sua Biblioteca está vazia</h4>
                      <p>Importe arquivos .sf2 para começar sua jornada sonora.</p>
                   </div>
                 }
               </div>
             </div>
          }

          <!-- Modais removidos em favor do Select integrado -->

          @if (audioService.viewMode() === 'mixer') {
             <!-- Visão Mixer (Vertical) -->
             <section class="mixer-view animate-in">
               <div class="mixer-scroll">
                   <!-- Canal Master -->
                   <div class="mixer-strip master animate-in">
                       <div class="strip-header">
                          <span class="ch-idx-badge">MASTER</span>
                          <span class="strip-label">MAIN OUT</span>
                       </div>
                       
                       <div class="fader-vu-container">
                          <div class="fader-track">
                             <input type="range" class="vertical-fader" min="0" max="2" step="0.01" value="1" (input)="onMasterParam('masterGain', $event)">
                          </div>
                          <div class="vu-meter-pro">
                             <div class="vu-seg" [class.active-r]="audioService.activeVoices() > 200"></div>
                             <div class="vu-seg" [class.active-r]="audioService.activeVoices() > 180"></div>
                             <div class="vu-seg" [class.active-y]="audioService.activeVoices() > 150"></div>
                             <div class="vu-seg" [class.active-y]="audioService.activeVoices() > 120"></div>
                             <div class="vu-seg" [class.active-g]="audioService.activeVoices() > 100"></div>
                             <div class="vu-seg" [class.active-g]="audioService.activeVoices() > 80"></div>
                             <div class="vu-seg" [class.active-g]="audioService.activeVoices() > 60"></div>
                             <div class="vu-seg" [class.active-g]="audioService.activeVoices() > 40"></div>
                             <div class="vu-seg" [class.active-g]="audioService.activeVoices() > 20"></div>
                             <div class="vu-seg" [class.active-g]="audioService.activeVoices() > 5"></div>
                          </div>
                       </div>
                       
                       <span class="db-val">-2.0 dB</span>
                       
                       <div class="strip-footer">
                          <button class="btn-pro">LIMITER</button>
                       </div>
                    </div>

                   @for (layer of audioService.layers(); track layer.id) {
                    <div class="mixer-strip animate-in" [style.animation-delay]="layer.channel * 0.05 + 's'">
                       <div class="strip-header">
                          <span class="ch-idx-badge">CH {{ layer.channel + 1 }}</span>
                          <span class="strip-label">{{ layer.name }}</span>
                       </div>

                       <div class="inst-icon-wrap">
                          <i [class]="getInstrumentIconClass(layer)" [style.color]="getInstrumentColor(layer)"></i>
                       </div>
                       
                       <div class="fader-vu-container">
                          <div class="fader-track">
                             <input type="range" class="vertical-fader" [value]="layer.volume" min="0" max="2" step="0.01" (input)="onLayerVol(layer, $event)">
                          </div>
                          <div class="vu-meter-pro">
                             <div class="vu-seg" [class.active-r]="layer.volume > 1.8"></div>
                             <div class="vu-seg" [class.active-r]="layer.volume > 1.6"></div>
                             <div class="vu-seg" [class.active-y]="layer.volume > 1.4"></div>
                             <div class="vu-seg" [class.active-y]="layer.volume > 1.2"></div>
                             <div class="vu-seg" [class.active-g]="layer.volume > 1.0"></div>
                             <div class="vu-seg" [class.active-g]="layer.volume > 0.8"></div>
                             <div class="vu-seg" [class.active-g]="layer.volume > 0.6"></div>
                             <div class="vu-seg" [class.active-g]="layer.volume > 0.4"></div>
                             <div class="vu-seg" [class.active-g]="layer.volume > 0.2"></div>
                             <div class="vu-seg" [class.active-g]="layer.volume > 0.05"></div>
                          </div>
                       </div>

                       <span class="db-val">{{ (layer.volume * 10 - 10) | number:'1.1-1' }} dB</span>
                       
                       <div class="strip-footer">
                          <button class="btn-pro solo" [class.active]="isSolo(layer)">S</button>
                          <button class="btn-pro mute" [class.active]="!layer.enabled" 
                                  (click)="audioService.updateLayer(layer.id, {enabled: !layer.enabled})">
                            M
                          </button>
                       </div>
                    </div>
                   }

                  <div class="add-timbre-strip">
                     <button (click)="audioService.addLayer()">
                        <i class="fas fa-plus"></i>
                        <span>ADICIONAR TIMBRE</span>
                     </button>
                  </div>
               </div>
             </section>
          } @else if (audioService.viewMode() === 'home') {
             <!-- Visão Home/Performance -->
             <section class="home-grid animate-in">
                <div class="timbres-panel">
                  <div class="panel-header">
                    <h3>TIMBRES ATIVOS</h3>
                    <button class="btn-ghost" (click)="audioService.addLayer()">+ ADICIONAR</button>
                  </div>

                  <div class="timbres-list">
                    @for (layer of audioService.layers(); track layer.id) {
                      <div class="timbre-card" [style.--accent]="getLayerColor(layer.channel)" [class.inactive]="!layer.enabled">
                        <span class="t-idx">{{ layer.channel + 1 }}</span>
                        <div class="t-img" (click)="selectedLayerForIcon.set(layer)">
                           <i [class]="getInstrumentIconClass(layer)" [style.color]="getInstrumentColor(layer)"></i>
                        </div>
                        <div class="t-main">
                           <div class="t-title">
                              <input class="layer-name-input" type="text" [value]="layer.name" 
                                     (change)="onLayerNameChange(layer, $event)"
                                     (click)="$event.stopPropagation()">
                           </div>
                           <div class="t-selector-wrapper">
                              <select class="premium-select" (change)="onSFSelectChange(layer, $event)">
                                 <option value="">SELECIONAR...</option>
                                 @for (sf of availableSF2s(); track sf.name) {
                                    <option [value]="sf.name" [selected]="layer.soundFontName === sf.name">
                                       {{ sf.name.split('.sf2')[0] }}
                                    </option>
                                 }
                              </select>
                              <i class="fas fa-chevron-down select-arrow"></i>
                           </div>
                        </div>
                        <div class="t-control">
                           <input type="range" class="mini-slider" [value]="layer.volume" min="0" max="2" (input)="onLayerVol(layer, $event)">
                        </div>
                        <div class="t-actions">
                           <span class="t-db">{{ (layer.volume * 100).toFixed(0) }}%</span>
                           
                           <div class="t-btns-group">
                              <!-- Botão Mute -->
                              <button class="btn-m" [class.active]="!layer.enabled" 
                                      (click)="audioService.updateLayer(layer.id, {enabled: !layer.enabled})">
                                M
                              </button>

                              <!-- Botão Excluir -->
                              <button class="btn-delete" (click)="audioService.removeLayer(layer.id)">
                                <i class="fas fa-trash"></i>
                              </button>
                           </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <div class="side-panels">
                   <!-- Efeitos Globais -->
                   <div class="effects-panel glass">
                      <h3>EFEITOS GLOBAIS</h3>
                      <div class="effects-list">
                         <div class="effect-item">
                            <button class="fx-toggle active"><i class="fas fa-power-off"></i></button>
                            <span class="fx-name">REVERB</span>
                            <div class="fx-knob-wrap">
                               <div class="knob-svg"></div>
                               <span class="fx-val">35 %</span>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                         </div>
                         <div class="effect-item">
                            <button class="fx-toggle"><i class="fas fa-power-off"></i></button>
                            <span class="fx-name">DELAY</span>
                            <div class="fx-knob-wrap">
                               <div class="knob-svg"></div>
                               <span class="fx-val">22 %</span>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                         </div>
                         <div class="effect-item">
                            <button class="fx-toggle active"><i class="fas fa-power-off"></i></button>
                            <span class="fx-name">CHORUS</span>
                            <div class="fx-knob-wrap">
                               <div class="knob-svg"></div>
                               <span class="fx-val">18 %</span>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                         </div>
                      </div>
                   </div>

                   <!-- Info Soundfont -->
                   <div class="info-panel glass">
                      <span class="label">ARQUIVO SF2 CARREGADO</span>
                      <div class="sf-file">
                         <i class="fas fa-file-audio"></i>
                         <div class="sf-details">
                            <span class="sf-name">{{ audioService.currentSoundFont() || 'Nenhum carregado' }}</span>
                            <span class="sf-size">2.4 MB</span>
                         </div>
                         <button class="btn-change" (click)="fileInput.click()">TROCAR</button>
                         <input #fileInput type="file" (change)="onFileSelected($event)" accept=".sf2" hidden>
                      </div>
                      
                      <div class="cpu-monitor">
                         <div class="monitor-header">
                            <span>USO DA CPU / VOZES</span>
                            <span>{{ audioService.activeVoices() }} / 256</span>
                         </div>
                         <div class="progress-bar">
                            <div class="progress-fill" [style.width.%]="(audioService.activeVoices() / 256) * 100"></div>
                         </div>
                         <span class="cpu-perc">{{ (audioService.activeVoices() / 256) * 100 | number:'1.0-0' }}%</span>
                      </div>
                   </div>
                </div>
             </section>
          }
        </main>

        <!-- Teclado Visual -->
        @if (audioService.viewMode() === 'home' && keyboardVisible()) {
          <footer class="visual-keyboard animate-up">
             <div class="piano-container">
               @for (n of notes; track n) {
                 <div class="key" 
                      [class.black]="isBlack(n)"
                      [class.active]="audioService.activeNotes().has(n)"
                      (mousedown)="onKeyStart(n, $event)"
                      (mouseup)="onKeyEnd(n, $event)"
                      (mouseleave)="onKeyEnd(n, $event)"
                      (touchstart)="onKeyTouchStart(n, $event)"
                      (touchend)="onKeyTouchEnd(n, $event)">
                 </div>
               }
             </div>
          </footer>
        }

        @if (!audioService.isImmersiveMode()) {
          <div class="status-bar animate-in">
             <div class="s-left">
                <span class="label">PRESET</span>
                <span class="val">{{ audioService.currentPresetName() || 'Show Domingo' }}</span>
             </div>
             
             <div class="s-center">
                <div class="midi-status" [class.connected]="audioService.midiConnected()">
                   <i class="fas fa-keyboard"></i>
                   <span>{{ audioService.midiConnected() ? 'MIDI CONECTADO' : 'SEM MIDI' }}</span>
                </div>
             </div>

             <div class="s-right">
                <!-- BOTÃO DE TECLADO CLARO E VISÍVEL -->
                <button class="btn-footer-toggle" (click)="keyboardVisible.set(!keyboardVisible())" [class.active]="keyboardVisible()">
                   <i class="fas fa-piano"></i>
                   <span>{{ keyboardVisible() ? 'FECHAR TECLADO' : 'ABRIR TECLADO' }}</span>
                </button>
                
                <div class="bpm-tap">
                   <span class="label">TAP</span>
                   <span class="val">120</span>
                </div>
             </div>
          </div>
        }

        <!-- Botão Flutuante de Modo Imersivo -->
        <button class="btn-float-immersive" (click)="audioService.isImmersiveMode.set(!audioService.isImmersiveMode())"
                [class.active]="audioService.isImmersiveMode()">
           <i [class]="audioService.isImmersiveMode() ? 'fas fa-expand-arrows-alt' : 'fas fa-compress-arrows-alt'"></i>
        </button>

        <!-- Seletor de Ícones (MODO PRO-MAX) -->
        @if (selectedLayerForIcon(); as selectedLayer) {
          <div class="modal-overlay-premium animate-in" (click)="selectedLayerForIcon.set(null)">
            <div class="modal-content-premium glass" (click)="$event.stopPropagation()">
              <div class="modal-header-premium">
                <div class="header-titles">
                  <h4>MUDAR ÍCONE DO INSTRUMENTO</h4>
                  <span class="active-layer-name">Editando: {{ selectedLayer.name }}</span>
                </div>
                <button class="close-btn-premium" (click)="selectedLayerForIcon.set(null)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              
              <div class="assign-grid-pro">
                @for (opt of instrumentOptions; track opt.id) {
                  <div class="assign-card-pro" 
                       [style.--icon-color]="opt.color || 'var(--primary)'"
                       (click)="setLayerIcon(selectedLayer.id, opt.id)">
                    <div class="icon-box">
                      <i [class]="opt.iconClass || 'fas fa-music'"></i>
                    </div>
                    <span class="inst-name">{{ opt.name }}</span>
                    <span class="inst-cat">PRO MIDI</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg-dark: #0a0a0f;
      --sidebar-bg: #12121e;
      --panel-bg: rgba(18, 18, 30, 0.6);
      --border: rgba(255, 255, 255, 0.08);
      --text: #ffffff;
      --text-muted: #808090;
      --primary: #00f2ff;
      --layer-1: #8a2be2;
      --layer-2: #32cd32;
      --layer-3: #1e90ff;
      --layer-4: #ff8c00;
    }

    * { box-sizing: border-box; }

    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: #05050a;
      color: #fff;
      font-family: 'Inter', sans-serif;
      user-select: none; /* DESATIVA SELEÇÃO DE TEXTO PARA PARECER APP NATIVO */
    }

    .main-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      background: var(--bg-dark);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      position: fixed;
      top: 0; left: 0;
    }

    /* Sidebar */
    .side-nav {
      width: 75px;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .nav-item {
      background: transparent;
      border: none;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 12px 0;
      cursor: pointer;
      transition: all 0.3s;
      width: 100%;
      letter-spacing: 0;
      text-transform: none;
      font-size: 7px;
    }
    .nav-item i { font-size: 18px; }
    .nav-item span { font-weight: 700; letter-spacing: 0.3px; font-size: 7px; }
    .nav-item.active { color: var(--primary); background: rgba(0, 242, 255, 0.05); border-left: 2px solid var(--primary); }
    .nav-item:hover { color: #fff; background: rgba(255,255,255,0.03); }

    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      min-width: 0; /* IMPEDE ESTOURO DE LARGURA */
    }

    /* Header */
    .main-header {
      height: 60px;
      padding: 0 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: rgba(10, 10, 15, 0.5);
      backdrop-filter: blur(20px);
    }

    .project-info { display: flex; align-items: center; gap: 12px; }
    .project-info .dropdown { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .p-name { font-size: 14px; font-weight: 600; }
    .badge-live { background: #32cd32; color: #000; font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 3px; }
    
    /* MIXER PROFISSIONAL - PADRÃO ESTÚDIO PRO-MAX */
    .mixer-view { 
       display: flex; 
       flex: 1; 
       padding: 0; /* PADDING REMOVIDO PARA GANHO DE ESPAÇO */
       gap: 10px; 
       height: 100%;
       width: 100%;
       background: radial-gradient(circle at center, rgba(30,30,40,1) 0%, rgba(10,10,15,1) 100%);
       overflow: hidden;
       align-items: stretch;
    }
    .mixer-scroll { 
       display: flex; 
       gap: 12px; 
       flex: 1;
       height: 100%;
       overflow-x: auto; 
       overflow-y: hidden;
       align-items: stretch;
       padding: 5px;
    }

    /* Strip de Canal Estilo Hardware */
    .mixer-strip { 
       flex: 0 0 85px; 
       background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
       backdrop-filter: blur(10px);
       border: 1px solid rgba(255,255,255,0.1);
       border-radius: 12px; 
       display: flex; 
       flex-direction: column; 
       padding: 8px 0; 
       gap: 5px;
       height: 100%;
       min-height: 0;
       position: relative;
       transition: all 0.3s ease;
    }
    .mixer-strip.master { 
       flex: 0 0 100px; 
       border: 1px solid rgba(0, 242, 255, 0.3);
       background: linear-gradient(180deg, rgba(0, 242, 255, 0.05) 0%, rgba(0,0,0,0.5) 100%);
    }

    .strip-header {
       display: flex;
       flex-direction: column;
       align-items: center;
       gap: 2px;
       padding: 0 4px;
    }
    .ch-idx-badge { 
       background: var(--primary); 
       color: #000; 
       font-size: 8px; 
       font-weight: 900; 
       padding: 1px 4px; 
       border-radius: 3px;
       margin-bottom: 2px;
    }
    .strip-label { 
       font-size: 9px; 
       font-weight: 700; 
       color: #eee; 
       text-align: center; 
       white-space: nowrap; 
       overflow: hidden; 
       text-overflow: ellipsis;
       text-transform: uppercase;
       letter-spacing: 0.5px;
    }

    .inst-icon-wrap {
       width: 40px;
       height: 40px;
       background: rgba(0,0,0,0.3);
       border-radius: 8px;
       display: flex;
       align-items: center;
       justify-content: center;
       margin: 5px auto;
       font-size: 18px;
       border: 1px solid rgba(255,255,255,0.05);
    }

    /* Fader e VU Meter */
    .fader-vu-container {
       flex: 1;
       display: flex;
       justify-content: center;
       gap: 8px;
       padding: 10px 0;
       min-height: 0;
    }

    .fader-track { 
       width: 30px; 
       position: relative; 
       display: flex; 
       justify-content: center; 
       height: 100%;
    }
    .vertical-fader { 
       width: 30px; 
       height: 100%;
       margin: 0;
       appearance: slider-vertical;
       cursor: pointer;
       filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
    }

    .vu-meter-pro {
       width: 6px;
       height: 100%;
       background: #111;
       border-radius: 3px;
       display: flex;
       flex-direction: column-reverse;
       gap: 1px;
       padding: 1px;
       border: 1px solid rgba(255,255,255,0.05);
    }
    .vu-seg {
       width: 100%;
       flex: 1;
       border-radius: 1px;
       background: #222;
       transition: background 0.1s ease;
    }
    .vu-seg.active-g { background: #00ff00; box-shadow: 0 0 5px #00ff00; }
    .vu-seg.active-y { background: #ffff00; box-shadow: 0 0 5px #ffff00; }
    .vu-seg.active-r { background: #ff0000; box-shadow: 0 0 5px #ff0000; }

    .db-val { 
       font-family: 'Courier New', monospace;
       font-size: 10px; 
       color: var(--primary); 
       background: rgba(0,0,0,0.5);
       padding: 2px 4px;
       border-radius: 3px;
       text-align: center;
       margin: 0 5px;
    }

    .strip-footer { 
       display: flex; 
       justify-content: center;
       gap: 5px; 
       padding: 5px;
    }
    .btn-pro {
       flex: 1;
       height: 24px;
       font-size: 10px;
       font-weight: 900;
       border-radius: 4px;
       border: none;
       background: rgba(255,255,255,0.05);
       color: #666;
       cursor: pointer;
       transition: all 0.2s;
    }
    /* MODAL DE CÓPIA PRO */
    .copy-overlay {
       position: fixed;
       top: 0; left: 0; right: 0; bottom: 0;
       background: rgba(0,0,0,0.85);
       backdrop-filter: blur(15px);
       z-index: 9999;
       display: flex;
       align-items: center;
       justify-content: center;
    }
    .copy-modal {
       width: 85%;
       max-width: 400px;
       padding: 30px;
       border-radius: 20px;
       text-align: center;
       border: 1px solid rgba(0, 242, 255, 0.3);
       box-shadow: 0 0 50px rgba(0, 242, 255, 0.2);
    }
    .copy-modal i { font-size: 40px; color: var(--primary); margin-bottom: 20px; }
    .copy-modal h3 { font-size: 18px; margin-bottom: 10px; color: #fff; }
    .copy-modal p { font-size: 12px; color: var(--text-muted); margin-bottom: 25px; }
    
    .pro-progress-container {
       width: 100%;
       height: 6px;
       background: rgba(255,255,255,0.05);
       border-radius: 3px;
       overflow: hidden;
       margin-bottom: 10px;
    }
    .pro-progress-bar {
       height: 100%;
       background: linear-gradient(90deg, var(--primary), var(--secondary));
       box-shadow: 0 0 10px var(--primary);
       transition: width 0.3s ease;
    }
    .progress-info { font-size: 14px; font-weight: 800; color: var(--primary); }

    /* New Premium Library Styling */
    .library-view { padding: 30px; height: 100%; overflow-y: auto; background: radial-gradient(circle at top right, rgba(0,242,255,0.05), transparent); }
    .panel-header h3 { font-size: 18px; letter-spacing: 1px; color: #fff; font-weight: 800; }
    
    .library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 30px; }
    
    .glass-card { 
       background: rgba(255,255,255,0.03); 
       backdrop-filter: blur(10px); 
       border: 1px solid rgba(255,255,255,0.08); 
       border-radius: 12px;
       transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sf-card-premium { 
       display: flex; 
       align-items: center; 
       justify-content: space-between; 
       padding: 16px;
    }
    .sf-card-premium:hover { 
       background: rgba(255,255,255,0.06); 
       border-color: var(--primary); 
       transform: translateY(-2px);
       box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    }

    .sf-main-info { display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0; }
    .sf-status-icon { 
       width: 44px; height: 44px; 
       background: rgba(0,0,0,0.4); 
       border-radius: 10px; 
       display: flex; align-items: center; justify-content: center;
       border: 1px solid var(--border);
       color: #666;
    }
    .sf-status-icon.active { 
       color: var(--primary); 
       background: rgba(0,242,255,0.08); 
       border-color: rgba(0,242,255,0.2);
       box-shadow: 0 0 15px rgba(0,242,255,0.1);
    }

    .sf-text { display: flex; flex-direction: column; min-width: 0; }
    .sf-filename { color: #fff; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sf-meta { font-size: 9px; color: var(--text-muted); font-weight: 800; letter-spacing: 0.5px; margin-top: 2px; }

    .btn-sf-delete { 
       background: rgba(255,51,51,0.1); 
       border: 1px solid rgba(255,51,51,0.2); 
       color: #ff3333; 
       width: 38px; height: 38px; 
       border-radius: 10px; 
       display: flex; align-items: center; justify-content: center;
       cursor: pointer;
       transition: all 0.2s;
    }
    .btn-sf-delete:hover { background: #ff3333; color: #fff; transform: scale(1.1); }

    .library-empty-state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; padding: 100px 0; color: #444; }
    .empty-icon-circle { width: 80px; height: 80px; border-radius: 50%; border: 2px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px; }
    .library-empty-state h4 { color: #888; margin-bottom: 8px; font-weight: 800; }
    .library-empty-state p { font-size: 12px; }

    /* PREMIUM SELECT STYLING */
    .t-selector-wrapper { position: relative; width: 100%; max-width: 180px; margin-top: 4px; }
    .premium-select { 
       width: 100%; 
       background: rgba(255,255,255,0.05); 
       border: 1px solid rgba(0,242,255,0.2); 
       color: var(--primary); 
       font-size: 11px; 
       font-weight: 700; 
       padding: 6px 30px 6px 10px; 
       border-radius: 6px; 
       appearance: none; 
       outline: none;
       cursor: pointer;
       text-transform: uppercase;
    }
    .premium-select option { background: #0a0a15; color: #fff; }
    .select-arrow { 
       position: absolute; right: 10px; top: 50%; transform: translateY(-50%); 
       font-size: 9px; color: var(--primary); pointer-events: none; 
    }

    /* FOOTER CONTROLS */
    .btn-footer-toggle { 
       background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
       color: #fff; border-radius: 6px; padding: 6px 12px; display: flex; align-items: center; gap: 8px;
       cursor: pointer; transition: all 0.2s;
    }
    .btn-footer-toggle i { color: var(--primary); font-size: 14px; }
    .btn-footer-toggle span { font-size: 9px; font-weight: 800; }
    .btn-footer-toggle.active { background: var(--primary); color: #000; border-color: var(--primary); }
    .btn-footer-toggle.active i { color: #000; }

    .midi-status { display: flex; align-items: center; gap: 8px; font-size: 9px; font-weight: 800; color: #444; }
    .midi-status i { font-size: 12px; }
    .midi-status.connected { color: #32cd32; }
    .midi-status.connected i { text-shadow: 0 0 10px #32cd32; }

    .animate-up { animation: slideUp 0.3s ease-out; }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .header-actions { display: flex; align-items: center; gap: 15px; }
    .layer-name-input { 
       background: transparent; 
       border: none; 
       color: #fff; 
       font-size: 14px; 
       font-weight: 800; 
       width: 100%; 
       outline: none;
       padding: 0;
       margin: 0;
       cursor: text;
    }
    .layer-name-input:focus { color: var(--primary); }
    .btn-live-mode { 
      background: rgba(0, 242, 255, 0.06); 
      color: var(--primary); 
      border: 1px solid var(--primary); 
      padding: 5px 12px; 
      border-radius: 4px; 
      font-size: 9px; 
      font-weight: 700; 
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bpm-control { background: #000; padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border); }
    .bpm-val { font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #fff; font-size: 11px; }

    .icon-btn-circle { background: transparent; border: 1px solid var(--border); color: #666; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    /* Content Area */
    .content-area { 
      flex: 1; 
      padding: 0; 
      overflow: hidden; /* MUDADO PARA HIDDEN PARA CONTROLAR SCROLL NOS FILHOS */
      display: flex; 
      flex-direction: column;
      min-width: 0;
    }
    
    .mixer-view, .home-grid { 
      padding: 20px; 
      flex: 1; 
      overflow-y: auto;
      min-width: 0;
    }

    /* Home Grid Responsivo */
    .home-grid { 
      display: grid; 
      grid-template-columns: 1fr 350px; 
      gap: 20px; 
      height: 100%; 
    }

    @media (max-width: 1200px) {
       .home-grid { grid-template-columns: 1fr; }
       .side-panels { display: grid !important; grid-template-columns: 1fr 1fr; gap: 20px; }
    }
    @media (max-width: 900px) {
       .side-panels { grid-template-columns: 1fr; }
    }

    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .panel-header h3 { font-size: 10px; color: var(--text-muted); letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }

    .timbres-list { display: flex; flex-direction: column; gap: 8px; }

    .timbre-card {
      background: var(--panel-bg);
      border-left: 3px solid var(--accent, var(--primary));
      border-radius: 6px;
      padding: 10px 15px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      transition: 0.2s;
    }
    
    .timbre-card.inactive { opacity: 0.35; filter: grayscale(0.8); }
    .t-idx { position: absolute; left: 6px; top: 10px; font-size: 8px; font-weight: 900; color: var(--accent); opacity: 0.4; }
    .t-img { width: 45px; height: 45px; background: rgba(0,0,0,0.3); border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--border); font-size: 20px; cursor: pointer; }
    .t-img i { text-shadow: 0 0 10px currentColor; }

    .t-main { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
    .t-title { display: flex; align-items: center; gap: 8px; }
    
    .t-selector-btn { 
       display: flex; 
       align-items: center; 
       gap: 6px; 
       background: rgba(255,255,255,0.03);
       border: 1px solid rgba(255,255,255,0.05);
       padding: 8px 10px;
       border-radius: 4px;
       cursor: pointer;
       width: fit-content;
       max-width: 100%;
       margin-top: 2px;
    }
    .t-selector-btn:active { background: rgba(0,242,255,0.2); }
    .t-inst-name { font-size: 11px; color: var(--primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .icon-mini { font-size: 8px; color: var(--primary); }

    .mini-slider { width: 100%; height: 3px; appearance: none; background: rgba(255,255,255,0.05); border-radius: 2px; outline: none; }
    .mini-slider::-webkit-slider-thumb { appearance: none; width: 10px; height: 10px; background: #fff; border-radius: 50%; cursor: pointer; border: 2px solid var(--accent); }

    .t-actions { display: flex; align-items: center; gap: 12px; border-left: 1px solid var(--border); padding-left: 12px; }
    .t-db { font-size: 8px; font-family: monospace; color: var(--text-muted); min-width: 30px; text-align: right; }
    
    .t-btns-group { display: flex; gap: 5px; align-items: center; }

    .btn-action-small {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      color: var(--primary);
      width: 28px; height: 28px;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      font-size: 11px;
    }

    .btn-delete {
      background: rgba(255, 51, 51, 0.1);
      border: 1px solid rgba(255, 51, 51, 0.2);
      color: #ff3333;
      width: 28px; height: 28px;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      font-size: 11px;
    }
    .btn-delete:hover { background: #ff3333; color: #fff; }

    .t-toggles { display: flex; gap: 3px; }
    .btn-s, .btn-m { background: #1a1a2a; border: 1px solid var(--border); color: #444; width: 26px; height: 26px; border-radius: 3px; font-weight: bold; cursor: pointer; font-size: 9px; }
    .btn-s.active { color: #fff; background: #ffaa00; border-color: #ffaa00; }
    .btn-m.active { color: #fff; background: #ff3333; border-color: #ff3333; }

    /* Right Panels Redesign */
    .effects-panel, .info-panel { 
      padding: 25px; 
      border-radius: 12px; 
      border: 1px solid var(--border); 
      background: linear-gradient(145deg, rgba(18, 18, 30, 0.8) 0%, rgba(10, 10, 15, 0.8) 100%); 
      margin-bottom: 25px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .effect-item { 
      display: flex; 
      align-items: center; 
      gap: 15px; 
      background: rgba(0,0,0,0.25); 
      padding: 12px; 
      border-radius: 8px; 
      border: 1px solid rgba(255,255,255,0.03);
    }
    .fx-toggle { background: #12121e; border: 1px solid var(--border); color: #333; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 10px; }
    .fx-toggle.active { color: var(--primary); border-color: var(--primary); }
    .fx-name { flex: 1; font-weight: 700; font-size: 10px; }
    .knob-svg { width: 22px; height: 22px; border: 1px solid var(--primary); border-radius: 50%; position: relative; opacity: 0.5; }
    .knob-svg::after { content: ''; position: absolute; width: 1px; height: 7px; background: var(--primary); left: 50%; top: 2px; transform: translateX(-50%) rotate(40deg); transform-origin: bottom; }
    .fx-val { font-size: 9px; color: var(--text-muted); width: 30px; text-align: right; }

    .sf-file { border: 1px solid var(--border); padding: 10px; border-radius: 5px; display: flex; align-items: center; gap: 10px; margin-top: 10px; background: rgba(0,0,0,0.1); }
    .sf-name { font-size: 10px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .sf-size { font-size: 8px; color: var(--text-muted); }

    /* ==============================
       MIXER VIEW - Console Style
       ============================== */
    .mixer-view { height: 100%; }
    .mixer-scroll { 
      display: flex; 
      gap: 12px; 
      height: 100%; 
      overflow-x: auto; 
      padding: 0 0 15px 0;
      align-items: flex-start;
    }

    .mixer-strip { 
      width: 100px;
      min-height: 350px;
      background: linear-gradient(180deg, rgba(20,20,32,1) 0%, rgba(12,12,20,1) 100%); 
      border-radius: 12px; 
      display: flex; 
      flex-direction: column; 
      align-items: center;
      padding: 12px 8px; 
      border: 1px solid var(--border); 
      flex-shrink: 0; 
      gap: 8px;
    }
    .mixer-strip.master { 
      width: 90px;
      border-color: rgba(0, 242, 255, 0.3); 
      background: linear-gradient(180deg, rgba(0,30,40,1) 0%, rgba(0,15,20,1) 100%);
    }

    .strip-label { 
      font-size: 9px; font-weight: 900; 
      color: var(--primary); 
      letter-spacing: 2px; 
      text-align: center;
    }

    .strip-header { 
      display: flex; 
      flex-direction: row;
      align-items: center; 
      gap: 6px; 
      width: 100%;
      justify-content: center;
    }
    .ch-idx { 
      font-size: 9px; font-weight: 900; 
      background: var(--accent); color: #000; 
      padding: 2px 5px; border-radius: 3px; 
      flex-shrink: 0;
    }
    .ch-name { 
      font-size: 10px; font-weight: 700; 
      overflow: hidden; text-overflow: ellipsis; 
      white-space: nowrap; 
      max-width: 65px;
    }

    .inst-icon-wrap { 
      width: 52px; height: 52px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 22px; 
      cursor: pointer;
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      border: 1px solid var(--border);
      transition: all 0.3s;
    }
    .inst-icon-wrap i { text-shadow: 0 0 12px currentColor; }
    .inst-icon-wrap:hover { border-color: var(--primary); background: rgba(0,242,255,0.08); }

    /* Fader Row (icon + fader + vu) */
    .fader-row {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 6px;
      flex: 1;
      width: 100%;
      min-height: 180px;
    }

    /* Fader track - the central rail */
    .fader-track {
      flex: 1;
      position: relative;
      background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);
      border-radius: 6px;
      border: 1px solid #222;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .fader-rail {
      position: absolute;
      left: 50%; top: 10px; bottom: 10px;
      width: 4px;
      background: linear-gradient(180deg, #333 0%, #111 100%);
      border-radius: 2px;
      transform: translateX(-50%);
    }
    .vertical-fader {
      position: absolute;
      left: 50%;
      top: 0; bottom: 0;
      width: 100%;
      transform: translateX(-50%);
      appearance: none;
      background: transparent;
      cursor: pointer;
      /* Writing mode makes it native vertical */
      writing-mode: vertical-lr;
      direction: rtl;
      height: 100%;
      z-index: 10;
    }
    .vertical-fader::-webkit-slider-thumb {
      appearance: none;
      width: 56px; height: 22px;
      background: linear-gradient(90deg, #555 0%, #333 40%, #444 60%, #555 100%);
      border-radius: 4px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.15);
      border: 1px solid #111;
      position: relative;
    }
    .vertical-fader::-webkit-slider-runnable-track {
      background: transparent;
    }

    /* VU Meter */
    .vu-bar {
      width: 10px;
      background: #080808;
      border-radius: 3px;
      border: 1px solid #1a1a1a;
      display: flex;
      flex-direction: column-reverse;
      gap: 2px;
      padding: 3px 2px;
      overflow: hidden;
    }
    .vu-seg { 
      flex: 1; 
      border-radius: 1px; 
      background: #1a1a1a;
    }
    .vu-seg.g { background: #22aa22; box-shadow: 0 0 4px #22aa22; }
    .vu-seg.y { background: #ccaa00; box-shadow: 0 0 4px #ccaa00; }
    .vu-seg.r { background: #cc2222; box-shadow: 0 0 4px #cc2222; }

    .db-val { 
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; 
      color: var(--text-muted); 
      background: #000; 
      padding: 3px 6px; 
      border-radius: 4px;
      text-align: center;
      border: 1px solid var(--border);
      width: 100%;
    }

    .strip-btns { display: flex; gap: 5px; width: 100%; }
    .btn-s, .btn-m { 
      flex: 1; 
      height: 28px; 
      background: rgba(255,255,255,0.04); 
      border: 1px solid rgba(255,255,255,0.1); 
      color: #555; 
      border-radius: 5px; 
      font-weight: 900; 
      cursor: pointer; 
      font-size: 10px;
      letter-spacing: 1px;
      transition: 0.15s;
    }
    .btn-s.active { color: #000; background: #ffaa00; border-color: #ffaa00; box-shadow: 0 0 10px rgba(255,170,0,0.4); }
    .btn-m.active { color: #fff; background: #cc2222; border-color: #cc2222; box-shadow: 0 0 10px rgba(200,34,34,0.4); }

    .btn-limiter {
      width: 100%;
      padding: 5px;
      background: rgba(0,242,255,0.08);
      border: 1px solid rgba(0,242,255,0.3);
      color: var(--primary);
      border-radius: 5px;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 2px;
      cursor: pointer;
    }

    .add-timbre-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 350px;
      padding: 12px;
    }
    .add-timbre-strip button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: rgba(0,242,255,0.04);
      border: 1px dashed rgba(0,242,255,0.2);
      color: var(--text-muted);
      border-radius: 12px;
      padding: 20px 15px;
      font-size: 9px;
      cursor: pointer;
      transition: 0.3s;
    }
    .add-timbre-strip button:hover { border-color: var(--primary); color: var(--primary); }
    .add-timbre-strip button i { font-size: 20px; }

    /* Visual Keyboard - Redesign Responsivo */
    .visual-keyboard { 
      height: 130px; 
      background: #000; 
      display: flex; 
      border-top: 2px solid var(--primary); 
      box-shadow: 0 -8px 25px rgba(0, 242, 255, 0.12);
      flex-shrink: 0;
    }
    .piano-container { 
      display: flex; 
      width: 100%;
      height: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 4px 10px;
    }
    .piano-container::-webkit-scrollbar { display: none; }
    .key { 
      flex: 0 0 36px; 
      height: 90%;
      background: linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 80%, #ccc 100%);
      border: 1px solid #aaa; 
      border-radius: 0 0 5px 5px; 
      margin: 0 1px; 
      cursor: pointer; 
      box-shadow: inset 0 -5px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.5);
      transition: all 0.08s ease;
      align-self: flex-start;
    }
    .key.black { 
      background: linear-gradient(180deg, #333 0%, #000 100%);
      z-index: 5; 
      height: 57%; 
      flex: 0 0 22px;
      margin-left: -11px; 
      margin-right: -11px; 
      border-color: #000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.9);
    }
    .key.active { 
      background: var(--primary); 
      box-shadow: 0 0 20px var(--primary), inset 0 0 8px rgba(255,255,255,0.3);
      transform: translateY(2px);
    }
    .key.black.active {
      background: var(--primary);
      box-shadow: 0 0 20px var(--primary);
    }

    /* Bottom Status Bar - Centralizado e Responsivo */
    .status-bar { 
      height: 50px; 
      background: rgba(5, 5, 10, 0.95); 
      border-top: 1px solid var(--border); 
      display: flex; 
      align-items: center; 
      padding: 0 20px; 
      gap: 10px;
      flex-shrink: 0;
    }
    .s-left, .s-right { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      min-width: 200px;
      font-size: 10px;
    }
    .s-left .label { color: var(--text-muted); font-size: 8px; text-transform: uppercase; }
    .s-left .val { font-weight: 700; color: #fff; }
    .s-left .arrows i { color: var(--text-muted); cursor: pointer; padding: 0 4px; }
    .s-center { 
      flex: 1; 
      display: flex; 
      justify-content: center; 
      align-items: center;
      gap: 12px; 
    }
    .s-right { justify-content: flex-end; }
    .midi-status { 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      padding: 5px 12px; 
      border-radius: 15px; 
      background: rgba(0,0,0,0.5); 
      border: 1px solid var(--border);
    }
    .midi-status.connected { border-color: #32cd32; }
    .midi-status .m-label { font-size: 8px; font-weight: 700; color: #32cd32; }
    .midi-status .m-dev { font-size: 8px; color: var(--text-muted); }
    .m-info { display: flex; flex-direction: column; }
    .btn-plus {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(0,242,255,0.1);
      border: 1px solid var(--primary);
      color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    }
    .bpm-tap { 
      background: #000; 
      border: 1px solid var(--border);
      border-radius: 6px; 
      padding: 4px 10px; 
      text-align: center;
      cursor: pointer;
    }
    .tap-label { display: block; font-size: 7px; color: var(--text-muted); letter-spacing: 1px; }
    .tap-val { display: block; font-size: 11px; font-weight: 700; font-family: monospace; color: var(--primary); }

    .animate-in { animation: fadeIn 0.3s ease; }

    /* Premium Buttons Globally */
    .btn-ghost, button {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-ghost:hover, button:hover:not(.nav-item) {
      background: rgba(0, 242, 255, 0.1);
      border-color: var(--primary);
      box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
      transform: translateY(-1px);
    }
    .btn-ghost:active { transform: scale(0.95); }

    .btn-live-mode { 
      background: linear-gradient(135deg, var(--primary) 0%, #00a2ff 100%) !important;
      color: #000 !important;
      border: none !important;
      font-weight: 900 !important;
      box-shadow: 0 0 20px rgba(0, 242, 255, 0.3);
    }
    
    /* SF2 Loader styling enhancement */
    .sf-file {
       background: rgba(0,0,0,0.4) !important;
       border: 1px solid rgba(0, 242, 255, 0.15) !important;
       padding: 15px !important;
    }
    .sf-file h3 { color: var(--primary); margin-bottom: 10px; font-size: 11px; }

    /* MODAL DE ÍCONES PREMIUM - FIX DEFINITIVO */
    .modal-overlay-premium {
       position: fixed;
       top: 0; left: 0; right: 0; bottom: 0;
       background: rgba(0,0,0,0.85);
       backdrop-filter: blur(20px);
       z-index: 10000;
       display: flex;
       align-items: center;
       justify-content: center;
       padding: 20px;
       animation: fadeIn 0.3s ease;
    }
    .modal-content-premium {
       width: 100%;
       max-width: 650px;
       max-height: 85vh;
       background: linear-gradient(145deg, rgba(20,20,30,0.95), rgba(10,10,15,0.98));
       border: 1px solid rgba(255,255,255,0.1);
       border-radius: 28px;
       display: flex;
       flex-direction: column;
       overflow: hidden;
       box-shadow: 0 30px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
    }
    .modal-header-premium {
       padding: 25px 35px;
       border-bottom: 1px solid rgba(255,255,255,0.08);
       display: flex;
       justify-content: space-between;
       align-items: center;
       background: rgba(255,255,255,0.02);
    }
    .header-titles h4 { font-size: 18px; font-weight: 900; color: #fff; margin: 0; letter-spacing: 0.5px; }
    .active-layer-name { font-size: 12px; color: var(--primary); font-weight: 700; text-transform: uppercase; margin-top: 4px; display: block; }
    
    .close-btn-premium { 
       width: 40px; height: 40px; border-radius: 50%; background: rgba(255,50,50,0.1); border: 1px solid rgba(255,50,50,0.2); color: #ff5555; 
       cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;
    }
    .close-btn-premium:hover { background: #ff3333; color: #fff; transform: rotate(90deg); }

    .assign-grid-pro {
       padding: 30px;
       display: grid;
       grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
       gap: 20px;
       overflow-y: auto;
       flex: 1;
       scrollbar-width: thin;
       scrollbar-color: var(--primary) transparent;
    }
    .assign-card-pro {
       background: rgba(255,255,255,0.04);
       border: 1px solid rgba(255,255,255,0.06);
       border-radius: 20px;
       padding: 25px 15px;
       display: flex;
       flex-direction: column;
       align-items: center;
       cursor: pointer;
       transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
       text-align: center;
       position: relative;
    }
    .assign-card-pro:hover {
       background: rgba(255,255,255,0.1);
       border-color: var(--icon-color);
       transform: translateY(-5px) scale(1.02);
       box-shadow: 0 15px 30px rgba(0,0,0,0.4), 0 0 20px -5px var(--icon-color);
    }
    .icon-box {
       width: 55px;
       height: 55px;
       background: rgba(0,0,0,0.4);
       border-radius: 16px;
       display: flex;
       align-items: center;
       justify-content: center;
       margin-bottom: 15px;
       font-size: 28px;
       color: var(--icon-color);
       transition: all 0.4s;
       border: 1px solid rgba(255,255,255,0.05);
    }
    .assign-card-pro:hover .icon-box { transform: scale(1.15) rotate(5deg); box-shadow: 0 0 25px var(--icon-color); }
    
    .inst-name { font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 6px; display: block; }
    .inst-cat { font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

    /* ==============================
       RESPONSIVIDADE ANDROID
       ============================== */
    @media (max-width: 768px) {
      /* Layout principal: sidebar EMBAIXO no mobile */
      .main-layout {
        flex-direction: column;
      }
      .side-nav {
        width: 100%;
        height: 56px;
        flex-direction: row;
        border-right: none;
        border-top: 1px solid var(--border);
        padding: 0;
        order: 10;
        justify-content: space-around;
      }
      .nav-top, .nav-bottom { 
        display: flex;
        flex-direction: row;
        gap: 0;
        width: 100%;
      }
      .nav-bottom { width: auto; }
      .nav-item {
        flex: 1;
        padding: 8px 5px;
        border-left: none !important;
        border-top: 2px solid transparent;
      }
      .nav-item.active { border-top: 2px solid var(--primary); border-left: none; }
      .nav-item span { font-size: 6px; }
      .nav-item i { font-size: 16px; }

      .main-wrapper { min-height: 0; flex: 1; }
      .main-header { height: 44px; padding: 0 12px; }
      .p-name { font-size: 11px; }
      .header-actions .btn-live-mode { padding: 5px 8px; font-size: 8px; }
      .header-actions .btn-live-mode i { display: none; }
      .bpm-control { display: none; }

      .content-area { padding: 10px; }

      /* Home: lista de timbres sem painel lateral */
      .home-grid { 
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .side-panels { display: none; }
      
      /* Timbres mais compactos */
      .timbre-card { padding: 8px 10px; gap: 8px; }
      .t-name input { font-size: 12px; }

      /* Teclado menor mas ainda funcional */
      .visual-keyboard { height: 90px; }
      .key { flex: 0 0 26px; }
      .key.black { flex: 0 0 16px; margin-left: -8px; margin-right: -8px; }

      /* Status bar oculta no mobile para ganhar espaço */
      .status-bar { display: none !important; }

      .s-center { flex: 0 0 100%; }
      .s-center button { flex: 1; padding: 7px 10px; font-size: 9px; }
    }

    @media (max-width: 480px) {
      .visual-keyboard { height: 75px; }
      .key { flex: 0 0 20px; }
      .key.black { flex: 0 0 12px; margin-left: -6px; margin-right: -6px; }
      .main-header { display: none; }
    }
    /* BOTÃO FLUTUANTE IMERSIVO */
    .btn-float-immersive {
       position: fixed;
       bottom: 20px;
       right: 20px;
       width: 45px;
       height: 45px;
       border-radius: 50%;
       background: rgba(0, 242, 255, 0.1);
       border: 1px solid rgba(0, 242, 255, 0.3);
       color: var(--primary);
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 18px;
       cursor: pointer;
       z-index: 10000;
       backdrop-filter: blur(10px);
       transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
       box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .btn-float-immersive:hover { transform: scale(1.1); background: rgba(0, 242, 255, 0.2); }
    .btn-float-immersive.active { 
       bottom: auto; 
       top: 10px; 
       right: 10px; 
       background: rgba(255,255,255,0.05); 
       opacity: 0.5;
    }
    .btn-float-immersive.active:hover { opacity: 1; }
  `]
})
export class AppComponent {
  audioService = inject(AudioService);
  midiService = inject(MidiService);
  sustain = signal(false);
  masterMinimized = signal(false);
  masterVisible = signal(true);

  notes = Array.from({length: 88}, (_, i) => i + 21); // 88 keys Piano
  
  instrumentOptions = [
    { id: 'piano', name: 'Grand Piano', iconClass: 'fa-solid fa-piano', color: '#00f2ff' },
    { id: 'epiano', name: 'Electric Piano', iconClass: 'fa-solid fa-keyboard', color: '#8a2be2' },
    { id: 'organ', name: 'Hammond Organ', iconClass: 'fa-solid fa-music', color: '#ff8c00' },
    { id: 'church', name: 'Church Organ', iconClass: 'fa-solid fa-place-of-worship', color: '#fff' },
    { id: 'sax', name: 'Saxophone', iconClass: 'fa-solid fa-sax-hot', color: '#ffd700' },
    { id: 'ssax', name: 'Soprano Sax', iconClass: 'fa-solid fa-sax-hot', color: '#ffd700' },
    { id: 'strings', name: 'Strings Section', iconClass: 'fa-solid fa-violin', color: '#ff4444' },
    { id: 'brass', name: 'Trumpet/Brass', iconClass: 'fa-solid fa-trumpet', color: '#ffd700' },
    { id: 'synth', name: 'Synth Lead', color: '#00f2ff' },
    { id: 'pad', name: 'Atmosphere/Pad', iconClass: 'fa-solid fa-cloud', color: '#1e90ff' },
    { id: 'guitar', name: 'Acoustic Guitar', iconClass: 'fa-solid fa-guitar', color: '#8b4513' },
    { id: 'eguitar', name: 'Electric Guitar', iconClass: 'fa-solid fa-guitar-electric', color: '#ff0000' },
    { id: 'bass', name: 'Bass Guitar', iconClass: 'fa-solid fa-guitar', color: '#0000ff' },
    { id: 'flute', name: 'Flute', iconClass: 'fa-solid fa-wind', color: '#f0f8ff' },
    { id: 'choir', name: 'Vocals/Choir', iconClass: 'fa-solid fa-users-viewfinder', color: '#fff' },
    { id: 'drums', name: 'Drums/Perc', iconClass: 'fa-solid fa-drum', color: '#fff' },
  ];

  selectedLayerForIcon = signal<SynthLayer | null>(null);
  assigningSF = signal<any | null>(null);
  assigningLayerForSF = signal<SynthLayer | null>(null);
  keyboardVisible = signal(false); // INICIA OCULTO COMO PEDIDO

  availableSF2s = computed(() => this.audioService.libraryFiles());

  openAssignModal(sf: any) {
    this.assigningSF.set(sf);
  }

  openAssignModalForLayer(layer: SynthLayer) {
    this.assigningLayerForSF.set(layer);
  }

  async onSFSelectChange(layer: SynthLayer, event: any) {
    const fileName = event.target.value;
    if (!fileName) return;

    const sf = this.availableSF2s().find(f => f.name === fileName);
    if (sf) {
      // Passar o canal da camada (Camada 1 = Canal 0, Camada 2 = Canal 1...)
      const layerIndex = this.audioService.layers().findIndex(l => l.id === layer.id);
      const channel = layerIndex !== -1 ? layerIndex : 0;
      
      // O AudioService já cuida de setProgram e ControlChange internamente no loadSoundFont
      await this.audioService.loadSoundFont(sf.data, sf.name, channel);

      this.audioService.updateLayer(layer.id, { 
        soundFontName: sf.name,
        name: sf.name.replace('.sf2', '').replace('.SF2', '')
      });
    }
  }

  onLayerNameChange(layer: SynthLayer, event: any) {
    this.audioService.updateLayer(layer.id, { name: event.target.value });
  }

  onLayerVol(layer: SynthLayer, event: any) {
    this.audioService.updateLayer(layer.id, { volume: parseFloat(event.target.value) });
  }

  testAudio() {
    this.audioService.testAudio();
  }

  async deleteFromLibrary(name: string) {
    if (confirm(`Deseja remover ${name} da biblioteca?`)) {
       await this.audioService.deleteFileFromDB(name);
    }
  }

  getLayerColor(channel: number): string {
    const colors = ['#8a2be2', '#32cd32', '#1e90ff', '#ff8c00', '#ff4444', '#00f2ff'];
    return colors[channel % colors.length];
  }

  getInstrumentIconClass(layer: SynthLayer): string {
    if (layer.icon) {
      const opt = this.instrumentOptions.find(o => o.id === layer.icon);
      if (opt) return opt.iconClass || 'fa-solid fa-music';
    }
    
    const prog = layer.program;
    if (prog <= 8) return 'fa-solid fa-piano';
    if (prog >= 40 && prog <= 47) return 'fa-solid fa-violin';
    if (prog >= 80 && prog <= 100) return 'fa-solid fa-wave-square';
    return 'fa-solid fa-music';
  }

  getInstrumentColor(layer: SynthLayer): string {
    if (layer.icon) {
      const opt = this.instrumentOptions.find(o => o.id === layer.icon);
      if (opt) return opt.color;
    }
    return 'var(--primary)';
  }

  setLayerIcon(layerId: string, iconId: string) {
    this.audioService.updateLayer(layerId, { icon: iconId });
    this.selectedLayerForIcon.set(null);
  }

  isSolo(layer: SynthLayer): boolean {
    return false;
  }

  constructor() {
    this.midiService.onMessage((msg) => {
      if (this.audioService.isInitialized()) {
        (this.audioService as any).audioContext?.resume();
      }

      if (msg.type === 0x90 && msg.velocity > 0) {
        this.audioService.noteOn(msg.note, msg.velocity);
      } else if (msg.type === 0x80 || (msg.type === 0x90 && msg.velocity === 0)) {
        this.audioService.noteOff(msg.note);
      } else if (msg.type === 'cc' && msg.note === 64) {
           const isOn = msg.velocity >= 64;
           this.sustain.set(isOn);
           this.audioService.setSustain(isOn);
      }
    });
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

  toggleView() {
    this.audioService.viewMode.update(v => v === 'home' ? 'mixer' : 'home');
  }

  isBlack(n: number) {
    const keys = [1, 3, 6, 8, 10];
    return keys.includes(n % 12);
  }

  private isMouseDown = false;

  onKeyStart(note: number, event: MouseEvent) {
    event.preventDefault();
    this.ensureAudio();
    this.isMouseDown = true;
    this.audioService.noteOn(note, 100);
  }

  onKeyEnd(note: number, event: MouseEvent) {
    this.audioService.noteOff(note);
  }

  onKeyTouchStart(note: number, event: TouchEvent) {
    event.preventDefault();
    this.ensureAudio();
    this.audioService.noteOn(note, 100);
  }

  onKeyTouchEnd(note: number, event: TouchEvent) {
    event.preventDefault();
    this.audioService.noteOff(note);
  }

  private ensureAudio() {
    if (!this.audioService.isInitialized()) {
      this.audioService.initialize();
    }
    // Resume AudioContext suspended by browser autoplay policy
    (this.audioService as any).audioContext?.resume().catch(() => {});
  }
}
