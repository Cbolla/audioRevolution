package com.audiorevolution.service

import android.content.Context
import android.media.midi.MidiDevice
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiManager
import android.media.midi.MidiOutputPort
import android.media.midi.MidiReceiver
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class MidiMessage(
    val type: Int,
    val channel: Int,
    val note: Int,
    val velocity: Int
)

class MidiService(context: Context) {
    private val midiManager = context.getSystemService(Context.MIDI_SERVICE) as MidiManager
    private val _devices = MutableStateFlow<List<MidiDeviceInfo>>(emptyList())
    val devices = _devices.asStateFlow()

    private val _messages = MutableStateFlow<MidiMessage?>(null)
    val messages = _messages.asStateFlow()

    private var messageCallback: ((MidiMessage) -> Unit)? = null

    init {
        updateDevices()
        midiManager.registerDeviceCallback(object : MidiManager.DeviceCallback() {
            override fun onDeviceAdded(device: MidiDeviceInfo?) { updateDevices() }
            override fun onDeviceRemoved(device: MidiDeviceInfo?) { updateDevices() }
        }, Handler(Looper.getMainLooper()))
    }

    private fun updateDevices() {
        _devices.value = midiManager.devices.toList()
    }

    fun onMessage(callback: (MidiMessage) -> Unit) {
        this.messageCallback = callback
    }

    fun openDevice(deviceInfo: MidiDeviceInfo) {
        midiManager.openDevice(deviceInfo, { device ->
            val outputPort = device.openOutputPort(0)
            outputPort?.connect(object : MidiReceiver() {
                override fun onSend(data: ByteArray, offset: Int, count: Int, timestamp: Long) {
                    handleMidiData(data, offset, count)
                }
            })
        }, Handler(Looper.getMainLooper()))
    }

    private fun handleMidiData(data: ByteArray, offset: Int, count: Int) {
        if (count < 3) return
        val status = data[offset].toInt() and 0xFF
        val type = status and 0xF0
        val channel = status and 0x0F
        val d1 = data[offset + 1].toInt() and 0x7F
        val d2 = data[offset + 2].toInt() and 0x7F

        val msg = MidiMessage(type, channel, d1, d2)
        _messages.value = msg
        messageCallback?.invoke(msg)
    }
}
