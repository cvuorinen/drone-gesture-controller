import { Observable, Subject } from "rxjs";

export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
}

let debug = false;
const messages = new Subject<string>();

class ObservableLogger implements Logger {
  setDebug(value: boolean) {
    debug = value;
  }
  get messages(): Observable<string> {
    return messages.asObservable();
  }
  write(level: string, ...values: any[]): void {
    // log to regular console
    (window as any)["console"][level](...values);

    if (!debug && level === 'debug') {
      return;
    }

    // publish messages as observable (to display them in DOM etc.)
    // (useful for debugging in mobile when dev tools not easily available)
    try {
      messages.next(
        level + ": " + values.map(JSON.stringify as any).join(" ") + "\n"
      );
    } catch (e) {} // catch possible JSON.stringify errors
  }

  // compatibility with window.console
  log = (message?: any, ...optionalParams: any[]): void => this.write("log", message, ...optionalParams)
  debug = (message?: any, ...optionalParams: any[]): void => this.write("debug", message, ...optionalParams)
  info = (message?: any, ...optionalParams: any[]): void => this.write("info", message, ...optionalParams)
  warn = (message?: any, ...optionalParams: any[]): void => this.write("warn", message, ...optionalParams)
  error = (message?: any, ...optionalParams: any[]): void => this.write("error", message, ...optionalParams)
};

export default new ObservableLogger();
