package com.openhonk

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Build
import android.util.Rational
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class PiPModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PiPModule"

    init {
        instance = this
    }

    companion object {
        @Volatile
        private var instance: PiPModule? = null

        fun notifyPiPChanged(isInPiP: Boolean) {
            instance?.onPictureInPictureModeChanged(isInPiP)
        }
    }

    @ReactMethod
    fun enterPiP() {
        enterPiPWithRatio(16, 9)
    }

    @ReactMethod
    fun enterPiPWithRatio(width: Int, height: Int) {
        val activity = reactApplicationContext.currentActivity ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        activity.runOnUiThread {
            try {
                val w = if (width > 0) width else 16
                val h = if (height > 0) height else 9
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(w, h))
                    .build()
                activity.enterPictureInPictureMode(params)
            } catch (e: Exception) {
                emitPipError(e.message ?: "Failed to enter PiP")
            }
        }
    }

    @ReactMethod
    fun exitPiP() {
        val activity = reactApplicationContext.currentActivity ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
        activity.runOnUiThread {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    activity.setPictureInPictureParams(
                        PictureInPictureParams.Builder().setAutoEnterEnabled(false).build()
                    )
                }
                // Move task to back to exit PiP - activity will resume normal
                activity.moveTaskToBack(true)
            } catch (e: Exception) {
                emitPipError(e.message ?: "Failed to exit PiP")
            }
        }
    }

    fun onPictureInPictureModeChanged(isInPiP: Boolean) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("pipModeChanged", isInPiP)

        // Notify BackgroundAudioModule so it doesn't interfere with WebView during PiP transitions
        BackgroundAudioModule.setInPiP(isInPiP)
    }

    private fun findWebViews(root: android.view.ViewGroup): List<android.webkit.WebView> {
        val result = mutableListOf<android.webkit.WebView>()
        for (i in 0 until root.childCount) {
            val child = root.getChildAt(i)
            if (child is android.webkit.WebView) {
                result.add(child)
            } else if (child is android.view.ViewGroup) {
                result.addAll(findWebViews(child))
            }
        }
        return result
    }

    private fun emitPipError(message: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("pipError", message)
    }
}
