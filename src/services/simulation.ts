import {
  CPU,
  avrInstruction,
  AVRTimer,
  AVRIOPort,
  AVRUSART,
  AVRClock,
  AVRADC,
  portBConfig,
  portCConfig,
  portDConfig,
  adcConfig,
  timer0Config,

  timer1Config,
  timer2Config,
  usart0Config,
  clockConfig,
  AVRTWI,
  twiConfig,
  AVRSPI,
  spiConfig,
} from "avr8js";

/** Parse Intel HEX format into a flat byte array */
function parseHex(hex: string): Uint8Array {
  const data = new Uint8Array(262144); // 256KB for Mega support
  let highAddress = 0;
  for (const line of hex.split("\n")) {
    if (!line.startsWith(":") || line.length < 11) continue;
    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const type = parseInt(line.substring(7, 9), 16);
    if (type === 4) {
      highAddress = parseInt(line.substring(9, 13), 16) << 16;
      continue;
    }
    if (type !== 0) continue;
    const absAddress = highAddress + address;
    for (let i = 0; i < byteCount; i++) {
      if (absAddress + i < data.length) {
        data[absAddress + i] = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
      }
    }
  }
  return data;
}

export type PinChangeCallback = (port: string, pin: number, value: boolean) => void;
export type SerialCallback = (char: string) => void;
export type I2CWriteCallback = (addr: number, data: number[]) => void;

const CPU_FREQ = 16e6;

export class ArduinoSimulator {
  private cpu: CPU;
  // Peripherals register hooks on the CPU during construction.
  // We must keep references so they aren't garbage-collected.
  private clock: AVRClock;
  private portB: AVRIOPort;
  private portC: AVRIOPort;
  private portD: AVRIOPort;
  private usart: AVRUSART;
  private timer0: AVRTimer;
  private timer1: AVRTimer;
  private timer2: AVRTimer;
  private adc: AVRADC;
  private twi: AVRTWI;
  private spi: AVRSPI;
  private running = false;
  private animFrameId: number | null = null;

  onPinChange?: PinChangeCallback;
  onSerialOutput?: SerialCallback;
  onI2CWrite?: I2CWriteCallback;

  constructor() {
    this.cpu = new CPU(new Uint16Array(131072)); // 256KB flash = 128K words
    this.clock = new AVRClock(this.cpu, CPU_FREQ, clockConfig);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, CPU_FREQ);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.twi = new AVRTWI(this.cpu, twiConfig, CPU_FREQ);
    this.spi = new AVRSPI(this.cpu, spiConfig, CPU_FREQ);

    let twiBuffer: number[] = [];
    let twiAddr = 0;
    let twiWrite = true;

    this.twi.eventHandler = {
      start: (repeated: boolean) => {
        twiBuffer = [];
        this.twi.completeStart();
      },
      stop: () => {
        if (twiWrite && twiBuffer.length > 0) {
           this.onI2CWrite?.(twiAddr, twiBuffer);
        }
        this.twi.completeStop();
      },
      connectToSlave: (addr: number, write: boolean) => {
        twiAddr = addr;
        twiWrite = write;
        twiBuffer = [];
        this.twi.completeConnect(true);
      },
      writeByte: (value: number) => {
        twiBuffer.push(value);
        this.twi.completeWrite(true);
      },
      readByte: (ack: boolean) => {
        this.twi.completeRead(0x00);
      }
    };

    this.usart.onByteTransmit = (byte: number) => {
      this.onSerialOutput?.(String.fromCharCode(byte));
    };

    this.portB.addListener(() => {
      for (let i = 0; i < 8; i++) {
        this.onPinChange?.("B", i, this.portB.pinState(i) === 1);
      }
    });

    this.portC.addListener(() => {
      for (let i = 0; i < 8; i++) {
        this.onPinChange?.("C", i, this.portC.pinState(i) === 1);
      }
    });

    this.portD.addListener(() => {
      for (let i = 0; i < 8; i++) {
        this.onPinChange?.("D", i, this.portD.pinState(i) === 1);
      }
      this.checkVirtualSensors();
    });
  }

  private checkVirtualSensors() {
    // This is a simplified placeholder for sensor-specific logic.
    // In a real implementation, we would hook specific pins.
  }

  loadHex(hex: string) {
    const progBytes = parseHex(hex);
    const progWords = new Uint16Array(progBytes.buffer);
    this.cpu.progMem.set(progWords);
    this.cpu.reset();
  }

  setPin(port: string, pin: number, high: boolean) {
    const p =
      port === "B" ? this.portB : port === "C" ? this.portC : this.portD;
    p.setPin(pin, high);
  }

  setAnalogPin(channel: number, value: number) {
    this.adc.channelValues[channel] = value;
  }

  /** Set sensor-specific values (e.g., distance for ultrasonic, temp for DHT) */
  setSensorValue(type: string, value: any) {
    // Logic for updating internal virtual sensor state
    // For now, we can store these in a map if we implement complex sensor models
  }


  start() {
    this.running = true;
    // Execute ~16M/60 = ~266K cycles per frame at 60fps
    const cyclesPerFrame = CPU_FREQ / 60;

    const runFrame = () => {
      if (!this.running) return;
      const targetCycles = this.cpu.cycles + cyclesPerFrame;
      while (this.cpu.cycles < targetCycles) {
        avrInstruction(this.cpu);
        this.cpu.tick();
      }
      this.animFrameId = requestAnimationFrame(runFrame);
    };
    this.animFrameId = requestAnimationFrame(runFrame);
  }

  stop() {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  reset() {
    this.stop();
    this.cpu.reset();
  }

  get isRunning() {
    return this.running;
  }
}
