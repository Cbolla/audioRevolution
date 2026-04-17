package com.audiorevolution.app

import android.content.Context
import android.media.midi.MidiManager
import android.media.midi.MidiDeviceInfo
import android.os.Handler
import android.os.Looper
import android.util.Log

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.sun.jna.Library
import com.sun.jna.Native
import com.sun.jna.Pointer

// Interface JNA para acessar as funções do C++ C-API do FluidSynth
interface FluidSynthLibrary : Library {
    fun new_fluid_settings(): Pointer
    fun new_fluid_synth(settings: Pointer): Pointer
    fun new_fluid_audio_driver(settings: Pointer, synth: Pointer): Pointer

    fun fluid_settings_setstr(settings: Pointer, name: String, str: String): Int
    fun fluid_settings_setint(settings: Pointer, name: String, value: Int): Int

    fun fluid_synth_sfload(synth: Pointer, filename: String, reset_presets: Int): Int
    fun fluid_synth_program_select(synth: Pointer, chan: Int, sfid: Int, bank: Int, num: Int): Int
    fun fluid_synth_noteon(synth: Pointer, chan: Int, key: Int, vel: Int): Int
    fun fluid_synth_noteoff(synth: Pointer, chan: Int, key: Int): Int
    fun fluid_synth_cc(synth: Pointer, chan: Int, num: Int, value: Int): Int
    fun fluid_synth_set_gain(synth: Pointer, gain: Float)
    fun delete_fluid_audio_driver(driver: Pointer)
    fun delete_fluid_synth(synth: Pointer)
    fun delete_fluid_settings(settings: Pointer)
}

@CapacitorPlugin(name = "AudioEngine")
class AudioEnginePlugin : Plugin() {

    private var midiManager: MidiManager? = null

    // Instâncias do C++
    private var fsLib: FluidSynthLibrary? = null
    private var fsSettings: Pointer? = null
    private var fsSynth: Pointer? = null
    private var fsAudioDriver: Pointer? = null

    override fun load() {
        super.load()
        Log.d("AudioEngine", "Native Audio Engine Plugin Loaded")

        try {
            val libDir = context.applicationInfo.nativeLibraryDir
            Log.d("AudioEngine", "Native Library Dir: $libDir")

            // LISTA COMPLETA DE DEPENDÊNCIAS DO FLUIDSYNTH (ORDEM CRÍTICA)
            val libs = arrayOf(
                "libpcre.so",
                "libpcreposix.so",
                "libglib-2.0.so",
                "libgthread-2.0.so",
                "libgmodule-2.0.so",
                "libgobject-2.0.so",
                "libgio-2.0.so",
                "libogg.so",
                "libopus.so",
                "libFLAC.so",
                "libvorbis.so",
                "libvorbisenc.so",
                "libvorbisfile.so",
                "libsndfile.so",
                "libinstpatch-1.0.so",
                "liboboe.so",
                "libfluidsynth-assetloader.so",
                "libfluidsynth.so"
            )

            // Carrega libc++_shared primeiro (fornecida pelo AGP/NDK agora)
            try {
                System.loadLibrary("c++_shared")
                Log.d("AudioEngine", "libc++_shared carregada via System.loadLibrary")
            } catch (e: Exception) {
                Log.e("AudioEngine", "Erro ao carregar libc++_shared: ${e.message}")
            }

            for (libName in libs) {
                try {
                    val shortName = libName.removePrefix("lib").removeSuffix(".so")
                    System.loadLibrary(shortName)
                    Log.d("AudioEngine", "Sucesso ao carregar: $libName")
                } catch (e: UnsatisfiedLinkError) {
                    Log.e("AudioEngine", "Falha ao carregar $libName: ${e.message}")
                }
            }

            // O JNA tentará mapear a biblioteca já carregada no processo
            fsLib = Native.load("fluidsynth", FluidSynthLibrary::class.java)
            Log.d("AudioEngine", "FluidSynth Native Library vinculada ao JNA com SUCESSO!")
        } catch (e: UnsatisfiedLinkError) {
            Log.e("AudioEngine", "Erro crítico de Linker (dlopen/symbol mismatch): ${e.message}")
            showToast("Erro de Linker: Símbolos do C++ incompatíveis. Verifique o Logcat.")
        } catch (e: Exception) {
            Log.e("AudioEngine", "Erro ao carregar FluidSynth: ${e.message}")
            showToast("Erro ao carregar: ${e.message}")
        }

        // 🎹 PREPARAÇÃO MIDI USB
        midiManager = context.getSystemService(Context.MIDI_SERVICE) as MidiManager
        setupMidiKeyboardListener()
    }

    private fun showToast(msg: String) {
        (context as? android.app.Activity)?.runOnUiThread {
            android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_LONG).show()
        }
    }
    private fun setupMidiKeyboardListener() {
        try {
            val devices = midiManager?.devices ?: arrayOf()
            for (device in devices) {
                Log.d("AudioEngine", "Teclado MIDI USB Detectado: ${device.properties.getString(MidiDeviceInfo.PROPERTY_NAME)}")
                // No futuro: Conectar o output_port do dispositivo diretamente ao sintetizador C++
            }

            midiManager?.registerDeviceCallback(object : MidiManager.DeviceCallback() {
                override fun onDeviceAdded(device: MidiDeviceInfo?) {
                    val name = device?.properties?.getString(MidiDeviceInfo.PROPERTY_NAME)
                    Log.d("AudioEngine", "=== NOVO TECLADO CONECTADO: $name ===")
                }
                override fun onDeviceRemoved(device: MidiDeviceInfo?) {
                    Log.d("AudioEngine", "=== TECLADO DESCONECTADO ===")
                }
            }, Handler(Looper.getMainLooper()))

        } catch (e: Exception) {
            Log.e("AudioEngine", "Erro ao acessar MIDI USB: ${e.message}")
        }
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        Log.d("AudioEngine", "Inicializando Motor de Audio Nativo via Oboe/FluidSynth...")
        try {
            if (fsLib != null) {
                fsSettings = fsLib!!.new_fluid_settings()
                // Configurações de performance para Android
                fsLib!!.fluid_settings_setstr(fsSettings!!, "audio.driver", "oboe")
                fsLib!!.fluid_settings_setint(fsSettings!!, "audio.period-size", 128)
                fsLib!!.fluid_settings_setint(fsSettings!!, "audio.periods", 2)

                fsSynth = fsLib!!.new_fluid_synth(fsSettings!!)
                fsAudioDriver = fsLib!!.new_fluid_audio_driver(fsSettings!!, fsSynth!!)

                Log.d("AudioEngine", "FluidSynth Inicializado no Servidor Android")
                val ret = JSObject()
                ret.put("success", true)
                call.resolve(ret)
            } else {
                call.reject("FluidSynth .so libraries failed to load")
            }
        } catch (e: Exception) {
            call.reject("Erro ao iniciar FluidSynth: ${e.message}")
        }
    }

    @PluginMethod
    fun loadSoundFont(call: PluginCall) {
        val base64 = call.getString("base64") ?: ""
        val path = call.getString("path") ?: ""
        val channel = call.getInt("channel") ?: 0

        Log.d("AudioEngine", "Iniciando tarefa de carga: Canal $channel, Path: $path")

        Thread {
            try {
                (context as android.app.Activity).runOnUiThread {
                    android.widget.Toast.makeText(context, "Processando Timbre Gigante...", android.widget.Toast.LENGTH_SHORT).show()
                }

                // DIRETÓRIO PERMANENTE (Padrão AudioEvolution/Kontakt)
                val sfDir = java.io.File(context.filesDir, "SoundFonts")
                if (!sfDir.exists()) sfDir.mkdirs()

                val fileName = if (path.isNotEmpty()) {
                    android.net.Uri.parse(path).lastPathSegment ?: "instrument_$channel.sf2"
                } else {
                    "instrument_$channel.sf2"
                }

                val finalFile = java.io.File(sfDir, fileName)

                if (path.isNotEmpty()) {
                    val uri = android.net.Uri.parse(path)

                    // Obtém o tamanho total do arquivo para a barra de progresso
                    var totalSize = 0L
                    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        val sizeIndex = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                        if (sizeIndex != -1 && cursor.moveToFirst()) {
                            totalSize = cursor.getLong(sizeIndex)
                        }
                    }

                    // Só copia se o arquivo não existir ou se o tamanho for diferente (indica arquivo novo/mudado)
                    if (!finalFile.exists() || (totalSize > 0 && finalFile.length() != totalSize)) {
                        Log.d("AudioEngine", "Iniciando cópia profissional para biblioteca. Tamanho: $totalSize")
                        context.contentResolver.openInputStream(uri)?.use { input ->
                            finalFile.outputStream().use { output ->
                                val buffer = ByteArray(1024 * 128) // Buffer de 128KB para velocidade
                                var bytesRead = 0L
                                var bytes = input.read(buffer)
                                while (bytes >= 0) {
                                    output.write(buffer, 0, bytes)
                                    bytesRead += bytes

                                    // Notifica o Front-end sobre o progresso
                                    if (totalSize > 0) {
                                        val progress = (bytesRead.toFloat() / totalSize.toFloat() * 100).toInt()
                                        val progressData = JSObject()
                                        progressData.put("progress", progress)
                                        progressData.put("channel", channel)
                                        progressData.put("status", "copying")
                                        notifyListeners("loadProgress", progressData)
                                    }
                                    bytes = input.read(buffer)
                                }
                            }
                        }
                        Log.d("AudioEngine", "Cópia para biblioteca concluída com sucesso.")
                    }
                } else if (base64.isNotEmpty()) {
                    val data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
                    finalFile.writeBytes(data)
                }

                Log.d("AudioEngine", "Carregando no FluidSynth: ${finalFile.absolutePath}")

                // SEGURANÇA: Verifica se o motor foi inicializado
                if (fsLib == null || fsSynth == null) {
                    Log.e("AudioEngine", "Motor não inicializado antes de sfload!")
                    (context as android.app.Activity).runOnUiThread {
                        android.widget.Toast.makeText(context, "Erro: Motor de Áudio não iniciado", android.widget.Toast.LENGTH_LONG).show()
                    }
                    call.reject("Audio engine not initialized. Call initialize() first.")
                    return@Thread
                }

                val sfId = fsLib!!.fluid_synth_sfload(fsSynth!!, finalFile.absolutePath, 1)

                if (sfId != -1) {
                    fsLib!!.fluid_synth_program_select(fsSynth!!, channel, sfId, 0, 0)
                    // Booster de GANHO para som máximo
                    fsLib!!.fluid_synth_set_gain(fsSynth!!, 1.2f)

                    (context as android.app.Activity).runOnUiThread {
                        android.widget.Toast.makeText(context, "Timbre Carregado com Sucesso!", android.widget.Toast.LENGTH_SHORT).show()
                    }
                    val ret = JSObject()
                    ret.put("sfId", sfId)
                    call.resolve(ret)
                } else {
                    (context as android.app.Activity).runOnUiThread {
                        android.widget.Toast.makeText(context, "ERRO: SoundFont Falhou ou RAM Baixa", android.widget.Toast.LENGTH_LONG).show()
                    }
                    call.reject("Erro ao carregar SoundFont no motor")
                }
            } catch (e: OutOfMemoryError) {
                (context as android.app.Activity).runOnUiThread {
                    android.widget.Toast.makeText(context, "CRASH: Memória Esgotada (OOM)", android.widget.Toast.LENGTH_LONG).show()
                }
                call.reject("OutOfMemoryError: Timbre muito pesado para este celular")
            } catch (e: Exception) {
                (context as android.app.Activity).runOnUiThread {
                    android.widget.Toast.makeText(context, "ERRO: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
                }
                Log.e("AudioEngine", "Erro inesperado: ${e.message}")
                call.reject(e.message)
            }
        }.start()
    }

    @PluginMethod
    fun loadSF2(call: PluginCall) {
        // Redireciona para o método oficial
        loadSoundFont(call)
    }

    @PluginMethod
    fun setProgram(call: PluginCall) {
        val channel = call.getInt("channel") ?: 0
        val sfId = call.getInt("sfId") ?: 1
        val bank = call.getInt("bank") ?: 0
        val program = call.getInt("program") ?: 0

        if (fsLib != null && fsSynth != null) {
            fsLib?.fluid_synth_program_select(fsSynth!!, channel, sfId, bank, program)
            call.resolve()
        } else {
            call.reject("Synth not initialized")
        }
    }

    @PluginMethod
    fun noteOn(call: PluginCall) {
        val channel = call.getInt("channel") ?: 0
        val note = call.getInt("note") ?: 60
        val velocity = call.getInt("velocity") ?: 100

        if (fsLib != null && fsSynth != null) {
            fsLib?.fluid_synth_noteon(fsSynth!!, channel, note, velocity)
            call.resolve()
        } else {
            // Silently ignore to avoid spamming errors during play
            call.reject("Synth not initialized")
        }
    }

    @PluginMethod
    fun noteOff(call: PluginCall) {
        val channel = call.getInt("channel") ?: 0
        val note = call.getInt("note") ?: 60
        if (fsLib != null && fsSynth != null) {
            fsLib?.fluid_synth_noteoff(fsSynth!!, channel, note)
            call.resolve()
        } else {
            call.reject("Synth not initialized")
        }
    }

    @PluginMethod
    fun setVolume(call: PluginCall) {
        val channel = call.getInt("channel") ?: 0
        val volume = call.getDouble("volume")?.toFloat() ?: 1.0f
        call.resolve()
    }

    @PluginMethod
    fun setPan(call: PluginCall) {
        val channel = call.getInt("channel") ?: 0
        val pan = call.getDouble("pan")?.toFloat() ?: 0.0f
        call.resolve()
    }

    @PluginMethod
    fun setReverb(call: PluginCall) {
         val channel = call.getInt("channel") ?: 0
         val value = call.getDouble("value")?.toFloat() ?: 0.0f
         call.resolve()
    }

    @PluginMethod
    fun allNotesOff(call: PluginCall) {
        Log.d("AudioEngine", "Panic: All Notes Off")
        call.resolve()
    }
}
