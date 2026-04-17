#include <jni.h>
#include <string>
#include <android/log.h>

// Aqui no futuro incluiremos o <fluidsynth.h>
// Para este MVP, criaremos as pontes JNI que o Kotlin chamará

extern "C" JNIEXPORT void JNICALL
Java_com_audiorevolution_service_AudioEngine_init(JNIEnv* env, jobject thiz) {
    __android_log_print(ANDROID_LOG_DEBUG, "AudioEngine", "Engine Iniciada");
}

extern "C" JNIEXPORT void JNICALL
Java_com_audiorevolution_service_AudioEngine_loadSoundFont(JNIEnv* env, jobject thiz, jstring path) {
    const char* nativePath = env->GetStringUTFChars(path, 0);
    __android_log_print(ANDROID_LOG_DEBUG, "AudioEngine", "Carregando SF2: %s", nativePath);
    env->ReleaseStringUTFChars(path, nativePath);
}

extern "C" JNIEXPORT void JNICALL
Java_com_audiorevolution_service_AudioEngine_noteOn(JNIEnv* env, jobject thiz, jint chan, jint key, jint vel) {
    // synth_noteon(synth, chan, key, vel);
}

extern "C" JNIEXPORT void JNICALL
Java_com_audiorevolution_service_AudioEngine_noteOff(JNIEnv* env, jobject thiz, jint chan, jint key) {
    // synth_noteoff(synth, chan, key);
}
