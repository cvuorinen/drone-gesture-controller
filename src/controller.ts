import { Observable } from "rxjs";
import { map, filter, distinctUntilChanged } from "rxjs/operators";

import Device, { DeviceOrientation } from "./device";
import MiniDrone, { Movement } from "./mini-drone";

export default class Controller {
  // expose as public for debug purposes
  public diff: DeviceOrientation = {
    alpha: 0,
    beta: 0,
    gamma: 0
  };
  public center: DeviceOrientation | null;
  public altitude: Observable<number>;
  public movement: Observable<Movement>;

  // Diff value lower than this will not cause movement
  private sensitivity = {
    yaw: 20,
    pitch: 15,
    roll: 20
  };

  // Diff value higher or egual to this will set max speed
  private maxDiff = {
    yaw: 70,
    pitch: 50,
    roll: 70
  };

  // Never set over 100, use lower value for easier piloting
  private maxSpeed = 100;

  // Should we send movement commands to the drone
  private movementEnabled = false;

  constructor(
    private drone: MiniDrone
  ) {
    this.movement = this.getMovement();

    // connect movements to drone
    this.movement.subscribe(move => this.drone.setMovement(move))
  }

  public connectAltitudeControl(altitude: Observable<number>): void {
    this.altitude = altitude;
  }

  public calibrateOrientation(): void {
    // just empty previously set center point, it will be assigned again
    // during next movement update
    this.center = null;
  }

  public startMovement() {
    this.calibrateOrientation();
    this.movementEnabled = true;
  }

  public stopMovement() {
    this.movementEnabled = false;
    this.drone.hover();
  }

  public getMovement(): Observable<Movement> {
    // TODO combine with altitude control
    return Device.getOrientation()
      .pipe(
        filter(_ => this.movementEnabled),
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

    /**/

    const move: Movement = {
      yaw: 0,
      pitch: this.pitchSpeed(this.diff.beta),
      roll: -1 * this.rollSpeed(this.diff.gamma),
      altitude: 0
    };

    if (move.roll === 0) {
      move.yaw = this.yawSpeed(this.diff.alpha);
    }

    /*/

    // use fixed "speed" values for now
    const defaultSpeed = 30;
    const maxSpeed = 60;

    const move: Movement = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      altitude: 0
    };

    // simplistic approach: just set default speed when diff is over sensitivity threshold
    if (this.diff.beta > this.sensitivity.pitch) {
      move.pitch = (this.diff.beta > (this.sensitivity.pitch * 2)) ? maxSpeed :  defaultSpeed;
    }

    if (this.diff.beta < -this.sensitivity.pitch) {
      move.pitch = (this.diff.beta < (-this.sensitivity.pitch * 2)) ? -maxSpeed :  -defaultSpeed;
    }

    if (this.diff.gamma < -this.sensitivity.roll) {
      move.roll = (this.diff.gamma < -(this.sensitivity.roll * 2)) ? maxSpeed : defaultSpeed;
    }

    if (this.diff.gamma > this.sensitivity.roll) {
      move.roll = (this.diff.gamma > (this.sensitivity.roll * 2)) ? -maxSpeed : -defaultSpeed;
    }

    if (move.roll === 0) {
      if (this.diff.alpha < -this.sensitivity.yaw) {
        move.yaw = -defaultSpeed;
      }

      if (this.diff.alpha > this.sensitivity.yaw) {
        move.yaw = defaultSpeed;
      }
    }

    /**/

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

  // calculate speed value (-100 - 100) based on sensitivity, max diff and current diff
  private calculateSpeed(sensitivity: number, maxDiff: number, diff: number): number {
    const sign = diff < 0 ? -1 : 1;
    diff = Math.abs(diff);

    if (diff < sensitivity) {
      return 0;
    }

    if (diff >= maxDiff) {
      return sign * this.maxSpeed;
    }

    return sign * Math.floor((diff - sensitivity) / (maxDiff - sensitivity) * this.maxSpeed);
  }

  // curried speed functions per axis
  private yawSpeed = (diff: number): number =>
    this.calculateSpeed(this.sensitivity.yaw, this.maxDiff.yaw, diff);

  private pitchSpeed = (diff: number): number =>
    this.calculateSpeed(this.sensitivity.pitch, this.maxDiff.pitch, diff);

  private rollSpeed = (diff: number): number =>
    this.calculateSpeed(this.sensitivity.roll, this.maxDiff.roll, diff);
}
