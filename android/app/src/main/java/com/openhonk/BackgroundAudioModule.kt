package com.openhonk

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BackgroundAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private var isServiceRunning = false
    private var keepWebViewAlive = false
    private val handler = Handler(Looper.getMainLooper())
    private val resumeRunnable = object : Runnable {
        override fun run() {
            if (keepWebViewAlive) {
                resumeAllWebViews()
                handler.postDelayed(this, 2000)
            }
        }
    }

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = "BackgroundAudioModule"

    @ReactMethod
    fun startBackgroundAudio() {
        val context = reactApplicationContext
        val intent = Intent(context, BackgroundAudioService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            isServiceRunning = true
            keepWebViewAlive = true
        } catch (e: Exception) {
            Log.e("BackgroundAudioModule", "Failed to start service", e)
        }
    }

    @ReactMethod
    fun stopBackgroundAudio() {
        val context = reactApplicationContext
        val intent = Intent(context, BackgroundAudioService::class.java)
        try {
            context.stopService(intent)
            isServiceRunning = false
            keepWebViewAlive = false
        } catch (e: Exception) {
            Log.e("BackgroundAudioModule", "Failed to stop service", e)
        }
    }

    @ReactMethod
    fun keepWebViewAliveInBackground(enabled: Boolean) {
        keepWebViewAlive = enabled
    }

    @ReactMethod
    fun requestUnrestrictedBattery() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val context = reactApplicationContext
                val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
                    val activity = getCurrentActivity()
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (activity != null) {
                        activity.startActivity(intent)
                    } else {
                        context.startActivity(intent)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("BackgroundAudioModule", "Failed to request battery optimization exemption", e)
        }
    }

    @ReactMethod
    fun isBatteryUnrestricted(callback: Callback) {
        try {
            val context = reactApplicationContext
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val isUnrestricted = pm.isIgnoringBatteryOptimizations(context.packageName)
            callback.invoke(isUnrestricted)
        } catch (e: Exception) {
            Log.e("BackgroundAudioModule", "Failed to check battery optimization", e)
            callback.invoke(false)
        }
    }

    @ReactMethod
    fun requestNotificationPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val activity = getCurrentActivity() ?: return
                if (ContextCompat.checkSelfPermission(activity, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    activity.requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1001)
                }
            }
        } catch (e: Exception) {
            Log.e("BackgroundAudioModule", "Failed to request notification permission", e)
        }
    }

    @ReactMethod
    fun isNotificationPermissionGranted(callback: Callback) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val context = reactApplicationContext
                val granted = ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                callback.invoke(granted)
            } else {
                callback.invoke(true)
            }
        } catch (e: Exception) {
            callback.invoke(true)
        }
    }

    @ReactMethod
    fun showNotification(title: String, message: String) {
        try {
            val context = reactApplicationContext
            val channelId = "openhonk_general"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "App Updates", NotificationManager.IMPORTANCE_DEFAULT)
                channel.description = "General app notifications"
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pendingIntent = android.app.PendingIntent.getActivity(
                context,
                2,
                launchIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notification = NotificationCompat.Builder(context, channelId)
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(2, notification)
        } catch (e: Exception) {
            Log.e("BackgroundAudioModule", "Failed to show notification", e)
        }
    }

    override fun onHostPause() {
        if (keepWebViewAlive) {
            resumeAllWebViews()
            handler.postDelayed(resumeRunnable, 2000)
        }
    }

    override fun onHostResume() {
        handler.removeCallbacks(resumeRunnable)
        resumeAllWebViews()
    }

    override fun onHostDestroy() {
        handler.removeCallbacks(resumeRunnable)
        if (isServiceRunning) {
            stopBackgroundAudio()
        }
    }

    private fun resumeAllWebViews() {
        val activity = getCurrentActivity() ?: return
        val rootView = activity.window?.decorView?.findViewById<ViewGroup>(android.R.id.content) ?: return
        findWebViews(rootView).forEach { webView ->
            try {
                webView.onResume()
                webView.resumeTimers()
            } catch (e: Exception) {
                Log.e("BackgroundAudioModule", "Failed to resume WebView", e)
            }
        }
    }

    private fun findWebViews(root: ViewGroup): List<WebView> {
        val webViews = mutableListOf<WebView>()
        for (i in 0 until root.childCount) {
            val child = root.getChildAt(i)
            if (child is WebView) {
                webViews.add(child)
            } else if (child is ViewGroup) {
                webViews.addAll(findWebViews(child))
            }
        }
        return webViews
    }
}
