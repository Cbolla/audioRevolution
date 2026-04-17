package com.audiorevolution.service

class AudioEngine {
    companion object {
        init {
            System.loadLibrary("audiorevolution")
        }
    }

    external fun init()
    external fun loadSoundFont(path: String)
    external fun noteOn(channel: Int, key: Int, velocity: Int)
    external fun noteOff(channel: Int, key: Int)

    // Configurações de efeito
    external fun setReverb(roomSize: Float, damping: Float, width: Float, level: Float)
    external fun setChorus(nr: Int, level: Float, speed: Float, depth: Float, type: Int)
}
