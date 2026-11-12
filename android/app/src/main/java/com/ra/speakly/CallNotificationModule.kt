package com.ra.speakly

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CallNotificationModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val CHANNEL_ID = "speakly_incoming_calls_v4"
  }

  private var incomingRingtone: Ringtone? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private val ringtoneTimeout = Runnable { stopRingtone() }

  override fun getName() = "CallNotification"

  @ReactMethod
  fun prepareIncomingCallChannel(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager =
            reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
          val channel =
              NotificationChannel(
                      CHANNEL_ID,
                      "Incoming voice calls",
                      NotificationManager.IMPORTANCE_HIGH,
                  )
                  .apply {
                    description = "Rings when a learner starts a voice call with you"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(300, 500, 300, 500)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setSound(
                        null,
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build(),
                    )
                  }
          manager.createNotificationChannel(channel)
        }
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_CHANNEL_ERROR", error)
    }
  }

  @ReactMethod
  fun startIncomingCallRingtone(promise: Promise) {
    try {
      if (incomingRingtone?.isPlaying == true) {
        promise.resolve(true)
        return
      }
      val ringtoneUri: Uri? = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      if (ringtoneUri == null) {
        promise.resolve(false)
        return
      }
      incomingRingtone = RingtoneManager.getRingtone(reactContext, ringtoneUri)
      incomingRingtone?.apply {
        audioAttributes =
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) isLooping = true
        play()
      }
      mainHandler.removeCallbacks(ringtoneTimeout)
      mainHandler.postDelayed(ringtoneTimeout, 30_000)
      promise.resolve(incomingRingtone != null)
    } catch (error: Exception) {
      promise.reject("CALL_RINGTONE_ERROR", error)
    }
  }

  @ReactMethod
  fun stopIncomingCallRingtone(promise: Promise) {
    try {
      stopRingtone()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_RINGTONE_STOP_ERROR", error)
    }
  }

  private fun stopRingtone() {
    mainHandler.removeCallbacks(ringtoneTimeout)
    incomingRingtone?.stop()
    incomingRingtone = null
  }

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    if (Build.VERSION.SDK_INT < 34) {
      promise.resolve(true)
      return
    }
    val manager =
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    promise.resolve(manager.canUseFullScreenIntent())
  }

  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < 34) {
        promise.resolve(true)
        return
      }
      val intent =
          Intent(
              Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
              Uri.parse("package:${reactContext.packageName}"),
          ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_PERMISSION_SETTINGS_ERROR", error)
    }
  }
}
