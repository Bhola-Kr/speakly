package com.ra.speakly

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*
import kotlin.concurrent.thread


class VoiceDetectorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {


    override fun getName(): String {
        return "VoiceDetector"
    }

    private val sampleRate = 16000

    private lateinit var recorder: AudioRecord

    @Volatile
    private var isRecording = false

    private var recordingThread: Thread? = null

    private val recordedSamples =
        mutableListOf<Short>()

    private val lock = Any()


    @ReactMethod
    fun startRecording(
        promise: Promise
    ) {

        if (
            ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {

            promise.reject(
                "NO_PERMISSION",
                "Microphone permission not granted"
            )

            return
        }

        if (isRecording) {

            promise.resolve(true)
            return

        }

        try {

            recordedSamples.clear()

            val bufferSize =
                AudioRecord.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )

            recorder =
                AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize
                )

            if (
                recorder.state != AudioRecord.STATE_INITIALIZED
            ) {

                promise.reject(
                    "INIT_ERROR",
                    "Unable to initialize AudioRecord"
                )

                return

            }

            recorder.startRecording()

            isRecording = true

            recordingThread =
                thread(start = true) {

                    val buffer =
                        ShortArray(bufferSize)

                    while (isRecording) {

                        val read =
                            recorder.read(
                                buffer,
                                0,
                                buffer.size
                            )

                        if (read > 0) {

                            synchronized(lock) {

                                for (i in 0 until read) {

                                    recordedSamples.add(
                                        buffer[i]
                                    )

                                }

                            }

                        }

                    }

                }

            promise.resolve(true)

        } catch (e: Exception) {

            promise.reject(
                "START_ERROR",
                e.message
            )

        }

    }

    @ReactMethod
fun stopAndVerify(
    promise: Promise
) {

    if (!isRecording) {

        promise.reject(
            "NOT_RECORDING",
            "Recording has not been started."
        )

        return
    }

    Thread {

        try {

            isRecording = false

            recordingThread?.join()

            try {
                recorder.stop()
            } catch (_: Exception) {
            }

            try {
                recorder.release()
            } catch (_: Exception) {
            }

            val audioData: ShortArray =
                synchronized(lock) {

                    recordedSamples.toShortArray()

                }

            val totalSamples =
                audioData.size

            if (totalSamples < 2048) {

                promise.reject(
                    "NO_AUDIO",
                    "Not enough audio recorded."
                )

                return@Thread
            }

            val audioFile = writeWaveFile(audioData)

            val pitches =
                mutableListOf<Float>()

            var index = 0

            while (
                index + 2048 < totalSamples
            ) {

                val frame =
                    audioData.copyOfRange(
                        index,
                        index + 2048
                    )

                /*
                 Skip silent frames
                */

                var energy = 0.0

                for (s in frame) {

                    energy +=
                        s * s.toDouble()

                }

                val rms =
                    sqrt(
                        energy / frame.size
                    )

                if (rms > 500) {

                    val pitch =
                        detectPitch(
                            frame,
                            sampleRate
                        )

                    if (
                        pitch in 50f..400f
                    ) {

                        pitches.add(pitch)

                    }

                }

                index += 1024
            }

            val averagePitch =
                if (pitches.isNotEmpty()) {

                    pitches.average()
                        .toFloat()

                } else {

                    0f

                }

           val gender =
    when {

        averagePitch == 0f ->
            "unknown"

        averagePitch < 165 ->
            "male"

        averagePitch >= 180 ->
            "female"

        else ->
            "unknown"
    }

            val confidence =
                calculateConfidence(
                    averagePitch,
                    pitches.size
                )

            val result =
                Arguments.createMap()

            result.putString(
                "gender",
                gender
            )

            result.putDouble(
                "pitch",
                averagePitch.toDouble()
            )

            result.putDouble(
                "confidence",
                confidence
            )

            result.putInt(
                "samples",
                pitches.size
            )

            result.putString(
                "localUri",
                audioFile.absolutePath
            )

            result.putInt(
                "durationMs",
                (totalSamples * 1000) / sampleRate
            )

            promise.resolve(result)

        } catch (e: Exception) {

            promise.reject(
                "VERIFY_ERROR",
                e
            )

        }

    }.start()

}

    private fun writeWaveFile(audioData: ShortArray): File {
        val file = File(
            reactContext.cacheDir,
            "expert-verification-${System.currentTimeMillis()}.wav"
        )
        val dataSize = audioData.size * 2
        val buffer = ByteBuffer.allocate(44 + dataSize)
            .order(ByteOrder.LITTLE_ENDIAN)

        buffer.put("RIFF".toByteArray(Charsets.US_ASCII))
        buffer.putInt(36 + dataSize)
        buffer.put("WAVE".toByteArray(Charsets.US_ASCII))
        buffer.put("fmt ".toByteArray(Charsets.US_ASCII))
        buffer.putInt(16)
        buffer.putShort(1.toShort())
        buffer.putShort(1.toShort())
        buffer.putInt(sampleRate)
        buffer.putInt(sampleRate * 2)
        buffer.putShort(2.toShort())
        buffer.putShort(16.toShort())
        buffer.put("data".toByteArray(Charsets.US_ASCII))
        buffer.putInt(dataSize)
        audioData.forEach { buffer.putShort(it) }

        FileOutputStream(file).use { it.write(buffer.array()) }
        return file
    }

    @ReactMethod
    fun detectGender(promise: Promise) {

        if (
            ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {

            promise.reject(
                "NO_PERMISSION",
                "Microphone permission not granted"
            )

            return
        }


        Thread {

            try {

                val sampleRate = 16000


                val bufferSize =
                    AudioRecord.getMinBufferSize(
                        sampleRate,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT
                    )


                val recorder =
                    AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        sampleRate,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize
                    )


                val maxSamples =
                    sampleRate * 3


                val audioData =
                    ShortArray(maxSamples)


                recorder.startRecording()


                var totalSamples = 0


                val start =
                    System.currentTimeMillis()


                while (
                    System.currentTimeMillis() - start < 3000
                ) {

                    val read =
                        recorder.read(
                            audioData,
                            totalSamples,
                            audioData.size - totalSamples
                        )


                    if(read > 0) {

                        totalSamples += read

                    }


                    if(totalSamples >= audioData.size) {
                        break
                    }
                }


                recorder.stop()
                recorder.release()



                val pitches =
                    mutableListOf<Float>()



                var index = 0


                while (
                    index + 2048 < totalSamples
                ) {


                    val frame =
                        audioData.copyOfRange(
                            index,
                            index + 2048
                        )


                    val pitch =
                        detectPitch(
                            frame,
                            sampleRate
                        )


                    /*
                       Ignore invalid pitch.
                       Human voice normally:
                       50Hz - 400Hz
                    */

                    if(
                        pitch > 50 &&
                        pitch < 400
                    ) {

                        pitches.add(pitch)

                    }


                    index += 2048

                }



                val averagePitch =
                    if(
                        pitches.isNotEmpty()
                    ) {

                        pitches.average()
                            .toFloat()

                    } else {

                        0f

                    }



                val gender =
                    when {

                        averagePitch == 0f ->
                            "unknown"


                        averagePitch < 160 ->
                            "male"


                        averagePitch > 175 ->
                            "female"


                        else ->
                            "unknown"
                    }



                val confidence =
                    calculateConfidence(
                        averagePitch,
                        pitches.size
                    )



                val result =
                    Arguments.createMap()



                result.putString(
                    "gender",
                    gender
                )


                result.putDouble(
                    "pitch",
                    averagePitch.toDouble()
                )


                result.putDouble(
                    "confidence",
                    confidence
                )


                result.putInt(
                    "samples",
                    pitches.size
                )



                promise.resolve(result)



            }
            catch(e: Exception) {


                promise.reject(
                    "VOICE_ERROR",
                    e.message
                )

            }


        }.start()

    }



private fun detectPitch(
    samples: ShortArray,
    sampleRate: Int
): Float {

    val size = samples.size

    if (size < 1024) {
        return 0f
    }

    val buffer = FloatArray(size)

    for (i in samples.indices) {
        buffer[i] = samples[i] / 32768f
    }

    val maxTau = size / 2

    val difference = FloatArray(maxTau)

    /*
        Difference function
     */

    for (tau in 1 until maxTau) {

        var sum = 0f

        var i = 0

        while (i < maxTau) {

            val delta =
                buffer[i] -
                        buffer[i + tau]

            sum += delta * delta

            i++
        }

        difference[tau] = sum
    }

    /*
        Cumulative Mean Normalized Difference
     */

    difference[0] = 1f

    var runningSum = 0f

    for (tau in 1 until maxTau) {

        runningSum += difference[tau]

        difference[tau] =
            if (runningSum == 0f) {

                1f

            } else {

                difference[tau] *
                        tau /
                        runningSum

            }

    }

    /*
        Absolute Threshold
     */

    val threshold = 0.20f

    var tauEstimate = -1

    for (tau in 2 until maxTau) {

        if (difference[tau] < threshold) {

            var betterTau = tau

            while (
                betterTau + 1 < maxTau &&
                difference[betterTau + 1] <
                difference[betterTau]
            ) {

                betterTau++

            }

            tauEstimate = betterTau

            break
        }

    }

    if (tauEstimate == -1) {
        return 0f
    }

    /*
        Parabolic interpolation
     */

    if (
        tauEstimate > 1 &&
        tauEstimate < maxTau - 1
    ) {

        val s0 =
            difference[tauEstimate - 1]

        val s1 =
            difference[tauEstimate]

        val s2 =
            difference[tauEstimate + 1]

        val denominator =
            2 * (2 * s1 - s2 - s0)

        if (denominator != 0f) {

            val shift =
                (s2 - s0) /
                        denominator

            val betterTau =
                tauEstimate + shift

            return sampleRate / betterTau

        }

    }

    return sampleRate.toFloat() /
            tauEstimate.toFloat()

}




private fun calculateConfidence(
    pitch: Float,
    frameCount: Int
): Double {

    if (
        pitch == 0f ||
        frameCount < 3
    ) {

        return 0.0

    }

    val confidence =
        when {

            pitch < 110 ->
                0.95

            pitch < 140 ->
                0.90

            pitch < 160 ->
                0.80

            pitch > 250 ->
                0.95

            pitch > 200 ->
                0.90

            pitch > 175 ->
                0.80

            else ->
                0.60
        }

    return min(
        1.0,
        confidence +
                frameCount * 0.01
    )

}

}
