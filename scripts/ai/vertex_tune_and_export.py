#!/usr/bin/env python3
import argparse
import json
import os
import shlex
import subprocess
from pathlib import Path


def run_or_print(command, execute):
    print(f"$ {command}")
    if execute:
        subprocess.run(command, shell=True, check=True)


def main():
    parser = argparse.ArgumentParser(description="Vertex AI tuning orchestration for SimuIDE agent")
    parser.add_argument("--project", required=True, help="GCP project id")
    parser.add_argument("--region", default="us-central1")
    parser.add_argument("--train-jsonl", required=True, help="Training JSONL in GCS (gs://...)")
    parser.add_argument("--eval-jsonl", required=True, help="Eval JSONL in GCS (gs://...)")
    parser.add_argument("--base-model", default="gemma-3-4b-it", help="Vertex model family id")
    parser.add_argument("--display-name", default="simuide-builder-tune")
    parser.add_argument("--output-dir", default="gs://REPLACE_BUCKET/simuide-tuning")
    parser.add_argument("--ollama-model-name", default="gemma3-simuide:v1")
    parser.add_argument("--execute", action="store_true", help="Execute commands instead of printing")
    parser.add_argument("--write-spec", default="server/data/vertex_tuning_job_spec.json")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    spec_path = (repo_root / args.write_spec).resolve() if not Path(args.write_spec).is_absolute() else Path(args.write_spec)
    spec_path.parent.mkdir(parents=True, exist_ok=True)

    spec = {
        "project": args.project,
        "region": args.region,
        "baseModel": args.base_model,
        "displayName": args.display_name,
        "trainJsonl": args.train_jsonl,
        "evalJsonl": args.eval_jsonl,
        "outputDir": args.output_dir,
        "ollamaModelName": args.ollama_model_name,
    }
    spec_path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    print(f"Wrote spec: {spec_path}")

    env_prefix = f"gcloud config set project {shlex.quote(args.project)}"
    run_or_print(env_prefix, args.execute)

    tuning_cmd = (
        "gcloud ai custom-jobs create "
        f"--region={shlex.quote(args.region)} "
        f"--display-name={shlex.quote(args.display_name)} "
        "--worker-pool-spec=machine-type=n1-standard-8,replica-count=1,container-image-uri=us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.2-2:latest "
        f"--args=--base_model={shlex.quote(args.base_model)},--train={shlex.quote(args.train_jsonl)},--eval={shlex.quote(args.eval_jsonl)},--output_dir={shlex.quote(args.output_dir)}"
    )
    run_or_print(tuning_cmd, args.execute)

    eval_cmd = (
        "python3 scripts/ai/evaluate_replay.py "
        "--dataset server/data/ai_eval_golden.jsonl "
        f"--model {shlex.quote(args.ollama_model_name)} "
        "--policy strict-json-v2"
    )
    run_or_print(eval_cmd, args.execute)

    export_note = (
        "After training artifact export, convert to GGUF and import to Ollama:\n"
        "  1) python convert_hf_to_gguf.py <artifact_dir>\n"
        "  2) ollama create "
        f"{args.ollama_model_name} -f Modelfile\n"
        "  3) set OLLAMA_MODEL_CANDIDATE to canary the tuned model"
    )
    print(export_note)


if __name__ == "__main__":
    main()
