import json
import os
import re
import sys

try:
    from google import genai as google_genai
except Exception:
    google_genai = None

try:
    # Optional ADK runtime path. We keep the agent contract stable and fall
    # back to the Google SDK path if ADK is unavailable at runtime.
    import google.adk  # noqa: F401
    HAS_GOOGLE_ADK = True
except Exception:
    HAS_GOOGLE_ADK = False

ACTION_INTENT_KEYWORDS = [
    "wire",
    "wiring",
    "connect",
    "connected",
    "place",
    "add led",
    "blink",
    "blinking",
    "build project",
    "build",
    "compile",
    "simulate",
    "start simulation",
    "code",
    "generate code",
    "canvas",
]

COMPONENT_TYPE_ALIASES = {
    "arduino uno": "arduino-uno",
    "uno": "arduino-uno",
    "arduino": "arduino-uno",
    "led": "led",
    "resistor": "resistor",
    "gnd": "gnd",
    "ground": "gnd",
    "vcc": "vcc",
}

VALID_ACTION_TYPES = {
    "PLACE_COMPONENT",
    "ADD_WIRE",
    "DELETE_COMPONENT",
    "DELETE_WIRE",
    "UPDATE_CODE",
    "VERIFY_BUILD",
    "START_SIMULATION",
    "STOP_SIMULATION",
}

PIN_SEQUENCE = ["13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2"]
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
GENAI_CLIENT = None


def clean_reply_text(text):
    value = str(text or "").strip()
    if not value:
        return ""
    # Collapse accidental repeated whitespace and repeated trailing lines.
    value = re.sub(r"[ \t]+", " ", value)
    lines = [ln.strip() for ln in value.splitlines() if ln.strip()]
    deduped = []
    for ln in lines:
        if not deduped or deduped[-1].lower() != ln.lower():
            deduped.append(ln)
    return "\n".join(deduped).strip()


def summarize_actions_for_user(actions):
    if not isinstance(actions, list) or not actions:
        return "Done."
    counts = {}
    for action in actions:
        if not isinstance(action, dict):
            continue
        atype = str(action.get("type", "")).upper()
        counts[atype] = counts.get(atype, 0) + 1

    parts = []
    if counts.get("PLACE_COMPONENT"):
        parts.append(f"placed {counts['PLACE_COMPONENT']} component(s)")
    if counts.get("ADD_WIRE"):
        parts.append(f"added {counts['ADD_WIRE']} wire(s)")
    if counts.get("UPDATE_CODE"):
        parts.append("updated code")
    if counts.get("VERIFY_BUILD"):
        parts.append("started build/verify")
    if counts.get("START_SIMULATION"):
        parts.append("started simulation")
    if counts.get("STOP_SIMULATION"):
        parts.append("stopped simulation")
    if not parts:
        return "Actions were applied."
    return "Done: " + ", ".join(parts) + "."


def normalize_pin(pin_str):
    """Convert 'id.pins.pinName' or 'id.pinName' to 'id:pinName' format."""
    if not pin_str:
        return pin_str
    if ":" in pin_str:
        return pin_str
    parts = pin_str.split(".")
    if len(parts) >= 3 and parts[1] == "pins":
        return f"{parts[0]}:{parts[2]}"
    if len(parts) == 2:
        return f"{parts[0]}:{parts[1]}"
    return pin_str


def _sanitize_ref_token(value, max_len=48):
    token = str(value or "").strip().strip('"').strip("'")
    if not token:
        return ""
    if len(token) > max_len:
        return ""
    if "\n" in token or "\r" in token or "\t" in token:
        return ""
    if token.startswith("{") or token.startswith("[") or token.endswith("}") or token.endswith("]"):
        return ""
    if re.search(r"""["'][A-Za-z_][\w-]*["']\s*:""", token):
        return ""
    if "{" in token and ":" in token and "," in token:
        return ""
    return token


def normalize_action(action):
    """Normalize action types and pin formats to match frontend schema."""
    # Some models return `action`/`operation` instead of `type`.
    action_type = str(
        action.get("type")
        or action.get("action")
        or action.get("operation")
        or ""
    ).upper()
    type_map = {
        "ADD": "PLACE_COMPONENT",
        "PLACE": "PLACE_COMPONENT",
        "PLACE_COMPONENT": "PLACE_COMPONENT",
        "CONNECT": "ADD_WIRE",
        "ADD_WIRE": "ADD_WIRE",
        "REMOVE": "DELETE_COMPONENT",
        "DELETE": "DELETE_COMPONENT",
        "DELETE_COMPONENT": "DELETE_COMPONENT",
        "REMOVE_WIRE": "DELETE_WIRE",
        "DELETE_WIRE": "DELETE_WIRE",
        "START_SIMULATION": "START_SIMULATION",
        "SIMULATE": "START_SIMULATION",
        "RUN_SIMULATION": "START_SIMULATION",
        "STOP_SIMULATION": "STOP_SIMULATION",
        "UPDATE_CODE": "UPDATE_CODE",
        "WRITE_CODE": "UPDATE_CODE",
        "VERIFY_BUILD": "VERIFY_BUILD",
        "BUILD_PROJECT": "VERIFY_BUILD",
        "TEST_PROJECT": "VERIFY_BUILD",
        "COMPILE": "VERIFY_BUILD",
    }
    normalized_type = type_map.get(action_type, action.get("type"))
    result = {**action, "type": normalized_type}

    if normalized_type == "PLACE_COMPONENT":
        raw_type = (
            action.get("componentType")
            or action.get("component")
            or action.get("name")
            or ""
        )
        lowered = str(raw_type).strip().lower()
        result["componentType"] = COMPONENT_TYPE_ALIASES.get(lowered, lowered or "led")
        clean_label = _sanitize_ref_token(result.get("label") or action.get("label"))
        clean_id = _sanitize_ref_token(result.get("id") or action.get("id"))
        if clean_label:
            result["label"] = clean_label
        elif "label" in result:
            result.pop("label", None)
        if clean_id:
            result["id"] = clean_id
        elif "id" in result:
            result.pop("id", None)
        if not result.get("label"):
            default_label_map = {
                "arduino-uno": "U1",
                "led": "D1",
                "resistor": "R1",
            }
            result["label"] = default_label_map.get(result["componentType"], result["componentType"].upper())

    if normalized_type == "ADD_WIRE":
        from_str = action.get("from") or action.get("from1") or ""
        to_str = action.get("to", "")
        result["from"] = normalize_pin(from_str)
        result["to"] = normalize_pin(to_str)

    if normalized_type == "UPDATE_CODE":
        result["code"] = action.get("code", "")
        result["fileName"] = action.get("fileName", "Blink.ino")

    return result


def extract_json_object(text):
    """Extract first JSON object from a model response."""
    if not text:
        return None

    fenced = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fenced:
        candidate = fenced.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def attempt_repair_json_payload(text):
    """Best-effort repair for near-JSON model payloads."""
    if not text:
        return None
    candidate = str(text).strip()

    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", candidate, re.IGNORECASE)
    if fenced:
        candidate = fenced.group(1).strip()

    # Keep the widest JSON object region if surrounding prose exists.
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = candidate[start : end + 1]

    # Remove trailing commas before closing object/list.
    candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
    # Normalize fancy quotes that occasionally appear in model output.
    candidate = candidate.replace("“", '"').replace("”", '"').replace("’", "'")

    try:
        return json.loads(candidate)
    except Exception:
        return None


def _resolve_agent_model(requested_model):
    configured_gemini_model = (
        os.environ.get("GEMINI_AGENT_MODEL")
        or os.environ.get("GEMINI_MODEL")
        or DEFAULT_GEMINI_MODEL
    )
    chosen = str(requested_model).strip() if requested_model else configured_gemini_model
    # Normalize non-Gemini aliases passed from UI/config to configured Gemini model.
    alias_map = {
        "gemma3:latest": configured_gemini_model,
        "gemma3:4b": configured_gemini_model,
        "gemma3:12b": configured_gemini_model,
        "models/gemma3:latest": configured_gemini_model,
        "huggingface/google/gemma-3-4b-it": configured_gemini_model,
        "google/gemma-3-4b-it": configured_gemini_model,
    }
    return alias_map.get(chosen.lower(), chosen)


def _get_genai_client():
    global GENAI_CLIENT
    if GENAI_CLIENT is not None:
        return GENAI_CLIENT
    if google_genai is None:
        raise RuntimeError(
            "google-genai is not installed. Run `pip install -r requirements.txt`."
        )
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    GENAI_CLIENT = google_genai.Client(api_key=api_key)
    return GENAI_CLIENT


def post_genai_chat(model, system_instruction, user_payload, image_base64=None, temperature=0.2):
    client = _get_genai_client()
    model_name = _resolve_agent_model(model)

    prompt_parts = [
        "Return JSON only.",
        "SYSTEM INSTRUCTION:",
        system_instruction,
        "USER PAYLOAD:",
        json.dumps(user_payload),
    ]
    contents = [{"text": "\n".join(prompt_parts)}]
    if image_base64:
        # Pass image context when provided. Agent behavior does not depend on it,
        # but this preserves multimodal support parity.
        contents.append(
            {
                "inline_data": {
                    "mime_type": "image/png",
                    "data": image_base64,
                }
            }
        )

    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config={
            "temperature": temperature,
            "response_mime_type": "application/json",
        },
    )

    text = getattr(response, "text", None)
    if not text and getattr(response, "candidates", None):
        parts = (
            response.candidates[0]
            .content
            .parts
        )
        text = "".join(getattr(part, "text", "") for part in parts if getattr(part, "text", ""))

    return {
        "response": text or "",
        "runtime": "genai-adk" if HAS_GOOGLE_ADK else "genai-sdk",
    }


def parse_model_json_payload(model_response):
    parsed = model_response
    content = parsed.get("response") or ""
    payload = extract_json_object(content)
    if payload:
        return payload, False
    repaired = attempt_repair_json_payload(content)
    if repaired:
        return repaired, True
    raise RuntimeError("Model did not return valid JSON action payload.")


def extract_actions_from_payload(payload):
    """Accept multiple response shapes and return a normalized actions list."""
    if not isinstance(payload, dict):
        return []

    actions = (
        payload.get("actions")
        or payload.get("operations")
        or payload.get("steps")
        or payload.get("changes")
        or []
    )
    if isinstance(actions, str):
        try:
            actions = json.loads(actions)
        except Exception:
            actions = []
    if not isinstance(actions, list):
        return []
    normalized = [normalize_action(a) for a in actions if isinstance(a, dict)]
    filtered = []
    for action in normalized:
        atype = str(action.get("type", "")).upper()
        if atype in VALID_ACTION_TYPES:
            filtered.append(action)
    return filtered


def prompt_wants_actions(prompt):
    text = str(prompt or "").strip().lower()
    if not text:
        return False

    # Direct keyword hits.
    if any(keyword in text for keyword in ACTION_INTENT_KEYWORDS):
        return True

    # Common imperative verbs that should trigger canvas actions.
    action_verbs = (
        "add ",
        "place ",
        "connect ",
        "wire ",
        "remove ",
        "delete ",
        "update ",
        "generate ",
        "create ",
        "make ",
        "build ",
        "run ",
        "start ",
        "stop ",
    )
    if text.startswith(action_verbs):
        return True

    # Tolerate typos like "builf" / "bulid" while still intenting build-like actions.
    if text.startswith(("buil", "bulid", "biuld", "mak ")) and any(
        token in text for token in ("project", "circuit", "led", "blink")
    ):
        return True

    # Component + action combos (e.g. "add another led", "one more resistor").
    component_tokens = ("led", "resistor", "arduino", "wire", "component", "circuit")
    if any(token in text for token in component_tokens) and any(
        token in text for token in ("add", "another", "one more", "connect", "wire", "blink")
    ):
        return True

    return False


def _find_component_label(components, type_keyword, fallback_label):
    for comp in components:
        ctype = str(comp.get("type", "")).lower()
        label = str(comp.get("label", "")).strip()
        if type_keyword in ctype and label:
            return label
    return fallback_label


def _extract_led_target_from_prompt(prompt, default_target):
    text = str(prompt or "").lower()
    digit_match = re.search(r"\b(\d+)\b", text)
    if digit_match:
        try:
            parsed = int(digit_match.group(1))
            if parsed > 0:
                return min(parsed, 8)
        except Exception:
            pass

    word_to_num = {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
    }
    for word, num in word_to_num.items():
        if re.search(rf"\b{word}\b", text):
            return num

    return default_target


def _wants_wiring_only(prompt):
    text = str(prompt or "").lower()
    asks_wire = any(token in text for token in ("wire", "wiring", "connect"))
    asks_build_or_code = any(
        token in text for token in ("blink", "build", "code", "compile", "simulate", "run")
    )
    return asks_wire and not asks_build_or_code


def _prompt_requests_new_components(prompt):
    text = str(prompt or "").lower()
    create_verbs = (
        "add",
        "place",
        "create",
        "insert",
        "put",
        "new",
        "another",
        "one more",
        "build from scratch",
        "start from scratch",
    )
    component_tokens = (
        "component",
        "led",
        "resistor",
        "arduino",
        "sensor",
        "motor",
        "transistor",
        "capacitor",
        "relay",
        "switch",
        "display",
    )
    return any(v in text for v in create_verbs) and any(c in text for c in component_tokens)


def _prompt_allows_autoplacement(prompt):
    text = str(prompt or "").lower()
    return any(
        token in text
        for token in (
            "build",
            "project",
            "complete",
            "runnable",
            "simulate",
            "run",
            "compile",
            "code",
            "blink",
            "make circuit",
            "create circuit",
        )
    )


def _extract_component_ref(endpoint_value):
    raw = str(endpoint_value or "").strip()
    if not raw:
        return ""
    if ":" in raw:
        return raw.split(":", 1)[0].strip().lower()
    if "." in raw:
        return raw.rsplit(".", 1)[0].strip().lower()
    return raw.lower()


def _collect_canvas_component_refs(canvas_state):
    refs = set()
    components = canvas_state.get("components", []) if isinstance(canvas_state, dict) else []
    for comp in components:
        if not isinstance(comp, dict):
            continue
        for key in ("id", "label", "type", "componentType", "name"):
            value = str(comp.get(key, "")).strip().lower()
            if value:
                refs.add(value)
    return refs


def _collect_planned_component_refs(actions):
    refs = set()
    for action in actions:
        if not isinstance(action, dict):
            continue
        if str(action.get("type", "")).upper() != "PLACE_COMPONENT":
            continue
        for key in ("id", "label", "componentType", "component", "name"):
            value = str(action.get(key, "")).strip().lower()
            if value:
                refs.add(value)
    return refs


def _collect_component_type_map(canvas_state, actions):
    ref_to_type = {}
    components = canvas_state.get("components", []) if isinstance(canvas_state, dict) else []
    for comp in components:
        if not isinstance(comp, dict):
            continue
        comp_type = str(
            comp.get("type")
            or comp.get("componentType")
            or comp.get("name")
            or ""
        ).strip().lower()
        for key in ("id", "label", "type", "componentType", "name"):
            ref = str(comp.get(key, "")).strip().lower()
            if ref and comp_type:
                ref_to_type[ref] = comp_type

    for action in actions:
        if not isinstance(action, dict):
            continue
        if str(action.get("type", "")).upper() != "PLACE_COMPONENT":
            continue
        comp_type = str(
            action.get("componentType")
            or action.get("component")
            or action.get("name")
            or ""
        ).strip().lower()
        for key in ("id", "label", "componentType", "component", "name"):
            ref = str(action.get(key, "")).strip().lower()
            if ref and comp_type:
                ref_to_type[ref] = comp_type
    return ref_to_type


def _extract_ref_and_pin(endpoint_value):
    raw = str(endpoint_value or "").strip()
    if not raw:
        return "", ""
    if ":" in raw:
        ref, pin = raw.split(":", 1)
        return ref.strip().lower(), pin.strip().lower()
    if "." in raw:
        parts = raw.split(".")
        if len(parts) >= 3 and parts[1] == "pins":
            return parts[0].strip().lower(), parts[2].strip().lower()
        if len(parts) >= 2:
            return parts[0].strip().lower(), parts[-1].strip().lower()
    return raw.lower(), ""


def _collect_wire_tuples(canvas_state, actions):
    tuples = []
    # Existing wires from canvas state.
    wires = canvas_state.get("wires", []) if isinstance(canvas_state, dict) else []
    for wire in wires:
        if not isinstance(wire, dict):
            continue
        if "from" in wire or "to" in wire:
            f_ref, f_pin = _extract_ref_and_pin(wire.get("from"))
            t_ref, t_pin = _extract_ref_and_pin(wire.get("to"))
        else:
            f_ref = str(wire.get("fromComponentId", "")).strip().lower()
            f_pin = str(wire.get("fromPinName", "")).strip().lower()
            t_ref = str(wire.get("toComponentId", "")).strip().lower()
            t_pin = str(wire.get("toPinName", "")).strip().lower()
        if f_ref and t_ref:
            tuples.append((f_ref, f_pin, t_ref, t_pin))

    # Planned wire actions.
    for action in actions:
        if str(action.get("type", "")).upper() != "ADD_WIRE":
            continue
        f_ref, f_pin = _extract_ref_and_pin(action.get("from"))
        t_ref, t_pin = _extract_ref_and_pin(action.get("to"))
        if f_ref and t_ref:
            tuples.append((f_ref, f_pin, t_ref, t_pin))

    return tuples


def _is_power_like_pin(pin_name):
    pin = str(pin_name or "").strip().lower()
    return pin in {"5v", "3.3v", "3v3", "vcc", "vin", "pos", "power"}


def _component_needs_power(comp_type):
    ctype = str(comp_type or "").lower()
    if not ctype:
        return False
    skip_tokens = ("arduino", "resistor", "gnd", "ground", "vcc", "battery", "power")
    return not any(token in ctype for token in skip_tokens)


def _wire_exists(wire_tuples, from_ref, from_pin, to_ref, to_pin):
    a = (from_ref, str(from_pin).lower(), to_ref, str(to_pin).lower())
    b = (to_ref, str(to_pin).lower(), from_ref, str(from_pin).lower())
    return a in wire_tuples or b in wire_tuples


def _find_power_source_ref(ref_to_type, valid_refs):
    # Prefer arduino board as power source.
    for ref in valid_refs:
        ctype = ref_to_type.get(ref, "")
        if "arduino" in ctype:
            return ref
    return ""


def _collect_component_instances(canvas_state, actions):
    """Collect stable component refs (prefer label, then id) with type."""
    instances = []
    seen = set()

    components = canvas_state.get("components", []) if isinstance(canvas_state, dict) else []
    for comp in components:
        if not isinstance(comp, dict):
            continue
        ctype = str(
            comp.get("type")
            or comp.get("componentType")
            or comp.get("name")
            or ""
        ).strip().lower()
        if not ctype:
            continue
        ref = str(comp.get("label") or comp.get("id") or "").strip().lower()
        if not ref or ref in seen:
            continue
        seen.add(ref)
        instances.append({"ref": ref, "type": ctype})

    for action in actions:
        if not isinstance(action, dict):
            continue
        if str(action.get("type", "")).upper() != "PLACE_COMPONENT":
            continue
        ctype = str(
            action.get("componentType")
            or action.get("component")
            or action.get("name")
            or ""
        ).strip().lower()
        if not ctype:
            continue
        ref = str(action.get("label") or action.get("id") or "").strip().lower()
        if not ref or ref in seen:
            continue
        seen.add(ref)
        instances.append({"ref": ref, "type": ctype})

    return instances


def _component_has_pin_connection(wire_tuples, comp_ref, pin_aliases):
    aliases = {str(a).strip().lower() for a in pin_aliases if str(a).strip()}
    for f_ref, f_pin, t_ref, t_pin in wire_tuples:
        if f_ref == comp_ref and str(f_pin).strip().lower() in aliases:
            return True
        if t_ref == comp_ref and str(t_pin).strip().lower() in aliases:
            return True
    return False


def _components_are_connected(wire_tuples, ref_a, ref_b):
    for f_ref, _, t_ref, _ in wire_tuples:
        if (f_ref == ref_a and t_ref == ref_b) or (f_ref == ref_b and t_ref == ref_a):
            return True
    return False


def _component_connected_to_arduino(wire_tuples, comp_ref, arduino_ref):
    return _components_are_connected(wire_tuples, comp_ref, arduino_ref)


def _auto_complete_wiring(actions, canvas_state):
    """
    Complete common partial plans so each LED path is electrically closed.
    Pattern enforced: Arduino Pin -> Resistor -> LED(A), LED(C) -> Arduino GND.
    """
    if not actions:
        return actions

    wire_tuples = _collect_wire_tuples(canvas_state, actions)
    instances = _collect_component_instances(canvas_state, actions)
    if not instances:
        return actions

    arduino_refs = [c["ref"] for c in instances if "arduino" in c["type"]]
    led_refs = [c["ref"] for c in instances if "led" in c["type"]]
    resistor_refs = [c["ref"] for c in instances if "resistor" in c["type"]]
    if not led_refs:
        return actions

    arduino_ref = arduino_refs[0] if arduino_refs else ""

    def append_wire(from_ref, from_pin, to_ref, to_pin):
        if not from_ref or not to_ref:
            return
        if _wire_exists(wire_tuples, from_ref, from_pin, to_ref, to_pin):
            return
        actions.append({
            "type": "ADD_WIRE",
            "from": f"{from_ref}:{from_pin}",
            "to": f"{to_ref}:{to_pin}",
        })
        wire_tuples.append((from_ref, str(from_pin).lower(), to_ref, str(to_pin).lower()))

    for idx, led_ref in enumerate(led_refs):
        # Ensure LED cathode is grounded.
        has_led_ground = _component_has_pin_connection(
            wire_tuples,
            led_ref,
            {"c", "cathode", "k", "gnd"},
        )
        if not has_led_ground and arduino_ref:
            append_wire(led_ref, "C", arduino_ref, "GND")

        # Ensure LED anode has a drive path.
        has_led_anode = _component_has_pin_connection(
            wire_tuples,
            led_ref,
            {"a", "anode", "vcc", "pos", "+"},
        )
        if has_led_anode:
            continue

        if idx < len(resistor_refs):
            resistor_ref = resistor_refs[idx]
            # Resistor -> LED anode
            append_wire(resistor_ref, "2", led_ref, "A")
            # Arduino -> resistor input
            if arduino_ref and not _component_connected_to_arduino(wire_tuples, resistor_ref, arduino_ref):
                pin = PIN_SEQUENCE[idx % len(PIN_SEQUENCE)]
                append_wire(arduino_ref, pin, resistor_ref, "1")
        elif arduino_ref:
            # No resistor available; at least close the signal path.
            pin = PIN_SEQUENCE[idx % len(PIN_SEQUENCE)]
            append_wire(arduino_ref, pin, led_ref, "A")

    return actions


def apply_action_guardrails(actions, prompt, canvas_state):
    if not isinstance(actions, list):
        return []

    normalized_actions = [normalize_action(a) for a in actions if isinstance(a, dict)]
    existing_refs = _collect_canvas_component_refs(canvas_state)
    allow_new_components = _prompt_requests_new_components(prompt)
    wiring_only = _wants_wiring_only(prompt)
    auto_place_ok = _prompt_allows_autoplacement(prompt) and not wiring_only

    filtered = []
    for action in normalized_actions:
        action_type = str(action.get("type", "")).upper()
        if action_type == "PLACE_COMPONENT":
            # Never inject random parts during explicit wiring-only requests.
            if wiring_only and not allow_new_components:
                continue
            # If a canvas already has parts, don't add new ones unless requested.
            if existing_refs and not allow_new_components and not auto_place_ok:
                continue
        filtered.append(action)

    valid_refs = existing_refs | _collect_planned_component_refs(filtered)
    final_actions = []
    for action in filtered:
        if str(action.get("type", "")).upper() != "ADD_WIRE":
            final_actions.append(action)
            continue

        from_ref = _extract_component_ref(action.get("from"))
        to_ref = _extract_component_ref(action.get("to"))
        # Skip wires whose endpoints do not resolve to known or newly placed components.
        if not from_ref or not to_ref:
            continue
        if from_ref not in valid_refs or to_ref not in valid_refs:
            continue
        final_actions.append(action)

    # Enforce power wiring for components that require supply when we are wiring.
    if final_actions:
        ref_to_type = _collect_component_type_map(canvas_state, filtered)
        wire_tuples = _collect_wire_tuples(canvas_state, final_actions)
        valid_refs = existing_refs | _collect_planned_component_refs(filtered)
        power_source_ref = _find_power_source_ref(ref_to_type, valid_refs)

        if power_source_ref:
            # Components touched by this plan should have a power connection.
            candidate_refs = set()
            for action in final_actions:
                atype = str(action.get("type", "")).upper()
                if atype == "PLACE_COMPONENT":
                    for key in ("id", "label"):
                        ref = str(action.get(key, "")).strip().lower()
                        if ref:
                            candidate_refs.add(ref)
                elif atype == "ADD_WIRE":
                    f_ref = _extract_component_ref(action.get("from"))
                    t_ref = _extract_component_ref(action.get("to"))
                    if f_ref:
                        candidate_refs.add(f_ref)
                    if t_ref:
                        candidate_refs.add(t_ref)

            for comp_ref in sorted(candidate_refs):
                if comp_ref == power_source_ref:
                    continue
                if comp_ref not in valid_refs:
                    continue
                comp_type = ref_to_type.get(comp_ref, comp_ref)
                if not _component_needs_power(comp_type):
                    continue

                has_power = False
                for f_ref, f_pin, t_ref, t_pin in wire_tuples:
                    if comp_ref == f_ref and _is_power_like_pin(t_pin):
                        has_power = True
                        break
                    if comp_ref == t_ref and _is_power_like_pin(f_pin):
                        has_power = True
                        break
                if has_power:
                    continue

                if not _wire_exists(wire_tuples, power_source_ref, "5V", comp_ref, "VCC"):
                    final_actions.append({
                        "type": "ADD_WIRE",
                        "from": f"{power_source_ref}:5V",
                        "to": f"{comp_ref}:VCC",
                    })
                    wire_tuples.append((power_source_ref, "5v", comp_ref, "vcc"))

    final_actions = _auto_complete_wiring(final_actions, canvas_state)
    final_actions = _ensure_build_flow_actions(final_actions, prompt, canvas_state)
    return final_actions


def _is_build_intent(prompt):
    text = str(prompt or "").lower()
    return any(
        token in text
        for token in ("build", "compile", "simulate", "run", "code", "blink", "project", "runnable")
    )


def _wants_start_simulation(prompt):
    text = str(prompt or "").lower()
    return any(token in text for token in ("simulate", "simulation", "run", "start"))


def _count_led_targets(canvas_state, actions):
    count = 0
    if isinstance(canvas_state, dict):
        for comp in canvas_state.get("components", []):
            if not isinstance(comp, dict):
                continue
            ctype = str(comp.get("type") or comp.get("componentType") or "").strip().lower()
            if "led" in ctype:
                count += 1
    for action in actions:
        if not isinstance(action, dict):
            continue
        if str(action.get("type", "")).upper() != "PLACE_COMPONENT":
            continue
        ctype = str(action.get("componentType") or action.get("component") or "").strip().lower()
        if "led" in ctype:
            count += 1
    return max(1, min(count, 8))


def _build_default_blink_code(led_count):
    n = max(1, min(int(led_count or 1), 8))
    pin_decls = "\n".join(
        [f"const int LED{i}_PIN = {PIN_SEQUENCE[(i - 1) % len(PIN_SEQUENCE)]};" for i in range(1, n + 1)]
    )
    setup_lines = "\n".join([f"  pinMode(LED{i}_PIN, OUTPUT);" for i in range(1, n + 1)])
    phase_lines = []
    for i in range(1, n + 1):
        phase_lines.append(f"  digitalWrite(LED{i}_PIN, HIGH);")
        for j in range(1, n + 1):
            if j != i:
                phase_lines.append(f"  digitalWrite(LED{j}_PIN, LOW);")
        phase_lines.append("  delay(500);")
        phase_lines.append("")
    phases = "\n".join(phase_lines).rstrip()
    return f"""{pin_decls}

void setup() {{
{setup_lines}
}}

void loop() {{
{phases}
}}
"""


def _ensure_build_flow_actions(actions, prompt, canvas_state):
    if not _is_build_intent(prompt):
        return actions
    if _wants_wiring_only(prompt):
        return actions

    has_update = any(str(a.get("type", "")).upper() == "UPDATE_CODE" for a in actions if isinstance(a, dict))
    has_verify = any(str(a.get("type", "")).upper() == "VERIFY_BUILD" for a in actions if isinstance(a, dict))
    has_start = any(str(a.get("type", "")).upper() == "START_SIMULATION" for a in actions if isinstance(a, dict))

    if not has_update:
        actions.append({
            "type": "UPDATE_CODE",
            "fileName": "Blink.ino",
            "code": _build_default_blink_code(_count_led_targets(canvas_state, actions)),
        })
    if not has_verify:
        actions.append({"type": "VERIFY_BUILD"})
    if _wants_start_simulation(prompt) and not has_start:
        actions.append({"type": "START_SIMULATION"})
    return actions


def _component_ref(comp):
    cid = str(comp.get("id", "")).strip()
    label = str(comp.get("label", "")).strip()
    ctype = str(comp.get("type", "")).strip()
    return cid or label or ctype


def _components_by_kind(canvas_state):
    components = canvas_state.get("components", []) if isinstance(canvas_state, dict) else []
    buckets = {"arduino": [], "led": [], "resistor": [], "gnd": []}
    for comp in components:
        if not isinstance(comp, dict):
            continue
        ctype = str(comp.get("type", "")).lower()
        if "arduino" in ctype:
            buckets["arduino"].append(comp)
        elif "led" in ctype:
            buckets["led"].append(comp)
        elif "resistor" in ctype:
            buckets["resistor"].append(comp)
        elif ctype in ("gnd", "ground"):
            buckets["gnd"].append(comp)
    return buckets


def autonomous_project_actions(canvas_state, prompt):
    """Generate deterministic best-effort actions when the model returns nothing useful."""
    wiring_only = _wants_wiring_only(prompt)
    build_intent = _is_build_intent(prompt) or prompt_wants_actions(prompt)
    buckets = _components_by_kind(canvas_state)
    target_leds = _extract_led_target_from_prompt(prompt, len(buckets["led"]) if buckets["led"] else 1)
    target_leds = max(1, min(target_leds, 6))
    actions = []

    arduino_ref = _component_ref(buckets["arduino"][0]) if buckets["arduino"] else "U1"

    if not buckets["arduino"] and build_intent and not wiring_only:
        actions.append({
            "type": "PLACE_COMPONENT",
            "componentType": "arduino-uno",
            "id": "U1",
            "label": "U1",
            "x": 180,
            "y": 170,
        })

    # For autonomous decisions, place only what is needed for requested scope.
    if build_intent and not wiring_only:
        led_have = len(buckets["led"])
        for i in range(led_have + 1, target_leds + 1):
            actions.append({
                "type": "PLACE_COMPONENT",
                "componentType": "led",
                "id": f"D{i}",
                "label": f"D{i}",
                "x": 500,
                "y": 110 + ((i - 1) * 90),
            })
        res_have = len(buckets["resistor"])
        for i in range(res_have + 1, target_leds + 1):
            actions.append({
                "type": "PLACE_COMPONENT",
                "componentType": "resistor",
                "id": f"R{i}",
                "label": f"R{i}",
                "x": 390,
                "y": 115 + ((i - 1) * 90),
            })

    led_refs = [_component_ref(c) for c in buckets["led"]]
    resistor_refs = [_component_ref(c) for c in buckets["resistor"]]
    if build_intent and not wiring_only:
        for i in range(len(led_refs) + 1, target_leds + 1):
            led_refs.append(f"D{i}")
        for i in range(len(resistor_refs) + 1, target_leds + 1):
            resistor_refs.append(f"R{i}")

    wiring_pairs = min(len(led_refs), len(resistor_refs))
    if arduino_ref and wiring_pairs > 0:
        for i in range(wiring_pairs):
            pin = PIN_SEQUENCE[i % len(PIN_SEQUENCE)]
            r_label = resistor_refs[i]
            d_label = led_refs[i]
            actions.extend([
                {"type": "ADD_WIRE", "from": f"{arduino_ref}:{pin}", "to": f"{r_label}:1"},
                {"type": "ADD_WIRE", "from": f"{r_label}:2", "to": f"{d_label}:A"},
                {"type": "ADD_WIRE", "from": f"{d_label}:C", "to": f"{arduino_ref}:GND"},
            ])

    if build_intent and not wiring_only and wiring_pairs > 0:
        pin_decls = "\n".join(
            [f"const int LED{i + 1}_PIN = {PIN_SEQUENCE[i % len(PIN_SEQUENCE)]};" for i in range(wiring_pairs)]
        )
        setup_lines = "\n".join([f"  pinMode(LED{i + 1}_PIN, OUTPUT);" for i in range(wiring_pairs)])
        phase_lines = []
        for i in range(1, wiring_pairs + 1):
            phase_lines.append(f"  digitalWrite(LED{i}_PIN, HIGH);")
            for j in range(1, wiring_pairs + 1):
                if j != i:
                    phase_lines.append(f"  digitalWrite(LED{j}_PIN, LOW);")
            phase_lines.append("  delay(500);")
            phase_lines.append("")
        phases = "\n".join(phase_lines).rstrip()
        code = f"""{pin_decls}

void setup() {{
{setup_lines}
}}

void loop() {{
{phases}
}}
"""
        actions.append({"type": "UPDATE_CODE", "fileName": "Blink.ino", "code": code})
        actions.append({"type": "VERIFY_BUILD"})
        if any(token in str(prompt or "").lower() for token in ("simulate", "run", "start")):
            actions.append({"type": "START_SIMULATION"})

    return apply_action_guardrails(actions, prompt, canvas_state)


def fallback_project_actions(canvas_state, prompt):
    components = canvas_state.get("components", []) if isinstance(canvas_state, dict) else []
    labels = {str(c.get("label", "")).strip().lower() for c in components if isinstance(c, dict)}
    types = [str(c.get("type", "")).lower() for c in components if isinstance(c, dict)]

    needs_uno = not any("arduino" in t for t in types)
    led_count = sum(1 for t in types if "led" in t)
    resistor_count = sum(1 for t in types if "resistor" in t)
    target_leds = _extract_led_target_from_prompt(prompt, led_count if led_count > 0 else 2)
    target_leds = max(2, min(target_leds, 8))

    actions = []
    if needs_uno:
        actions.append({
            "type": "PLACE_COMPONENT",
            "componentType": "arduino-uno",
            "id": "U1",
            "label": "U1",
            "x": 180,
            "y": 170,
        })

    uno = _find_component_label(components, "arduino", "U1")
    led_labels = [f"D{i}" for i in range(1, target_leds + 1)]
    resistor_labels = [f"R{i}" for i in range(1, target_leds + 1)]

    # Ensure deterministic component set exists for the target LED count.
    for i, led_label in enumerate(led_labels, start=1):
        if led_label.lower() not in labels and led_count < i:
            actions.append({
                "type": "PLACE_COMPONENT",
                "componentType": "led",
                "id": led_label,
                "label": led_label,
                "x": 500,
                "y": 110 + ((i - 1) * 90),
            })
    for i, r_label in enumerate(resistor_labels, start=1):
        if r_label.lower() not in labels and resistor_count < i:
            actions.append({
                "type": "PLACE_COMPONENT",
                "componentType": "resistor",
                "id": r_label,
                "label": r_label,
                "x": 390,
                "y": 115 + ((i - 1) * 90),
            })

    for i, (r_label, d_label) in enumerate(zip(resistor_labels, led_labels)):
        pin = PIN_SEQUENCE[i % len(PIN_SEQUENCE)]
        actions.extend([
            {"type": "ADD_WIRE", "from": f"{uno}:{pin}", "to": f"{r_label}:1"},
            {"type": "ADD_WIRE", "from": f"{r_label}:2", "to": f"{d_label}:A"},
            {"type": "ADD_WIRE", "from": f"{d_label}:C", "to": f"{uno}:GND"},
        ])

    if _wants_wiring_only(prompt):
        return [normalize_action(a) for a in actions]

    pin_decls = "\n".join(
        [f"const int LED{i}_PIN = {PIN_SEQUENCE[(i - 1) % len(PIN_SEQUENCE)]};" for i in range(1, target_leds + 1)]
    )
    setup_lines = "\n".join([f"  pinMode(LED{i}_PIN, OUTPUT);" for i in range(1, target_leds + 1)])
    phase_lines = []
    for i in range(1, target_leds + 1):
        phase_lines.append(f"  digitalWrite(LED{i}_PIN, HIGH);")
        for j in range(1, target_leds + 1):
            if j != i:
                phase_lines.append(f"  digitalWrite(LED{j}_PIN, LOW);")
        phase_lines.append("  delay(BLINK_MS);")
        phase_lines.append("")
    phases = "\n".join(phase_lines).rstrip()

    code = f"""{pin_decls}
const unsigned long BLINK_MS = 500;

void setup() {
{setup_lines}
}

void loop() {
{phases}
}
"""
    actions.extend([
        {"type": "UPDATE_CODE", "fileName": "Blink.ino", "code": code},
        {"type": "VERIFY_BUILD"},
        {"type": "START_SIMULATION"},
    ])
    return [normalize_action(a) for a in actions]


def safe_run_builder_agent(model, builder_instruction, prompt, history, canvas_state, image_base64, policy_variant="default"):
    try:
        return run_builder_agent(
            model,
            builder_instruction,
            prompt,
            history,
            canvas_state,
            image_base64,
            policy_variant=policy_variant,
        )
    except Exception as exc:
        return {
            "text": f"Builder agent fallback due to model output parse error: {exc}",
            "actions": [],
            "meta": {
                "builderError": str(exc),
                "parseRepairUsed": False,
            },
        }


def run_conversation_agent(model, prompt, history, canvas_state, image_base64):
    system_instruction = (
        "You are the Conversation Agent for SimuIDE. Keep context from history, answer naturally, "
        "and decide if the Builder Agent should run.\n"
        "Return JSON only:\n"
        '{"assistant_reply":"string","should_build":true|false,"builder_instruction":"string"}\n'
        "Set should_build=true when the user requests to create/update circuit, connect wires, generate/update code, "
        "compile/build/test, or run simulation."
    )
    user_payload = {
        "prompt": prompt,
        "history": history[-20:] if isinstance(history, list) else [],
        "canvasState": canvas_state or {"components": [], "wires": []},
        "imageAttached": bool(image_base64),
    }
    response = post_genai_chat(model, system_instruction, user_payload, image_base64=image_base64, temperature=0.3)
    payload, _ = parse_model_json_payload(response)
    return {
        "assistant_reply": str(payload.get("assistant_reply", "")).strip(),
        "should_build": bool(payload.get("should_build", False)),
        "builder_instruction": str(payload.get("builder_instruction", "")).strip() or prompt,
    }


def build_builder_system_instruction(policy_variant):
    base = (
        "You are the Builder Agent for SimuIDE. Convert user intent to executable actions.\n"
        "Return JSON only:\n"
        '{"text":"short build summary","actions":[...]}.\n'
        "Allowed actions: PLACE_COMPONENT, ADD_WIRE, DELETE_COMPONENT, DELETE_WIRE, UPDATE_CODE, "
        "VERIFY_BUILD, START_SIMULATION, STOP_SIMULATION.\n"
        "For ADD_WIRE use pin format 'componentId:pinName'. "
        "For UPDATE_CODE include code and fileName (default sketch.ino). "
        "For complete project requests, usually include UPDATE_CODE then VERIFY_BUILD then START_SIMULATION.\n"
        "CRITICAL RULES:\n"
        "1) Do NOT add random components.\n"
        "2) If user only asks to wire/connect, use existing components from canvasState and do not place new ones unless explicitly asked.\n"
        "3) Ensure every ADD_WIRE endpoint references a real component id/label from canvasState or a component you place in this same action list.\n"
        "4) If requirements are missing or ambiguous, return actions as [] and explain what detail is missing in text."
    )
    variant = str(policy_variant or "").strip().lower()
    if variant in ("strict-json-v2", "strict"):
        return (
            f"{base}\n"
            "STRICT OUTPUT CONTRACT:\n"
            "- Output must be a single JSON object and nothing else.\n"
            "- Do not use markdown code fences.\n"
            "- Ensure every action object includes a valid `type` in the allowed list.\n"
            "- For ADD_WIRE, always include both `from` and `to` with 'componentRef:pinName'.\n"
            "- If the user asks to build blinking LEDs, include UPDATE_CODE and usually VERIFY_BUILD + START_SIMULATION."
        )
    return base


def run_builder_agent(model, builder_instruction, prompt, history, canvas_state, image_base64, policy_variant="default"):
    system_instruction = build_builder_system_instruction(policy_variant)
    user_payload = {
        "policyVariant": policy_variant,
        "builderInstruction": builder_instruction,
        "prompt": prompt,
        "history": history[-20:] if isinstance(history, list) else [],
        "canvasState": canvas_state or {"components": [], "wires": []},
        "imageAttached": bool(image_base64),
    }
    response = post_genai_chat(model, system_instruction, user_payload, image_base64=image_base64, temperature=0.2)
    payload, parse_repair_used = parse_model_json_payload(response)

    actions = extract_actions_from_payload(payload)
    actions = apply_action_guardrails(actions, prompt, canvas_state)
    return {
        "text": str(payload.get("text", "")).strip(),
        "actions": actions,
        "meta": {
            "parseRepairUsed": bool(parse_repair_used),
            "policyVariant": policy_variant,
        },
    }


def run_genai_agent(prompt, canvas_state, image_base64, requested_model=None, history=None, policy_variant=None):
    model = _resolve_agent_model(requested_model)
    policy_variant = policy_variant or os.environ.get("AI_PROMPT_POLICY", "default")
    history = history if isinstance(history, list) else []
    wants_actions = prompt_wants_actions(prompt)
    retry_used = False
    fallback_used = False
    parse_repair_used = False

    # Critical behavior: action-oriented prompts should always go through the
    # builder pipeline so canvas interactions are not blocked by chat noise.
    if wants_actions:
        build_out = safe_run_builder_agent(
            model,
            prompt,
            prompt,
            history,
            canvas_state,
            image_base64,
            policy_variant=policy_variant,
        )
        parse_repair_used = parse_repair_used or bool(build_out.get("meta", {}).get("parseRepairUsed"))
        if not build_out["actions"]:
            retry_used = True
            retry_instruction = (
                f"{prompt}\n\n"
                "IMPORTANT: Return a non-empty actions[] containing executable actions only."
            )
            build_out = safe_run_builder_agent(
                model,
                retry_instruction,
                prompt,
                history,
                canvas_state,
                image_base64,
                policy_variant=policy_variant,
            )
            parse_repair_used = parse_repair_used or bool(build_out.get("meta", {}).get("parseRepairUsed"))
        if not build_out["actions"]:
            fallback_used = True
            build_out = {
                "text": "Model output was incomplete; applied autonomous best-effort project plan.",
                "actions": autonomous_project_actions(canvas_state, prompt),
            }
        return {
            "success": True,
            "text": summarize_actions_for_user(build_out["actions"]),
            "actions": build_out["actions"],
            "meta": {
                "model": model,
                "mode": "default",
                "policyVariant": policy_variant,
                "wantsActions": wants_actions,
                "retryUsed": retry_used,
                "fallbackUsed": fallback_used,
                "parseRepairUsed": parse_repair_used,
            },
        }

    try:
        convo = run_conversation_agent(model, prompt, history, canvas_state, image_base64)
    except Exception as exc:
        # Keep chat usable even if the selected model is temporarily unavailable.
        return {
            "success": True,
            "text": f"I could not reach model `{model}` right now ({exc}). Try again or choose a different model.",
            "actions": [],
            "meta": {
                "model": model,
                "mode": "default",
                "policyVariant": policy_variant,
                "wantsActions": wants_actions,
                "retryUsed": False,
                "fallbackUsed": True,
                "parseRepairUsed": False,
                "conversationFallback": True,
            },
        }
    actions = []
    builder_text = ""
    should_build = convo["should_build"] or prompt_wants_actions(prompt)
    if should_build:
        build_out = safe_run_builder_agent(
            model,
            convo["builder_instruction"],
            prompt,
            history,
            canvas_state,
            image_base64,
            policy_variant=policy_variant,
        )
        parse_repair_used = parse_repair_used or bool(build_out.get("meta", {}).get("parseRepairUsed"))
        actions = build_out["actions"]
        builder_text = build_out["text"]
        if not actions:
            retry_used = True
            retry_instruction = (
                f"{convo['builder_instruction'] or prompt}\n\n"
                "IMPORTANT: Return a non-empty actions[] using only executable actions. "
                "When user asks to build/blink/wire, include PLACE_COMPONENT/ADD_WIRE/UPDATE_CODE "
                "and optionally VERIFY_BUILD/START_SIMULATION."
            )
            build_out = safe_run_builder_agent(
                model,
                retry_instruction,
                prompt,
                history,
                canvas_state,
                image_base64,
                policy_variant=policy_variant,
            )
            parse_repair_used = parse_repair_used or bool(build_out.get("meta", {}).get("parseRepairUsed"))
            actions = build_out["actions"]
            if build_out["text"]:
                builder_text = build_out["text"]

    if not actions and prompt_wants_actions(prompt):
        fallback_used = True
        actions = autonomous_project_actions(canvas_state, prompt)
        if not builder_text:
            builder_text = "Applied autonomous best-effort planning from current canvas and intent."

    convo_text = clean_reply_text(convo.get("assistant_reply", ""))
    builder_text = clean_reply_text(builder_text)
    # For action-centric requests, prefer deterministic confirmation text so
    # users don't see noisy or repetitive model chatter.
    if actions and wants_actions:
        final_text = summarize_actions_for_user(actions)
    else:
        text_parts = []
        if convo_text:
            text_parts.append(convo_text)
        if builder_text:
            text_parts.append(builder_text)
        final_text = "\n\n".join(text_parts).strip() or "Done."

    return {
        "success": True,
        "text": final_text,
        "actions": actions,
        "meta": {
            "model": model,
            "mode": "default",
            "policyVariant": policy_variant,
            "wantsActions": wants_actions,
            "retryUsed": retry_used,
            "fallbackUsed": fallback_used,
            "parseRepairUsed": parse_repair_used,
        },
    }


def run_canvas_json_agent(prompt, canvas_state, image_base64, requested_model=None, history=None, policy_variant=None):
    model = _resolve_agent_model(requested_model)
    policy_variant = policy_variant or os.environ.get("AI_PROMPT_POLICY", "default")
    history = history if isinstance(history, list) else []
    retry_used = False
    fallback_used = False
    parse_repair_used = False
    build_out = safe_run_builder_agent(
        model,
        prompt,
        prompt,
        history,
        canvas_state,
        image_base64,
        policy_variant=policy_variant,
    )
    parse_repair_used = parse_repair_used or bool(build_out.get("meta", {}).get("parseRepairUsed"))
    # Retry with stricter instruction if model returns empty actions.
    if not build_out["actions"]:
        retry_used = True
        retry_instruction = (
            f"{prompt}\n\n"
            "IMPORTANT: Return at least one executable action in actions[]. "
            "If project is empty, start with PLACE_COMPONENT actions for arduino-uno and led, "
            "then ADD_WIRE, UPDATE_CODE, VERIFY_BUILD, START_SIMULATION."
        )
        build_out = safe_run_builder_agent(
            model,
            retry_instruction,
            prompt,
            history,
            canvas_state,
            image_base64,
            policy_variant=policy_variant,
        )
        parse_repair_used = parse_repair_used or bool(build_out.get("meta", {}).get("parseRepairUsed"))
    if not build_out["actions"]:
        fallback_used = True
        build_out = {
            "text": "Canvas JSON planner returned no actions; autonomous planner generated actions.",
            "actions": autonomous_project_actions(canvas_state, prompt),
        }

    return {
        "success": True,
        "text": clean_reply_text(build_out["text"]) or summarize_actions_for_user(build_out["actions"]),
        "actions": build_out["actions"],
        "meta": {
            "model": model,
            "mode": "canvas_json",
            "policyVariant": policy_variant,
            "wantsActions": True,
            "retryUsed": retry_used,
            "fallbackUsed": fallback_used,
            "parseRepairUsed": parse_repair_used,
        },
    }

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input provided"}))
            return
            
        data = json.loads(input_data)
        prompt = data.get("prompt", "")
        canvas_state = data.get("canvasState", {})
        image_base64 = data.get("image")
        requested_model = data.get("model")
        history = data.get("history", [])
        mode = data.get("mode")
        policy_variant = data.get("policyVariant")

        if mode == "canvas_json":
            result = run_canvas_json_agent(
                prompt,
                canvas_state,
                image_base64,
                requested_model,
                history,
                policy_variant=policy_variant,
            )
        else:
            result = run_genai_agent(
                prompt,
                canvas_state,
                image_base64,
                requested_model,
                history,
                policy_variant=policy_variant,
            )
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
