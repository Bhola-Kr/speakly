package com.cozyds.voicetamil

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.*

class OngoingCallService : Service() {
    companion object {
        var onTick: (() -> Unit)? = null
        const val CHANNEL = "voicetamil_calls"
        const val NOTIFICATION_ID = 901
    }
    private val handler = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null
    private val ticker = object : Runnable {
        override fun run() {
            onTick?.invoke()
            handler.postDelayed(this, 1000)
        }
    }
    override fun onBind(intent: Intent?) = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        @Suppress("DEPRECATION")
        val receiver = intent?.getParcelableExtra<ResultReceiver>("result")
        try {
            val manager = getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                manager.createNotificationChannel(NotificationChannel(
                    CHANNEL, "Ongoing voice calls", NotificationManager.IMPORTANCE_LOW
                ))
            }
            val openApp = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            val pending = PendingIntent.getActivity(
                this, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }
            val notification = builder
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("VoiceTamil call in progress")
                .setContentText("Tap to return to your call")
                .setContentIntent(pending)
                .setCategory(Notification.CATEGORY_CALL)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .build()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            if (wakeLock == null) {
                wakeLock = (getSystemService(POWER_SERVICE) as PowerManager)
                    .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VoiceTamil:ActiveCall")
                    .apply { acquire() }
                handler.post(ticker)
            }
            receiver?.send(0, Bundle())
        } catch (error: Exception) {
            receiver?.send(1, Bundle().apply { putString("error", error.message) })
            stopSelf()
        }
        return START_NOT_STICKY
    }
    override fun onDestroy() {
        handler.removeCallbacks(ticker)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
