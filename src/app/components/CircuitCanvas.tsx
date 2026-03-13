import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { UNO_PIN_MAP } from '../../utils/arduinoPins';

// Mapping from internal component type → wokwi custom-element tag + approximate render size
const WOKWI_MAP: Record<string, { tag: string; width: number; height: number; attrs?: Record<string, string> }> = {
  'arduino-uno':    { tag: 'wokwi-arduino-uno',    width: 280, height: 200 },
  'arduino-nano':   { tag: 'wokwi-arduino-nano',   width: 260, height: 80 },
  'arduino-mega':   { tag: 'wokwi-arduino-mega',   width: 360, height: 200 },
  'esp32':          { tag: 'wokwi-esp32-devkit-v1', width: 200, height: 180 },
  'resistor':       { tag: 'wokwi-resistor',        width: 120, height: 25, attrs: { value: '220' } },
  'led':            { tag: 'wokwi-led',             width: 40,  height: 50, attrs: { color: 'red' } },
  'led-green':      { tag: 'wokwi-led',             width: 40,  height: 50, attrs: { color: 'green' } },
  'led-blue':       { tag: 'wokwi-led',             width: 40,  height: 50, attrs: { color: 'blue' } },
  'led-yellow':     { tag: 'wokwi-led',             width: 40,  height: 50, attrs: { color: 'yellow' } },
  'rgb-led':        { tag: 'wokwi-rgb-led',         width: 50,  height: 60 },
  'neopixel':       { tag: 'wokwi-neopixel',        width: 40,  height: 40 },
  'pushbutton':     { tag: 'wokwi-pushbutton',      width: 60,  height: 60 },
  'potentiometer':  { tag: 'wokwi-potentiometer',   width: 80,  height: 80 },
  'buzzer':         { tag: 'wokwi-buzzer',          width: 60,  height: 60 },
  'servo':          { tag: 'wokwi-servo',           width: 120, height: 80 },
  '7seg':           { tag: 'wokwi-7segment',        width: 100, height: 60 },
  'lcd-16x2':       { tag: 'wokwi-lcd1602',         width: 260, height: 120 },
  'lcd-20x4':       { tag: 'wokwi-lcd2004',         width: 280, height: 140 },
  'dht22':          { tag: 'wokwi-dht22',           width: 60,  height: 80 },
  'hcsr04':         { tag: 'wokwi-hc-sr04',         width: 100, height: 60 },
  'pir':            { tag: 'wokwi-pir-motion-sensor', width: 80, height: 80 },
  'ir-recv':        { tag: 'wokwi-ir-receiver',     width: 40, height: 50 },
  'ir-remote':      { tag: 'wokwi-ir-remote',       width: 100, height: 180 },
  'slide-switch':   { tag: 'wokwi-slide-switch',    width: 60,  height: 30 },
  'membrane-keypad':{ tag: 'wokwi-membrane-keypad', width: 120, height: 160 },
  'analog-joystick':{ tag: 'wokwi-analog-joystick', width: 80,  height: 80 },
  'rotary-encoder': { tag: 'wokwi-ky-040',          width: 60,  height: 60 },
  'stepper-motor':  { tag: 'wokwi-stepper-motor',   width: 100, height: 100 },
  'flame-sensor':   { tag: 'wokwi-flame-sensor',    width: 60,  height: 40 },
  'gas-sensor':     { tag: 'wokwi-gas-sensor',      width: 80,  height: 80 },
  'ntc-sensor':     { tag: 'wokwi-ntc-temperature-sensor', width: 60, height: 40 },
  'photoresistor-sensor': { tag: 'wokwi-photoresistor-sensor', width: 60, height: 40 },
  'ssd1306':        { tag: 'wokwi-ssd1306',         width: 120, height: 60 },
  'microsd':        { tag: 'wokwi-microsd-card',    width: 60,  height: 50 },
  'ds1307':         { tag: 'wokwi-ds1307',          width: 80,  height: 60 },
  'neopixel-matrix':{ tag: 'wokwi-neopixel-matrix', width: 100, height: 100 },
  'dip-switch-8':   { tag: 'wokwi-dip-switch-8',    width: 100, height: 40 },
  'led-bar-graph':  { tag: 'wokwi-led-bar-graph',   width: 100, height: 30 },
  'relay':          { tag: 'wokwi-ks2e-m-dc5',      width: 80,  height: 60 },
  'sound-sensor':   { tag: 'wokwi-small-sound-sensor', width: 60, height: 40 },
  'mpu6050':        { tag: 'wokwi-mpu6050',         width: 60,  height: 60 },
  'hx711':          { tag: 'wokwi-hx711',           width: 80,  height: 60 },
};

export interface PlacedComponent {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  selected: boolean;
  attrs?: Record<string, string>;
}

// BUG 1&2 FIX: Wire stores pin references only — no absolute coordinates.
// Endpoints are resolved dynamically at render time from component positions + pinInfo.
export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinName: string;
  toComponentId: string;
  toPinName: string;
  color: string;
}

interface CachedPin {
  name: string;
  x: number;
  y: number;
  signals: any[];
}

interface CanvasPin {
  componentId: string;
  pinName: string;
  x: number;
  y: number;
  signals: any[];
}

const SNAP_THRESHOLD = 20;

// Components that support right-click value editing
// `units`: list of common units — first entry is the SI default
interface EditableAttrInfo {
  attr: string;
  label: string;
  units: { symbol: string; multiplier: number }[];
  defaultValue: string;
}
const EDITABLE_ATTRS: Record<string, EditableAttrInfo> = {
  'resistor': {
    attr: 'value', label: 'Resistance', defaultValue: '1000',
    units: [
      { symbol: 'Ω',  multiplier: 1 },
      { symbol: 'mΩ', multiplier: 0.001 },
      { symbol: 'kΩ', multiplier: 1000 },
      { symbol: 'MΩ', multiplier: 1e6 },
    ],
  },
  'potentiometer': {
    attr: 'value', label: 'Resistance', defaultValue: '10000',
    units: [
      { symbol: 'Ω',  multiplier: 1 },
      { symbol: 'kΩ', multiplier: 1000 },
      { symbol: 'MΩ', multiplier: 1e6 },
    ],
  },
  'capacitor': {
    attr: 'value', label: 'Capacitance', defaultValue: '100e-6',
    units: [
      { symbol: 'F',  multiplier: 1 },
      { symbol: 'mF', multiplier: 1e-3 },
      { symbol: 'µF', multiplier: 1e-6 },
      { symbol: 'nF', multiplier: 1e-9 },
      { symbol: 'pF', multiplier: 1e-12 },
    ],
  },
  'ntc-sensor': {
    attr: 'temperature', label: 'Temperature', defaultValue: '25',
    units: [
      { symbol: '°C', multiplier: 1 },
      { symbol: '°F', multiplier: 1 },
      { symbol: 'K',  multiplier: 1 },
    ],
  },
};

function findNearestPin(pos: { x: number; y: number }, pins: CanvasPin[]): CanvasPin | null {
  let best: CanvasPin | null = null;
  let bestDist = SNAP_THRESHOLD;
  for (const pin of pins) {
    const d = Math.hypot(pin.x - pos.x, pin.y - pos.y);
    if (d < bestDist) {
      bestDist = d;
      best = pin;
    }
  }
  return best;
}

// Determine wire color from pin names (Wokwi style)
function getWireColor(fromName: string, toName: string): string {
  const names = [fromName.toUpperCase(), toName.toUpperCase()];
  for (const n of names) {
    if (n === 'GND' || n === 'VSS' || n === 'G') return '#000000';
  }
  for (const n of names) {
    if (['VCC', '5V', '3V3', '3.3V', 'VIN', 'VDD', 'V+'].includes(n)) return '#ff0000';
  }
  return '#1b9e1b';
}

// Sizes for custom SVG (non-wokwi) components
const CUSTOM_SIZES: Record<string, { width: number; height: number }> = {
  battery: { width: 60, height: 80 },
  capacitor: { width: 80, height: 50 },
  breadboard: { width: 478, height: 160 },
  'breadboard-half': { width: 240, height: 160 },
  battery: { width: 60, height: 100 },
};

// Generate breadboard pin layout
// Standard breadboard: power rails (top + bottom) + 5 rows above channel (a-e) + 5 rows below (f-j)
const BB_PITCH = 7.2;  // ~2.54mm grid
const BB_MARGIN_X = 12;
const BB_MARGIN_TOP = 10;
const BB_POWER_H = 14;
const BB_GAP = 10;
const BB_ROW_LABELS = ['a','b','c','d','e','f','g','h','i','j'];

function generateBreadboardPins(cols: number): CachedPin[] {
  const pins: CachedPin[] = [];
  const rowsTop = ['a','b','c','d','e'];
  const rowsBottom = ['f','g','h','i','j'];
  // Y positions:
  const topPowerPlusY = BB_MARGIN_TOP + 3;
  const topPowerMinusY = BB_MARGIN_TOP + 3 + BB_PITCH;
  const mainStartY = BB_MARGIN_TOP + BB_POWER_H + BB_GAP;
  const channelY = mainStartY + 5 * BB_PITCH;
  const bottomStartY = channelY + BB_GAP;
  const bottomPowerPlusY = bottomStartY + 5 * BB_PITCH + BB_GAP + 3;
  const bottomPowerMinusY = bottomPowerPlusY + BB_PITCH;
  for (let c = 0; c < cols; c++) {
    const x = BB_MARGIN_X + c * BB_PITCH;
    // Power rails
    pins.push({ name: `tp${c+1}`, x, y: topPowerPlusY, signals: [] });
    pins.push({ name: `tn${c+1}`, x, y: topPowerMinusY, signals: [] });
    pins.push({ name: `bp${c+1}`, x, y: bottomPowerPlusY, signals: [] });
    pins.push({ name: `bn${c+1}`, x, y: bottomPowerMinusY, signals: [] });
    // Main rows
    for (let r = 0; r < 5; r++) {
      pins.push({ name: `${rowsTop[r]}${c+1}`, x, y: mainStartY + r * BB_PITCH, signals: [] });
    }
    for (let r = 0; r < 5; r++) {
      pins.push({ name: `${rowsBottom[r]}${c+1}`, x, y: bottomStartY + r * BB_PITCH, signals: [] });
    }
  }
  return pins;
}

const BB_FULL_PINS = generateBreadboardPins(63);
const BB_HALF_PINS = generateBreadboardPins(30);

// SVG breadboard rendering helper
function BreadboardSVG({ cols, w, h, label, selected }: { cols: number; w: number; h: number; label: string; selected: boolean }) {
  const mainStartY = BB_MARGIN_TOP + BB_POWER_H + BB_GAP;
  const channelY = mainStartY + 5 * BB_PITCH;
  const bottomStartY = channelY + BB_GAP;
  const topPowerPlusY = BB_MARGIN_TOP + 3;
  const topPowerMinusY = BB_MARGIN_TOP + 3 + BB_PITCH;
  const bottomPowerPlusY = bottomStartY + 5 * BB_PITCH + BB_GAP + 3;
  const bottomPowerMinusY = bottomPowerPlusY + BB_PITCH;
  return (
    <>
      {/* Hit area */}
      <rect x="0" y="0" width={w} height={h} fill="transparent" />
      {/* Board body */}
      <rect x="0" y="0" width={w} height={h} rx="3" fill="#e8dcc8" stroke="#c4a97d" strokeWidth="1.2" />
      {/* Center channel groove */}
      <rect x="4" y={channelY - 2} width={w - 8} height={BB_GAP + 4} rx="1" fill="#d5c7a8" />
      <line x1="4" y1={channelY - 2} x2={w - 4} y2={channelY - 2} stroke="#c0ad88" strokeWidth="0.5" />
      <line x1="4" y1={channelY + BB_GAP + 2} x2={w - 4} y2={channelY + BB_GAP + 2} stroke="#c0ad88" strokeWidth="0.5" />
      {/* Power rail lines */}
      <line x1={BB_MARGIN_X - 4} y1={topPowerPlusY} x2={BB_MARGIN_X + (cols - 1) * BB_PITCH + 4} y2={topPowerPlusY} stroke="#d44" strokeWidth="0.6" opacity="0.5" />
      <line x1={BB_MARGIN_X - 4} y1={topPowerMinusY} x2={BB_MARGIN_X + (cols - 1) * BB_PITCH + 4} y2={topPowerMinusY} stroke="#44d" strokeWidth="0.6" opacity="0.5" />
      <line x1={BB_MARGIN_X - 4} y1={bottomPowerPlusY} x2={BB_MARGIN_X + (cols - 1) * BB_PITCH + 4} y2={bottomPowerPlusY} stroke="#d44" strokeWidth="0.6" opacity="0.5" />
      <line x1={BB_MARGIN_X - 4} y1={bottomPowerMinusY} x2={BB_MARGIN_X + (cols - 1) * BB_PITCH + 4} y2={bottomPowerMinusY} stroke="#44d" strokeWidth="0.6" opacity="0.5" />
      {/* +/- labels */}
      <text x="4" y={topPowerPlusY + 3} fontSize="5" fill="#c44" fontWeight="bold">+</text>
      <text x="4" y={topPowerMinusY + 3} fontSize="5" fill="#44c" fontWeight="bold">–</text>
      <text x="4" y={bottomPowerPlusY + 3} fontSize="5" fill="#c44" fontWeight="bold">+</text>
      <text x="4" y={bottomPowerMinusY + 3} fontSize="5" fill="#44c" fontWeight="bold">–</text>
      {/* Pin holes */}
      {Array.from({ length: cols }).map((_, c) => {
        const x = BB_MARGIN_X + c * BB_PITCH;
        return (
          <React.Fragment key={c}>
            {/* Power rail holes */}
            <circle cx={x} cy={topPowerPlusY} r="1.3" fill="#888" />
            <circle cx={x} cy={topPowerMinusY} r="1.3" fill="#888" />
            <circle cx={x} cy={bottomPowerPlusY} r="1.3" fill="#888" />
            <circle cx={x} cy={bottomPowerMinusY} r="1.3" fill="#888" />
            {/* Top section (a-e) */}
            {[0,1,2,3,4].map(r => (
              <circle key={`t${r}`} cx={x} cy={mainStartY + r * BB_PITCH} r="1.3" fill="#888" />
            ))}
            {/* Bottom section (f-j) */}
            {[0,1,2,3,4].map(r => (
              <circle key={`b${r}`} cx={x} cy={bottomStartY + r * BB_PITCH} r="1.3" fill="#888" />
            ))}
          </React.Fragment>
        );
      })}
      {/* Row labels */}
      {BB_ROW_LABELS.slice(0, 5).map((lbl, i) => (
        <text key={`lt${lbl}`} x={BB_MARGIN_X - 7} y={mainStartY + i * BB_PITCH + 2.5} fontSize="4" fill="#aaa" textAnchor="middle">{lbl}</text>
      ))}
      {BB_ROW_LABELS.slice(5).map((lbl, i) => (
        <text key={`lb${lbl}`} x={BB_MARGIN_X - 7} y={bottomStartY + i * BB_PITCH + 2.5} fontSize="4" fill="#aaa" textAnchor="middle">{lbl}</text>
      ))}
      {/* Column numbers every 5 */}
      {Array.from({ length: cols }).filter((_, i) => (i + 1) % 5 === 0).map((_, idx) => {
        const c = (idx + 1) * 5 - 1;
        return <text key={c} x={BB_MARGIN_X + c * BB_PITCH} y={mainStartY - 4} fontSize="4" fill="#aaa" textAnchor="middle">{c + 1}</text>;
      })}
      {/* Label */}
      <text x={w / 2} y={h + 12} textAnchor="middle" fontSize="9" fill="#555" fontFamily="monospace">{label}</text>
      {/* Selection ring */}
      {selected && <rect x="-3" y="-3" width={w + 6} height={h + 6} fill="none" stroke="#0078d7" strokeWidth="1.5" strokeDasharray="4 2" rx="3" />}
    </>
  );
}

// Build bounding boxes for components
interface Rect { x: number; y: number; w: number; h: number; }

function getComponentRect(comp: PlacedComponent): Rect {
  const wDef = WOKWI_MAP[comp.type];
  const cDef = CUSTOM_SIZES[comp.type];
  return { x: comp.x, y: comp.y, w: wDef?.width ?? cDef?.width ?? 60, h: wDef?.height ?? cDef?.height ?? 40 };
}

// Determine which edge of a component rect a pin is closest to → outward direction
function escapeDir(px: number, py: number, r: Rect): { dx: number; dy: number } {
  const dl = px - r.x, dr = r.x + r.w - px, dt = py - r.y, db = r.y + r.h - py;
  const m = Math.min(dl, dr, dt, db);
  if (m === dt) return { dx: 0, dy: -1 };
  if (m === db) return { dx: 0, dy: 1 };
  if (m === dl) return { dx: -1, dy: 0 };
  return { dx: 1, dy: 0 };
}

const ESCAPE_DIST = 18;
const WIRE_PAD = 6;

// Check if an axis-aligned segment intersects a rectangle
function segCrossesRect(ax: number, ay: number, bx: number, by: number, r: Rect): boolean {
  const xMin = Math.min(ax, bx), xMax = Math.max(ax, bx);
  const yMin = Math.min(ay, by), yMax = Math.max(ay, by);
  if (xMax <= r.x || xMin >= r.x + r.w || yMax <= r.y || yMin >= r.y + r.h) return false;
  if (Math.abs(ay - by) < 0.5) return ay > r.y && ay < r.y + r.h;
  if (Math.abs(ax - bx) < 0.5) return ax > r.x && ax < r.x + r.w;
  return false;
}

// Build SVG path from waypoints with rounded corners
function buildPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i], n = pts[i + 1];
    if (n) {
      const dx1 = c.x - p.x, dy1 = c.y - p.y;
      const dx2 = n.x - c.x, dy2 = n.y - c.y;
      const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
      const radius = Math.min(5, l1 / 2, l2 / 2);
      if (radius > 0.5 && l1 > 1 && l2 > 1) {
        d += ` L ${c.x - (dx1 / l1) * radius} ${c.y - (dy1 / l1) * radius}`;
        d += ` Q ${c.x} ${c.y} ${c.x + (dx2 / l2) * radius} ${c.y + (dy2 / l2) * radius}`;
        continue;
      }
    }
    d += ` L ${c.x} ${c.y}`;
  }
  return d;
}

/**
 * Route a wire that leaves each pin perpendicular to the component edge,
 * then routes between escape points avoiding other component bodies.
 */
function routeWire(
  x1: number, y1: number, x2: number, y2: number,
  comp1Rect: Rect | null, comp2Rect: Rect | null,
  otherRects: Rect[]
): string {
  // 1. Compute escape points — extend perpendicular from component edge
  let e1 = { x: x1, y: y1 };
  let e2 = { x: x2, y: y2 };
  if (comp1Rect) {
    const dir = escapeDir(x1, y1, comp1Rect);
    e1 = { x: x1 + dir.dx * ESCAPE_DIST, y: y1 + dir.dy * ESCAPE_DIST };
  }
  if (comp2Rect) {
    const dir = escapeDir(x2, y2, comp2Rect);
    e2 = { x: x2 + dir.dx * ESCAPE_DIST, y: y2 + dir.dy * ESCAPE_DIST };
  }

  // Inflate other component rects for clearance
  const obs = otherRects.map(r => ({
    x: r.x - WIRE_PAD, y: r.y - WIRE_PAD, w: r.w + WIRE_PAD * 2, h: r.h + WIRE_PAD * 2,
  }));

  // If escape points are nearly aligned, straight connection
  if (Math.abs(e1.x - e2.x) < 2 || Math.abs(e1.y - e2.y) < 2) {
    return buildPath([{ x: x1, y: y1 }, e1, e2, { x: x2, y: y2 }]);
  }

  // 2. Try L-path: horizontal-first then vertical
  const hvMid = { x: e2.x, y: e1.y };
  const hvHit = obs.some(r =>
    segCrossesRect(e1.x, e1.y, hvMid.x, hvMid.y, r) ||
    segCrossesRect(hvMid.x, hvMid.y, e2.x, e2.y, r)
  );
  if (!hvHit) return buildPath([{ x: x1, y: y1 }, e1, hvMid, e2, { x: x2, y: y2 }]);

  // 3. Try L-path: vertical-first then horizontal
  const vhMid = { x: e1.x, y: e2.y };
  const vhHit = obs.some(r =>
    segCrossesRect(e1.x, e1.y, vhMid.x, vhMid.y, r) ||
    segCrossesRect(vhMid.x, vhMid.y, e2.x, e2.y, r)
  );
  if (!vhHit) return buildPath([{ x: x1, y: y1 }, e1, vhMid, e2, { x: x2, y: y2 }]);

  // 4. Both L-paths blocked — find the blocker and detour around it
  const blocker = obs.find(r =>
    segCrossesRect(e1.x, e1.y, e2.x, e1.y, r) || segCrossesRect(e2.x, e1.y, e2.x, e2.y, r)
  ) || obs.find(r =>
    segCrossesRect(e1.x, e1.y, e1.x, e2.y, r) || segCrossesRect(e1.x, e2.y, e2.x, e2.y, r)
  );

  if (blocker) {
    // Try routing above / below / left / right of the blocker
    const detours: { x: number; y: number }[][] = [
      [{ x: e1.x, y: blocker.y - 2 }, { x: e2.x, y: blocker.y - 2 }],         // above
      [{ x: e1.x, y: blocker.y + blocker.h + 2 }, { x: e2.x, y: blocker.y + blocker.h + 2 }], // below
      [{ x: blocker.x - 2, y: e1.y }, { x: blocker.x - 2, y: e2.y }],         // left
      [{ x: blocker.x + blocker.w + 2, y: e1.y }, { x: blocker.x + blocker.w + 2, y: e2.y }], // right
    ];
    let best: { x: number; y: number }[] | null = null;
    let bestLen = Infinity;
    for (const [wp1, wp2] of detours) {
      const pts = [{ x: x1, y: y1 }, e1, wp1, wp2, e2, { x: x2, y: y2 }];
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        len += Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
      }
      if (len < bestLen) { bestLen = len; best = pts; }
    }
    if (best) return buildPath(best);
  }

  // 5. Fallback: L-path
  return buildPath([{ x: x1, y: y1 }, e1, hvMid, e2, { x: x2, y: y2 }]);
}

export const defaultWires: Wire[] = [];

// Renders the appropriate component — uses wokwi web component if available, else SVG fallback
function CanvasComponent({
  comp,
  activeTool,
  onClick,
  onMouseDown,
  onContextMenu,
  wokwiRefs,
}: {
  comp: PlacedComponent;
  activeTool: string;
  onClick: (id: string) => void;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
  wokwiRefs: React.MutableRefObject<Map<string, any>>;
}) {
  // When wire tool is active, let all clicks pass through to canvas for pin detection
  const passThrough = activeTool === 'wire';
  const baseProps = {
    onClick: (e: React.MouseEvent) => { if (passThrough) return; e.stopPropagation(); onClick(comp.id); },
    onMouseDown: (e: React.MouseEvent) => { if (passThrough) return; onMouseDown(comp.id, e); },
    onContextMenu: (e: React.MouseEvent) => { if (passThrough) return; e.preventDefault(); e.stopPropagation(); onContextMenu(comp.id, e); },
    className: 'cursor-pointer',
    style: {
      filter: comp.selected ? 'drop-shadow(0 0 4px rgba(0,120,215,0.6))' : undefined,
      pointerEvents: passThrough ? 'none' as const : undefined,
    },
    ref: (el: any) => {
      if (el) {
        // Since foreignObject contains the actual custom element
        const customEl = el.querySelector(wokwiRefs.current.get(comp.id)?.tagName || '*');
        if (customEl) wokwiRefs.current.set(comp.id, customEl);
      }
    }
  };

  // Check if there's a wokwi element for this type
  const wokwi = WOKWI_MAP[comp.type];
  if (wokwi) {
    const attrs = { ...(wokwi.attrs || {}), ...(comp.attrs || {}) };
    return (
      <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
        <foreignObject width={wokwi.width} height={wokwi.height} style={{ overflow: 'visible' }}>
          {(() => {
            const Tag = wokwi.tag as any;
            return <Tag 
              {...attrs} 
              id={`wokwi-${comp.id}`}
              ref={(el: any) => {
                if (el) wokwiRefs.current.set(comp.id, el);
              }}
            />;
          })()}
        </foreignObject>
        {/* Label below the component */}
        <text x={wokwi.width / 2} y={wokwi.height + 14} textAnchor="middle" fontSize="10" fill="#555" fontFamily="monospace">{comp.label}</text>
        {/* Selection ring */}
        {comp.selected && (
          <rect x="-3" y="-3" width={wokwi.width + 6} height={wokwi.height + 6}
            fill="none" stroke="#0078d7" strokeWidth="1.5" strokeDasharray="4 2" rx="3" />
        )}
      </g>
    );
  }

  // ── SVG fallbacks for non-wokwi types ──
  switch (comp.type) {
    case 'vcc':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          <line x1="15" y1="30" x2="15" y2="22" stroke="#c62828" strokeWidth="2" />
          <polygon points="5,22 25,22 15,10" fill="#c62828" />
          <text x="15" y="42" textAnchor="middle" fontSize="9" fill="#c62828" fontFamily="monospace">VCC</text>
          {comp.selected && <rect x="3" y="8" width="24" height="36" fill="none" stroke="#0078d7" strokeWidth="1" strokeDasharray="3 2" rx="1" />}
        </g>
      );

    case 'gnd':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          <line x1="15" y1="0" x2="15" y2="8" stroke="#333" strokeWidth="2" />
          <line x1="5" y1="8" x2="25" y2="8" stroke="#333" strokeWidth="2.5" />
          <line x1="8" y1="13" x2="22" y2="13" stroke="#333" strokeWidth="2" />
          <line x1="11" y1="18" x2="19" y2="18" stroke="#333" strokeWidth="1.5" />
          <text x="15" y="30" textAnchor="middle" fontSize="9" fill="#333" fontFamily="monospace">GND</text>
          {comp.selected && <rect x="3" y="-2" width="24" height="34" fill="none" stroke="#0078d7" strokeWidth="1" strokeDasharray="3 2" rx="1" />}
        </g>
      );

    case 'battery':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          {/* Invisible hit area */}
          <rect x="-2" y="8" width="64" height="74" fill="transparent" />
          {/* Main Body */}
          <rect x="0" y="10" width="60" height="70" rx="4" fill="#333" stroke="#555" strokeWidth="2" />
          {/* Terminals */}
          <rect x="15" y="0" width="10" height="10" fill="#777" rx="1" />
          <rect x="35" y="0" width="10" height="10" fill="#777" rx="1" />
          {/* Decals */}
          <text x="30" y="50" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">9V</text>
          <text x="20" y="25" textAnchor="middle" fontSize="14" fill="#c62828" fontWeight="bold">+</text>
          <text x="40" y="23" textAnchor="middle" fontSize="14" fill="#1565c0" fontWeight="bold">-</text>
          {/* Label */}
          <text x="30" y="94" textAnchor="middle" fontSize="9" fill="#555" fontFamily="monospace">{comp.label}</text>
          {/* Selection Ring */}
          {comp.selected && <rect x="-3" y="-3" width="66" height="86" fill="none" stroke="#0078d7" strokeWidth="1.5" strokeDasharray="4 2" rx="4" />}
        </g>
      );

    case 'capacitor':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          {/* Invisible hit area for mouse interaction */}
          <rect x="-2" y="5" width="84" height="45" fill="transparent" />
          {/* Lead wires */}
          <line x1="0" y1="25" x2="28" y2="25" stroke="#888" strokeWidth="2" />
          <line x1="52" y1="25" x2="80" y2="25" stroke="#888" strokeWidth="2" />
          {/* Capacitor plates */}
          <line x1="28" y1="8" x2="28" y2="42" stroke="#1565c0" strokeWidth="3" />
          <line x1="52" y1="8" x2="52" y2="42" stroke="#1565c0" strokeWidth="3" />
          {/* Polarity marking (+) */}
          <text x="14" y="18" textAnchor="middle" fontSize="10" fill="#888" fontFamily="monospace">+</text>
          {/* Label */}
          <text x="40" y="60" textAnchor="middle" fontSize="9" fill="#555" fontFamily="monospace">{comp.label}</text>
          {/* Selection ring */}
          {comp.selected && <rect x="-3" y="5" width="86" height="45" fill="none" stroke="#0078d7" strokeWidth="1.5" strokeDasharray="4 2" rx="3" />}
        </g>
      );

    case 'breadboard':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          <BreadboardSVG cols={63} w={478} h={160} label={comp.label} selected={comp.selected} />
        </g>
      );
    case 'breadboard-half':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          <BreadboardSVG cols={30} w={240} h={160} label={comp.label} selected={comp.selected} />
        </g>
      );

    case 'battery':
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          {/* Invisible hit area for mouse interaction */}
          <rect x="-2" y="-2" width="64" height="104" fill="transparent" />
          
          {/* Battery Body */}
          <rect x="5" y="15" width="50" height="80" rx="4" fill="#333" stroke="#555" strokeWidth="2" />
          
          {/* Terminals (Targeting POS x:20 y:15 and NEG x:40 y:15 as defined in pins) */}
          <rect x="15" y="5" width="10" height="10" rx="1" fill="#bbb" stroke="#888" strokeWidth="1" />
          <circle cx="20" cy="5" r="4" fill="#ddd" />
          <rect x="35" y="5" width="10" height="10" rx="1" fill="#bbb" stroke="#888" strokeWidth="1" />
          <polygon points="35,5 45,5 42,0 38,0" fill="#ddd" />
          
          {/* Labels */}
          <text x="20" y="30" textAnchor="middle" fontSize="12" fill="#f87171" fontWeight="bold">+</text>
          <text x="40" y="30" textAnchor="middle" fontSize="12" fill="#60a5fa" fontWeight="bold">-</text>
          <text x="30" y="60" textAnchor="middle" fontSize="16" fill="#f5a623" fontWeight="bold">9V</text>
          
          {/* Component Label */}
          <text x="30" y="110" textAnchor="middle" fontSize="10" fill="#555" fontFamily="monospace">{comp.label}</text>
          
          {/* Selection ring */}
          {comp.selected && <rect x="-3" y="3" width="66" height="94" fill="none" stroke="#0078d7" strokeWidth="1.5" strokeDasharray="4 2" rx="5" />}
        </g>
      );

    default:
      return (
        <g transform={`translate(${comp.x}, ${comp.y})`} {...baseProps}>
          <rect x="0" y="0" width="60" height="40" fill="#f5f5f5" stroke="#888" strokeWidth="1.5" rx="2" />
          <text x="30" y="22" textAnchor="middle" fontSize="9" fill="#555">{comp.type}</text>
          <text x="30" y="52" textAnchor="middle" fontSize="9" fill="#555" fontFamily="monospace">{comp.label}</text>
          {comp.selected && <rect x="-2" y="-2" width="64" height="44" fill="none" stroke="#0078d7" strokeWidth="1" strokeDasharray="3 2" rx="1" />}
        </g>
      );
  }
}

interface CircuitCanvasProps {
  components: PlacedComponent[];
  activeTool: string;
  zoom: number;
  selectedLibComponent: string | null;
  onPlaceComponent: (type: string, label: string, x: number, y: number) => void;
  onStatusChange: (msg: string) => void;
  onCoordinatesChange: (coords: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onUpdateComponents: (components: PlacedComponent[]) => void;
  onDeleteComponent: (id: string) => void;
  wires: Wire[];
  onUpdateWires: (wires: Wire[]) => void;
  showGrid: boolean;
  darkMode: boolean;
  onClearCanvas?: () => void;
}

const GRID = 20;
const SCROLLBAR_SIZE = 14;
const VIRTUAL_W = 2400;
const VIRTUAL_H = 1800;
const VIRTUAL_MIN_X = -200;
const VIRTUAL_MIN_Y = -200;

export function CircuitCanvas({
  components,
  activeTool,
  zoom,
  selectedLibComponent,
  onPlaceComponent,
  onStatusChange,
  onCoordinatesChange,
  onZoomChange,
  onUpdateComponents,
  onDeleteComponent,
  wires,
  onUpdateWires,
  showGrid,
  darkMode,
  onClearCanvas,
}: CircuitCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [localComponents, setLocalComponents] = useState<PlacedComponent[]>(components);

  const labelCounters = useRef<Record<string, number>>({ resistor: 2, led: 1, capacitor: 1, vcc: 0, gnd: 0 });
  const scale = zoom / 100;

  // Wire drawing state (pin-to-pin; no intermediate points)
  const [isDrawingWire, setIsDrawingWire] = useState(false);
  const [wirePreview, setWirePreview] = useState<{ x: number; y: number } | null>(null);

  // Pin detection state
  const typePinsCache = useRef<Map<string, CachedPin[]>>(new Map());
  const [hoveredPin, setHoveredPin] = useState<CanvasPin | null>(null);
  const wireStartPinRef = useRef<CanvasPin | null>(null);

  // Value editor state
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editPopupPos, setEditPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState(0); // index into units array

  // Dragging components within canvas
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ compX: number; compY: number; mouseX: number; mouseY: number } | null>(null);
  const didDragRef = useRef(false);


  // Scrollbar state
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const scrollDragRef = useRef<{ axis: 'h' | 'v'; startMouse: number; startPan: number } | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const containerSizeRef = useRef(containerSize);
  containerSizeRef.current = containerSize;

  useEffect(() => {
    setLocalComponents(components);
  }, [components]);

  // Track container size for scrollbars
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pre-seed pins for custom (non-wokwi) SVG components
  useEffect(() => {
    if (!typePinsCache.current.has('battery')) {
      typePinsCache.current.set('battery', [
        { name: 'VCC', x: 20, y: 5, signals: [] },
        { name: 'GND', x: 40, y: 5, signals: [] },
      ]);
    }
    if (!typePinsCache.current.has('capacitor')) {
      typePinsCache.current.set('capacitor', [
        { name: 'pin1', x: 0, y: 25, signals: [] },
        { name: 'pin2', x: 80, y: 25, signals: [] },
      ]);
    }
    if (!typePinsCache.current.has('breadboard')) {
      typePinsCache.current.set('breadboard', BB_FULL_PINS);
    }
    if (!typePinsCache.current.has('breadboard-half')) {
      typePinsCache.current.set('breadboard-half', BB_HALF_PINS);
    }
    if (!typePinsCache.current.has('battery')) {
      typePinsCache.current.set('battery', [
        { name: 'POS', x: 20, y: 15, signals: [] },
        { name: 'NEG', x: 40, y: 15, signals: [] },
      ]);
    }
  }, []);

  // BUG 3 FIX: Scan ALL pins from wokwi elements including signals.
  // Re-scan periodically so even late-loading elements (like LED A+C) get captured.
  useEffect(() => {
    const scan = () => {
      const svg = svgRef.current;
      if (!svg) return;
      for (const [type, wokwi] of Object.entries(WOKWI_MAP)) {
        if (typePinsCache.current.has(type)) continue;
        const el = svg.querySelector(wokwi.tag) as any;
        if (el?.pinInfo && el.pinInfo.length > 0) {
          typePinsCache.current.set(type, el.pinInfo.map((p: any) => ({
            name: p.name as string,
            x: p.x as number,
            y: p.y as number,
            signals: Array.isArray(p.signals) ? p.signals : [],
          })));
        }
      }
    };
    // Retry multiple times — some elements load pinInfo asynchronously
    const timers = [50, 200, 600, 1500, 3000].map(d => setTimeout(scan, d));
    return () => timers.forEach(clearTimeout);
  }, [localComponents.length]);

  // Compute absolute pin positions for all placed components
  const getAllPins = useCallback((): CanvasPin[] => {
    const result: CanvasPin[] = [];
    for (const comp of localComponents) {
      const pins = typePinsCache.current.get(comp.type);
      if (!pins) continue;
      for (const pin of pins) {
        result.push({
          componentId: comp.id,
          pinName: pin.name,
          x: comp.x + pin.x,
          y: comp.y + pin.y,
          signals: pin.signals,
        });
      }
    }
    return result;
  }, [localComponents]);

  // Resolve a single pin reference to world coordinates
  const resolvePinPosition = useCallback((componentId: string, pinName: string): { x: number; y: number } | null => {
    const comp = localComponents.find(c => c.id === componentId);
    if (!comp) return null;
    const pins = typePinsCache.current.get(comp.type);
    if (!pins) return null;
    const pin = pins.find(p => p.name === pinName);
    if (!pin) return null;
    return { x: comp.x + pin.x, y: comp.y + pin.y };
  }, [localComponents]);

  // Combined Simulation Bridge
  const { isRunning, simulator } = useSimulationStore();
  const wokwiRefs = useRef<Map<string, any>>(new Map());

  // Track powered components for visual effects
  const [poweredComponents, setPoweredComponents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isRunning) {
      setPoweredComponents(new Set());
      return;
    }

    // 1. Build Netlist (Transitive)
    const netlist = new Map<string, { componentId: string; pinName: string }[]>();
    const findConnected = (startCompId: string, startPinName: string) => {
      const visited = new Set<string>();
      const queue: { compId: string; pinName: string }[] = [{ compId: startCompId, pinName: startPinName }];
      const results: { componentId: string; pinName: string }[] = [];
      while (queue.length > 0) {
        const { compId, pinName } = queue.shift()!;
        const key = `${compId}:${pinName}`;
        if (visited.has(key)) continue;
        visited.add(key);
        wires.forEach(wire => {
          let o: { compId: string; pinName: string } | null = null;
          if (wire.fromComponentId === compId && wire.fromPinName === pinName) o = { compId: wire.toComponentId, pinName: wire.toPinName };
          else if (wire.toComponentId === compId && wire.toPinName === pinName) o = { compId: wire.fromComponentId, pinName: wire.fromPinName };
          if (o) {
            const oc = localComponents.find(c => c.id === o!.compId);
            if (!oc) return;
            if (oc.type.startsWith('arduino-')) return;
            results.push({ componentId: o!.compId, pinName: o!.pinName });
            if (['resistor', 'capacitor'].includes(oc.type) || oc.type.startsWith('breadboard')) {
              getAllPins().filter(p => p.componentId === o!.compId && p.pinName !== o!.pinName).forEach(p => queue.push({ compId: p.componentId, pinName: p.pinName }));
            }
          }
        });
      }
      return results;
    };

    if (simulator) {
      Object.keys(UNO_PIN_MAP).forEach(p => {
        const ac = localComponents.find(c => c.type.startsWith('arduino-'));
        if (ac) netlist.set(p, findConnected(ac.id, p));
      });
    }

    // 1b. Permanent Drivers (VCC/GND)
    const drivePower = () => {
      localComponents.forEach(c => {
        const el = wokwiRefs.current.get(c.id);
        if (!el) return;
        if (c.type === 'vcc' || c.type === 'battery') findConnected(c.id, 'VCC').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, true));
        if (c.type === 'gnd' || c.type === 'battery') findConnected(c.id, 'GND').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, false));
        // Also drive the "VCC" and "GND" pins of the main boards if connected
        if (c.type.startsWith('arduino-') || c.type === 'esp32') {
           findConnected(c.id, '5V').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, true));
           findConnected(c.id, '3.3V').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, true));
           findConnected(c.id, 'GND').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, false));
        }
        if (c.type === 'battery') {
          findConnected(c.id, 'POS').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, true));
          findConnected(c.id, 'NEG').forEach(p => wokwiRefs.current.get(p.componentId)?.setPinState?.(p.pinName, false));
        }
      });
    };
    drivePower();

    // 1c. Visual Power-Path Tracer — find components that sit on a complete VCC→GND path
    const traceVisualPower = () => {
      const vccSources = localComponents.filter(c => c.type === 'battery' || c.type === 'vcc');
      const gndSources = localComponents.filter(c => c.type === 'battery' || c.type === 'gnd');
      const passthroughTypes = ['resistor', 'capacitor', 'breadboard', 'breadboard-half'];

      // Find all component IDs reachable from VCC pins
      const vccReachable = new Set<string>();
      vccSources.forEach(src => {
        const vccPin = src.type === 'battery' ? 'VCC' : 'VCC';
        findConnected(src.id, vccPin).forEach(p => vccReachable.add(p.componentId));
      });
      // Also from Arduino 5V
      localComponents.filter(c => c.type.startsWith('arduino-') || c.type === 'esp32').forEach(src => {
        findConnected(src.id, '5V').forEach(p => vccReachable.add(p.componentId));
        findConnected(src.id, '3.3V').forEach(p => vccReachable.add(p.componentId));
      });

      // Find all component IDs reachable from GND pins
      const gndReachable = new Set<string>();
      gndSources.forEach(src => {
        const gndPin = src.type === 'battery' ? 'GND' : 'GND';
        findConnected(src.id, gndPin).forEach(p => gndReachable.add(p.componentId));
      });
      localComponents.filter(c => c.type.startsWith('arduino-') || c.type === 'esp32').forEach(src => {
        findConnected(src.id, 'GND').forEach(p => gndReachable.add(p.componentId));
      });

      // Components on BOTH VCC and GND paths are powered (complete circuit)
      const powered = new Set<string>();
      localComponents.forEach(comp => {
        if (passthroughTypes.includes(comp.type)) return; // don't highlight passthrough
        if (vccReachable.has(comp.id) && gndReachable.has(comp.id)) {
          powered.add(comp.id);
        }
      });

      setPoweredComponents(powered);

      // Directly set visual properties for powered components
      powered.forEach(compId => {
        const comp = localComponents.find(c => c.id === compId);
        if (!comp) return;
        const el = wokwiRefs.current.get(compId);

        // LED glow
        if (comp.type.startsWith('led') && comp.type !== 'led-bar-graph' && comp.type !== 'rgb-led') {
          if (el) el.value = true;
        }
        // RGB LED — all channels on
        if (comp.type === 'rgb-led') {
          if (el) { el.red = 255; el.green = 255; el.blue = 255; }
        }
        // Buzzer
        if (comp.type === 'buzzer') {
          if (el) el.hasSignal = true;
        }
        // Servo
        if (comp.type === 'servo') {
          if (el) el.angle = 90;
        }
      });
    };

    // Run visual tracer initially and on an interval to keep effects alive
    traceVisualPower();
    const visualInterval = setInterval(traceVisualPower, 500);

    // 2. Setup Input Handlers
    const listeners: { el: any; ev: string; handler: any }[] = [];
    localComponents.forEach(comp => {
      const el = wokwiRefs.current.get(comp.id);
      if (!el) return;

      // Create a map of ALL wires connected to this component's pins
      const pinToArduino = new Map<string, { port: string; pin: number; name: string }>();
      wires.forEach(w => {
        let compPin: string | null = null;
        let arduinoPinName: string | null = null;
        if (w.fromComponentId === comp.id) {
          compPin = w.fromPinName;
          if (w.toComponentId.startsWith('arduino')) arduinoPinName = w.toPinName;
        } else if (w.toComponentId === comp.id) {
          compPin = w.toPinName;
          if (w.fromComponentId.startsWith('arduino')) arduinoPinName = w.fromPinName;
        }
        if (compPin && arduinoPinName) {
          const m = UNO_PIN_MAP[arduinoPinName];
          if (m) pinToArduino.set(compPin, { ...m, name: arduinoPinName });
        }
      });

      if (comp.type === 'pushbutton') {
        const h = (e: any) => {
          const p = pinToArduino.get('1') || pinToArduino.get('2') || pinToArduino.values().next().value;
          if (p && simulator) simulator.setPin(p.port, p.pin, e.detail);
        };
        el.addEventListener('button-press', h);
        listeners.push({ el, ev: 'button-press', handler: h });
      }

      if (comp.type === 'slide-switch') {
        const h = (e: any) => {
          const p = pinToArduino.get('1') || pinToArduino.get('2') || pinToArduino.get('3');
          if (p && simulator) simulator.setPin(p.port, p.pin, e.target.value === '1');
        };
        el.addEventListener('input', h);
        listeners.push({ el, ev: 'input', handler: h });
      }

      if (['potentiometer', 'ntc-sensor', 'photoresistor-sensor'].includes(comp.type)) {
        const h = (e: any) => {
          const p = pinToArduino.get('SIG') || pinToArduino.get('2') || Array.from(pinToArduino.values()).find(px => px.name.startsWith('A'));
          if (p && simulator) {
            const val = Math.floor((e.target.value / 100) * 1023);
            simulator.setAnalogPin(parseInt(p.name.substring(1)), val);
          }
        };
        el.addEventListener('input', h);
        listeners.push({ el, ev: 'input', handler: h });
      }

      if (comp.type === 'analog-joystick') {
        const h = (e: any) => {
          const { x, y, button } = e.detail;
          const px = pinToArduino.get('HORZ');
          const py = pinToArduino.get('VERT');
          const pb = pinToArduino.get('SEL');
          if (px && px.name.startsWith('A') && simulator) simulator.setAnalogPin(parseInt(px.name.substring(1)), Math.floor((x / 100) * 1023));
          if (py && py.name.startsWith('A') && simulator) simulator.setAnalogPin(parseInt(py.name.substring(1)), Math.floor((y / 100) * 1023));
          if (pb && simulator) simulator.setPin(pb.port, pb.pin, button);
        };
        el.addEventListener('input', h);
        listeners.push({ el, ev: 'input', handler: h });
      }

      if (comp.type === 'rotary-encoder') {
        const h = (e: any) => {
          const { clk, dt, sw } = e.detail;
          const pClk = pinToArduino.get('CLK');
          const pDt = pinToArduino.get('DT');
          const pSw = pinToArduino.get('SW');
          if (pClk && clk !== undefined && simulator) simulator.setPin(pClk.port, pClk.pin, clk);
          if (pDt && dt !== undefined && simulator) simulator.setPin(pDt.port, pDt.pin, dt);
          if (pSw && sw !== undefined && simulator) simulator.setPin(pSw.port, pSw.pin, sw);
        };
        el.addEventListener('change', h);
        listeners.push({ el, ev: 'change', handler: h });
      }

      if (comp.type === 'dip-switch-8') {
        const h = (e: any) => {
          const state = e.target.value;
          for (let i = 1; i <= 8; i++) {
            const p = pinToArduino.get(String(i));
            if (p && simulator) simulator.setPin(p.port, p.pin, state[i - 1] === '1');
          }
        };
        el.addEventListener('input', h);
        listeners.push({ el, ev: 'input', handler: h });
      }

      if (comp.type === 'membrane-keypad') {
        const h = (e: any) => {
          const { row, col, pressed } = e.detail;
          if (comp.attrs) comp.attrs[`key_${row}_${col}`] = pressed ? '1' : '0';
        };
        el.addEventListener('key-press', h);
        listeners.push({ el, ev: 'key-press', handler: h });
      }

      if (comp.type === 'pir') {
        const h = (e: any) => {
          const p = pinToArduino.get('OUT');
          if (p && simulator) simulator.setPin(p.port, p.pin, e.detail);
        };
        el.addEventListener('motion', h);
        listeners.push({ el, ev: 'motion', handler: h });
      }

      if (comp.type === 'dht22') {
        const h = (e: any) => {
          if (comp.attrs) {
            comp.attrs.temp = String(e.detail.temp);
            comp.attrs.hum = String(e.detail.hum);
          }
        };
        el.addEventListener('dht-change', h);
        listeners.push({ el, ev: 'dht-change', handler: h });
      }

      // 2b. Generic Attribute Sync (ensure UI attributes like 'distance' or 'color' are on element)
      if (comp.attrs) {
        Object.entries(comp.attrs).forEach(([attr, val]) => {
          if (el.getAttribute(attr) !== val) el.setAttribute(attr, val);
        });
      }
    });

    // 3. Setup Pin Listening (only active when simulator exists)
    let original: any = null;
    if (simulator) {
      original = simulator.onPinChange;
      simulator.onPinChange = (port, pin, value) => {
        if (original) original(port, pin, value);
        const aPin = Object.entries(UNO_PIN_MAP).find(([_,v])=>v.port===port && v.pin===pin)?.[0];
        if (aPin) {
          (netlist.get(aPin) || []).forEach(p => {
            const el = wokwiRefs.current.get(p.componentId);
            if (!el) return;
            const comp = localComponents.find(c => c.id === p.componentId);

            // HC-SR04 Logic: Trigger -> Echo
            if (comp?.type === 'hcsr04' && p.pinName === 'TRIG' && value === true) {
               const distance = parseFloat(comp.attrs?.distance || '100');
               const echoTimeMs = (distance * 58) / 1000;
               
               const echoPin = getAllPins().find(pn => pn.componentId === p.componentId && pn.pinName === 'ECHO');
               if (echoPin) {
                 const wire = wires.find(w => 
                   (w.fromComponentId === echoPin.componentId && w.fromPinName === echoPin.pinName) ||
                   (w.toComponentId === echoPin.componentId && w.toPinName === echoPin.pinName)
                 );
                 if (wire) {
                   const aSide = wire.fromComponentId === echoPin.componentId ? (wire.toComponentId.startsWith('arduino') ? 'to' : null) : (wire.fromComponentId.startsWith('arduino') ? 'from' : null);
                   if (aSide) {
                      const aPinName = aSide === 'from' ? wire.fromPinName : wire.toPinName;
                      const m = UNO_PIN_MAP[aPinName];
                      if (m) {
                        setTimeout(() => {
                          simulator.setPin(m.port, m.pin, true);
                          setTimeout(() => {
                            simulator.setPin(m.port, m.pin, false);
                          }, echoTimeMs);
                        }, 1);
                      }
                   }
                 }
               }
            }

            if (comp?.type.startsWith('led') && comp?.type !== 'led-bar-graph' && comp?.type !== 'rgb-led') el.value = value;
            else if (comp?.type === 'buzzer') el.hasSignal = value;
            else if (comp?.type === 'servo') el.angle = value ? 180 : 0;
            else if (comp?.type === 'rgb-led') {
               if (p.pinName === 'R') el.red = value ? 255 : 0;
               if (p.pinName === 'G') el.green = value ? 255 : 0;
               if (p.pinName === 'B') el.blue = value ? 255 : 0;
            }
            else if (comp?.type === '7seg') {
               if (!comp.attrs) comp.attrs = {};
               const attrs = comp.attrs;
               attrs[p.pinName] = value ? '1' : '0';
               const segments = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];
               el.values = segments.map(seg => attrs[seg] === '1' ? 1 : 0);
            }
            else if (comp?.type === 'led-bar-graph') {
               if (!comp.attrs) comp.attrs = {};
               const attrs = comp.attrs;
               attrs[p.pinName] = value ? '1' : '0';
               el.values = Array.from({length: 10}, (_, i) => {
                   const pName1 = String(i + 1);
                   const pName2 = 'A' + (i + 1);
                   return (attrs[pName1] === '1' || attrs[pName2] === '1') ? 1 : 0;
               });
            }
            else if (el.setPinState) el.setPinState(p.pinName, value);

            // Keypad scanning logic: if row is high, check if key is pressed to set col high
            if (comp?.type === 'membrane-keypad' && p.pinName.startsWith('R')) {
              const rowIdx = parseInt(p.pinName.substring(1)) - 1;
              // Find columns for this keypad
              const cols = [1,2,3,4]; // 4x4 keypad
              cols.forEach(cIdx => {
                if (comp.attrs?.[`key_${rowIdx}_${cIdx-1}`] === '1') {
                  const colPin = getAllPins().find(pn => pn.componentId === comp.id && pn.pinName === `C${cIdx}`);
                  if (colPin) {
                     // Drive the connected Arduino pin for this column
                     const wire = wires.find(w => (w.fromComponentId === colPin.componentId && w.fromPinName === colPin.pinName) || (w.toComponentId === colPin.componentId && w.toPinName === colPin.pinName));
                     if (wire) {
                       const aSide = wire.fromComponentId.startsWith('arduino') ? 'from' : 'to';
                       const aPinName = aSide === 'from' ? wire.fromPinName : wire.toPinName;
                       const targetM = UNO_PIN_MAP[aPinName];
                       if (targetM) simulator.setPin(targetM.port, targetM.pin, value);
                     }
                  }
                }
              });
            }
          });
        }
      };
    }

    return () => {
      clearInterval(visualInterval);
      if (simulator && original !== null) simulator.onPinChange = original;
      listeners.forEach(l => l.el.removeEventListener(l.ev, l.handler));
    };
  }, [isRunning, simulator, wires, localComponents, getAllPins]);

  // Scrollbar drag handling
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!scrollDragRef.current) return;
      const { axis, startMouse, startPan } = scrollDragRef.current;
      const s = scaleRef.current;
      const cs = containerSizeRef.current;
      if (axis === 'h') {
        const tw = cs.width - SCROLLBAR_SIZE;
        const dx = e.clientX - startMouse;
        setPan(prev => ({ ...prev, x: startPan - (dx / tw) * VIRTUAL_W * s }));
      } else {
        const th = cs.height - SCROLLBAR_SIZE;
        const dy = e.clientY - startMouse;
        setPan(prev => ({ ...prev, y: startPan - (dy / th) * VIRTUAL_H * s }));
      }
    };
    const handleUp = () => { scrollDragRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cx = (sx - rect.left - pan.x) / scale;
    const cy = (sy - rect.top - pan.y) / scale;
    return {
      x: Math.round(cx / GRID) * GRID,
      y: Math.round(cy / GRID) * GRID,
    };
  }, [pan, scale]);

  const screenToCanvasRaw = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / scale,
      y: (sy - rect.top - pan.y) / scale,
    };
  }, [pan, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    onCoordinatesChange(pos);

    // Pin snap detection when wire tool is active (use raw coords for accurate distance)
    if (activeTool === 'wire') {
      const rawPos = screenToCanvasRaw(e.clientX, e.clientY);
      const allPins = getAllPins();
      const nearest = findNearestPin(rawPos, allPins);
      setHoveredPin(nearest);

      if (isDrawingWire) {
        setWirePreview(nearest ? { x: nearest.x, y: nearest.y } : rawPos);
      }
    } else if (hoveredPin) {
      setHoveredPin(null);
    }

    // Handle component dragging within canvas
    if (draggingId && dragStartRef.current) {
      const rawPos = screenToCanvasRaw(e.clientX, e.clientY);
      const dx = rawPos.x - dragStartRef.current.mouseX;
      const dy = rawPos.y - dragStartRef.current.mouseY;
      const newX = Math.round((dragStartRef.current.compX + dx) / GRID) * GRID;
      const newY = Math.round((dragStartRef.current.compY + dy) / GRID) * GRID;
      didDragRef.current = true;
      setLocalComponents(prev => prev.map(c =>
        c.id === draggingId ? { ...c, x: newX, y: newY } : c
      ));
      return;
    }

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart, screenToCanvas, screenToCanvasRaw, onCoordinatesChange, draggingId, isDrawingWire, activeTool, getAllPins, hoveredPin]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [activeTool, pan]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      if (didDragRef.current) {
        onUpdateComponents(localComponents);
        onStatusChange('Component moved');
        setLocalComponents(prev => prev.map(c => ({ ...c, selected: c.id === draggingId })));
      }
      setDraggingId(null);
      dragStartRef.current = null;
    }
    setIsPanning(false);
  }, [draggingId, localComponents, onUpdateComponents, onStatusChange]);

  // Double-click on a pin to finish wire
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'wire' && isDrawingWire && wireStartPinRef.current) {
      const rawPos = screenToCanvasRaw(e.clientX, e.clientY);
      const allPins = getAllPins();
      const nearest = findNearestPin(rawPos, allPins);
      if (nearest && !(nearest.componentId === wireStartPinRef.current.componentId && nearest.pinName === wireStartPinRef.current.pinName)) {
        const startPin = wireStartPinRef.current;
        const color = getWireColor(startPin.pinName, nearest.pinName);
        const newWire: Wire = {
          id: `w-${Date.now()}`,
          fromComponentId: startPin.componentId,
          fromPinName: startPin.pinName,
          toComponentId: nearest.componentId,
          toPinName: nearest.pinName,
          color,
        };
        onUpdateWires([...wires, newWire]);
        onStatusChange(`Wire: ${startPin.pinName} → ${nearest.pinName}`);
      }
      setIsDrawingWire(false);
      setWirePreview(null);
      wireStartPinRef.current = null;
      setHoveredPin(null);
    }
  }, [activeTool, isDrawingWire, onStatusChange, wires, onUpdateWires, screenToCanvasRaw, getAllPins]);

  // Escape to cancel wire drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingWire) {
        setIsDrawingWire(false);
        setWirePreview(null);
        wireStartPinRef.current = null;
        setHoveredPin(null);
        onStatusChange('Wire drawing cancelled');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingWire, onStatusChange]);

  // Click on a wire to delete it (when delete tool is active)
  const handleWireClick = useCallback((wireId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'delete') {
      onUpdateWires(wires.filter(w => w.id !== wireId));
      onStatusChange(`Wire deleted`);
    }
  }, [activeTool, onStatusChange, wires, onUpdateWires]);

  // Right-click on a component to edit its value
  const handleComponentContextMenu = useCallback((id: string, e: React.MouseEvent) => {
    const comp = localComponents.find(c => c.id === id);
    if (!comp) return;
    const editInfo = EDITABLE_ATTRS[comp.type];
    if (!editInfo) return; // Not an editable component — no popup
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentValue = comp.attrs?.[editInfo.attr] ?? WOKWI_MAP[comp.type]?.attrs?.[editInfo.attr] ?? editInfo.defaultValue;
    setEditingComponentId(id);
    setEditPopupPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setEditValue(currentValue);
    setEditUnit(0); // default to SI unit
  }, [localComponents]);

  // Save edited value back to component
  const handleSaveEdit = useCallback(() => {
    if (!editingComponentId) return;
    const comp = localComponents.find(c => c.id === editingComponentId);
    if (!comp) return;
    const editInfo = EDITABLE_ATTRS[comp.type];
    if (!editInfo) return;
    // Convert to base value using selected unit multiplier
    const unitInfo = editInfo.units[editUnit] || editInfo.units[0];
    const numVal = parseFloat(editValue);
    const baseValue = !isNaN(numVal) ? String(numVal * unitInfo.multiplier) : editValue;
    const updated = localComponents.map(c =>
      c.id === editingComponentId
        ? { ...c, attrs: { ...(c.attrs || {}), [editInfo.attr]: baseValue } }
        : c
    );
    setLocalComponents(updated);
    onUpdateComponents(updated);
    setEditingComponentId(null);
    onStatusChange(`${comp.label}: ${editInfo.label} = ${editValue} ${unitInfo.symbol}`);
  }, [editingComponentId, editValue, editUnit, localComponents, onUpdateComponents, onStatusChange]);

  // Right-click to finish wire at a pin, or cancel (also prevents browser context menu)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent browser context menu on canvas
    if (activeTool === 'wire' && isDrawingWire) {
      const rawPos = screenToCanvasRaw(e.clientX, e.clientY);
      const allPins = getAllPins();
      const nearest = findNearestPin(rawPos, allPins);
      if (nearest && wireStartPinRef.current &&
          !(nearest.componentId === wireStartPinRef.current.componentId && nearest.pinName === wireStartPinRef.current.pinName)) {
        const startPin = wireStartPinRef.current;
        const color = getWireColor(startPin.pinName, nearest.pinName);
        const newWire: Wire = {
          id: `w-${Date.now()}`,
          fromComponentId: startPin.componentId,
          fromPinName: startPin.pinName,
          toComponentId: nearest.componentId,
          toPinName: nearest.pinName,
          color,
        };
        onUpdateWires([...wires, newWire]);
        onStatusChange(`Wire: ${startPin.pinName} → ${nearest.pinName}`);
      } else {
        onStatusChange('Wire drawing cancelled');
      }
      setIsDrawingWire(false);
      setWirePreview(null);
      wireStartPinRef.current = null;
      setHoveredPin(null);
      return;
    }
  }, [activeTool, isDrawingWire, screenToCanvasRaw, onStatusChange, getAllPins, wires, onUpdateWires]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Close value editor if open
    if (editingComponentId) {
      setEditingComponentId(null);
      return;
    }

    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    // Wire drawing: click on a pin to start/finish wire
    if (activeTool === 'wire') {
      const rawPos = screenToCanvasRaw(e.clientX, e.clientY);
      const allPins = getAllPins();
      const nearest = findNearestPin(rawPos, allPins);
      if (!nearest) return; // Must click near a pin
      if (!isDrawingWire) {
        // Start a new wire from this pin
        setIsDrawingWire(true);
        wireStartPinRef.current = nearest;
        setWirePreview({ x: nearest.x, y: nearest.y });
        onStatusChange(`Wire from ${nearest.pinName} — click another pin to connect`);
      } else {
        // Finish the wire at this pin
        const startPin = wireStartPinRef.current!;
        if (startPin.componentId === nearest.componentId && startPin.pinName === nearest.pinName) return;
        const color = getWireColor(startPin.pinName, nearest.pinName);
        const newWire: Wire = {
          id: `w-${Date.now()}`,
          fromComponentId: startPin.componentId,
          fromPinName: startPin.pinName,
          toComponentId: nearest.componentId,
          toPinName: nearest.pinName,
          color,
        };
        onUpdateWires([...wires, newWire]);
        setIsDrawingWire(false);
        setWirePreview(null);
        wireStartPinRef.current = null;
        setHoveredPin(null);
        onStatusChange(`Wire: ${startPin.pinName} → ${nearest.pinName}`);
      }
      return;
    }

    if (activeTool === 'place' && selectedLibComponent) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const type = selectedLibComponent;
      const prefix: Record<string, string> = {
        resistor: 'R', led: 'D', 'led-green': 'D', 'led-blue': 'D', 'led-yellow': 'D',
        'rgb-led': 'D', neopixel: 'D', 'arduino-uno': 'U', 'arduino-nano': 'U',
        'arduino-mega': 'U', esp32: 'U', vcc: 'VCC', gnd: 'GND',
        pushbutton: 'SW', 'slide-switch': 'SW', potentiometer: 'RV', buzzer: 'BZ',
        relay: 'K', servo: 'SRV', '7seg': 'SEG', 'lcd-16x2': 'LCD', 'lcd-20x4': 'LCD',
        ssd1306: 'OLED', dht22: 'DHT', hcsr04: 'US', pir: 'PIR', 'ir-recv': 'IR',
        'ir-remote': 'RC', 'stepper-motor': 'M', 'analog-joystick': 'JS',
        'membrane-keypad': 'KP', 'rotary-encoder': 'RE', 'neopixel-matrix': 'NM',
        'led-bar-graph': 'BG', 'flame-sensor': 'FS', 'gas-sensor': 'GS',
        'ntc-sensor': 'NT', 'photoresistor-sensor': 'LDR', 'sound-sensor': 'SS',
        mpu6050: 'IMU', ds1307: 'RTC', hx711: 'HX', microsd: 'SD',
        'dip-switch-8': 'DS', capacitor: 'C', breadboard: 'BB', 'breadboard-half': 'BB',
      };
      const p = prefix[type] || 'X';
      labelCounters.current[p] = (labelCounters.current[p] || 0) + 1;
      const label = `${p}${labelCounters.current[p]}`;
      onPlaceComponent(type, label, pos.x, pos.y);
    } else if (activeTool === 'select') {
      // Deselect all
      setLocalComponents(prev => prev.map(c => ({ ...c, selected: false })));
    }
  }, [activeTool, selectedLibComponent, screenToCanvas, screenToCanvasRaw, onPlaceComponent, isDrawingWire, onStatusChange, getAllPins, wires, onUpdateWires, editingComponentId]);

  const handleComponentClick = useCallback((id: string) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    // Delete tool: remove component on click
    if (activeTool === 'delete') {
      const comp = localComponents.find(c => c.id === id);
      onDeleteComponent(id);
      if (comp) onStatusChange(`Deleted: ${comp.label} (${comp.type})`);
      return;
    }
    setLocalComponents(prev =>
      prev.map(c => ({ ...c, selected: c.id === id ? !c.selected : false }))
    );
    const comp = localComponents.find(c => c.id === id);
    if (comp) onStatusChange(`Selected: ${comp.label} (${comp.type})`);
  }, [localComponents, onStatusChange, activeTool, onDeleteComponent]);

  const handleComponentMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    const rawPos = screenToCanvasRaw(e.clientX, e.clientY);
    const comp = localComponents.find(c => c.id === id);
    if (!comp) return;
    setDraggingId(id);
    dragStartRef.current = { compX: comp.x, compY: comp.y, mouseX: rawPos.x, mouseY: rawPos.y };
    didDragRef.current = false;
    onStatusChange(`Moving: ${comp.label}`);
  }, [activeTool, localComponents, screenToCanvasRaw, onStatusChange]);

  // BUG 5 FIX: Zoom toward cursor position on scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.25), 3);
    const newZoom = Math.round(newScale * 100);
    const finalScale = newZoom / 100;
    // Keep point under cursor fixed
    const newPanX = mouseX - (mouseX - pan.x) * (finalScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (finalScale / scale);
    setPan({ x: newPanX, y: newPanY });
    onZoomChange(newZoom);
  }, [scale, pan, onZoomChange]);

  // Zoom toward viewport center (for toolbar buttons)
  const zoomToCenter = useCallback((newZoom: number) => {
    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;
    const newScale = newZoom / 100;
    setPan(prev => ({
      x: cx - (cx - prev.x) * (newScale / scale),
      y: cy - (cy - prev.y) * (newScale / scale),
    }));
    onZoomChange(newZoom);
  }, [containerSize, scale, onZoomChange]);

  // BUG 4 FIX: Reset View fits all components
  const resetView = useCallback(() => {
    if (localComponents.length === 0) {
      setPan({ x: 40, y: 40 });
      onZoomChange(100);
      return;
    }
    const xs = localComponents.map(c => c.x);
    const ys = localComponents.map(c => c.y);
    const ws = localComponents.map(c => WOKWI_MAP[c.type]?.width || 60);
    const hs = localComponents.map(c => WOKWI_MAP[c.type]?.height || 40);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
    const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
    const padding = 40;
    const vw = containerSize.width - SCROLLBAR_SIZE;
    const vh = containerSize.height - SCROLLBAR_SIZE;
    const scaleX = vw / (maxX - minX + 2 * padding);
    const scaleY = vh / (maxY - minY + 2 * padding);
    const newScale = Math.min(scaleX, scaleY, 1.5);
    const newZoom = Math.max(25, Math.min(300, Math.round(newScale * 100)));
    const finalScale = newZoom / 100;
    const newPanX = (vw / 2) - ((minX + maxX) / 2) * finalScale;
    const newPanY = (vh / 2) - ((minY + maxY) / 2) * finalScale;
    setPan({ x: newPanX, y: newPanY });
    onZoomChange(newZoom);
  }, [localComponents, containerSize, onZoomChange]);

  // Listen for reset-view events from MainToolbar
  useEffect(() => {
    const handler = () => resetView();
    window.addEventListener('simuide-reset-view', handler);
    return () => window.removeEventListener('simuide-reset-view', handler);
  }, [resetView]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('component');
    if (!type) return;
    const pos = screenToCanvas(e.clientX, e.clientY);
    const prefix: Record<string, string> = {
      resistor: 'R', led: 'D', 'arduino-uno': 'U', vcc: 'VCC', gnd: 'GND',
      pushbutton: 'SW', potentiometer: 'RV', buzzer: 'BZ', servo: 'SRV',
      esp32: 'U', 'arduino-nano': 'U', 'arduino-mega': 'U', capacitor: 'C',
      breadboard: 'BB', 'breadboard-half': 'BB',
    };
    const p = prefix[type] || 'X';
    labelCounters.current[p] = (labelCounters.current[p] || 0) + 1;
    const label = `${p}${labelCounters.current[p]}`;
    onPlaceComponent(type, label, pos.x, pos.y);
  }, [screenToCanvas, onPlaceComponent]);

  // Scrollbar metrics
  const trackW = containerSize.width - SCROLLBAR_SIZE;
  const trackH = containerSize.height - SCROLLBAR_SIZE;
  const viewW = containerSize.width / scale;
  const viewH = containerSize.height / scale;
  const viewX = -pan.x / scale;
  const viewY = -pan.y / scale;
  const hThumbSize = Math.max(30, Math.min(trackW, (viewW / VIRTUAL_W) * trackW));
  const vThumbSize = Math.max(30, Math.min(trackH, (viewH / VIRTUAL_H) * trackH));
  const hThumbPos = Math.max(0, Math.min(trackW - hThumbSize, ((viewX - VIRTUAL_MIN_X) / VIRTUAL_W) * trackW));
  const vThumbPos = Math.max(0, Math.min(trackH - vThumbSize, ((viewY - VIRTUAL_MIN_Y) / VIRTUAL_H) * trackH));

  const cursorClass =
    draggingId ? 'cursor-grabbing' :
    activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' :
    activeTool === 'wire' ? 'cursor-crosshair' :
    activeTool === 'place' ? 'cursor-crosshair' :
    activeTool === 'delete' ? 'cursor-pointer' :
    'cursor-default';

  return (
    <div className={`flex-1 flex flex-col overflow-hidden border-r relative ${darkMode ? 'bg-[#1e1e1e] border-[#3c3c3c]' : 'bg-[#e0e0e0] border-[#c0c0c0]'}`}>
      {/* Clear Canvas button — top-right corner */}
      {onClearCanvas && localComponents.length > 0 && (
        <button
          onClick={onClearCanvas}
          title="Clear Canvas"
          className="absolute top-0 z-20 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition-all"
          style={{
            right: SCROLLBAR_SIZE,
            background: darkMode ? '#3c3c3c' : '#fff',
            borderBottom: darkMode ? '1px solid #555' : '1px solid #c0c0c0',
            borderLeft: darkMode ? '1px solid #555' : '1px solid #c0c0c0',
            borderRadius: '0 0 0 6px',
            color: darkMode ? '#e06c75' : '#c62828',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Clear All
        </button>
      )}
      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${cursorClass}`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: 'block', userSelect: 'none' }}
        >
          <defs>
            {/* Grid pattern */}
            <pattern id="smallGrid" width={GRID * scale} height={GRID * scale} patternUnits="userSpaceOnUse"
              x={pan.x % (GRID * scale)} y={pan.y % (GRID * scale)}>
              <path d={`M ${GRID * scale} 0 L 0 0 0 ${GRID * scale}`}
                fill="none" stroke={darkMode ? '#333' : '#d0d0d0'} strokeWidth="0.5" />
            </pattern>
            <pattern id="bigGrid" width={GRID * 5 * scale} height={GRID * 5 * scale} patternUnits="userSpaceOnUse"
              x={pan.x % (GRID * 5 * scale)} y={pan.y % (GRID * 5 * scale)}>
              <rect width={GRID * 5 * scale} height={GRID * 5 * scale} fill="url(#smallGrid)" />
              <path d={`M ${GRID * 5 * scale} 0 L 0 0 0 ${GRID * 5 * scale}`}
                fill="none" stroke={darkMode ? '#444' : '#b8b8b8'} strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width="100%" height="100%" fill={darkMode ? '#1e1e1e' : 'white'} />
          {showGrid && <rect width="100%" height="100%" fill="url(#bigGrid)" />}

          {/* Canvas content with pan+zoom transform */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* Components (rendered first so wires appear on top) */}
            {localComponents.map(comp => (
              <CanvasComponent key={comp.id} comp={comp} activeTool={activeTool} onClick={handleComponentClick} onMouseDown={handleComponentMouseDown} onContextMenu={handleComponentContextMenu} wokwiRefs={wokwiRefs} />
            ))}

            {/* Simulation visual effects — glow overlays for powered components */}
            {isRunning && localComponents.filter(c => poweredComponents.has(c.id)).map(comp => {
              const wDef = WOKWI_MAP[comp.type];
              const cDef = CUSTOM_SIZES[comp.type];
              const w = wDef?.width ?? cDef?.width ?? 60;
              const h = wDef?.height ?? cDef?.height ?? 40;
              const cx = comp.x + w / 2;
              const cy = comp.y + h / 2;

              // LED glow effect
              if (comp.type.startsWith('led') && comp.type !== 'led-bar-graph' && comp.type !== 'rgb-led') {
                const colorMap: Record<string, string> = {
                  'led': '#ff3333', 'led-green': '#33ff33', 'led-blue': '#3388ff', 'led-yellow': '#ffcc00',
                };
                const glowColor = colorMap[comp.type] || '#ff3333';
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`led-glow-${comp.id}`}>
                        <stop offset="0%" stopColor={glowColor} stopOpacity="0.8" />
                        <stop offset="50%" stopColor={glowColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <circle cx={cx} cy={cy} r={Math.max(w, h) * 0.8} fill={`url(#led-glow-${comp.id})`}>
                      <animate attributeName="r" values={`${Math.max(w, h) * 0.7};${Math.max(w, h) * 0.9};${Math.max(w, h) * 0.7}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              }

              // RGB LED glow
              if (comp.type === 'rgb-led') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`rgb-glow-${comp.id}`}>
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <circle cx={cx} cy={cy} r={Math.max(w, h) * 0.8} fill={`url(#rgb-glow-${comp.id})`}>
                      <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              }

              // Buzzer — pulsing sound waves
              if (comp.type === 'buzzer') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <circle cx={cx} cy={cy} r={w * 0.5} fill="none" stroke="#ff9800" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" values={`${w * 0.4};${w * 0.8};${w * 0.4}`} dur="0.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={w * 0.3} fill="none" stroke="#ff9800" strokeWidth="1" opacity="0.4">
                      <animate attributeName="r" values={`${w * 0.3};${w * 0.6};${w * 0.3}`} dur="0.6s" repeatCount="indefinite" begin="0.15s" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="0.6s" repeatCount="indefinite" begin="0.15s" />
                    </circle>
                  </g>
                );
              }

              // Servo — rotating indicator
              if (comp.type === 'servo') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <circle cx={cx} cy={cy} r={w * 0.35} fill="none" stroke="#2196f3" strokeWidth="2" strokeDasharray="6 3" opacity="0.6">
                      <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur="3s" repeatCount="indefinite" />
                    </circle>
                    <line x1={cx} y1={cy} x2={cx + w * 0.3} y2={cy} stroke="#2196f3" strokeWidth="2" opacity="0.7">
                      <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};180 ${cx} ${cy};0 ${cx} ${cy}`} dur="2s" repeatCount="indefinite" />
                    </line>
                  </g>
                );
              }

              // Relay — toggle switch animation
              if (comp.type === 'relay') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <rect x={comp.x - 3} y={comp.y - 3} width={w + 6} height={h + 6} rx={3} fill="none" stroke="#ff9800" strokeWidth="2" opacity="0.6">
                      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1s" repeatCount="indefinite" />
                    </rect>
                    {/* Toggle indicator line */}
                    <line x1={cx - 12} y1={cy} x2={cx + 8} y2={cy - 8} stroke="#ff9800" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
                      <animate attributeName="y2" values={`${cy - 8};${cy + 8};${cy - 8}`} dur="1.2s" repeatCount="indefinite" />
                    </line>
                    {/* Contact points */}
                    <circle cx={cx - 12} cy={cy} r={2.5} fill="#ff9800" opacity="0.9" />
                    <circle cx={cx + 10} cy={cy - 8} r={2} fill="#ff9800" opacity="0.7" />
                    <circle cx={cx + 10} cy={cy + 8} r={2} fill="#ff9800" opacity="0.7" />
                    {/* CLICK text */}
                    <text x={cx} y={comp.y - 6} textAnchor="middle" fontSize="8" fill="#ff9800" fontWeight="bold" opacity="0.7">
                      <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
                      CLICK
                    </text>
                  </g>
                );
              }

              // 7-Segment Display — glowing segments
              if (comp.type === '7seg') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`seg-glow-${comp.id}`}>
                        <stop offset="0%" stopColor="#ff1744" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#ff1744" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <rect x={comp.x - 4} y={comp.y - 4} width={w + 8} height={h + 8} rx={3} fill={`url(#seg-glow-${comp.id})`}>
                      <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
                    </rect>
                    {/* Simulated digit "8" outline */}
                    <text x={cx} y={cy + 4} textAnchor="middle" fontSize={h * 0.5} fill="#ff1744" fontFamily="monospace" opacity="0.4">
                      <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
                      8
                    </text>
                  </g>
                );
              }

              // LCD 16x2 / 20x4 — backlight glow
              if (comp.type === 'lcd-16x2' || comp.type === 'lcd-20x4') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`lcd-glow-${comp.id}`}>
                        <stop offset="0%" stopColor="#7ec8a0" stopOpacity="0.4" />
                        <stop offset="80%" stopColor="#7ec8a0" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#7ec8a0" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <rect x={comp.x + 4} y={comp.y + 4} width={w - 8} height={h - 8} rx={2} fill={`url(#lcd-glow-${comp.id})`}>
                      <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
                    </rect>
                    {/* Cursor blink */}
                    <rect x={comp.x + 12} y={comp.y + h * 0.35} width={6} height={h * 0.15} fill="#333" opacity="0.8">
                      <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                    </rect>
                    {/* Power indicator */}
                    <circle cx={comp.x + w - 8} cy={comp.y + h - 8} r={3} fill="#4caf50" opacity="0.9">
                      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              }

              // OLED SSD1306 — screen on glow
              if (comp.type === 'ssd1306') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`oled-glow-${comp.id}`}>
                        <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.5" />
                        <stop offset="80%" stopColor="#4fc3f7" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#0288d1" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <rect x={comp.x + 2} y={comp.y + 2} width={w - 4} height={h - 4} rx={2} fill={`url(#oled-glow-${comp.id})`}>
                      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
                    </rect>
                    {/* Pixel noise effect */}
                    {[0,1,2,3,4].map(i => (
                      <rect key={i} x={comp.x + 10 + i * 18} y={comp.y + h * 0.3} width={12} height={2} fill="#4fc3f7" opacity="0.6">
                        <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${0.8 + i * 0.2}s`} repeatCount="indefinite" />
                      </rect>
                    ))}
                  </g>
                );
              }

              // NeoPixel — rainbow color cycling
              if (comp.type === 'neopixel') {
                const neoColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`neo-glow-${comp.id}`}>
                        <stop offset="0%" stopColor="#e040fb" stopOpacity="0.8">
                          <animate attributeName="stop-color" values={neoColors.join(';')} dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="60%" stopColor="#e040fb" stopOpacity="0.3">
                          <animate attributeName="stop-color" values={[...neoColors.slice(2), ...neoColors.slice(0, 2)].join(';')} dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#e040fb" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <circle cx={cx} cy={cy} r={Math.max(w, h) * 0.9} fill={`url(#neo-glow-${comp.id})`}>
                      <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              }

              // NeoPixel Matrix — multi-colored grid glow
              if (comp.type === 'neopixel-matrix') {
                const matrixColors = ['#e040fb', '#00e676', '#ff5252', '#448aff', '#ff9100', '#00e5ff'];
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    {[0,1,2,3].map(row => [0,1,2,3].map(col => {
                      const colorIdx = (row + col) % matrixColors.length;
                      const px = comp.x + 12 + col * (w - 24) / 3;
                      const py = comp.y + 12 + row * (h - 24) / 3;
                      return (
                        <circle key={`${row}-${col}`} cx={px} cy={py} r={6} fill={matrixColors[colorIdx]} opacity="0.7">
                          <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${1 + (row * 4 + col) * 0.15}s`} repeatCount="indefinite" />
                          <animate attributeName="r" values="4;7;4" dur={`${1.2 + (row * 4 + col) * 0.1}s`} repeatCount="indefinite" />
                        </circle>
                      );
                    }))}
                  </g>
                );
              }

              // LED Bar Graph — bars lighting up sequentially
              if (comp.type === 'led-bar-graph') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    {[0,1,2,3,4,5,6,7,8,9].map(i => {
                      const barColor = i < 3 ? '#4caf50' : i < 7 ? '#ff9800' : '#f44336';
                      const bx = comp.x + 6 + i * (w - 12) / 10;
                      return (
                        <rect key={i} x={bx} y={comp.y + 4} width={(w - 12) / 10 - 2} height={h - 8} rx={1} fill={barColor} opacity="0.6">
                          <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${0.5 + i * 0.15}s`} repeatCount="indefinite" begin={`${i * 0.1}s`} />
                          <animate attributeName="height" values={`${(h - 8) * 0.3};${h - 8};${(h - 8) * 0.3}`} dur={`${0.5 + i * 0.15}s`} repeatCount="indefinite" begin={`${i * 0.1}s`} />
                          <animate attributeName="y" values={`${comp.y + h - 4 - (h - 8) * 0.3};${comp.y + 4};${comp.y + h - 4 - (h - 8) * 0.3}`} dur={`${0.5 + i * 0.15}s`} repeatCount="indefinite" begin={`${i * 0.1}s`} />
                        </rect>
                      );
                    })}
                  </g>
                );
              }

              // Stepper Motor — spinning gear indicator
              if (comp.type === 'stepper-motor') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <circle cx={cx} cy={cy} r={w * 0.35} fill="none" stroke="#9e9e9e" strokeWidth="2.5" strokeDasharray="8 4" opacity="0.7">
                      <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={cx} cy={cy} r={w * 0.2} fill="none" stroke="#757575" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5">
                      <animateTransform attributeName="transform" type="rotate" values={`360 ${cx} ${cy};0 ${cx} ${cy}`} dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    {/* Shaft line */}
                    <line x1={cx} y1={cy} x2={cx + w * 0.28} y2={cy} stroke="#616161" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
                      <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur="2s" repeatCount="indefinite" />
                    </line>
                    {/* RPM text */}
                    <text x={cx} y={comp.y + h + 14} textAnchor="middle" fontSize="8" fill="#9e9e9e" fontWeight="bold" opacity="0.7">
                      ⟳ RUNNING
                    </text>
                  </g>
                );
              }

              // Ultrasonic HC-SR04 — wave emission
              if (comp.type === 'hcsr04') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    {/* Wave arcs emanating forward from sensor */}
                    {[0,1,2].map(i => (
                      <path key={i} d={`M ${comp.x + w + 5} ${cy - 15} Q ${comp.x + w + 25 + i * 15} ${cy} ${comp.x + w + 5} ${cy + 15}`}
                        fill="none" stroke="#00bcd4" strokeWidth="1.5" opacity="0.6">
                        <animate attributeName="opacity" values="0.7;0;0.7" dur="1.2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                        <animate attributeName="stroke-width" values="1.5;0.5;1.5" dur="1.2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                      </path>
                    ))}
                    {/* Active indicator */}
                    <rect x={comp.x - 3} y={comp.y - 3} width={w + 6} height={h + 6} rx={3} fill="none" stroke="#00bcd4" strokeWidth="1.5" opacity="0.4">
                      <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                    {/* Distance readout */}
                    <text x={cx} y={comp.y + h + 14} textAnchor="middle" fontSize="8" fill="#00bcd4" fontWeight="bold" opacity="0.8">
                      ))) SCANNING
                    </text>
                  </g>
                );
              }

              // PIR Motion Sensor — radial detection pulse
              if (comp.type === 'pir') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <defs>
                      <radialGradient id={`pir-glow-${comp.id}`}>
                        <stop offset="0%" stopColor="#ff5722" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ff5722" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    {/* Detection zone cone */}
                    <circle cx={cx} cy={cy} r={w * 0.8} fill={`url(#pir-glow-${comp.id})`}>
                      <animate attributeName="r" values={`${w * 0.6};${w * 1.2};${w * 0.6}`} dur="2s" repeatCount="indefinite" />
                    </circle>
                    {/* Scanning sweeps */}
                    {[0,1,2].map(i => (
                      <circle key={i} cx={cx} cy={cy} r={w * 0.4} fill="none" stroke="#ff5722" strokeWidth="1" opacity="0.4">
                        <animate attributeName="r" values={`${w * 0.3};${w * 0.9};${w * 0.3}`} dur="2s" repeatCount="indefinite" begin={`${i * 0.6}s`} />
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" begin={`${i * 0.6}s`} />
                      </circle>
                    ))}
                    {/* Active text */}
                    <text x={cx} y={comp.y + h + 16} textAnchor="middle" fontSize="7" fill="#ff5722" fontWeight="bold" opacity="0.7">
                      DETECTING
                    </text>
                  </g>
                );
              }

              // DHT22 Temperature/Humidity — reading indicator
              if (comp.type === 'dht22') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <rect x={comp.x - 3} y={comp.y - 3} width={w + 6} height={h + 6} rx={4} fill="none" stroke="#00796b" strokeWidth="1.5" opacity="0.5">
                      <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
                    </rect>
                    {/* Temperature reading */}
                    <text x={cx} y={comp.y + h + 12} textAnchor="middle" fontSize="8" fill="#00796b" fontWeight="bold" opacity="0.8">
                      25°C · 60%
                    </text>
                  </g>
                );
              }

              // IR Receiver — blinking receive indicator
              if (comp.type === 'ir-recv') {
                return (
                  <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                    <circle cx={cx} cy={comp.y + 6} r={5} fill="#c62828" opacity="0.7">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                    <rect x={comp.x - 3} y={comp.y - 3} width={w + 6} height={h + 6} rx={3} fill="none" stroke="#c62828" strokeWidth="1.5" opacity="0.4">
                      <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                  </g>
                );
              }

              // Generic powered indicator (green pulse outline) — for any other type
              return (
                <g key={`glow-${comp.id}`} style={{ pointerEvents: 'none' }}>
                  <rect x={comp.x - 4} y={comp.y - 4} width={w + 8} height={h + 8} rx={4}
                    fill="none" stroke="#4caf50" strokeWidth="2" opacity="0.5">
                    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                  <circle cx={comp.x + w - 2} cy={comp.y + 2} r={4} fill="#4caf50" opacity="0.8">
                    <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}

            {/* Wires — rendered ABOVE components so they are always visible */}
            {wires.map(wire => {
              const from = resolvePinPosition(wire.fromComponentId, wire.fromPinName);
              const to = resolvePinPosition(wire.toComponentId, wire.toPinName);
              if (!from || !to) return null;
              const fromComp = localComponents.find(c => c.id === wire.fromComponentId);
              const toComp = localComponents.find(c => c.id === wire.toComponentId);
              const comp1Rect = fromComp ? getComponentRect(fromComp) : null;
              const comp2Rect = toComp ? getComponentRect(toComp) : null;
              const others = localComponents
                .filter(c => c.id !== wire.fromComponentId && c.id !== wire.toComponentId)
                .map(c => getComponentRect(c));
              const d = routeWire(from.x, from.y, to.x, to.y, comp1Rect, comp2Rect, others);
              return (
                <g key={wire.id}>
                  <path d={d} fill="none"
                    stroke={activeTool === 'delete' ? '#c62828' : wire.color}
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    style={{ cursor: activeTool === 'delete' ? 'pointer' : 'default' }}
                    onClick={(ev) => handleWireClick(wire.id, ev)} />
                  {/* Wider invisible hit area */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ cursor: activeTool === 'delete' ? 'pointer' : 'default' }}
                    onClick={(ev) => handleWireClick(wire.id, ev)} />
                  {/* Connection dots at endpoints */}
                  <circle cx={from.x} cy={from.y} r={3} fill={wire.color} stroke="white" strokeWidth={0.5} />
                  <circle cx={to.x} cy={to.y} r={3} fill={wire.color} stroke="white" strokeWidth={0.5} />
                </g>
              );
            })}

            {/* In-progress wire preview */}
            {isDrawingWire && wireStartPinRef.current && wirePreview && (() => {
              const startComp = localComponents.find(c => c.id === wireStartPinRef.current!.componentId);
              const startRect = startComp ? getComponentRect(startComp) : null;
              const previewOthers = localComponents
                .filter(c => c.id !== wireStartPinRef.current!.componentId)
                .map(c => getComponentRect(c));
              return <path
                d={routeWire(wireStartPinRef.current.x, wireStartPinRef.current.y, wirePreview.x, wirePreview.y, startRect, null, previewOthers)}
                fill="none"
                stroke="#1b9e1b"
                strokeWidth={2}
                strokeDasharray="6 3"
                strokeLinecap="round"
                opacity={0.7}
              />;
            })()}

            {/* Pin indicators when wire tool is active */}
            {activeTool === 'wire' && getAllPins().map((pin, i) => (
              <circle
                key={`pin-${pin.componentId}-${pin.pinName}-${i}`}
                cx={pin.x}
                cy={pin.y}
                r={hoveredPin?.componentId === pin.componentId && hoveredPin?.pinName === pin.pinName ? 6 : 3.5}
                fill={hoveredPin?.componentId === pin.componentId && hoveredPin?.pinName === pin.pinName ? '#ff4081' : '#4caf50'}
                stroke="white"
                strokeWidth="1"
                opacity="0.85"
                style={{ pointerEvents: 'none' }}
              />
            ))}

            {/* Pin name tooltip on hover */}
            {hoveredPin && activeTool === 'wire' && (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={hoveredPin.x + 10}
                  y={hoveredPin.y - 22}
                  width={Math.max(hoveredPin.pinName.length * 7 + 12, 32)}
                  height={18}
                  rx="4"
                  fill="rgba(0,0,0,0.85)"
                />
                <text
                  x={hoveredPin.x + 16}
                  y={hoveredPin.y - 9}
                  fontSize="10"
                  fill="white"
                  fontFamily="monospace"
                >
                  {hoveredPin.pinName}
                </text>
              </g>
            )}

            {/* Coordinate origin indicator */}
            <g opacity="0.2">
              <line x1="0" y1="-20" x2="0" y2="20" stroke="#888" strokeWidth="1" />
              <line x1="-20" y1="0" x2="20" y2="0" stroke="#888" strokeWidth="1" />
            </g>
          </g>
        </svg>

        {/* Placement ghost / hint */}
        {activeTool === 'place' && selectedLibComponent && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0078d7] text-white text-[11px] px-3 py-1 rounded-full shadow pointer-events-none">
            Click to place · Esc to cancel
          </div>
        )}

        {activeTool === 'wire' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1565c0] text-white text-[11px] px-3 py-1 rounded-full shadow pointer-events-none">
            {isDrawingWire ? 'Click a pin to connect · Esc to cancel' : 'Click a pin to start drawing a wire'}
          </div>
        )}

        {activeTool === 'delete' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#c62828] text-white text-[11px] px-3 py-1 rounded-full shadow pointer-events-none">
            Click a component or wire to delete it
          </div>
        )}

        {/* Right-click value editor popup */}
        {editingComponentId && (() => {
          const comp = localComponents.find(c => c.id === editingComponentId);
          if (!comp) return null;
          const editInfo = EDITABLE_ATTRS[comp.type];
          if (!editInfo) return null;
          return (
            <div
              className="absolute z-50"
              style={{ left: editPopupPos.x, top: editPopupPos.y }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="bg-[#f8f8f8] border border-[#c0c0c0] rounded-lg shadow-xl min-w-[220px]"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#e8e8ea] to-[#dcdcde] border-b border-[#d0d0d0] rounded-t-lg">
                  <span className="text-[11px] font-semibold text-[#333]">{comp.label} — {comp.type}</span>
                </div>
                <div className="px-3 py-3">
                  <label className="text-[11px] text-[#666] mb-1.5 block font-medium">{editInfo.label}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingComponentId(null);
                        e.stopPropagation();
                      }}
                      className="border border-[#c0c0c0] rounded px-2 py-1 text-[12px] w-[90px] bg-white focus:outline-none focus:border-[#0078d7] focus:ring-1 focus:ring-[#0078d7]/30"
                      autoFocus
                    />
                    <select
                      value={editUnit}
                      onChange={e => setEditUnit(Number(e.target.value))}
                      onKeyDown={e => e.stopPropagation()}
                      className="border border-[#c0c0c0] rounded px-1.5 py-1 text-[12px] bg-white focus:outline-none focus:border-[#0078d7] focus:ring-1 focus:ring-[#0078d7]/30 font-mono cursor-pointer"
                    >
                      {editInfo.units.map((u, i) => (
                        <option key={u.symbol} value={i}>{u.symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-[#e0e0e0] bg-[#f0f0f0] rounded-b-lg">
                  <button
                    onClick={() => setEditingComponentId(null)}
                    className="text-[11px] px-3 py-1 rounded border border-[#c0c0c0] bg-white hover:bg-[#f0f0f0] text-[#555] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="text-[11px] px-3 py-1 rounded bg-[#0078d7] text-white hover:bg-[#006abc] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {localComponents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[#bbb] text-[14px]">Drag components here</p>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mt-1 text-[#ccc]">
              <path d="M12 4v16m0 0l-4-4m4 4l4-4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Horizontal scrollbar */}
        <div
          className={`absolute bottom-0 left-0 border-t ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-[#f0f0f0] border-[#d4d4d4]'}`}
          style={{ height: SCROLLBAR_SIZE, width: containerSize.width - SCROLLBAR_SIZE, zIndex: 10 }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = e.clientX - rect.left;
            const newViewX = (clickPos / trackW) * VIRTUAL_W + VIRTUAL_MIN_X - viewW / 2;
            setPan(prev => ({ ...prev, x: -newViewX * scale }));
          }}
        >
          <div
            className="absolute top-[2px] rounded-full bg-[#b0b0b0] hover:bg-[#888] active:bg-[#666] transition-colors"
            style={{
              height: SCROLLBAR_SIZE - 4,
              width: hThumbSize,
              left: hThumbPos,
              cursor: 'pointer',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollDragRef.current = { axis: 'h', startMouse: e.clientX, startPan: pan.x };
            }}
          />
        </div>

        {/* Vertical scrollbar */}
        <div
          className={`absolute top-0 right-0 border-l ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-[#f0f0f0] border-[#d4d4d4]'}`}
          style={{ width: SCROLLBAR_SIZE, height: containerSize.height - SCROLLBAR_SIZE, zIndex: 10 }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = e.clientY - rect.top;
            const newViewY = (clickPos / trackH) * VIRTUAL_H + VIRTUAL_MIN_Y - viewH / 2;
            setPan(prev => ({ ...prev, y: -newViewY * scale }));
          }}
        >
          <div
            className="absolute left-[2px] rounded-full bg-[#b0b0b0] hover:bg-[#888] active:bg-[#666] transition-colors"
            style={{
              width: SCROLLBAR_SIZE - 4,
              height: vThumbSize,
              top: vThumbPos,
              cursor: 'pointer',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollDragRef.current = { axis: 'v', startMouse: e.clientY, startPan: pan.y };
            }}
          />
        </div>

        {/* Corner square */}
        <div
          className={`absolute bottom-0 right-0 border-t border-l ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-[#f0f0f0] border-[#d4d4d4]'}`}
          style={{ width: SCROLLBAR_SIZE, height: SCROLLBAR_SIZE, zIndex: 10 }}
        />
      </div>
    </div>
  );
}
