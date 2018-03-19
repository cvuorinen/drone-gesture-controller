import { h, Component } from "preact";

interface ControllerState {
  darkThemeEnabled: boolean;
}

export default class Controller extends Component<{}, ControllerState> {
  render() {
    return <div>Hello from ctrl</div>;
  }
}
