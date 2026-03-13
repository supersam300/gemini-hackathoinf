import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, Zap, Cpu, Radio, Battery, Settings2, Star } from 'lucide-react';

const FAVORITES_STORAGE_KEY = 'simuide-favorites';

interface ComponentItem {
  id: string;
  label: string;
  sublabel: string;
  color: string;
}

interface ComponentCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  items: ComponentItem[];
}

const categories: ComponentCategory[] = [
  {
    id: 'basic',
    label: 'BASIC',
    icon: <Zap size={12} />,
    accent: '#c0392b',
    items: [
      { id: 'resistor', label: 'Resistor', sublabel: '220 Ω', color: '#b85c00' },
      { id: 'led', label: 'LED Red', sublabel: '5mm', color: '#c62828' },
      { id: 'led-green', label: 'LED Green', sublabel: '5mm', color: '#2e7d32' },
      { id: 'led-blue', label: 'LED Blue', sublabel: '5mm', color: '#1565c0' },
      { id: 'led-yellow', label: 'LED Yellow', sublabel: '5mm', color: '#f9a825' },
      { id: 'rgb-led', label: 'RGB LED', sublabel: 'Common Cathode', color: '#8e24aa' },
      { id: 'neopixel', label: 'NeoPixel', sublabel: 'WS2812B', color: '#e040fb' },
      { id: 'pushbutton', label: 'Push Button', sublabel: 'Momentary', color: '#333' },
      { id: 'slide-switch', label: 'Slide Switch', sublabel: 'SPDT', color: '#555' },
      { id: 'potentiometer', label: 'Potentiometer', sublabel: '10 kΩ', color: '#5a3e00' },
      { id: 'buzzer', label: 'Buzzer', sublabel: 'Active, 5V', color: '#333' },
      { id: 'relay', label: 'Relay', sublabel: '5V SPDT', color: '#555' },
      { id: 'capacitor', label: 'Capacitor', sublabel: '100 nF', color: '#1565c0' },
      { id: 'breadboard', label: 'Breadboard', sublabel: 'Full Size', color: '#e8d5b7' },
      { id: 'breadboard-half', label: 'Breadboard Half', sublabel: 'Half Size', color: '#e8d5b7' },
      { id: 'battery', label: '9V Battery', sublabel: 'Power Source', color: '#333' },
    ],
  },
  {
    id: 'ics',
    label: 'ICs / MCUs',
    icon: <Cpu size={12} />,
    accent: '#1565c0',
    items: [
      { id: 'arduino-uno', label: 'Arduino Uno', sublabel: 'ATmega328P', color: '#1a6b45' },
      { id: 'arduino-nano', label: 'Arduino Nano', sublabel: 'ATmega328P', color: '#1a6b45' },
      { id: 'arduino-mega', label: 'Arduino Mega', sublabel: 'ATmega2560', color: '#1a6b45' },
      { id: 'esp32', label: 'ESP32', sublabel: 'DevKit V1', color: '#333' },
    ],
  },
  {
    id: 'display',
    label: 'DISPLAY',
    icon: <Zap size={12} />,
    accent: '#e65100',
    items: [
      { id: '7seg', label: '7-Segment', sublabel: 'Common Cathode', color: '#c62828' },
      { id: 'lcd-16x2', label: 'LCD 16×2', sublabel: 'HD44780', color: '#1a5c5e' },
      { id: 'lcd-20x4', label: 'LCD 20×4', sublabel: 'HD44780', color: '#1a5c5e' },
      { id: 'ssd1306', label: 'OLED SSD1306', sublabel: '128×64 I2C', color: '#333' },
      { id: 'neopixel-matrix', label: 'NeoPixel Matrix', sublabel: '8×8 WS2812', color: '#e040fb' },
      { id: 'led-bar-graph', label: 'LED Bar Graph', sublabel: '10 segment', color: '#2e7d32' },
    ],
  },
  {
    id: 'sensors',
    label: 'SENSORS',
    icon: <Radio size={12} />,
    accent: '#00796b',
    items: [
      { id: 'hcsr04', label: 'Ultrasonic', sublabel: 'HC-SR04', color: '#00796b' },
      { id: 'dht22', label: 'Temp / Humidity', sublabel: 'DHT22', color: '#00796b' },
      { id: 'pir', label: 'PIR Motion', sublabel: 'HC-SR501', color: '#555' },
      { id: 'ir-recv', label: 'IR Receiver', sublabel: 'TSOP38238', color: '#333' },
      { id: 'ir-remote', label: 'IR Remote', sublabel: '21-key', color: '#333' },
      { id: 'ntc-sensor', label: 'NTC Temp Sensor', sublabel: 'Thermistor', color: '#b85c00' },
      { id: 'flame-sensor', label: 'Flame Sensor', sublabel: 'IR', color: '#c62828' },
      { id: 'gas-sensor', label: 'Gas Sensor', sublabel: 'MQ-2', color: '#555' },
      { id: 'photoresistor-sensor', label: 'Photoresistor', sublabel: 'LDR Module', color: '#b85c00' },
      { id: 'sound-sensor', label: 'Sound Sensor', sublabel: 'Analog', color: '#555' },
      { id: 'mpu6050', label: 'MPU6050', sublabel: 'Accel / Gyro', color: '#1565c0' },
    ],
  },
  {
    id: 'actuators',
    label: 'ACTUATORS',
    icon: <Settings2 size={12} />,
    accent: '#4527a0',
    items: [
      { id: 'servo', label: 'Servo Motor', sublabel: 'SG90 (180°)', color: '#1565c0' },
      { id: 'stepper-motor', label: 'Stepper Motor', sublabel: 'NEMA 17', color: '#555' },
      { id: 'analog-joystick', label: 'Analog Joystick', sublabel: 'XY + Button', color: '#00796b' },
      { id: 'rotary-encoder', label: 'Rotary Encoder', sublabel: 'KY-040', color: '#555' },
      { id: 'membrane-keypad', label: 'Membrane Keypad', sublabel: '4×4', color: '#333' },
      { id: 'dip-switch-8', label: 'DIP Switch (8)', sublabel: '8-position', color: '#555' },
    ],
  },
  {
    id: 'modules',
    label: 'MODULES',
    icon: <Cpu size={12} />,
    accent: '#f57f17',
    items: [
      { id: 'ds1307', label: 'RTC DS1307', sublabel: 'Real-Time Clock', color: '#555' },
      { id: 'hx711', label: 'HX711', sublabel: 'Load Cell Amp', color: '#555' },
      { id: 'microsd', label: 'MicroSD Card', sublabel: 'SPI', color: '#333' },
    ],
  },
];

// Small SVG component symbols for the panel
function ComponentIcon({ type }: { type: string }) {
  // Color-dot shorthand for LEDs
  const ledColors: Record<string, string> = {
    'led': '#c62828', 'led-green': '#2e7d32', 'led-blue': '#1565c0', 'led-yellow': '#f9a825',
  };
  if (ledColors[type]) {
    return (
      <svg width="38" height="18" viewBox="0 0 38 18">
        <line x1="0" y1="9" x2="12" y2="9" stroke="#555" strokeWidth="1.5" />
        <polygon points="12,3 12,15 24,9" fill={ledColors[type]} opacity="0.8" />
        <line x1="24" y1="3" x2="24" y2="15" stroke={ledColors[type]} strokeWidth="2" />
        <line x1="24" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1.5" />
        <line x1="26" y1="4" x2="30" y2="1" stroke={ledColors[type]} strokeWidth="1" />
        <line x1="29" y1="7" x2="33" y2="4" stroke={ledColors[type]} strokeWidth="1" />
      </svg>
    );
  }

  // Board-style icons
  if (['arduino-uno','arduino-nano','arduino-mega','esp32'].includes(type)) {
    const labels: Record<string,string> = { 'arduino-uno':'Uno', 'arduino-nano':'Nano', 'arduino-mega':'Mega', 'esp32':'ESP32' };
    return (
      <svg width="38" height="18" viewBox="0 0 38 18">
        <rect x="2" y="2" width="34" height="14" fill="#1a6b45" rx="1" />
        <rect x="6" y="5" width="26" height="8" fill="#1a8040" rx="0.5" />
        <text x="19" y="12" textAnchor="middle" fontSize="5" fill="white">{labels[type] || type}</text>
      </svg>
    );
  }

  switch (type) {
    case 'resistor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <line x1="0" y1="9" x2="9" y2="9" stroke="#555" strokeWidth="1.5" />
          <rect x="9" y="4" width="20" height="10" rx="2" fill="#d2b48c" stroke="#8b7355" strokeWidth="1" />
          <rect x="12" y="4" width="2.5" height="10" fill="#c62828" />
          <rect x="16" y="4" width="2.5" height="10" fill="#8e24aa" />
          <rect x="20" y="4" width="2.5" height="10" fill="#333" />
          <rect x="25" y="4" width="1.5" height="10" fill="#c8a415" />
          <line x1="29" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1.5" />
        </svg>
      );
    case 'capacitor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <line x1="0" y1="9" x2="15" y2="9" stroke="#555" strokeWidth="1.5" />
          <line x1="15" y1="2" x2="15" y2="16" stroke="#1565c0" strokeWidth="2.5" />
          <line x1="23" y1="2" x2="23" y2="16" stroke="#1565c0" strokeWidth="2.5" />
          <line x1="23" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1.5" />
        </svg>
      );
    case 'rgb-led':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="14" cy="9" r="4" fill="#c62828" opacity="0.6" />
          <circle cx="19" cy="6" r="4" fill="#2e7d32" opacity="0.6" />
          <circle cx="24" cy="9" r="4" fill="#1565c0" opacity="0.6" />
          <line x1="0" y1="9" x2="10" y2="9" stroke="#555" strokeWidth="1" />
          <line x1="28" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1" />
        </svg>
      );
    case 'neopixel':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="9" y="1" width="20" height="16" rx="2" fill="#222" stroke="#555" strokeWidth="1" />
          <circle cx="19" cy="9" r="5" fill="#e040fb" opacity="0.7" />
          <circle cx="19" cy="9" r="2.5" fill="#fff" opacity="0.5" />
        </svg>
      );
    case 'pushbutton':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="10" y="2" width="18" height="14" rx="2" fill="#444" stroke="#666" strokeWidth="1" />
          <circle cx="19" cy="9" r="5" fill="#888" />
          <circle cx="19" cy="9" r="3" fill="#aaa" />
          <line x1="0" y1="5" x2="10" y2="5" stroke="#555" strokeWidth="1" />
          <line x1="0" y1="13" x2="10" y2="13" stroke="#555" strokeWidth="1" />
          <line x1="28" y1="5" x2="38" y2="5" stroke="#555" strokeWidth="1" />
          <line x1="28" y1="13" x2="38" y2="13" stroke="#555" strokeWidth="1" />
        </svg>
      );
    case 'slide-switch':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="8" y="4" width="22" height="10" rx="5" fill="#555" stroke="#777" strokeWidth="1" />
          <circle cx="23" cy="9" r="4" fill="#aaa" />
          <line x1="0" y1="9" x2="8" y2="9" stroke="#555" strokeWidth="1" />
          <line x1="30" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1" />
        </svg>
      );
    case 'battery':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="10" y="2" width="18" height="14" rx="2" fill="#333" stroke="#555" strokeWidth="1" />
          <rect x="13" y="1" width="4" height="2" fill="#555" />
          <rect x="21" y="1" width="4" height="2" fill="#555" />
          <text x="19" y="11" textAnchor="middle" fontSize="6" fill="#f5a623" fontWeight="bold">9V</text>
        </svg>
      );
    case 'potentiometer':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="19" cy="9" r="7" fill="#5a3e00" opacity="0.3" stroke="#5a3e00" strokeWidth="1.5" />
          <line x1="19" y1="2" x2="19" y2="9" stroke="#5a3e00" strokeWidth="2" />
          <circle cx="19" cy="9" r="2" fill="#5a3e00" />
          <line x1="0" y1="9" x2="12" y2="9" stroke="#555" strokeWidth="1" />
          <line x1="26" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1" />
          <line x1="19" y1="16" x2="19" y2="18" stroke="#555" strokeWidth="1" />
        </svg>
      );
    case 'buzzer':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="19" cy="9" r="7" fill="#333" stroke="#555" strokeWidth="1" />
          <circle cx="19" cy="9" r="3" fill="#555" />
          <circle cx="19" cy="9" r="1" fill="#888" />
          <line x1="0" y1="7" x2="12" y2="7" stroke="#555" strokeWidth="1" />
          <line x1="0" y1="11" x2="12" y2="11" stroke="#555" strokeWidth="1" />
        </svg>
      );
    case 'relay':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="6" y="1" width="26" height="16" rx="1" fill="#4a6fa5" stroke="#555" strokeWidth="1" />
          <rect x="10" y="4" width="18" height="10" fill="#3a5a8a" rx="1" />
          <text x="19" y="12" textAnchor="middle" fontSize="5.5" fill="#ccc">RELAY</text>
        </svg>
      );
    case '7seg':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="8" y="1" width="22" height="16" rx="1" fill="#1a1a1a" stroke="#555" strokeWidth="1" />
          <text x="19" y="13" textAnchor="middle" fontSize="10" fill="#c62828" fontFamily="monospace">8</text>
        </svg>
      );
    case 'lcd-16x2':
    case 'lcd-20x4':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="4" y="1" width="30" height="16" rx="1" fill="#1a5c5e" stroke="#555" strokeWidth="1" />
          <rect x="7" y="4" width="24" height="10" fill="#7ec8a0" rx="0.5" />
          <line x1="9" y1="7" x2="29" y2="7" stroke="#5a9a6a" strokeWidth="1" />
          <line x1="9" y1="11" x2="29" y2="11" stroke="#5a9a6a" strokeWidth="1" />
        </svg>
      );
    case 'ssd1306':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="6" y="1" width="26" height="16" rx="1" fill="#222" stroke="#555" strokeWidth="1" />
          <rect x="9" y="3" width="20" height="12" fill="#000" rx="0.5" />
          <text x="19" y="11" textAnchor="middle" fontSize="4.5" fill="#4fc3f7">OLED</text>
        </svg>
      );
    case 'neopixel-matrix':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="7" y="1" width="24" height="16" rx="1" fill="#111" stroke="#555" strokeWidth="1" />
          {[0,1,2,3].map(r => [0,1,2,3].map(c => (
            <circle key={`${r}-${c}`} cx={12 + c * 5} cy={4 + r * 3.5} r="1.2"
              fill={['#e040fb','#00e676','#ff5252','#448aff'][(r+c)%4]} opacity="0.8" />
          )))}
        </svg>
      );
    case 'led-bar-graph':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="5" y="2" width="28" height="14" rx="1" fill="#222" stroke="#555" strokeWidth="1" />
          {[0,1,2,3,4,5,6,7].map(i => (
            <rect key={i} x={7 + i * 3} y="4" width="2" height="10" rx="0.5"
              fill={i < 3 ? '#2e7d32' : i < 6 ? '#f9a825' : '#c62828'} opacity={0.7} />
          ))}
        </svg>
      );
    case 'hcsr04':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="4" y="2" width="30" height="14" rx="1" fill="#1a8a8a" stroke="#555" strokeWidth="1" />
          <circle cx="13" cy="9" r="4" fill="#ddd" stroke="#888" strokeWidth="0.8" />
          <circle cx="25" cy="9" r="4" fill="#ddd" stroke="#888" strokeWidth="0.8" />
        </svg>
      );
    case 'dht22':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="9" y="1" width="20" height="16" rx="2" fill="#fff" stroke="#00796b" strokeWidth="1.2" />
          <rect x="12" y="5" width="14" height="8" fill="#e0f2f1" rx="1" />
          <text x="19" y="12" textAnchor="middle" fontSize="4" fill="#00796b">DHT</text>
        </svg>
      );
    case 'pir':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="19" cy="10" r="7" fill="#eee" stroke="#888" strokeWidth="1" />
          <circle cx="19" cy="10" r="4" fill="#ddd" stroke="#aaa" strokeWidth="0.8" />
          <circle cx="19" cy="10" r="1.5" fill="#c62828" />
          <rect x="13" y="15" width="12" height="3" fill="#2e7d32" rx="0.5" />
        </svg>
      );
    case 'ir-recv':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <path d="M14,16 L14,5 Q14,1 19,1 Q24,1 24,5 L24,16" fill="#333" stroke="#555" strokeWidth="1" />
          <line x1="14" y1="16" x2="14" y2="18" stroke="#555" strokeWidth="1" />
          <line x1="19" y1="16" x2="19" y2="18" stroke="#555" strokeWidth="1" />
          <line x1="24" y1="16" x2="24" y2="18" stroke="#555" strokeWidth="1" />
        </svg>
      );
    case 'ir-remote':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="11" y="0" width="16" height="18" rx="2" fill="#222" stroke="#555" strokeWidth="1" />
          <circle cx="19" cy="4" r="2" fill="#c62828" />
          <rect x="14" y="8" width="3" height="2" rx="0.3" fill="#555" />
          <rect x="21" y="8" width="3" height="2" rx="0.3" fill="#555" />
          <rect x="14" y="12" width="3" height="2" rx="0.3" fill="#555" />
          <rect x="21" y="12" width="3" height="2" rx="0.3" fill="#555" />
        </svg>
      );
    case 'ntc-sensor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <line x1="0" y1="9" x2="10" y2="9" stroke="#555" strokeWidth="1.5" />
          <ellipse cx="19" cy="9" rx="8" ry="6" fill="#b85c00" opacity="0.3" stroke="#b85c00" strokeWidth="1.2" />
          <text x="19" y="11" textAnchor="middle" fontSize="5" fill="#b85c00">T</text>
          <line x1="28" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1.5" />
        </svg>
      );
    case 'flame-sensor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="9" y="2" width="20" height="14" rx="2" fill="#2e2e2e" stroke="#555" strokeWidth="1" />
          <path d="M19,13 Q16,8 18,5 Q17,8 19,4 Q21,8 20,5 Q22,8 19,13Z" fill="#ff6d00" opacity="0.9" />
        </svg>
      );
    case 'gas-sensor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="19" cy="9" r="7" fill="#555" stroke="#777" strokeWidth="1" />
          <circle cx="19" cy="9" r="4" fill="#888" stroke="#aaa" strokeWidth="0.5" />
          <text x="19" y="11" textAnchor="middle" fontSize="4" fill="#ddd">MQ</text>
        </svg>
      );
    case 'photoresistor-sensor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <line x1="0" y1="9" x2="10" y2="9" stroke="#555" strokeWidth="1.5" />
          <circle cx="19" cy="9" r="7" fill="#b85c00" opacity="0.2" stroke="#b85c00" strokeWidth="1.2" />
          <line x1="14" y1="3" x2="17" y2="6" stroke="#f9a825" strokeWidth="1" />
          <line x1="17" y1="3" x2="20" y2="6" stroke="#f9a825" strokeWidth="1" />
          <line x1="28" y1="9" x2="38" y2="9" stroke="#555" strokeWidth="1.5" />
        </svg>
      );
    case 'sound-sensor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="9" y="2" width="20" height="14" rx="2" fill="#2e7d32" stroke="#555" strokeWidth="1" />
          <circle cx="19" cy="9" r="4" fill="#1a5c1a" stroke="#333" strokeWidth="0.8" />
          <circle cx="19" cy="9" r="1.5" fill="#555" />
        </svg>
      );
    case 'mpu6050':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="7" y="1" width="24" height="16" rx="1" fill="#1a237e" stroke="#555" strokeWidth="1" />
          <rect x="11" y="4" width="10" height="10" fill="#283593" stroke="#3949ab" strokeWidth="0.5" rx="1" />
          <text x="25" y="12" textAnchor="middle" fontSize="3.5" fill="#90caf9">6050</text>
        </svg>
      );
    case 'servo':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="4" y="3" width="24" height="12" rx="1" fill="#1565c0" stroke="#555" strokeWidth="1" />
          <circle cx="28" cy="9" r="5" fill="#1976d2" stroke="#555" strokeWidth="1" />
          <line x1="28" y1="9" x2="35" y2="5" stroke="#fff" strokeWidth="1.2" />
        </svg>
      );
    case 'stepper-motor':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="19" cy="9" r="7" fill="#555" stroke="#777" strokeWidth="1" />
          <circle cx="19" cy="9" r="3" fill="#888" />
          <rect x="16" y="7" width="6" height="4" fill="#aaa" rx="0.5" />
          <rect x="6" y="6" width="6" height="6" fill="#444" stroke="#666" strokeWidth="0.5" rx="0.5" />
        </svg>
      );
    case 'analog-joystick':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="7" y="2" width="24" height="14" rx="2" fill="#333" stroke="#555" strokeWidth="1" />
          <circle cx="19" cy="9" r="4" fill="#555" stroke="#777" strokeWidth="0.8" />
          <circle cx="19" cy="9" r="2" fill="#888" />
        </svg>
      );
    case 'rotary-encoder':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <circle cx="19" cy="9" r="7" fill="#444" stroke="#666" strokeWidth="1" />
          <circle cx="19" cy="9" r="4" fill="#666" stroke="#888" strokeWidth="0.5" />
          <line x1="19" y1="5" x2="19" y2="9" stroke="#bbb" strokeWidth="1.5" />
        </svg>
      );
    case 'membrane-keypad':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="6" y="1" width="26" height="16" rx="1" fill="#eee" stroke="#888" strokeWidth="1" />
          {[0,1,2,3].map(r => [0,1,2,3].map(c => (
            <rect key={`${r}-${c}`} x={9 + c * 5.5} y={3 + r * 3.5} width="3.5" height="2.5" rx="0.3"
              fill="#bbb" stroke="#999" strokeWidth="0.3" />
          )))}
        </svg>
      );
    case 'dip-switch-8':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="5" y="3" width="28" height="12" rx="1" fill="#c62828" stroke="#555" strokeWidth="1" />
          {[0,1,2,3,4,5,6,7].map(i => (
            <rect key={i} x={7 + i * 3.2} y={5} width="2" height="6" rx="0.3"
              fill={i % 2 === 0 ? '#fff' : '#eee'} stroke="#888" strokeWidth="0.3" />
          ))}
        </svg>
      );
    case 'ds1307':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="7" y="2" width="24" height="14" rx="1" fill="#1a237e" stroke="#555" strokeWidth="1" />
          <circle cx="19" cy="9" r="5" fill="none" stroke="#90caf9" strokeWidth="0.8" />
          <line x1="19" y1="5" x2="19" y2="9" stroke="#90caf9" strokeWidth="0.8" />
          <line x1="19" y1="9" x2="22" y2="11" stroke="#90caf9" strokeWidth="0.8" />
        </svg>
      );
    case 'hx711':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="7" y="2" width="24" height="14" rx="1" fill="#2e7d32" stroke="#555" strokeWidth="1" />
          <rect x="12" y="5" width="14" height="8" fill="#1b5e20" rx="0.5" />
          <text x="19" y="11" textAnchor="middle" fontSize="4" fill="#a5d6a7">HX</text>
        </svg>
      );
    case 'microsd':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <path d="M10,2 L28,2 L28,16 L10,16 L10,5 L13,2Z" fill="#333" stroke="#555" strokeWidth="1" />
          <rect x="13" y="5" width="12" height="8" fill="#444" rx="0.5" />
          <text x="19" y="11" textAnchor="middle" fontSize="3.5" fill="#aaa">SD</text>
        </svg>
      );
    case 'breadboard':
    case 'breadboard-half':
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="2" y="1" width="34" height="16" rx="1.5" fill="#e8d5b7" stroke="#c4a97d" strokeWidth="0.8" />
          <line x1="2" y1="9" x2="36" y2="9" stroke="#c4a97d" strokeWidth="0.6" />
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <React.Fragment key={i}>
              <circle cx={5 + i * 3} cy={5} r="0.7" fill="#999" />
              <circle cx={5 + i * 3} cy={7} r="0.7" fill="#999" />
              <circle cx={5 + i * 3} cy={11} r="0.7" fill="#999" />
              <circle cx={5 + i * 3} cy={13} r="0.7" fill="#999" />
            </React.Fragment>
          ))}
          <rect x="3" y="3.5" width="32" height="1" rx="0.3" fill="#c62828" opacity="0.3" />
          <rect x="3" y="13.5" width="32" height="1" rx="0.3" fill="#1565c0" opacity="0.3" />
        </svg>
      );
    default:
      // Generic chip icon for any other component
      return (
        <svg width="38" height="18" viewBox="0 0 38 18">
          <rect x="4" y="2" width="30" height="14" fill="#eee" stroke="#888" strokeWidth="1.5" rx="1" />
          <line x1="4" y1="6" x2="0" y2="6" stroke="#555" strokeWidth="1" />
          <line x1="4" y1="12" x2="0" y2="12" stroke="#555" strokeWidth="1" />
          <line x1="34" y1="6" x2="38" y2="6" stroke="#555" strokeWidth="1" />
          <line x1="34" y1="12" x2="38" y2="12" stroke="#555" strokeWidth="1" />
        </svg>
      );
  }
}

interface ComponentPanelProps {
  selectedComponent: string | null;
  onSelectComponent: (type: string) => void;
  darkMode?: boolean;
}

export function ComponentPanel({ selectedComponent, onSelectComponent, darkMode }: ComponentPanelProps) {
  const dm = darkMode;
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['basic', 'ics']));
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFavorite = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      const matchesSearch =
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.sublabel.toLowerCase().includes(search.toLowerCase());
      const matchesFav = activeTab === 'favorites' ? favorites.has(item.id) : true;
      return matchesSearch && matchesFav;
    }),
  })).filter(cat => cat.items.length > 0);

  return (
    <div
      className={`w-[252px] shrink-0 flex flex-col overflow-hidden shadow-sm ${dm ? 'border-r border-[#333] bg-[#1e1e1e]' : 'border-r border-[#d0d0d0] bg-[#fafafa]'}`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Panel Header */}
      <div className={`flex items-center h-[34px] px-3 border-b shrink-0 ${dm ? 'bg-gradient-to-r from-[#2a2a2a] to-[#252525] border-[#333]' : 'bg-gradient-to-r from-[#f0f0f0] to-[#e8e8e8] border-[#c8c8c8]'}`}>
        <span className={`text-[11px] font-bold tracking-widest uppercase ${dm ? 'text-[#ccc]' : 'text-[#444]'}`}>Components</span>
        <div className="ml-auto flex gap-1.5">
          <button
            className={`text-[10px] px-2 py-0.5 rounded transition-all duration-150 font-medium ${
              activeTab === 'all'
                ? 'bg-[#1565c0] text-white shadow-sm'
                : dm ? 'text-[#999] hover:bg-[#333]' : 'text-[#666] hover:bg-[#ddd]'
            }`}
            onClick={() => setActiveTab('all')}
          >All</button>
          <button
            className={`text-[10px] px-2 py-0.5 rounded transition-all duration-150 font-medium ${
              activeTab === 'favorites'
                ? 'bg-[#1565c0] text-white shadow-sm'
                : dm ? 'text-[#999] hover:bg-[#333]' : 'text-[#666] hover:bg-[#ddd]'
            }`}
            onClick={() => setActiveTab('favorites')}
          >★ Fav</button>
        </div>
      </div>

      {/* Search */}
      <div className={`px-2.5 py-2.5 border-b shrink-0 ${dm ? 'border-[#333] bg-[#252525]' : 'border-[#e0e0e0] bg-[#f5f5f5]'}`}>
        <div className={`flex items-center gap-2 h-[28px] border rounded px-2.5 focus-within:border-[#1565c0] focus-within:shadow-[0_0_0_2px_rgba(21,101,192,0.12)] transition-all duration-150 ${dm ? 'bg-[#2a2a2a] border-[#444]' : 'bg-white border-[#c8c8c8]'}`}>
          <Search size={12} className={`shrink-0 ${dm ? 'text-[#777]' : 'text-[#999]'}`} />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`flex-1 bg-transparent outline-none text-[12px] ${dm ? 'text-[#ccc] placeholder-[#666]' : 'text-[#1a1a1a] placeholder-[#b0b0b0]'}`}
          />
          {search && (
            <button className={`transition-colors ${dm ? 'text-[#777] hover:text-[#ccc]' : 'text-[#999] hover:text-[#333]'}`} onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Component Categories */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#c0c0c0 transparent' }}>
        {filteredCategories.map(cat => (
          <div key={cat.id}>
            {/* Category Header */}
            <button
              className={`w-full flex items-center gap-1.5 h-[28px] px-2.5 text-[11px] font-semibold border-b transition-colors duration-100 text-left ${dm ? 'bg-[#252525] border-[#333] hover:bg-[#2e2e2e]' : 'bg-[#f0f0f0] border-[#ddd] hover:bg-[#e6e6e6]'}`}
              style={{ color: cat.accent, borderLeft: `3px solid ${cat.accent}` }}
              onClick={() => toggleCategory(cat.id)}
            >
              {openCategories.has(cat.id) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span className={dm ? 'text-[#999]' : 'text-[#555]'}>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={`ml-auto text-[10px] font-normal px-1.5 rounded ${dm ? 'text-[#777] bg-[#333]' : 'text-[#aaa] bg-white'}`}>{cat.items.length}</span>
            </button>

            {/* Component Items */}
            {openCategories.has(cat.id) && (
              <div className={`py-1 ${dm ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-2.5 mx-1.5 my-[2px] px-2.5 py-1.5 rounded cursor-pointer transition-all duration-100
                      ${selectedComponent === item.id
                        ? dm ? 'bg-[#1e3a5f] border border-[#1565c0] shadow-sm' : 'bg-[#e3f0fc] border border-[#1565c0] shadow-sm'
                        : dm ? 'hover:bg-[#2a2a2a] border border-transparent hover:border-[#444]' : 'hover:bg-[#f0f4f8] border border-transparent hover:border-[#d8e4f0]'
                      }`}
                    onClick={() => onSelectComponent(item.id)}
                    onDoubleClick={() => onSelectComponent(item.id)}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('component', item.id);
                    }}
                  >
                    <div className="shrink-0 w-[38px] h-[18px] flex items-center justify-center opacity-90">
                      <ComponentIcon type={item.id} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-[12px] leading-tight truncate font-medium ${dm ? 'text-[#ccc]' : 'text-[#1a1a1a]'}`}>{item.label}</span>
                      <span className={`text-[10px] leading-tight ${dm ? 'text-[#777]' : 'text-[#999]'}`}>{item.sublabel}</span>
                    </div>
                    <button
                      className={`shrink-0 p-0.5 rounded transition-all duration-150 ${
                        favorites.has(item.id)
                          ? 'text-[#f5a623] hover:text-[#e09000]'
                          : 'text-[#ccc] hover:text-[#f5a623] opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => toggleFavorite(item.id, e)}
                      title={favorites.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                      style={{ opacity: favorites.has(item.id) ? 1 : undefined }}
                    >
                      <Star size={12} fill={favorites.has(item.id) ? '#f5a623' : 'none'} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-8 gap-1 ${dm ? 'text-[#666]' : 'text-[#aaa]'}`}>
            {activeTab === 'favorites' ? (
              <>
                <Star size={20} />
                <span className="text-[12px]">No favorites yet</span>
                <span className={`text-[10px] ${dm ? 'text-[#555]' : 'text-[#bbb]'}`}>Click ★ on a component to add it</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span className="text-[12px]">No components found</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hint Footer */}
      {selectedComponent && (
        <div className={`px-3 py-2.5 border-t text-[11px] shrink-0 font-medium ${dm ? 'bg-gradient-to-r from-[#0d2137] to-[#112840] border-[#1565c0]/40 text-[#7abaff]' : 'bg-gradient-to-r from-[#e8f4fd] to-[#f0f8ff] border-[#b8d8f0] text-[#1565c0]'}`}>
          📌 Click on canvas to place · Esc to cancel
        </div>
      )}
      {!selectedComponent && (
        <div className={`px-3 py-2 border-t text-[10px] shrink-0 ${dm ? 'bg-[#252525] border-[#333] text-[#666]' : 'bg-[#f5f5f5] border-[#e0e0e0] text-[#aaa]'}`}>
          Click or drag a component to the canvas
        </div>
      )}
    </div>
  );
}
