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
  getOrientation(): Observable<DeviceOrientation> {
    return (
      fromEvent<DeviceOrientationEvent>(window, "deviceorientation")
        .pipe(
          // throttle events and sync with requestAnimationFrame
          throttleTime(throttleAmount, animationFrame),
          map(({ alpha, beta, gamma }) => {
            // when device orientation not supported, it might still emit one event with null values
            if (alpha === null || beta === null || gamma === null) {
              throw "Device orientation not supported";
            }

            return {
              alpha: Math.round(alpha),
              beta: Math.round(beta),
              gamma: Math.round(gamma)
            };
          }),
          // only emit if any value changed (after rounding)
          distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b)
          )
        )
    );
  }
};

export default Device;
