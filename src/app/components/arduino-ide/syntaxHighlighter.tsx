import React from "react";

const KEYWORDS = new Set([
  "void", "int", "float", "double", "bool", "boolean", "char", "byte",
  "long", "short", "unsigned", "signed", "const", "static", "volatile",
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
  "return", "new", "delete", "class", "struct", "typedef", "enum",
  "public", "private", "protected", "String", "array", "sizeof",
]);

const CONSTANTS = new Set([
  "true", "false", "null", "NULL", "HIGH", "LOW", "INPUT", "OUTPUT",
  "INPUT_PULLUP", "LED_BUILTIN", "A0", "A1", "A2", "A3", "A4", "A5",
  "MSBFIRST", "LSBFIRST", "CHANGE", "RISING", "FALLING",
]);

const ARDUINO_FUNCS = new Set([
  "setup", "loop", "pinMode", "digitalWrite", "digitalRead",
  "analogRead", "analogWrite", "analogReference", "delay",
  "delayMicroseconds", "millis", "micros", "map", "constrain",
  "min", "max", "abs", "sq", "sqrt", "pow", "random", "randomSeed",
  "tone", "noTone", "pulseIn", "shiftIn", "shiftOut",
  "attachInterrupt", "detachInterrupt", "interrupts", "noInterrupts",
  "Serial", "Serial1", "Wire", "SPI", "Servo", "println", "print",
  "begin", "available", "read", "write", "end", "attach", "detach",
  "writeMicroseconds", "servo", "available", "parseInt", "parseFloat",
  "flush", "peek", "setTimeout",
]);

type TokenType =
  | "keyword"
  | "constant"
  | "function"
  | "comment"
  | "string"
  | "number"
  | "preprocessor"
  | "operator"
  | "text";

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Block comment
    if (code[i] === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const val = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push({ type: "comment", value: val });
      i += val.length;
      continue;
    }
    // Line comment
    if (code[i] === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const val = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: "comment", value: val });
      i += val.length;
      continue;
    }
    // Preprocessor
    if (code[i] === "#" && (i === 0 || code[i - 1] === "\n")) {
      const end = code.indexOf("\n", i);
      const val = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: "preprocessor", value: val });
      i += val.length;
      continue;
    }
    // String
    if (code[i] === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"' && code[j] !== "\n") {
        if (code[j] === "\\") j++;
        j++;
      }
      const val = code.slice(i, j + 1);
      tokens.push({ type: "string", value: val });
      i = j + 1;
      continue;
    }
    // Char literal
    if (code[i] === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== "'" && code[j] !== "\n") {
        if (code[j] === "\\") j++;
        j++;
      }
      const val = code.slice(i, j + 1);
      tokens.push({ type: "string", value: val });
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9]/.test(code[i]) || (code[i] === "." && /[0-9]/.test(code[i + 1] || ""))) {
      let j = i;
      if (code[j] === "0" && (code[j + 1] === "x" || code[j + 1] === "X")) {
        j += 2;
        while (/[0-9a-fA-F]/.test(code[j] || "")) j++;
      } else {
        while (/[0-9.]/.test(code[j] || "")) j++;
        if (code[j] === "f" || code[j] === "F" || code[j] === "L" || code[j] === "l") j++;
      }
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (/[a-zA-Z0-9_$]/.test(code[j] || "")) j++;
      const word = code.slice(i, j);
      if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (CONSTANTS.has(word)) {
        tokens.push({ type: "constant", value: word });
      } else if (ARDUINO_FUNCS.has(word)) {
        tokens.push({ type: "function", value: word });
      } else {
        tokens.push({ type: "text", value: word });
      }
      i = j;
      continue;
    }
    // Operator
    if (/[+\-*/%=<>!&|^~?:;.,()[\]{}]/.test(code[i])) {
      tokens.push({ type: "operator", value: code[i] });
      i++;
      continue;
    }
    // Whitespace and other
    tokens.push({ type: "text", value: code[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: "#569CD6",
  constant: "#4FC1FF",
  function: "#DCDCAA",
  comment: "#6A9955",
  string: "#CE9178",
  number: "#B5CEA8",
  preprocessor: "#C586C0",
  operator: "#D4D4D4",
  text: "#D4D4D4",
};

export function SyntaxHighlight({ code }: { code: string }) {
  const tokens = tokenize(code);
  return (
    <>
      {tokens.map((token, idx) => (
        <span key={idx} style={{ color: TOKEN_COLORS[token.type] }}>
          {token.value}
        </span>
      ))}
    </>
  );
}
