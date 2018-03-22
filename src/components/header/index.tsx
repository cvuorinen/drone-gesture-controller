import { h, Component } from "preact";
import Toolbar from "preact-material-components/Toolbar";
import Dialog from "preact-material-components/Dialog";
import Switch from "preact-material-components/Switch";
import "preact-material-components/Switch/style.css";
import "preact-material-components/Dialog/style.css";
import "preact-material-components/List/style.css";
import "preact-material-components/Toolbar/style.css";
import "preact-material-components/Button/style.css";

import Logger from "../../logger";

interface HeaderState {
  darkThemeEnabled: boolean;
  log: string[];
}

export default class Header extends Component<{}, HeaderState> {
  dialog: any;

  constructor() {
    super();
    this.state = {
      darkThemeEnabled: false,
      log: []
    };
  }

  openSettings = () => this.dialog.MDComponent.show();

  dialogRef = (dialog: any) => (this.dialog = dialog);

  toggleDarkTheme = () => {
    this.setState(
      {
        darkThemeEnabled: !this.state.darkThemeEnabled
      },
      () => {
        if (this.state.darkThemeEnabled) {
          document.body.classList.add("mdc-theme--dark");
        } else {
          document.body.classList.remove("mdc-theme--dark");
        }
      }
    );
  };

  componentDidMount() {
    Logger.messages.subscribe(message => {
      this.state.log.push(message);
      this.setState({
        log: this.state.log
      });
    });
  }

  render() {
    return (
      <div>
        <Toolbar className="toolbar">
          <Toolbar.Row>
            <Toolbar.Section align-start>
              <Toolbar.Title>&#10058; DroneCtrl</Toolbar.Title>
            </Toolbar.Section>
            <Toolbar.Section align-end>
              <Toolbar.Icon onClick={this.openSettings}>settings</Toolbar.Icon>
            </Toolbar.Section>
          </Toolbar.Row>
        </Toolbar>
        <Dialog ref={this.dialogRef}>
          <Dialog.Header>Settings</Dialog.Header>
          <Dialog.Body>
            <div>
              Enable dark theme <Switch onClick={this.toggleDarkTheme} />
            </div>
            <div class="log-output">
              <textarea>{this.state.log.join("")}</textarea>
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.FooterButton accept>okay</Dialog.FooterButton>
          </Dialog.Footer>
        </Dialog>
      </div>
    );
  }
}
