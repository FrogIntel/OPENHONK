# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.swmansion.** { *; }
-keep class com.reactnativecommunity.** { *; }
-keep class com.reactnative.** { *; }
-keep class org.webkit.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep models/serializers
-keep class * implements java.io.Serializable { *; }
-keep class com.openhonk.** { *; }

# Keep androidx.media for MediaSession
-keep class android.support.v4.media.** { *; }
-keep class androidx.media.** { *; }
