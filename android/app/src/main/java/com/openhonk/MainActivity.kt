package com.openhonk

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Bundle
import android.os.Build
import android.util.Rational
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "openhonk"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Prevent screen fragments from being restored (required for react-native-screens)
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    enableEdgeToEdge()
  }

  private fun enableEdgeToEdge() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      WindowCompat.setDecorFitsSystemWindows(window, false)
      val controller = WindowCompat.getInsetsController(window, window.decorView)
      controller?.isAppearanceLightNavigationBars = false
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    PiPModule.notifyPiPChanged(isInPictureInPictureMode)
  }
}
