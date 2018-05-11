import MiniDrone from "./mini-drone";
import Logger from "./logger";

type VoiceCommand = { keyword: string, command: (drone: MiniDrone) => void };

const voiceCommands: { [key: string]: Array<VoiceCommand>} = {
  "en-US": [
    { keyword: "take off", command: drone => drone.takeOff() },
    { keyword: "land", command: drone => drone.land() },
    { keyword: "up|higher", command: drone => drone.moveUp() },
    { keyword: "down|lower", command: drone => drone.moveDown() },
    { keyword: "forward", command: drone => drone.moveForwards() },
    { keyword: "backward", command: drone => drone.moveBackwards() },
    { keyword: "turn left", command: drone => drone.turn(-90) },
    { keyword: "turn right", command: drone => drone.turn(90) },
    { keyword: "turn around", command: drone => drone.turn(180) },
    { keyword: "spin", command: drone => drone.turn(359) },
    { keyword: "left", command: drone => drone.moveLeft() },
    { keyword: "right", command: drone => drone.moveRight() },
    { keyword: "backflip", command: drone => drone.flip(1) },
    { keyword: "flip", command: drone => drone.flip() },
  ],
  "fi-FI": [
    { keyword: "lentoon", command: drone => drone.takeOff() },
    { keyword: "laskeudu", command: drone => drone.land() },
    { keyword: "ylös|ylemmäs|korkeammalle", command: drone => drone.moveUp() },
    { keyword: "alas|alemmas", command: drone => drone.moveDown() },
    { keyword: "käänny vasemmalle", command: drone => drone.turn(-90) },
    { keyword: "käänny oikealle", command: drone => drone.turn(90) },
    { keyword: "käänny ympäri", command: drone => drone.turn(180) },
    { keyword: "pyörähdä", command: drone => drone.turn(359) },
    { keyword: "vasemmalle", command: drone => drone.moveLeft() },
    { keyword: "oikealle", command: drone => drone.moveRight() },
    { keyword: "eteenpäin", command: drone => drone.moveForwards() },
    { keyword: "taaksepäin", command: drone => drone.moveBackwards() },
    { keyword: "takaperin ?voltti", command: drone => drone.flip(1) },
    { keyword: "voltti", command: drone => drone.flip() },
  ]
};

export default class SpeechController {
  private recognition: SpeechRecognition;
  private listening = false;
  private commands: VoiceCommand[];

  //private language = "fi-FI";
  private language = "en-US";

  constructor(private drone: MiniDrone) {
    if (!("webkitSpeechRecognition" in window)) {
      return;
    }

    this.recognition = new (window as any).webkitSpeechRecognition();
    this.recognition.onstart = this.onstart;
    this.recognition.onresult = this.onresult;
    this.recognition.onerror = this.onerror;
    this.recognition.onend = this.onend;
    this.recognition.lang = this.language;

    this.commands = voiceCommands[this.language];
  }

  private onstart = () => {
    Logger.debug("webkitSpeechRecognition::onstart");
  };

  private onresult = (event: SpeechRecognitionEvent) => {
    Logger.debug("webkitSpeechRecognition::onresult", event);

    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        this.mapTranslationToCommand(event.results[i][0].transcript.toLowerCase());
      }
    }
  };

  private onerror = (event: SpeechRecognitionError) => {
    Logger.debug("webkitSpeechRecognition::onerror", event);
  };

  private onend = () => {
    Logger.debug("webkitSpeechRecognition::onend", this.listening);

    if (this.listening) {
      // autostart if listening enabled (mobile Chrome only listens for few seconds)
      this.recognition.start();
    }
  };

  public toggleListening(): void {
    if (this.listening) {
      return this.stopListening();
    }

    this.startListening();
  }

  public startListening(): void {
    if (!this.recognition) {
      throw "Not supported";
    }

    this.recognition.start();
    this.listening = true;
  }

  public stopListening(): void {
    if (!this.recognition) {
      throw "Not supported";
    }

    this.listening = false;
    this.recognition.stop();
  }

  private mapTranslationToCommand = (text: string) => {
    Logger.debug("mapTranslationToCommand", text);

    for (let command of this.commands) {
      // match voice command keywords from provided text
      const pattern = new RegExp(
        '(^|\\s)' + // beginning or whitespace
        // keyword or multiple keywords separated by pipe
        '(' + command.keyword + ')' +
        '(\\s|$)', // ending or whitespace
        'g'
      );

      if (text.match(pattern)) {
        Logger.debug("command", text, command);

        return command.command(this.drone);
      }
    }
  };
}
