import { map } from 'rxjs/operators';

import { Bluetooth, Logger } from "./bluetooth";

// interval for sending commands to the drone (in milliseconds)
const PING_INTERVAL = 50;

// default value for movement commands (0-100)
const DEFAULT_SPEED = 50;

// default value for how many interval steps to keep moving
const DEFAULT_DRIVE_STEPS = 40;

// Command identifiers from Parrot libARCommands
// https://github.com/Parrot-Developers/libARCommands/blob/ARSDK3_version_3_1_0/Xml/MiniDrone_commands.xml
const FeatureID = 2; // MiniDrone project identifier

enum CmdClass {
  Piloting = 0,
  Animations = 4,
}

enum PilotingCmd {
  FlatTrim = 0,
  TakeOff = 1,
  PCMD = 2, // Progressive commands (movement controlling)
  Landing = 3,
  Emergency = 4,
  AutoTakeOffMode = 5,
}

enum AnimationsCmd {
  Flip = 0,
  Cap = 1, // Rotate by X degrees
}

enum FlipDirection {
  Front = 0,
  Back = 1,
  Right = 2,
  Left = 3,
}

// Data types used with BLE commands
// http://developer.parrot.com/docs/SDK3/ARSDK_Protocols.pdf
enum DataType {
  Normal = 2, // Normal data (no ack requested)
  HighPrio = 3, // Low latency data
  Ack = 4 // Data requesting an ack
}

enum BleService {
  Write = "9a66fa00-0800-9191-11e4-012d1540cb8e",
  Read = "9a66fb00-0800-9191-11e4-012d1540cb8e",

  /* Not sure what these are for, or are they needed?
  fd21 = "9a66fd21-0800-9191-11e4-012d1540cb8e",
  fd51 = "9a66fd51-0800-9191-11e4-012d1540cb8e",*/
}

enum BleWriteCharacteristic {
  PCMD = "9a66fa0a-0800-9191-11e4-012d1540cb8e", // Non-acknowledged commands (PCMD only)
  Cmd = "9a66fa0b-0800-9191-11e4-012d1540cb8e", // Acknowledged commands (anything but PCMD & Emergency )
  HighPrio = "9a66fa0c-0800-9191-11e4-012d1540cb8e", // High Priority commands (Emergency only)
}

enum BleReadCharacteristic {
  FlightStatus = "9a66fb0e-0800-9191-11e4-012d1540cb8e",
  BatteryStatus = "9a66fb0f-0800-9191-11e4-012d1540cb8e",

  /* Not sure what these are for, or are they needed?
  fb1b = "9a66fb1b-0800-9191-11e4-012d1540cb8e",
  fb1c = "9a66fb1c-0800-9191-11e4-012d1540cb8e",
  fd22 = "9a66fd22-0800-9191-11e4-012d1540cb8e",
  fd23 = "9a66fd23-0800-9191-11e4-012d1540cb8e",
  fd24 = "9a66fd24-0800-9191-11e4-012d1540cb8e",
  fd52 = "9a66fd52-0800-9191-11e4-012d1540cb8e",
  fd53 = "9a66fd53-0800-9191-11e4-012d1540cb8e",
  fd54 = "9a66fd54-0800-9191-11e4-012d1540cb8e",*/
}

const BluetoothDiscoveryOptions = {
  filters: [
    { namePrefix: "RS_" }, // Rolling Spider
    { namePrefix: "Mars_" }, // Not sure about these other ones...
    { namePrefix: "Travis_" },
    { namePrefix: "Mambo_" },
  ],
  optionalServices: [
    BleService.Write,
    BleService.Read,
  ]
};

// all numbers from -100 to 100 where 0 is no movement
export type Movement = {
  yaw: number; // rotate left/right
  pitch: number; // backward/forward
  roll: number; // left/right
  altitude: number; // down/up
};

// Class used to communicate with Parrot mini drones (Rolling Spider, Mambo etc.) via Bluetooth
export default class MiniDrone {
  private pingIntervalHandle: number;

  private speeds: Movement = {
    yaw: 0, // turn
    pitch: 0, // forward/backward
    roll: 0, // left/right
    altitude: 0 // up/down
  };

  // Remaining steps in a predefined movement
  private driveStepsRemaining: number = 0;

  // Used to store the sequence number 'counter' that's sent to each characteristic
  private sequenceCounter: { [index: string]: number } = {};

  constructor(
    private bluetooth: Bluetooth,
    private logger: Logger = window.console
  ) {}

  public async connect(): Promise<void> {
    await this.bluetooth.connect(BluetoothDiscoveryOptions);

    await this.startNotifications();

    await wait(100);
    await this.handshake();
  }

  private async startNotifications(): Promise<void> {
    this.logger.debug("Start notifications...");

    await this.subscribeNotifications(BleReadCharacteristic.FlightStatus, this.handleFlightStatus);
    await this.subscribeNotifications(BleReadCharacteristic.BatteryStatus, this.handleBatteryStatus);
    /*try {
      (await this.bluetooth.startNotifications(BleService.Read, BleCharacteristic.ReadFlightStatus))
        .pipe(map(event => new Uint8Array(event.target.value.buffer)))
        .subscribe(this.handleFlightStatus);
    } catch (error) {
      this.logger.error("Failed to start notifications", BleCharacteristic.ReadFlightStatus, error);
    }

    try {
      (await this.bluetooth.startNotifications(BleService.Read, BleCharacteristic.ReadBatteryStatus))
        .pipe(map(event => new Uint8Array(event.target.value.buffer)))
        .subscribe(this.handleBatteryStatus);
    } catch (error) {
      this.logger.error("Failed to start notifications", BleCharacteristic.ReadBatteryStatus, error);
    }*/

    /*const listenTo = [
      [BleService.Read, BleCharacteristic.ReadBatteryStatus],
      [BleService.Read, BleCharacteristic.ReadFlightStatus],
      [BluetoothService.fb00, BluetoothCharacteristic.fb1b],
      [BluetoothService.fb00, BluetoothCharacteristic.fb1c],
      [BluetoothService.fd21, BluetoothCharacteristic.fd22],
      [BluetoothService.fd21, BluetoothCharacteristic.fd23],
      [BluetoothService.fd21, BluetoothCharacteristic.fd24],
      [BluetoothService.fd51, BluetoothCharacteristic.fd52],
      [BluetoothService.fd51, BluetoothCharacteristic.fd53],
      [BluetoothService.fd51, BluetoothCharacteristic.fd54],
    ];*/

    /*const notifications = [];

    for (let [service, characteristic] of listenTo) {
      try {
        notifications.push(
          await this.bluetooth.startNotifications(service, characteristic)
        );
      } catch (error) {
        this.logger.error("Failed to start notifications", error, characteristic);
      }
    }*/

    this.logger.debug("Finished starting notifications");

    /*merge(...notifications)
      .subscribe(([characteristicID, event]) =>
        this.handleEvent(characteristicID, event)
      );*/

    /*this.bluetooth.getNotifications()
      .subscribe(([characteristicID, event]) =>
        this.handleEvent(characteristicID, event)
      );*/
  }

  private async subscribeNotifications(
    characteristic: BleReadCharacteristic,
    listener: (buffer: ArrayBuffer | ArrayLike<number>) => void
  ): Promise<void> {
    try {
      const notifications = await this.bluetooth.startNotifications(BleService.Read, characteristic);

      notifications
        .pipe(map(event => new Uint8Array(event.target.value.buffer)))
        .subscribe(listener);
    } catch (error) {
      this.logger.error("Failed to start notifications", characteristic, error);
    }
  }

  private handleBatteryStatus = (buffer: ArrayBuffer | ArrayLike<number>): void => {
    const array = new Uint8Array(buffer);
    const batteryLevel = array[array.length - 1];

    this.logger.log(`Battery Level: ${batteryLevel}%`);

    if (batteryLevel < 10) {
      this.logger.error("Battery level too low!");
    }
  };

  private handleFlightStatus = (buffer: ArrayBuffer | ArrayLike<number>): void => {
    const array = new Uint8Array(buffer);
    var eventList = [
      "fsLanded",
      "fsTakingOff",
      "fsHovering",
      "fsUnknown",
      "fsLanding",
      "fsCutOff"
    ];

    if (eventList[array[6]] === "fsHovering") {
      this.logger.log("Hovering - ready to go");
    } else {
      this.logger.log("Not hovering... Not ready", array[6]);
    }

    if ([1, 2, 3, 4].indexOf(array[6]) >= 0) {
      this.logger.log("Flying");
    } else {
      this.logger.log("Not flying");
    }
  };

  /*private handleEvent(characteristicID: BluetoothCharacteristicUUID, event: any) {
    const array = new Uint8Array(event.target.value.buffer);

    let a = [];
    for (let i = 0; i < array.byteLength; i++) {
      a.push("0x" + ("00" + array[i].toString(16)).slice(-2));
    }

    this.logger.log("Notification from " + characteristicID + ": " + a.join(" "));

    if (characteristicID === BleCharacteristic.ReadFlightStatus) {
      var eventList = [
        "fsLanded",
        "fsTakingOff",
        "fsHovering",
        "fsUnknown",
        "fsLanding",
        "fsCutOff"
      ];

      if (eventList[array[6]] === "fsHovering") {
        this.logger.log("Hovering - ready to go");
      } else {
        this.logger.log("Not hovering... Not ready", array[6]);
      }

      if ([1, 2, 3, 4].indexOf(array[6]) >= 0) {
        this.logger.log("Flying");
      } else {
        this.logger.log("Not flying");
      }
    } else if (characteristicID === BleCharacteristic.ReadBatteryStatus) {
      const batteryLevel = array[array.length - 1];

      this.logger.log(`Battery Level: ${batteryLevel}%`);

      if (batteryLevel < 10) {
        this.logger.error("Battery level too low!");
      }
    }
  }*/

  private async handshake(): Promise<void> {
    // TODO is this needed ??
    this.logger.debug("Handshake");

    await this.bluetooth.write(
      BleService.Write,
      BleWriteCharacteristic.Cmd,
      [4, this.getSequenceNum(BleWriteCharacteristic.Cmd), 0, 4, 1, 0,
        0x32, 0x30, 0x31, 0x34, 0x2d, 0x31, 0x30, 0x2d, 0x32, 0x38, 0x00]
    );

    this.logger.debug("Completed handshake");
  }

  /**
   * Each characteristic has its own independent sequence number, which should
   * be increased on new data send, but not on retries. Drone will ignore out
   * of order data/commands.
   *
   * Value must fit in one byte, so return integer between 0 and 255
   * (going back to 0 after 255 is ok, back-gap is only 10)
   */
  private getSequenceNum(name: string): number {
    if (!this.sequenceCounter[name] || this.sequenceCounter[name] === 255) {
      this.sequenceCounter[name] = 0;
    }


    return ++this.sequenceCounter[name];
  }

  public setMovement(speeds: Movement): void {
    this.speeds = speeds;
  }

  private startPing(): void {
    this.logger.debug("Start ping");

    this.pingIntervalHandle = window.setInterval(() => {
      this.logger.debug("Ping...", this.speeds);

      this.bluetooth.write(
        BleService.Write,
        BleWriteCharacteristic.PCMD,
        [
          DataType.Normal,
          this.getSequenceNum(BleWriteCharacteristic.PCMD),
          FeatureID,
          CmdClass.Piloting,
          PilotingCmd.PCMD, 0,
          this.isMoving() ? 1 : 0,
          this.speeds.roll,
          this.speeds.pitch,
          this.speeds.yaw,
          this.speeds.altitude,
          0, 0, 0, 0, 0, 0, 0, 0]
        ).catch(this.onBluetoothError);

      if (this.driveStepsRemaining > 0) {
        this.driveStepsRemaining--;

        if (this.driveStepsRemaining === 0) {
          this.logger.debug("Move complete, reset to hover state");
          this.hover();
        } else {
          this.logger.debug("Drive steps remaining", this.driveStepsRemaining);
        }
      }
    }, PING_INTERVAL);
  }

  private isMoving(): boolean {
    return !(
      this.speeds.yaw === 0 &&
      this.speeds.pitch === 0 &&
      this.speeds.roll === 0 &&
      this.speeds.altitude === 0
    ) || !!this.driveStepsRemaining;
  }

  private onBluetoothError = (err: any) => {
    this.logger.error("Error!", err);
    window.clearInterval(this.pingIntervalHandle);
  };

  public async takeOff(): Promise<void> {
    this.logger.debug("Take off...");

    try {
      // "Flat trim" should be called before taking off
      await this.bluetooth.write(
        BleService.Write,
        BleWriteCharacteristic.Cmd,
        [DataType.Normal, this.getSequenceNum(BleWriteCharacteristic.Cmd), FeatureID, CmdClass.Piloting, PilotingCmd.FlatTrim, 0]
      );

      // Actual command to take off
      await this.bluetooth.write(
        BleService.Write,
        BleWriteCharacteristic.Cmd,
        [DataType.Ack, this.getSequenceNum(BleWriteCharacteristic.Cmd), FeatureID, CmdClass.Piloting, PilotingCmd.TakeOff, 0]
      );
    } catch (error) {
      this.logger.error("Error!", error);
    }

    this.startPing();
  }

  public flip(direction: FlipDirection = FlipDirection.Front): Promise<void> {
    this.logger.debug("Flip...");

    return this.bluetooth.write(
      BleService.Write,
      BleWriteCharacteristic.Cmd,
      [DataType.Ack, this.getSequenceNum(BleWriteCharacteristic.Cmd), FeatureID, CmdClass.Animations, AnimationsCmd.Flip, 0, direction, 0, 0, 0]
    ).catch(this.onBluetoothError);
  }

  public async land(): Promise<void> {
    this.logger.debug("Land...");

    await this.bluetooth.write(
      BleService.Write,
      BleWriteCharacteristic.Cmd,
      [DataType.Ack, this.getSequenceNum(BleWriteCharacteristic.Cmd), FeatureID, CmdClass.Piloting, PilotingCmd.Landing, 0]
    ).catch(this.onBluetoothError);

    clearInterval(this.pingIntervalHandle);
  }

  public async emergencyCutOff(): Promise<void> {
    this.logger.warn("Emergency cut off!");

    await this.bluetooth.write(
      BleService.Write,
      BleWriteCharacteristic.HighPrio,
      // TODO should use HighPrio data type for this?
      [DataType.Normal, this.getSequenceNum(BleWriteCharacteristic.HighPrio), FeatureID, CmdClass.Piloting, PilotingCmd.Emergency, 0]
    ).catch(this.onBluetoothError);

    clearInterval(this.pingIntervalHandle);
  }

  public hover(): void {
    this.logger.debug("Hover");

    this.driveStepsRemaining = 0;
    this.speeds.yaw = 0;
    this.speeds.pitch = 0;
    this.speeds.roll = 0;
    this.speeds.altitude = 0;
  }

  public moveForwards(): void {
    this.startMovement("pitch", DEFAULT_SPEED);
  }

  public moveBackwards(): void {
    this.startMovement("pitch", -DEFAULT_SPEED);
  }

  public moveLeft(): void {
    this.startMovement("yaw", -DEFAULT_SPEED);
  }

  public moveRight(): void {
    this.startMovement("yaw", DEFAULT_SPEED);
  }

  private startMovement(property: keyof Movement, speed: number, steps: number = DEFAULT_DRIVE_STEPS): void {
    this.logger.debug(`Start movement of ${property} with speed ${speed} for ${steps} steps`);

    // cancel any previously running movement
    this.hover();

    this.speeds[property] = speed;
    this.driveStepsRemaining = steps;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}
