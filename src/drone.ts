import { skipWhile } from "rxjs/operators";

import Bluetooth from "./bluetooth";
import Logger from "./logger";
import Controller, { Movement } from "./controller";

const DEFAULT_SPEED = 50;
const DEFAULT_DRIVE_STEPS = 40;

// Class used to communicate with Parrot Rolling Spider drone (via Bluetooth)
// adapted from https://github.com/poshaughnessy/web-bluetooth-parrot-drone/blob/master/js/drone.js
export default class Drone {
  ping: any;
  speeds: Movement = {
    yaw: 0, // turn
    pitch: 0, // forward/backward
    roll: 0, // left/right
    altitude: 0 // up/down
  };
  driveStepsRemaining: number = 0;
  private bluetooth: Bluetooth;
  private movementEnabled = false;

  // Used to store the 'counter' that's sent to each characteristic
  private steps: { [index: string]: number } = {};

  constructor(private controller: Controller) {}

  getBlutoothDiscoveryOptions() {
    return {
      filters: [
        { namePrefix: "RS_" },
        { namePrefix: "Mars_" },
        { namePrefix: "Travis_" }
      ],
      optionalServices: [
        getUUID("fa00"),
        getUUID("fb00"),
        getUUID("fd21"),
        getUUID("fd51")
      ]
    };
  }

  connect(bluetooth: Bluetooth): Promise<any> {
    this.bluetooth = bluetooth;

    return this.startNotifications()
      .then(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.handshake()
              .then(resolve)
              .catch(reject);
          }, 100);
        });
      })
      .then(() => {
        Logger.debug("Completed handshake");
        this.connectController();
      });
  }

  private startNotifications(): Promise<any> {
    Logger.debug("Start notifications...");

    return this.bluetooth
      .startNotificationsForCharacteristic("fb00", "fb0f")
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fb00",
          "fb0e"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fb00",
          "fb1b"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fb00",
          "fb1c"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fd21",
          "fd22"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fd21",
          "fd23"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fd21",
          "fd24"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fd51",
          "fd52"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fd51",
          "fd53"
        );
      })
      .then(() => {
        return this.bluetooth.startNotificationsForCharacteristic(
          "fd51",
          "fd54"
        );
      })
      .then(() => {
        Logger.debug("Finished starting notifications");
        this.bluetooth
          .getNotifications()
          .subscribe(([characteristicID, event]) =>
            this.handleEvent(characteristicID, event)
          );
      })
      .catch(error => {
        Logger.error("Failed to start notifications", error);
      });
  }

  private handleEvent(characteristicID: string, event: any) {
    const array = new Uint8Array(event.target.value.buffer);

    let a = [];
    for (let i = 0; i < array.byteLength; i++) {
      a.push("0x" + ("00" + array[i].toString(16)).slice(-2));
    }

    Logger.log("Notification from " + characteristicID + ": " + a.join(" "));

    if (characteristicID === "fb0e") {
      var eventList = [
        "fsLanded",
        "fsTakingOff",
        "fsHovering",
        "fsUnknown",
        "fsLanding",
        "fsCutOff"
      ];

      if (eventList[array[6]] === "fsHovering") {
        Logger.log("Hovering - ready to go");
      } else {
        Logger.log("Not hovering... Not ready", array[6]);
      }

      if ([1, 2, 3, 4].indexOf(array[6]) >= 0) {
        Logger.log("Flying");
      } else {
        Logger.log("Not flying");
      }
    } else if (characteristicID === "fb0f") {
      const batteryLevel = array[array.length - 1];

      Logger.log(`Battery Level: ${batteryLevel}%`);

      if (batteryLevel < 10) {
        Logger.error("Battery level too low!");
      }
    }
  }

  private handshake(): Promise<any> {
    Logger.debug("Handshake");

    return this.bluetooth.connectGATT().then(() => {
      return this.bluetooth.writeTo("fa00", "fa0b", [
        4,
        this.getNextStep("fa0b"),
        0,
        4,
        1,
        0,
        0x32,
        0x30,
        0x31,
        0x34,
        0x2d,
        0x31,
        0x30,
        0x2d,
        0x32,
        0x38,
        0x00
      ]);
    });
  }

  private getNextStep(name: string): number {
    if (!this.steps[name]) {
      this.steps[name] = 1;
    }

    return ++this.steps[name];
  }

  public startMovement() {
    Logger.log("Start movement");
    this.controller.calibrateOrientation();
    this.movementEnabled = true;
  }

  public stopMovement() {
    Logger.log("Stop movement");
    this.movementEnabled = false;
    this.hover();
  }

  private connectController() {
    this.controller
      .getMovement()
      .pipe(skipWhile(_ => !this.movementEnabled))
      .subscribe(movement => (this.speeds = movement));
  }

  /*private handleMovement = (movement: Movement) => {
    // TODO convert movement
    Logger.log("Handle movement", movement);
    this.bluetooth
      .writeTo("fa00", "fa0a", [
        2,
        this.getNextStep("fa0a"),
        2,
        0,
        2,
        0,
        this.isMoving() ? 1 : 0,
        movement.roll,
        movement.pitch,
        movement.yaw,
        movement.altitude,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ])
      .catch(this.onBluetoothError);
  };*/

  private startPing(): void {
    Logger.log("Start ping");

    this.ping = setInterval(() => {
      Logger.log("Ping...", this.speeds);

      this.bluetooth
        .writeTo("fa00", "fa0a", [
          2,
          this.getNextStep("fa0a"),
          2,
          0,
          2,
          0,
          //this.driveStepsRemaining ? 1 : 0,
          this.isMoving() ? 1 : 0,
          this.speeds.roll,
          this.speeds.pitch,
          this.speeds.yaw,
          this.speeds.altitude,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ])
        .catch(this.onBluetoothError);

      /*if (this.driveStepsRemaining > 0) {
        this.driveStepsRemaining--;

        if (this.driveStepsRemaining === 0) {
          Logger.log("Move complete, reset to hover state");
          this.hover();
        } else {
          Logger.log("Drive steps remaining", this.driveStepsRemaining);
        }
      }*/
    }, 50);
  }

  private isMoving(): boolean {
    return !(
      this.speeds.yaw === 0 &&
      this.speeds.pitch === 0 &&
      this.speeds.roll === 0 &&
      this.speeds.altitude === 0
    );
  }

  private onBluetoothError = (err: any) => {
    Logger.error("Error!", err);
    clearInterval(this.ping);
  };

  takeOff(): Promise<any> {
    Logger.log("Take off...");
    return this.bluetooth
      .connectGATT()
      .then(() => {
        // "Flat trim" which you are meant to call before taking off
        return this.bluetooth.writeTo("fa00", "fa0b", [
          2,
          this.getNextStep("fa0b") & 0xff,
          2,
          0,
          0,
          0
        ]);
      })
      .then(() => {
        // Actual command to take off
        return this.bluetooth.writeTo("fa00", "fa0b", [
          4,
          this.getNextStep("fa0b"),
          2,
          0,
          1,
          0
        ]);
      })
      .then(() => {
        this.startPing();
      })
      .catch(this.onBluetoothError);
  }

  flip(): Promise<any> {
    Logger.log("Flip...");
    return this.bluetooth
      .connectGATT()
      .then(() => {
        return this.bluetooth.writeTo("fa00", "fa0b", [
          4,
          this.getNextStep("fa0b"),
          2,
          4,
          0,
          0,
          2,
          0,
          0,
          0
        ]);
      })
      .catch(this.onBluetoothError);
  }

  land(): Promise<any> {
    Logger.log("Land...");
    return this.bluetooth
      .connectGATT()
      .then(() => {
        return this.bluetooth.writeTo("fa00", "fa0b", [
          4,
          this.getNextStep("fa0b"),
          2,
          0,
          3,
          0
        ]);
      })
      .then(() => {
        clearInterval(this.ping);
      })
      .catch(this.onBluetoothError);
  }

  emergencyCutOff() {
    Logger.warn("Emergency cut off!");
    return this.bluetooth
      .connectGATT()
      .then(() => {
        return this.bluetooth.writeTo("fa00", "fa0c", [
          0x02,
          this.getNextStep("fa0c") & 0xff,
          0x02,
          0x00,
          0x04,
          0x00
        ]);
      })
      .then(() => {
        clearInterval(this.ping);
      })
      .catch(this.onBluetoothError);
  }

  hover() {
    Logger.log("Hover");

    this.driveStepsRemaining = 0;
    this.speeds.yaw = 0;
    this.speeds.pitch = 0;
    this.speeds.roll = 0;
    this.speeds.altitude = 0;
  }

  moveForwards() {
    this.setSpeed("pitch", DEFAULT_SPEED, DEFAULT_DRIVE_STEPS);
  }

  moveBackwards() {
    this.setSpeed("pitch", -DEFAULT_SPEED, DEFAULT_DRIVE_STEPS);
  }

  moveLeft() {
    this.setSpeed("yaw", -DEFAULT_SPEED, DEFAULT_DRIVE_STEPS);
  }

  moveRight() {
    this.setSpeed("yaw", DEFAULT_SPEED, DEFAULT_DRIVE_STEPS);
  }

  private setSpeed(property: string, speed: number, driveSteps: number) {
    Logger.log(`Change ${property} to ${speed}`);

    const props = ["yaw", "pitch", "roll", "altitude"];

    for (let i = 0; i < props.length; i++) {
      const prop = props[i];

      if (property === prop) {
        (this.speeds as any)[prop] = speed;
      } else {
        (this.speeds as any)[prop] = 0;
      }

      this.driveStepsRemaining = driveSteps;
    }
  }
}

function getUUID(uniqueSegment: string) {
  return "9a66" + uniqueSegment + "-0800-9191-11e4-012d1540cb8e";
}
