import { Observable } from "rxjs";
import { map, distinctUntilChanged } from "rxjs/operators";

import Device, { DeviceOrientation } from "./device";

// all numbers from -100 to 100 where 0 is no movement
export type Movement = {
  yaw: number; // rotate left/right
  pitch: number; // backward/forward
  roll: number; // left/right
  altitude: number; // down/up
};

export default class Controller {
  // expose as public for debug purposes
  public diff: DeviceOrientation = {
    alpha: 0,
    beta: 0,
    gamma: 0
  };
  public center: DeviceOrientation | null;
  public altitude: Observable<number>;

  private sensitivity = {
    yaw: 20,
    pitch: 15,
    roll: 20,
    altitude: 20
  };

  public connectAltitudeControl(altitude: Observable<number>): void {
    this.altitude = altitude;
  }

  public calibrateOrientation(): void {
    this.center = null;
  }

  public getMovement(): Observable<Movement> {
    // TODO combine with altitude control
    return Device.getOrientation()
      .pipe(
        map(this.mapOrientationToMovement),
        // only emit if any value changed from previous
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b)
        )
      );
  }

  private mapOrientationToMovement = (
    orientation: DeviceOrientation
  ): Movement => {
    if (!this.center) {
      this.center = Object.assign({}, orientation);
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

    // use fixed "speed" value for now
    const defaultSpeed = 30;
    const move: Movement = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      altitude: 0
    };

    // simplistic approach: just set default speed when diff is over sensitivity threshold
    if (this.diff.beta > this.sensitivity.pitch) {
      move.pitch = defaultSpeed;
    }

    if (this.diff.beta < -this.sensitivity.pitch) {
      move.pitch = -defaultSpeed;
    }

    if (this.diff.gamma < -this.sensitivity.roll) {
      move.roll = defaultSpeed;
    }

    if (this.diff.gamma > this.sensitivity.roll) {
      move.roll = -defaultSpeed;
    }

    if (move.roll === 0) {
      if (this.diff.alpha < -this.sensitivity.yaw) {
        move.yaw = -defaultSpeed;
      }

      if (this.diff.alpha > this.sensitivity.yaw) {
        move.yaw = defaultSpeed;
      }
    }

    return move;
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
