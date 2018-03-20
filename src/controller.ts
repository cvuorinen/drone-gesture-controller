import { Observable } from "rxjs";
import { map, distinctUntilChanged } from "rxjs/operators";

import Device, { DeviceOrientation } from "./device";

export type Movement = {
  tilt: {
    forward: number;
    backward: number;
    left: number;
    right: number;
  };
  rotate: {
    left: number;
    right: number;
  };
  altitude?: {
    higher: number;
    lower: number;
  };
};

export default class Controller {
  // expose as public for debug purposes
  public diff: DeviceOrientation = {
    alpha: 0,
    beta: 0,
    gamma: 0
  };
  public center: DeviceOrientation;
  public altitude: Observable<number>;

  private sensitivity = 20;

  connectAltitudeControl(altitude: Observable<number>) {
    this.altitude = altitude;
  }

  calibrateOrientation(orientation: DeviceOrientation) {
    this.center = Object.assign({}, orientation);
  }

  getMovement(): Observable<Movement> {
    // TODO combine with altitude control
    return (
      Device.getOrientation()
        .pipe(map(this.mapOrientationToMovement))
        // only emit if any value changed from previous
        .pipe(
          distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b)
          )
        )
    );
  }

  private mapOrientationToMovement = (
    orientation: DeviceOrientation
  ): Movement => {
    if (!this.center) {
      this.calibrateOrientation(orientation);
    }

    this.diff.alpha = this.calculateAngleDiff(
      this.center.alpha,
      orientation.alpha
    );
    this.diff.beta = this.calculateAngleDiff(
      this.center.beta,
      orientation.beta
    );
    this.diff.gamma = this.calculateAngleDiff(
      this.center.gamma,
      orientation.gamma
    );

    return {
      tilt: {
        forward: this.diff.beta > this.sensitivity ? 1 : 0,
        backward: this.diff.beta < -this.sensitivity ? 1 : 0,
        left: this.diff.alpha < -this.sensitivity ? 1 : 0,
        right: this.diff.alpha > this.sensitivity ? 1 : 0
      },
      rotate: {
        left: this.diff.gamma < -this.sensitivity ? 1 : 0,
        right: this.diff.gamma > this.sensitivity ? 1 : 0
      }
    };
  };

  // calculate difference of angle degree for current value from calibrated center point
  private calculateAngleDiff(center: number, current: number): number {
    const subtraction = center - current;
    const diff = Math.abs(subtraction) % 360;
    const result = diff > 180 ? 360 - diff : diff;

    const sign =
      (subtraction >= 0 && subtraction <= 180) ||
      (subtraction <= -180 && subtraction >= -360)
        ? 1
        : -1;

    return sign * result;
  }
}
