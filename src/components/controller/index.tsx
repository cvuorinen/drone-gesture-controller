import { h, Component } from "preact";
import Button from "preact-material-components/Button";

import Device, { DeviceOrientation } from "../../device";
import Controller, { Movement } from "../../controller";

interface ControllerState {
  orientation: DeviceOrientation | null;
  movement: Movement | null;
  error: string | null;
}

export default class Control extends Component<{}, ControllerState> {
  controller: Controller;

  componentDidMount() {
    this.controller = new Controller();
    this.controller.getMovement().subscribe(
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

  render() {
    if (this.state.error) {
      return <div>error: {this.state.error}</div>;
    }

    if (!this.state.orientation) {
      return <div>waiting</div>;
    }

    const center = this.controller.center;
    const diff = this.controller.diff;

    return (
      <div>
        <h2>Hello from ctrl</h2>
        <Button
          style={{ float: "right" }}
          onClick={() =>
            this.controller.calibrateOrientation(this.state
              .orientation as DeviceOrientation)
          }
        >
          Calibrate
        </Button>
        <div>
          <pre>{JSON.stringify(this.state.orientation, null, 2)}</pre>

          <h3>Center</h3>
          <pre>{JSON.stringify(center, null, 2)}</pre>

          <h3>Diff</h3>
          <pre>{JSON.stringify(diff, null, 2)}</pre>

          <h3>Movement</h3>
          <pre>{JSON.stringify(this.state.movement, null, 2)}</pre>
        </div>
      </div>
    );
  }
}
