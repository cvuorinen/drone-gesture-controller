import { h, Component } from "preact";

import Header from "./header";
import Controller from "./controller";
import Logger from '../logger';

interface AppState {
  debug: boolean;
}

export type AppContext = AppState;

export default class App extends Component<{}, AppState> {
  state = {
    debug: false
  };
  toggleDebug = () => {
    this.setState({
      debug: !this.state.debug
    }, () => {
      Logger.setDebug(this.state.debug);
    });
  };
  getChildContext(): AppContext {
    return this.state;
  }
  render() {
    return (
      <div id="app">
        <Header onToggleDebug={this.toggleDebug} />
        <div class="content">
          <Controller />
        </div>
      </div>
    );
  }
}
