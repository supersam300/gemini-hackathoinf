export interface FileItem {
  name: string;
  type: "file" | "folder";
  children?: FileItem[];
  content?: string;
}

export const BLINK_CODE = `/*
  Blink
  Turns an LED on for one second, then off for one second, repeatedly.

  Most Arduinos have an on-board LED you can control. On the UNO, MEGA
  and ZERO it is attached to digital pin 13. LED_BUILTIN is set to
  the correct LED pin independent of which board is used.
*/

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);  // turn the LED on (HIGH is the voltage level)
  delay(1000);                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW);   // turn the LED off by making the voltage LOW
  delay(1000);                       // wait for a second
}`;

export const SERIAL_READ_CODE = `/*
  Serial Input Basics - Example 1
  Receiving a single character from the Serial Monitor.
*/

char receivedChar;
bool newData = false;

void setup() {
  Serial.begin(9600);
  Serial.println("<Arduino is ready>");
}

void loop() {
  recvOneChar();
  showNewData();
}

void recvOneChar() {
  if (Serial.available() > 0) {
    receivedChar = Serial.read();
    newData = true;
  }
}

void showNewData() {
  if (newData == true) {
    Serial.print("This just in ... ");
    Serial.println(receivedChar);
    newData = false;
  }
}`;

export const TEMPERATURE_CODE = `/*
  Temperature Sensor - Analog Reading
  Reads temperature from NTC thermistor on analog pin A0.
*/

#include <math.h>

const int THERMISTOR_PIN = A0;
const float BETA = 3950.0;    // Beta coefficient of the thermistor
const float R0 = 10000.0;     // Resistance at 25°C (nominal)
const float T0 = 298.15;      // 25°C in Kelvin

float readTemperatureC() {
  int rawValue = analogRead(THERMISTOR_PIN);
  float voltage = rawValue * (5.0 / 1023.0);
  float resistance = (5.0 - voltage) / voltage * R0;

  // Steinhart-Hart equation simplified
  float tempK = 1.0 / (log(resistance / R0) / BETA + 1.0 / T0);
  return tempK - 273.15; // Convert to Celsius
}

void setup() {
  Serial.begin(9600);
  Serial.println("Temperature Sensor Ready");
}

void loop() {
  float tempC = readTemperatureC();
  float tempF = tempC * 9.0 / 5.0 + 32.0;

  Serial.print("Temperature: ");
  Serial.print(tempC, 2);
  Serial.print(" °C / ");
  Serial.print(tempF, 2);
  Serial.println(" °F");

  delay(2000); // Read every 2 seconds
}`;

export const SERVO_CODE = `/*
  Servo Sweep
  Sweeps the shaft of a RC servo motor back and forth.
*/

#include <Servo.h>

Servo myservo;   // create servo object to control a servo
int pos = 0;     // variable to store the servo position

void setup() {
  myservo.attach(9);  // attaches the servo on pin 9 to the servo object
  Serial.begin(9600);
  Serial.println("Servo Sweep Started");
}

void loop() {
  // sweep from 0 to 180 degrees
  for (pos = 0; pos <= 180; pos += 1) {
    myservo.write(pos);
    delay(15);
  }
  // sweep from 180 to 0 degrees
  for (pos = 180; pos >= 0; pos -= 1) {
    myservo.write(pos);
    delay(15);
  }
}`;

export const SKETCH_FILES: FileItem[] = [
  {
    name: "MyProject",
    type: "folder",
    children: [
      { name: "Blink.ino", type: "file", content: BLINK_CODE },
      { name: "SerialInput.ino", type: "file", content: SERIAL_READ_CODE },
      { name: "TemperatureSensor.ino", type: "file", content: TEMPERATURE_CODE },
      { name: "Servo.ino", type: "file", content: SERVO_CODE },
    ],
  },
  {
    name: "Libraries",
    type: "folder",
    children: [
      { name: "Servo.h", type: "file" },
      { name: "Wire.h", type: "file" },
      { name: "SPI.h", type: "file" },
    ],
  },
];

export interface TabFile {
  name: string;
  content: string;
  modified: boolean;
}

export const BOARDS = [
  "Arduino Uno",
  "Arduino Nano",
  "Arduino Mega 2560",
  "Arduino Leonardo",
  "Arduino Due",
  "Arduino Zero",
  "Arduino Micro",
  "Arduino Pro Mini",
  "ESP32 Dev Module",
  "ESP8266 NodeMCU",
];

export const PORTS = [
  "COM1",
  "COM3",
  "COM5",
  "/dev/ttyUSB0",
  "/dev/ttyACM0",
  "/dev/cu.usbmodem1401",
];

export const LIBRARIES = [
  { name: "Servo", version: "1.1.8", installed: true, description: "Allows Arduino boards to control a variety of servo motors." },
  { name: "Wire", version: "1.0.0", installed: true, description: "I2C communication protocol library." },
  { name: "SPI", version: "1.0.0", installed: true, description: "SPI communication protocol library." },
  { name: "EEPROM", version: "2.0.0", installed: true, description: "Read and write to the EEPROM non-volatile storage." },
  { name: "SD", version: "1.2.4", installed: true, description: "Reading and writing to SD cards." },
  { name: "Adafruit NeoPixel", version: "1.11.0", installed: false, description: "Arduino library for controlling single-wire LED pixels." },
  { name: "DHT sensor library", version: "1.4.4", installed: false, description: "Library for DHT11, DHT22 temperature and humidity sensors." },
  { name: "Adafruit GFX Library", version: "1.11.9", installed: false, description: "Core graphics library for Adafruit all-in-one displays." },
  { name: "FastLED", version: "3.6.0", installed: false, description: "Library for easily programming LED strips and arrays." },
  { name: "PubSubClient", version: "2.8.0", installed: false, description: "A client library for MQTT messaging with Arduino." },
  { name: "IRremote", version: "4.2.1", installed: false, description: "Send and receive infrared signals with multiple protocols." },
  { name: "LiquidCrystal", version: "1.0.7", installed: true, description: "Allows control of LiquidCrystal displays (LCD)." },
];

export const BOARD_PACKAGES = [
  { name: "Arduino AVR Boards", version: "1.8.6", installed: true, boards: ["Uno", "Mega", "Nano", "Leonardo"] },
  { name: "Arduino SAM Boards (32-bits ARM Cortex-M3)", version: "1.6.12", installed: true, boards: ["Due"] },
  { name: "Arduino SAMD Boards", version: "1.8.13", installed: true, boards: ["Zero", "MKR WiFi 1010"] },
  { name: "esp32", version: "2.0.14", installed: false, boards: ["ESP32 Dev Module", "ESP32-S3"] },
  { name: "esp8266", version: "3.1.2", installed: false, boards: ["NodeMCU 1.0", "Wemos D1"] },
  { name: "Arduino nRF5 Boards", version: "1.0.2", installed: false, boards: ["Nano 33 BLE", "Nano 33 IoT"] },
];
