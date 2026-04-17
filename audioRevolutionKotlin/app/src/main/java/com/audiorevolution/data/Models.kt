package com.audiorevolution.data

data class SynthLayer(
    val id: String,
    val name: String,
    val program: Int = 0,
    val bankMSB: Int = 0,
    val bankLSB: Int = 0,
    val volume: Float = 1.0f,
    val reverb: Float = 0.5f,
    val chorus: Float = 0.2f,
    val pan: Float = 0f, // -1.0 to 1.0
    val transpose: Int = 0,
    val enabled: Boolean = true,
    val channel: Int,
    val soundFontName: String? = null,
    val midiMappings: MidiMappings = MidiMappings()
)

data class MidiMappings(
    val volumeCC: Int? = null,
    val reverbCC: Int? = null,
    val panCC: Int? = null
)

data class MasterSettings(
    val volume: Float = 1.0f,
    val reverbGain: Float = 0.5f,
    val reverbTime: Int = 64,
    val delayGain: Float = 0.5f,
    val performanceMode: Boolean = false,
    val masterMidiMappings: Map<String, Int> = emptyMap()
)
