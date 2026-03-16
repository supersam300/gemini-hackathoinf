#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

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


def load_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def collect_refs(canvas_state, actions):
    refs = set()
    for comp in canvas_state.get("components", []):
        if not isinstance(comp, dict):
            continue
        for key in ("id", "label", "type", "componentType", "name"):
            value = str(comp.get(key, "")).strip().lower()
            if value:
                refs.add(value)
    for action in actions:
        if str(action.get("type", "")).upper() != "PLACE_COMPONENT":
            continue
        for key in ("id", "label", "componentType", "component", "name"):
            value = str(action.get(key, "")).strip().lower()
            if value:
                refs.add(value)
    return refs


def endpoint_ref(value):
    raw = str(value or "").strip()
    if ":" in raw:
        return raw.split(":", 1)[0].strip().lower()
    if "." in raw:
        return raw.split(".", 1)[0].strip().lower()
    return raw.lower()


def schema_ok(action):
    atype = str(action.get("type", "")).upper()
    if atype not in VALID_ACTION_TYPES:
        return False
    if atype == "PLACE_COMPONENT":
        return bool(action.get("componentType"))
    if atype == "ADD_WIRE":
        return bool(action.get("from") and action.get("to"))
    if atype == "UPDATE_CODE":
        return isinstance(action.get("code"), str)
    return True


def score_expected(expected, actions):
    if not isinstance(expected, dict):
        return True
    action_types = [str(a.get("type", "")).upper() for a in actions if isinstance(a, dict)]
    required_types = [str(t).upper() for t in expected.get("requiredActionTypes", [])]
    for req in required_types:
        if req not in action_types:
            return False
    min_counts = expected.get("minActionCounts", {})
    counts = {}
    for atype in action_types:
        counts[atype] = counts.get(atype, 0) + 1
    for key, minimum in min_counts.items():
        if counts.get(str(key).upper(), 0) < int(minimum):
            return False
    return True


def run_agent(script_path, payload, env):
    proc = subprocess.run(
        [sys.executable, str(script_path)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        env=env,
    )
    if proc.returncode != 0:
        return {"success": False, "error": f"agent_exit_{proc.returncode}", "actions": []}, False
    try:
        parsed = json.loads(proc.stdout.strip() or "{}")
        return parsed, True
    except json.JSONDecodeError:
        return {"success": False, "error": "invalid_json_stdout", "actions": []}, False


def main():
    parser = argparse.ArgumentParser(description="Replay evaluator for SimuIDE builder agent")
    parser.add_argument("--dataset", required=True, help="JSONL dataset path")
    parser.add_argument("--model", default=None, help="Model override")
    parser.add_argument("--policy", default="default", help="Prompt policy variant")
    parser.add_argument("--agent-script", default="server/services/agent.py", help="agent.py path")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    dataset_path = (repo_root / args.dataset).resolve() if not Path(args.dataset).is_absolute() else Path(args.dataset)
    script_path = (repo_root / args.agent_script).resolve() if not Path(args.agent_script).is_absolute() else Path(args.agent_script)

    rows = load_jsonl(dataset_path)
    if not rows:
        print(json.dumps({"error": "empty_dataset"}))
        sys.exit(1)

    env = os.environ.copy()
    env["AI_PROMPT_POLICY"] = args.policy

    total = len(rows)
    valid_json = 0
    success = 0
    schema_sum = 0.0
    wire_sum = 0.0
    completion = 0
    expected_pass = 0
    fallback = 0

    details = []
    for row in rows:
        payload = {
            "prompt": row.get("prompt", ""),
            "canvasState": row.get("canvasState", {}),
            "image": row.get("image"),
            "model": args.model,
            "history": row.get("history", []),
            "mode": row.get("mode"),
            "policyVariant": args.policy,
        }
        result, output_is_json = run_agent(script_path, payload, env)
        actions = result.get("actions", []) if isinstance(result, dict) else []
        if output_is_json:
            valid_json += 1
        if isinstance(result, dict) and result.get("success"):
            success += 1
        if isinstance(result, dict) and result.get("meta", {}).get("fallbackUsed"):
            fallback += 1

        if not isinstance(actions, list):
            actions = []
        if not actions:
            schema_rate = 1.0
            wire_rate = 1.0
        else:
            schema_hits = sum(1 for action in actions if isinstance(action, dict) and schema_ok(action))
            schema_rate = schema_hits / len(actions)
            refs = collect_refs(row.get("canvasState", {}), actions)
            wire_actions = [a for a in actions if str(a.get("type", "")).upper() == "ADD_WIRE"]
            if not wire_actions:
                wire_rate = 1.0
            else:
                wire_hits = 0
                for wire in wire_actions:
                    from_ref = endpoint_ref(wire.get("from"))
                    to_ref = endpoint_ref(wire.get("to"))
                    if from_ref and to_ref and from_ref in refs and to_ref in refs:
                        wire_hits += 1
                wire_rate = wire_hits / len(wire_actions)

        completion_score = schema_rate * wire_rate
        schema_sum += schema_rate
        wire_sum += wire_rate
        completion += 1 if completion_score >= 0.85 else 0
        exp_ok = score_expected(row.get("expected"), actions)
        expected_pass += 1 if exp_ok else 0
        details.append({
            "id": row.get("id"),
            "success": bool(result.get("success")) if isinstance(result, dict) else False,
            "schemaRate": round(schema_rate, 4),
            "wireRate": round(wire_rate, 4),
            "completionScore": round(completion_score, 4),
            "expectedPass": exp_ok,
            "fallbackUsed": bool(result.get("meta", {}).get("fallbackUsed")) if isinstance(result, dict) else False,
        })

    summary = {
        "dataset": str(dataset_path),
        "model": args.model,
        "policy": args.policy,
        "total": total,
        "successRate": success / total,
        "validJsonRate": valid_json / total,
        "avgValidActionSchemaRate": schema_sum / total,
        "avgExecutableWireEndpointRate": wire_sum / total,
        "taskCompletionRate": completion / total,
        "expectedPassRate": expected_pass / total,
        "fallbackRate": fallback / total,
        "details": details,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
