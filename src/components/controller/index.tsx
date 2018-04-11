import { h, Component } from "preact";
import Button from "preact-material-components/Button";

import { AppContext } from '../app';
import Device, { DeviceOrientation } from "../../device";
import Controller from "../../controller";
import Bluetooth from "../../bluetooth";
//import Bluetooth from "../../bluetooth-mock";
import MiniDrone, { Movement } from "../../mini-drone";
import Logger from "../../logger";

enum BluetoothStates {
  NotConnected = "Not connected",
  Connecting = "Connecting",
  Connected = "Connected",
  Error = "Error"
}

type BluetoothStatus =
  | BluetoothStates.NotConnected
  | BluetoothStates.Connecting
  | BluetoothStates.Connected
  | BluetoothStates.Error;

interface ControllerState {
  orientation: DeviceOrientation | null;
  movement: Movement | null;
  bluetoothStatus: BluetoothStatus;
  droneStatus: boolean;
  error?: string;
}

export default class Control extends Component<{}, ControllerState> {
  drone: MiniDrone;
  controller: Controller;
  bluetooth: Bluetooth;

  constructor() {
    super();
    this.state = {
      orientation: null,
      movement: null,
      bluetoothStatus: BluetoothStates.NotConnected,
      droneStatus: false
    };
  }

  componentDidMount() {
    this.bluetooth = new Bluetooth(Logger);
    this.drone = new MiniDrone(this.bluetooth, Logger);

    this.controller = new Controller(this.drone);
    this.controller.movement.subscribe(
      movement => {
        this.setState({ movement });
      },
      error => {
        this.setState({ error });
      }
    );

    Device.getOrientation().subscribe(
      orientation => {
        this.setState({ orientation });
      },
      error => {
        this.setState({ error });
      }
    );
  }

  connect() {
    this.setState({ bluetoothStatus: BluetoothStates.Connecting });
    this.drone.connect()
      .then(() => {
        this.setState({
          bluetoothStatus: BluetoothStates.Connected,
          droneStatus: true
        });
      })
      .catch(e => {
        Logger.error("Bluetooth connect failed: " + e);
        this.setState({
          bluetoothStatus: BluetoothStates.Error
        });
      });

    /*this.bluetooth.getNotifications().subscribe(([id, event]) => {
      console.log("ctrl.bluetooth.notification", id, event);
    });*/
  }

  render(props: {}, state: ControllerState, context: AppContext) {
    return (
      <div>
        {this.renderBluetoothControl()}
        {this.renderDroneControl()}
        {this.renderOrientation(context.debug)}
      </div>
    );
  }

  renderBluetoothControl() {
    const allowConnect =
      this.state.bluetoothStatus !== BluetoothStates.Connected &&
      this.state.bluetoothStatus !== BluetoothStates.Connecting;

    return (
      <div>
        <div>Bluetooth: {this.state.bluetoothStatus}</div>
        {allowConnect ? (
          <Button onClick={() => this.connect()}>Connect</Button>
        ) : null}
      </div>
    );
  }

  renderDroneControl() {
    if (!this.state.droneStatus) {
      return <div>Drone not connected</div>;
    }

    return (
      <div>
        <Button onClick={() => this.drone.takeOff()}>Takeoff</Button>
        <Button onClick={() => this.drone.land()}>Land</Button>
        <Button onClick={() => this.drone.emergencyCutOff()}>Emergency</Button>
        <div style={{ textAlign: "center" }}>
          <br />
          <br />
          <Button
            raised
            style={{ padding: "40px", lineHeight: "5px" }}
            onTouchStart={() => this.controller.startMovement()}
            onTouchEnd={() => this.controller.stopMovement()}
          >
            MOVE
          </Button>
        </div>
      </div>
    );
  }

  renderOrientation(debug: boolean) {
    if (this.state.error) {
      return <div>error: {this.state.error}</div>;
    }

    if (!this.state.orientation) {
      return <div>waiting</div>;
    }

    if (!debug) {
      return;
    }

    return (
      <div>
        <pre>{JSON.stringify(this.state.orientation, null, 2)}</pre>
{/*
          <h3>Center</h3>
          <pre>{JSON.stringify(this.controller.center, null, 2)}</pre>
*/}
          <h3>Diff</h3>
          <pre>{JSON.stringify(this.controller.diff, null, 2)}</pre>

        <h3>Movement</h3>
        <pre>{JSON.stringify(this.state.movement, null, 2)}</pre>
      </div>
    );
  }
}
