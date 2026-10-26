import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

export async function startCallRuntime() {
  if (Platform.OS === 'android') await NativeModules.CallRuntime.start();
}

export function stopCallRuntime() {
  if (Platform.OS === 'android') NativeModules.CallRuntime.stop();
}

// Native ticks keep Android call billing running while the screen is locked.
export function setCallInterval(
  callback: () => void | Promise<void>,
  interval: number,
) {
  let next = Date.now() + interval;
  let active = true;
  let running = false;
  const tick = async () => {
    if (!active || running) return;
    running = true;
    try {
      while (active && Date.now() >= next) {
        next += interval;
        await callback();
      }
    } catch (error) {
      console.error('Call timer failed:', error);
    } finally {
      running = false;
    }
  };
  const subscription =
    Platform.OS === 'android'
      ? DeviceEventEmitter.addListener('SpeaklyCallTick', tick)
      : undefined;
  const timer = Platform.OS !== 'android' ? setInterval(tick, 1000) : undefined;
  return () => {
    active = false;
    subscription?.remove();
    if (timer) clearInterval(timer);
  };
}
