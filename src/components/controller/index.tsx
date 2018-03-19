import { h, Component } from "preact";

import Device, { DeviceOrientation } from "../../device";

interface ControllerState {
  orientation: DeviceOrientation | null;
}

export default class Controller extends Component<{}, ControllerState> {
  componentDidMount() {
    Device.getDeviceOrientation().subscribe(orientation => {
      this.setState({ orientation });
    });
  }
  render() {
    return (
      <div>
        <h2>Hello from ctrl</h2>
        {this.state.orientation ? (
          <div>
            <div>alpha: {this.state.orientation.alpha}</div>
            <div>beta: {this.state.orientation.beta}</div>
            <div>gamma: {this.state.orientation.gamma}</div>
          </div>
        ) : null}
      </div>
    );
  }
}
