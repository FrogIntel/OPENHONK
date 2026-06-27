package com.openhonk

import android.util.Log
import android.webkit.CookieManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class CookiePersistModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CookiePersistModule"

    @ReactMethod
    fun getCookies(url: String, promise: Promise) {
        try {
            val cookies = CookieManager.getInstance().getCookie(url)
            promise.resolve(cookies ?: "")
        } catch (e: Exception) {
            Log.e("CookiePersistModule", "getCookies failed", e)
            promise.resolve("")
        }
    }

    @ReactMethod
    fun setCookies(url: String, cookieString: String, promise: Promise) {
        try {
            if (cookieString.isNotEmpty()) {
                // Ensure CookieManager accepts cookies for this URL
                CookieManager.getInstance().setAcceptCookie(true)
                // Split cookie string by "; " and set each cookie
                val cookies = cookieString.split("; ")
                for (cookie in cookies) {
                    if (cookie.trim().isNotEmpty()) {
                        CookieManager.getInstance().setCookie(url, cookie.trim())
                    }
                }
                CookieManager.getInstance().flush()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("CookiePersistModule", "setCookies failed", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun flush(promise: Promise) {
        try {
            CookieManager.getInstance().flush()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun clearAll(promise: Promise) {
        try {
            CookieManager.getInstance().removeAllCookies { }
            CookieManager.getInstance().flush()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("CookiePersistModule", "clearAll failed", e)
            promise.resolve(false)
        }
    }
}
