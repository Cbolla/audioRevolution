package com.audiorevolution.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the local Capacitor plugin
        registerPlugin(AudioEnginePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
