package com.audiorevolution

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.audiorevolution.ui.AudioViewModel
import com.audiorevolution.data.SynthLayer

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AudioRevolutionTheme {
                MainScreen()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: AudioViewModel = viewModel()) {
    val layers = viewModel.layers
    val viewMode by viewModel.viewMode
    val masterSettings by viewModel.masterSettings

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF050510), Color(0xFF101025))
                )
            )
    ) {
        // Header
        TopAppBar(
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Waves, contentDescription = null, tint = Color(0xFF00f2ff))
                    Spacer(Modifier.width(8.dp))
                    Text("AudioRevolution", fontWeight = FontWeight.Black, color = Color.White)
                    Spacer(Modifier.width(8.dp))
                    Surface(color = Color(0xFFFF00C8), shape = MaterialTheme.shapes.small) {
                        Text("ENT", modifier = Modifier.padding(horizontal = 4.dp), fontSize = 10.sp, color = Color.White)
                    }
                }
            },
            actions = {
                IconButton(onClick = { viewModel.viewMode.value = if(viewMode == "cards") "mixer" else "cards" }) {
                    Icon(if(viewMode == "cards") Icons.Default.Tune else Icons.Default.GridView, contentDescription = null, tint = Color.White)
                }
                IconButton(onClick = { viewModel.addLayer() }) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF00f2ff))
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
        )

        // Master Controls Area
        MasterStrip(viewModel)

        // Content Area
        Box(modifier = Modifier.weight(1f)) {
            if (viewMode == "cards") {
                LayersGrid(viewModel)
            } else {
                MixerBoard(viewModel)
            }
        }

        // Piano Footer
        PianoFooter(viewModel)
    }
}

@Composable
fun MasterStrip(viewModel: AudioViewModel) {
    Surface(
        color = Color(0x22FFFFFF),
        modifier = Modifier.fillMaxWidth().height(60.dp),
        border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0x11FFFFFF))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("MASTER", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00f2ff))

            // Exemplo de Knob/Slider de Volume Master
            Slider(
                value = viewModel.masterSettings.value.volume,
                onValueChange = { viewModel.masterSettings.value = viewModel.masterSettings.value.copy(volume = it) },
                valueRange = 0f..2f,
                modifier = Modifier.width(150.dp),
                colors = SliderDefaults.colors(thumbColor = Color(0xFF00f2ff), activeTrackColor = Color(0xFF00f2ff))
            )

            Spacer(Modifier.weight(1f))

            Text("VOZES: ${viewModel.activeVoices.value}", fontSize = 10.sp, color = Color.Gray)
        }
    }
}

@Composable
fun LayersGrid(viewModel: AudioViewModel) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(320.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(viewModel.layers, key = { it.id }) { layer ->
            LayerCard(layer, viewModel)
        }
    }
}

@Composable
fun LayerCard(layer: SynthLayer, viewModel: AudioViewModel) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(containerColor = Color(0x33141423))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("CH ${layer.channel + 1}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                Spacer(Modifier.width(8.dp))
                Text(layer.name, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { viewModel.removeLayer(layer.id) }) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = Color.DarkGray, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(Modifier.height(8.dp))
            Text("Instrumento: Grand Piano", fontSize = 12.sp, color = Color(0xFF00f2ff))

            Spacer(Modifier.height(16.dp))

            // Volume
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("VOL", fontSize = 10.sp, color = Color.Gray, modifier = Modifier.width(30.dp))
                Slider(
                    value = layer.volume,
                    onValueChange = { v -> viewModel.updateLayer(layer.id) { it.copy(volume = v) } },
                    valueRange = 0f..2f,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun MixerBoard(viewModel: AudioViewModel) {
    androidx.compose.foundation.lazy.LazyRow(
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(viewModel.layers) { layer ->
            MixerChannel(layer, viewModel)
        }
    }
}

@Composable
fun MixerChannel(layer: SynthLayer, viewModel: AudioViewModel) {
    Column(
        modifier = Modifier
            .width(80.dp)
            .fillMaxHeight()
            .background(Color(0x11FFFFFF), MaterialTheme.shapes.medium)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.weight(1f).padding(vertical = 16.dp)) {
            // Slider Vertical customizado seria ideal aqui
            Slider(
                value = layer.volume,
                onValueChange = { v -> viewModel.updateLayer(layer.id) { it.copy(volume = v) } },
                valueRange = 0f..2f,
                modifier = Modifier.align(Alignment.Center)
            )
        }

        Button(
            onClick = { viewModel.updateLayer(layer.id) { it.copy(enabled = !it.enabled) } },
            colors = ButtonDefaults.buttonColors(
                containerColor = if(layer.enabled) Color(0xFF003A20) else Color(0xFF4A0000)
            ),
            modifier = Modifier.height(30.dp),
            contentPadding = PaddingValues(0.dp)
        ) {
            Text(if(layer.enabled) "ON" else "OFF", fontSize = 10.sp)
        }

        Spacer(Modifier.height(8.dp))
        Text(layer.name, fontSize = 10.sp, color = Color.White, maxLines = 1)
    }
}

@Composable
fun PianoFooter(viewModel: AudioViewModel) {
    Surface(
        color = Color.Black,
        modifier = Modifier.fillMaxWidth().height(120.dp)
    ) {
        androidx.compose.foundation.lazy.LazyRow {
            items(88) { index ->
                val note = index + 21
                val isBlack = remember(note) {
                    val n = note % 12
                    n == 1 || n == 3 || n == 6 || n == 8 || n == 10
                }

                Box(
                    modifier = Modifier
                        .width(if (isBlack) 30.dp else 45.dp)
                        .fillMaxHeight(if (isBlack) 0.6f else 1f)
                        .background(if (viewModel.activeNotes.contains(note)) Color(0xFF00f2ff) else if (isBlack) Color.DarkGray else Color.White)
                        .padding(1.dp)
                )
            }
        }
    }
}

@Composable
fun AudioRevolutionTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF00f2ff),
            secondary = Color(0xFF7000ff),
            tertiary = Color(0xFFFF00C8),
            background = Color(0xFF050510)
        ),
        content = content
    )
}
