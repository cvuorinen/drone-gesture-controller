import { Observable, interval } from "rxjs";
import { map } from "rxjs/operators";

import { Bluetooth, Logger } from "./bluetooth";

interface CharacteristicValueEventTarget extends EventTarget {
  value: {
    buffer: ArrayBuffer | ArrayLike<number>
  }
}
interface CharacteristicValueEvent extends Event {
  target: CharacteristicValueEventTarget
}

//type CharacteristicValueEvent = any;
export type BluetoothNotification = [BluetoothCharacteristicUUID, CharacteristicValueEvent];

// Web Bluetooth API class used to connect to the drone
// adapted from https://github.com/poshaughnessy/web-bluetooth-parrot-drone/blob/master/js/drone.js
export default class MockBluetooth implements Bluetooth {
  private connected = false;
  private device: BluetoothDevice;
  //private gattServer: BluetoothRemoteGATTServer;

  private services: { [index: string]: BluetoothRemoteGATTService } = {};
  private characteristics: { [index: string]: BluetoothRemoteGATTCharacteristic } = {};

  //private notifications = new Subject<BluetoothNotification>();

  /*getNotifications(): Observable<BluetoothNotification> {
    return this.notifications.asObservable();
  }*/

  constructor(
    private logger: Logger = window.console
  ) {}

  public async connect(discoveryOptions: RequestDeviceOptions): Promise<void> {
    if (this.connected) {
      this.logger.debug("Already connected");

      return;
    }

    this.logger.debug("Connect");

    await this.discover(discoveryOptions);

    await this.connectGATT();

    this.connected = true;
  }

  private async discover(discoveryOptions: RequestDeviceOptions): Promise<void> {
    /*const bluetooth = navigator.bluetooth;

    if (!bluetooth) {
      throw "Bluetooth not supported";
    }*/

    this.logger.debug("Searching for drone...");

    //this.device = await bluetooth.requestDevice(discoveryOptions);

    this.logger.debug("Discovered drone", this.device);

    return Promise.resolve();
  }

  // TODO change to private if not needed during handshake
  // & refactor to this side if needed for every write
  private async connectGATT(): Promise<void> {
    /*if (!this.device || !this.device.gatt) {
      this.logger.error("Invalid device, no GATT found");
      throw "Invalid Bluetooth device";
    }*/

    this.logger.debug("Connect GATT");

    /*const server = await this.device.gatt.connect();

    this.logger.debug("GATT server", server, this.gattServer === server);

    if (!this.gattServer) {
      this.gattServer = server;
    }*/
  }

  public async startNotifications(
    serviceID: BluetoothServiceUUID,
    characteristicID: BluetoothCharacteristicUUID
  ): Promise<Observable<CharacteristicValueEvent>> {
    const characteristic = await this.getCharacteristic(serviceID, characteristicID);

    this.logger.debug("Got characteristic, now start notifications", characteristicID, characteristic);

    try {
      //await characteristic.startNotifications();

      this.logger.debug("Started notifications for", characteristicID);
    } catch (error) {
      this.logger.error("startNotifications error", error);
      throw error;
    }

    //return fromEvent<CharacteristicValueEvent>(characteristic, "characteristicvaluechanged");
    return interval(10000)
      .pipe(
        map(value => ({ target: { value: { buffer: new ArrayBuffer(8) } } } as CharacteristicValueEvent)),
      );
  }

  public async write(
    serviceID: BluetoothServiceUUID,
    characteristicID: BluetoothCharacteristicUUID,
    command: Array<number>
  ): Promise<void> {
    //await this.connectGATT();

    const characteristic = await this.getCharacteristic(serviceID, characteristicID);

    this.logger.debug("Got characteristic, now write");

    await this.writeCommand(characteristic, command);

    this.logger.debug("Written command");
  }

  private async getCharacteristic(
    serviceID: BluetoothServiceUUID,
    characteristicID: BluetoothCharacteristicUUID
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    if (this.characteristics[characteristicID]) {
      this.logger.debug("Return cached characteristic", this.characteristics[characteristicID]);

      return this.characteristics[characteristicID];
    }

    try {
      const service = await this.getService(serviceID);

      //this.characteristics[characteristicID] = await service.getCharacteristic(characteristicID);

      this.logger.debug("Obtained characteristic", this.characteristics[characteristicID], service);
    } catch (error) {
      this.logger.error("getCharacteristic error", error);
      throw error;
    }

    //return this.characteristics[characteristicID];
    return Promise.resolve({} as any);
  }

  private async getService(serviceID: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService> {
    if (this.services[serviceID]) {
      this.logger.debug("Return cached service", this.services[serviceID]);
      return this.services[serviceID];
    }

    this.logger.debug("Get service", serviceID);
    try {
      //this.services[serviceID] = await this.gattServer.getPrimaryService(serviceID);
      this.logger.debug("Obtained service", this.services[serviceID]);
    } catch (error) {
      this.logger.error("getService error", error);
      throw error;
    }

    //return this.services[serviceID];
    return Promise.resolve({} as any);
  }

  private writeCommand(
    characteristic: BluetoothRemoteGATTCharacteristic,
    commandArray: Array<number>
  ): Promise<void> {
    const buffer = new ArrayBuffer(commandArray.length);
    const command = new Uint8Array(buffer);
    command.set(commandArray);

    this.logger.debug("Write command", command);

    //return characteristic.writeValue(command);
    return Promise.resolve();
  }
}
