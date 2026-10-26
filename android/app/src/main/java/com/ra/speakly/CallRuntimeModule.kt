package com.ra.speakly

import android.content.Intent
import android.os.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallRuntimeModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "CallRuntime"
    @ReactMethod
    fun start(promise: Promise) {
        val intent = Intent(context, OngoingCallService::class.java)
        intent.putExtra("result", object : ResultReceiver(Handler(Looper.getMainLooper())) {
            override fun onReceiveResult(code: Int, data: Bundle?) {
                if (code == 0) promise.resolve(null)
                else promise.reject("CALL_SERVICE_FAILED", data?.getString("error"))
            }
        })
        OngoingCallService.onTick = {
            if (context.hasActiveReactInstance()) {
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("SpeaklyCallTick", null)
            }
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
            else context.startService(intent)
        } catch (error: Exception) {
            OngoingCallService.onTick = null
            promise.reject("CALL_SERVICE_FAILED", error)
        }
    }
    @ReactMethod
    fun stop() {
        OngoingCallService.onTick = null
        context.stopService(Intent(context, OngoingCallService::class.java))
    }
    override fun invalidate() {
        stop()
        super.invalidate()
    }
}
