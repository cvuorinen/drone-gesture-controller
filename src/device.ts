import { Observable, fromEvent } from "rxjs";
import { map, throttleTime, distinctUntilChanged } from "rxjs/operators";
import { animationFrame } from "rxjs/internal/scheduler/animationFrame";

export type DeviceOrientation = {
  alpha: number;
  beta: number;
  gamma: number;
};

// see https://developer.mozilla.org/en-US/docs/Web/API/Screen/lockOrientation
type OrientationLock =
  | "portrait"
  | "landscape"
  | "default"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

const throttleAmount = Math.round(1000 / 30); // 30 fps

const Device = {
  getOrientation(): Observable<DeviceOrientation> {
    return (
      fromEvent<DeviceOrientationEvent>(window, "deviceorientation")
        // throttle events and sync with requestAnimationFrame
        .pipe(throttleTime(throttleAmount, animationFrame))
        .pipe(
          map(({ alpha, beta, gamma }) => {
            // when device orientation not supported, it might still emit one event with null values
            if (alpha === null || beta === null || gamma === null) {
              throw "Device orientation not supported";
            }

            // convert to our own DeviceOrientation type and round values
            return {
              alpha: Math.round(alpha),
              beta: Math.round(beta),
              gamma: Math.round(gamma)
            };
          })
        )
        // only emit if any value changed (after rounding)
        .pipe(
          distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b)
          )
        )
    );
  },
  lockOrientation(lock?: OrientationLock | OrientationLock[]) {
    if (!lock) {
      // lock to current orientation if none provided
      lock = (window as any).screen.orientation.type;
    }

    // TODO: need to trigger fullscreen mode first to make this work
    // see example: https://whatwebcando.today/screen-orientation.html
    (window as any).screen
      .lockOrientation(lock)
      // empty catch to prevent unhandled promise rejection when lock not supported
      .catch(() => {});
  }
};

export default Device;