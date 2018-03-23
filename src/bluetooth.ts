import { Observable, Subject } from "rxjs";

import Logger from "./logger";

type CharacteristicValueEvent = any;
export type Notification = [string, CharacteristicValueEvent];

// Web Bluetooth API class used to connect to the drone
// adapted from https://github.com/poshaughnessy/web-bluetooth-parrot-drone/blob/master/js/drone.js
export default class Bluetooth {
  private connected = false;
  private device: any;
  private gattServer: any;

  private services: { [index: string]: any } = {};
  private characteristics: { [index: string]: any } = {};

  private notifications = new Subject<Notification>();

  getNotifications(): Observable<Notification> {
    return this.notifications.asObservable();
  }

  connect(discoveryOptions: any): Promise<any> {
    if (this.connected) {
      Logger.debug("Already connected");
      return Promise.resolve();
    }

    Logger.debug("Connect");

    return this.discover(discoveryOptions).then(() => this.connectGATT());
  }

  private discover(discoveryOptions: any): Promise<any> {
    const bluetooth = (navigator as any).bluetooth;

    if (!bluetooth) {
      return Promise.reject("Bluetooth not supported");
    }

    Logger.debug("Searching for drone...");

    return bluetooth.requestDevice(discoveryOptions).then((device: any) => {
      Logger.debug("Discovered drone", device);
      this.device = device;
    });
  }

  // TODO change to private if not needed during handshake
  // & refactor to this side if needed for every write
  public connectGATT(): Promise<any> {
    Logger.debug("Connect GATT");

    return this.device.gatt.connect().then((server: any) => {
      Logger.debug("GATT server", server, this.gattServer === server);
      if (!this.gattServer) {
        this.gattServer = server;
      }
    });
  }

  // TODO return as observable?
  public startNotificationsForCharacteristic(
    serviceID: string,
    characteristicID: string
  ): Promise<any> {
    Logger.debug("Start notifications for", characteristicID);

    return new Promise((resolve, reject) => {
      return this.getCharacteristic(serviceID, characteristicID)
        .then(characteristic => {
          Logger.debug(
            "Got characteristic, now start notifications",
            characteristicID,
            characteristic
          );
          characteristic.startNotifications().then(() => {
            Logger.debug("Started notifications for", characteristicID);

            characteristic.addEventListener(
              "characteristicvaluechanged",
              (event: CharacteristicValueEvent) => {
                const array = new Uint8Array(event.target.value.buffer);

                let a = [];
                for (let i = 0; i < array.byteLength; i++) {
                  a.push("0x" + ("00" + array[i].toString(16)).slice(-2));
                }

                Logger.debug(
                  "Notification from " + characteristicID + ": " + a.join(" ")
                );

                this.notifications.next([characteristicID, event]);
              }
            );

            resolve();
          });
        })
        .catch(error => {
          Logger.error("startNotifications error", error);
          reject();
        });
    });
  }

  public writeTo(
    serviceID: string,
    characteristicID: string,
    commandArray: any
  ): Promise<any> {
    return this.getCharacteristic(serviceID, characteristicID).then(
      characteristic => {
        Logger.debug("Got characteristic, now write");
        return this.writeCommand(characteristic, commandArray).then(() => {
          Logger.debug("Written command");
        });
      }
    );
  }

  private getCharacteristic(
    serviceID: string,
    characteristicID: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const char = this.characteristics[characteristicID];

      // If we already have it cached...
      if (char) {
        Logger.debug("Return cached characteristic", char);
        resolve(char);
      } else {
        this.getService(serviceID)
          .then(service => {
            return service.getCharacteristic(getUUID(characteristicID));
          })
          .then(characteristic => {
            this.characteristics[characteristicID] = characteristic;
            Logger.debug("Obtained characteristic", characteristic);
            resolve(characteristic);
          })
          .catch(error => {
            Logger.error("getCharacteristic error", error);
            reject(error);
          });
      }
    });
  }

  private getService(serviceID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const service = this.services[serviceID];

      // If we already have it cached...
      if (service) {
        Logger.debug("Return cached service", service);
        resolve(service);
      } else {
        Logger.debug("Get service", getUUID(serviceID));

        return this.gattServer
          .getPrimaryService(getUUID(serviceID))
          .then((service: any) => {
            Logger.debug("Obtained service", service);
            this.services[serviceID] = service;
            resolve(service);
          })
          .catch((error: any) => {
            Logger.error("getService error", error);
            reject(error);
          });
      }
    });
  }

  private writeCommand(characteristic: any, commandArray: any): Promise<any> {
    var buffer = new ArrayBuffer(commandArray.length);
    var command = new Uint8Array(buffer);
    command.set(commandArray);

    Logger.debug("Write command", command);

    return characteristic.writeValue(command);
  }
}

// TODO remove from here and convert in drone side
function getUUID(uniqueSegment: string) {
  return "9a66" + uniqueSegment + "-0800-9191-11e4-012d1540cb8e";
}
