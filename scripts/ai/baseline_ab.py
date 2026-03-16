#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from pathlib import Path


def run_eval(eval_script, dataset, model, policy):
    command = [
        sys.executable,
        str(eval_script),
        "--dataset",
        str(dataset),
        "--policy",
        policy,
    ]
    if model:
        command.extend(["--model", model])
    proc = subprocess.run(command, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Evaluator failed for policy {policy}: {proc.stderr or proc.stdout}")
    return json.loads(proc.stdout)


def main():
    parser = argparse.ArgumentParser(description="A/B baseline comparer for builder prompt policies")
    parser.add_argument("--dataset", required=True, help="Path to golden JSONL")
    parser.add_argument("--model", default=None, help="Model override")
    parser.add_argument("--policy-a", default="default")
    parser.add_argument("--policy-b", default="strict-json-v2")
    parser.add_argument("--evaluate-script", default="scripts/ai/evaluate_replay.py")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    dataset = (repo_root / args.dataset).resolve() if not Path(args.dataset).is_absolute() else Path(args.dataset)
    eval_script = (repo_root / args.evaluate_script).resolve() if not Path(args.evaluate_script).is_absolute() else Path(args.evaluate_script)

    result_a = run_eval(eval_script, dataset, args.model, args.policy_a)
    result_b = run_eval(eval_script, dataset, args.model, args.policy_b)

    delta = {
        "validJsonRate": result_b["validJsonRate"] - result_a["validJsonRate"],
        "avgValidActionSchemaRate": result_b["avgValidActionSchemaRate"] - result_a["avgValidActionSchemaRate"],
        "avgExecutableWireEndpointRate": result_b["avgExecutableWireEndpointRate"] - result_a["avgExecutableWireEndpointRate"],
        "taskCompletionRate": result_b["taskCompletionRate"] - result_a["taskCompletionRate"],
        "expectedPassRate": result_b["expectedPassRate"] - result_a["expectedPassRate"],
        "fallbackRate": result_b["fallbackRate"] - result_a["fallbackRate"],
    }

    print(json.dumps({
        "model": args.model,
        "dataset": str(dataset),
        "policyA": result_a,
        "policyB": result_b,
        "delta_policyB_minus_policyA": delta,
        "winnerByExpectedPassRate": args.policy_b if delta["expectedPassRate"] > 0 else args.policy_a,
    }, indent=2))


if __name__ == "__main__":
    main()
