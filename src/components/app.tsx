import { h, Component } from "preact";

import Header from "./header";
import Controller from "./controller";

export default class App extends Component<{}, {}> {
  render() {
    return (
      <div id="app">
        <Header />
        <div class="content">
          <Controller />
        </div>
      </div>
    );
  }
}
