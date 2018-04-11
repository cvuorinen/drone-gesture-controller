import { Observable, Subject } from "rxjs";

const messages = new Subject<string>();

const Logger = {
  get messages(): Observable<string> {
    return messages.asObservable();
  },
  write(level: string, ...values: any[]): void {
    // log to regular console (comment out or filter by level when not want to log all, e.g. in prod)
    (window as any)["console"][level](...values);

    // publish messages as observable (to display them in DOM etc.)
    // (useful for debugging in mobile when dev tools not easily available)
    try {
      messages.next(
        level + ": " + values.map(JSON.stringify as any).join(" ") + "\n"
      );
    } catch (e) {} // catch possible JSON.stringify errors
  },

  // compatibility with window.console
  log: (message?: any, ...optionalParams: any[]): void => Logger.write("log", message, ...optionalParams),
  debug: (message?: any, ...optionalParams: any[]): void => Logger.write("debug", message, ...optionalParams),
  info: (message?: any, ...optionalParams: any[]): void => Logger.write("info", message, ...optionalParams),
  warn: (message?: any, ...optionalParams: any[]): void => Logger.write("warn", message, ...optionalParams),
  error: (message?: any, ...optionalParams: any[]): void => Logger.write("error", message, ...optionalParams)
};

export default Logger;
