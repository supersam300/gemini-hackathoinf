export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  extension?: string;
  children?: FileNode[];
  content?: string;
}

export const blinkCode = `/*
 * Arduino Blink Sketch
 * Blinks the onboard LED at a 1 second interval.
 * Board: Arduino Uno
 * Author: Arduino IDE
 */

#define LED_PIN     13
#define BLINK_DELAY 1000  // milliseconds

// Global state
bool ledState = false;

void setup() {
  // Initialize digital pin LED_PIN as an output
  pinMode(LED_PIN, OUTPUT);

  // Start serial communication
  Serial.begin(9600);
  Serial.println("=== Blink Sketch Initialized ===");
  Serial.print("LED Pin: ");
  Serial.println(LED_PIN);
}

void loop() {
  // Toggle the LED state
  ledState = !ledState;
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);

  // Print current state to Serial Monitor
  Serial.print("[");
  Serial.print(millis());
  Serial.print("ms] LED is ");
  Serial.println(ledState ? "ON" : "OFF");

  delay(BLINK_DELAY);
}
`;

export const sensorCode = `/*
 * DHT22 Temperature & Humidity Sensor
 * Reads temperature and humidity values every 2 seconds.
 */

#include <DHT.h>
#include <Wire.h>

#define DHT_PIN   2
#define DHT_TYPE  DHT22
#define ALERT_TEMP 30.0f

DHT dht(DHT_PIN, DHT_TYPE);

// Sensor readings
float temperature = 0.0f;
float humidity    = 0.0f;
int   readCount   = 0;

void printSensorData(float temp, float hum) {
  Serial.println("------------------------------");
  Serial.print("Read #");
  Serial.println(readCount);
  Serial.print("Temperature : ");
  Serial.print(temp, 2);
  Serial.println(" °C");
  Serial.print("Humidity    : ");
  Serial.print(hum, 2);
  Serial.println(" %");
  if (temp > ALERT_TEMP) {
    Serial.println("[ALERT] High temperature detected!");
  }
  Serial.println("------------------------------");
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  Wire.begin();
  Serial.println("DHT22 Sensor Ready.");
}

void loop() {
  readCount++;
  humidity    = dht.readHumidity();
  temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[ERROR] Failed to read from DHT sensor!");
    delay(2000);
    return;
  }

  printSensorData(temperature, humidity);
  delay(2000);
}
`;

export const motorCode = `/*
 * DC Motor Control with L298N Driver
 * Controls motor speed and direction via PWM.
 */

#include <Arduino.h>

// Motor A Pins
const int IN1 = 5;
const int IN2 = 6;
const int ENA = 9;  // PWM pin

// Motor B Pins
const int IN3 = 7;
const int IN4 = 8;
const int ENB = 10; // PWM pin

enum MotorDir { FORWARD, BACKWARD, STOP };

void setMotorA(MotorDir dir, uint8_t speed) {
  analogWrite(ENA, speed);
  switch (dir) {
    case FORWARD:
      digitalWrite(IN1, HIGH);
      digitalWrite(IN2, LOW);
      break;
    case BACKWARD:
      digitalWrite(IN1, LOW);
      digitalWrite(IN2, HIGH);
      break;
    case STOP:
    default:
      digitalWrite(IN1, LOW);
      digitalWrite(IN2, LOW);
      break;
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);
  Serial.println("Motor Controller Ready.");
}

void loop() {
  Serial.println("Moving FORWARD at 50% speed...");
  setMotorA(FORWARD, 128);
  delay(2000);

  Serial.println("Moving BACKWARD at 75% speed...");
  setMotorA(BACKWARD, 192);
  delay(2000);

  Serial.println("STOP");
  setMotorA(STOP, 0);
  delay(1000);
}
`;

export const fileTree: FileNode[] = [
  {
    id: "workspace",
    name: "WORKSPACE",
    type: "folder",
    children: [
      {
        id: "blink-project",
        name: "Blink",
        type: "folder",
        children: [
          { id: "blink-ino", name: "Blink.ino", type: "file", extension: "ino", content: blinkCode },
          { id: "blink-readme", name: "README.md", type: "file", extension: "md" },
        ],
      },
      {
        id: "sensor-project",
        name: "SensorHub",
        type: "folder",
        children: [
          { id: "sensor-ino", name: "SensorHub.ino", type: "file", extension: "ino", content: sensorCode },
          { id: "sensor-h", name: "config.h", type: "file", extension: "h" },
        ],
      },
      {
        id: "motor-project",
        name: "MotorControl",
        type: "folder",
        children: [
          { id: "motor-ino", name: "MotorControl.ino", type: "file", extension: "ino", content: motorCode },
          { id: "motor-util", name: "motor_utils.h", type: "file", extension: "h" },
          { id: "motor-pid", name: "pid.cpp", type: "file", extension: "cpp" },
        ],
      },
    ],
  },
  {
    id: "libraries",
    name: "LIBRARIES",
    type: "folder",
    children: [
      {
        id: "lib-dht", name: "DHT", type: "folder", children: [
          { id: "dht-h", name: "DHT.h", type: "file", extension: "h" },
          { id: "dht-cpp", name: "DHT.cpp", type: "file", extension: "cpp" },
        ]
      },
      {
        id: "lib-wire", name: "Wire", type: "folder", children: [
          { id: "wire-h", name: "Wire.h", type: "file", extension: "h" },
        ]
      },
      {
        id: "lib-servo", name: "Servo", type: "folder", children: [
          { id: "servo-h", name: "Servo.h", type: "file", extension: "h" },
        ]
      },
    ],
  },
];

export interface OpenTab {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
  extension: string;
}

export const serialMessages = [
  { time: "00:00:00.000", type: "info", text: "Serial port COM3 opened at 9600 baud" },
  { time: "00:00:00.012", type: "output", text: "=== Blink Sketch Initialized ===" },
  { time: "00:00:00.014", type: "output", text: "LED Pin: 13" },
  { time: "00:00:01.001", type: "output", text: "[1001ms] LED is ON" },
  { time: "00:00:02.003", type: "output", text: "[2003ms] LED is OFF" },
  { time: "00:00:03.005", type: "output", text: "[3005ms] LED is ON" },
  { time: "00:00:04.007", type: "output", text: "[4007ms] LED is OFF" },
  { time: "00:00:05.009", type: "output", text: "[5009ms] LED is ON" },
];

export const compilerOutput = [
  { type: "info", text: "Compiling sketch..." },
  { type: "info", text: "Using board: Arduino Uno (atmega328p)" },
  { type: "info", text: "avr-g++ -c -g -Os -w -std=gnu++11 -fpermissive -fno-exceptions..." },
  { type: "success", text: "Sketch uses 924 bytes (2%) of program storage space. Maximum is 32256 bytes." },
  { type: "success", text: "Global variables use 9 bytes (0%) of dynamic memory. Maximum is 2048 bytes." },
  { type: "success", text: "✓ Compilation successful." },
  { type: "info", text: "Uploading to board..." },
  { type: "success", text: "✓ Upload complete." },
];

export const boards = [
  "Arduino Uno",
  "Arduino Mega 2560",
  "Arduino Nano",
  "Arduino Leonardo",
  "Arduino Due",
  "Arduino Micro",
  "ESP32 Dev Module",
  "ESP8266 NodeMCU",
];

export const ports = [
  "COM3 (Arduino Uno)",
  "COM4",
  "COM5",
  "/dev/ttyUSB0",
  "/dev/ttyACM0",
];
