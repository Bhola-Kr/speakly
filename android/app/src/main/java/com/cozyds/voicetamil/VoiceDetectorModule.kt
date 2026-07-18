package com.cozyds.voicetamil

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import kotlin.math.*


class VoiceDetectorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {


    override fun getName(): String {
        return "VoiceDetector"
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


        val size =
            samples.size


        val buffer =
            FloatArray(size)



        for(i in samples.indices) {

            buffer[i] =
                samples[i]
                    .toFloat() / 32768f

        }



        val maxTau =
            size / 2



        val difference =
            FloatArray(maxTau)



        /*
            YIN Step 1:
            Difference function
        */

        for(tau in 1 until maxTau) {


            var sum = 0f


            for(i in 0 until maxTau) {


                val delta =
                    buffer[i] -
                    buffer[i + tau]


                sum +=
                    delta * delta

            }


            difference[tau] =
                sum

        }





        /*
            YIN Step 2:
            Cumulative mean normalized difference
        */


        var runningSum = 0f


        for(tau in 1 until maxTau) {


            runningSum +=
                difference[tau]


            difference[tau] =
                difference[tau] *
                tau /
                runningSum

        }





        /*
            YIN Step 3:
            Threshold search
        */


        val threshold =
            0.15f


        var tauEstimate =
            -1



        for(
            tau in 2 until maxTau
        ) {


            if(
                difference[tau] <
                threshold
            ) {


                while(
                    tau + 1 < maxTau &&
                    difference[tau + 1]
                    <
                    difference[tau]
                ) {

                    tauEstimate =
                        tau + 1

                    break
                }


                if(
                    tauEstimate == -1
                ) {

                    tauEstimate =
                        tau

                }


                break

            }

        }



        if(
            tauEstimate <= 0
        ) {

            return 0f

        }



        /*
            Frequency = sample rate / period
        */


        return sampleRate.toFloat() /
                tauEstimate.toFloat()

    }





    private fun calculateConfidence(
        pitch: Float,
        frameCount: Int
    ): Double {


        if(
            pitch == 0f ||
            frameCount < 2
        ) {

            return 0.0

        }



        return when {


            pitch < 130 ->
                0.90


            pitch < 160 ->
                0.75


            pitch > 210 ->
                0.90


            pitch > 175 ->
                0.75


            else ->
                0.50
        }

    }

}