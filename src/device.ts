import { Observable, fromEvent } from "rxjs";
import { map, throttleTime, distinctUntilChanged } from "rxjs/operators";
import { animationFrame } from "rxjs/internal/scheduler/animationFrame";

export type DeviceOrientation = {
  alpha: number;
  beta: number;
  gamma: number;
};

const throttleAmount = Math.round(1000 / 30); // 30 fps

const Device = {
  supportsDeviceOrientation(): boolean {
    return !!(window as any).DeviceOrientationEvent;
  },
  getDeviceOrientation(): Observable<DeviceOrientation> {
    return (
      fromEvent<DeviceOrientationEvent>(window, "deviceorientation")
        // throttle events and sync with requestAnimationFrame
        .pipe(throttleTime(throttleAmount, animationFrame))
        // convert to our own DeviceOrientation type and round values
        .pipe(
          map(({ alpha, beta, gamma }) => {
            return {
              alpha: Math.round(alpha),
              beta: Math.round(beta),
              gamma: Math.round(gamma)
            };
          })
        )
        // only emit if any value changed (after rounding)
        .pipe(distinctUntilChanged(compareOrientation))
    );
  }
};

export default Device;

function compareOrientation(
  a: DeviceOrientation,
  b: DeviceOrientation
): boolean {
  return a.alpha === b.alpha && a.beta === b.beta && a.gamma === b.gamma;
}
