package com.audiorevolution.ui

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.audiorevolution.data.MasterSettings
import com.audiorevolution.data.SynthLayer
import java.util.UUID

class AudioViewModel : ViewModel() {
    val layers = mutableStateListOf<SynthLayer>(
        SynthLayer(id = UUID.randomUUID().toString(), name = "Camada 1", channel = 0)
    )

    val masterSettings = mutableStateOf(MasterSettings())
    val activeVoices = mutableStateOf(0)
    val isInitialized = mutableStateOf(true)
    val viewMode = mutableStateOf("cards") // "cards" or "mixer"

    val activeNotes = mutableStateListOf<Int>()

    fun addLayer() {
        val nextChannel = layers.size % 16
        layers.add(
            SynthLayer(
                id = UUID.randomUUID().toString(),
                name = "Camada ${layers.size + 1}",
                channel = nextChannel
            )
        )
    }

    fun removeLayer(id: String) {
        layers.removeAll { it.id == id }
    }

    fun updateLayer(id: String, update: (SynthLayer) -> SynthLayer) {
        val index = layers.indexOfFirst { it.id == id }
        if (index != -1) {
            layers[index] = update(layers[index])
        }
    }

    fun noteOn(note: Int, velocity: Int) {
        if (!activeNotes.contains(note)) {
            activeNotes.add(note)
        }
        // Aqui chamaria a engine de som nativa (ex: FluidSynth)
    }

    fun noteOff(note: Int) {
        activeNotes.remove(note)
        // Aqui chamaria a engine de som nativa
    }

    fun togglePerformance() {
        masterSettings.value = masterSettings.value.copy(
            performanceMode = !masterSettings.value.performanceMode
        )
    }
}
