# SimuIDE Web

A web-based circuit simulator and IDE similar to Wokwi. Drag and drop electronic components, design complex circuits, code your microcontrollers in C/C++, and simulate everything directly in the browser.

## Features

- **Interactive Circuit Canvas:** Drag, drop, and wire components on a dynamic grid.
- **Microcontroller Support:** Simulate Arduino Uno, Nano, Mega, and ESP32 boards.
- **Extensive Component Library:** Includes LEDs, resistors, capacitors, displays (LCD, 7-segment, OLED), sensors (DHT22, PIR, Ultrasonic), motors (Servo, Stepper), and more.
- **Integrated Code Editor:** Built-in Monaco editor with syntax highlighting for C/C++ (Arduino sketches).
- **Simulation Engine:** Powered by `avr8js` for accurate AVR microcontroller simulation.
- **AI Assistant Pipeline:** Integrated Gemini AI chat for coding help and circuit analysis.
- **Project Management:** Save and load projects locally (`.json`) or sync them to the cloud.

## Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your system.

### Local Development

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

*(Optional)* Start the full stack with the backend compilation server:
```bash
npm run dev:full
```

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Simulation Engine:** AVR8js
- **Canvas / Components:** Custom SVG rendering & `@wokwi/elements` custom elements

## Documentation

Detailed documentation about specific parts of the project can be found in the following files:

- [`FRONTEND.md`](./FRONTEND.md) - Detailed guide to the React frontend architecture, stores, and components.
- [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) - Overview of the directory layout and initial sprint framework.
- [`DOCKER.md`](./DOCKER.md) - Containerization instructions and deployment setups.
- [`MONGODB_EXPORT.md`](./MONGODB_EXPORT.md) - Database schema and data export documentation.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
