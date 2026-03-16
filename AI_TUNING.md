# AI Tuning and Evaluation

This project now includes a full reliability loop for the local builder agent:

1. Runtime telemetry capture (`/api/ai/agent` + `/api/ai/feedback`)
2. Offline replay evaluation (`scripts/ai/evaluate_replay.py`)
3. Baseline A/B policy comparison (`scripts/ai/baseline_ab.py`)
4. Training-data export from production telemetry (`scripts/ai/export_training_data.cjs`)
5. Vertex AI tuning/registry orchestration (`scripts/ai/vertex_tune_and_export.py`)

## Core Metrics

The system tracks these primary metrics:

- `validJsonRate`: agent returned machine-parseable JSON.
- `avgValidActionSchemaRate`: actions match allowed action schema.
- `avgExecutableWireEndpointRate`: `ADD_WIRE` endpoints resolve to known/planned components.
- `avgTaskCompletionHeuristic`: schema rate * endpoint executability.
- `fallbackRate`: autonomous fallback path usage.
- `correctedRate` / `rejectedRate`: user outcome feedback.

Target thresholds:

- `validJsonRate >= 0.95`
- `avgExecutableWireEndpointRate >= 0.90`
- `avgTaskCompletionHeuristic >= 0.85`
- `fallbackRate <= 0.05`

## Golden Set

Golden prompts live at `server/data/ai_eval_golden.jsonl` and contain:

- `prompt`
- `canvasState`
- `mode`
- `expected` (required action types, optional minimum counts)

Run replay evaluation:

```bash
python scripts/ai/evaluate_replay.py \
  --dataset server/data/ai_eval_golden.jsonl \
  --model gemma3:latest \
  --policy default
```

## Baseline A/B

Compare prompt policy variants:

```bash
python scripts/ai/baseline_ab.py \
  --dataset server/data/ai_eval_golden.jsonl \
  --model gemma3:latest \
  --policy-a default \
  --policy-b strict-json-v2
```

## Feedback and Monitoring APIs

- `POST /api/ai/feedback` with `{ eventId, outcome }`
- `GET /api/ai/metrics?hours=168`
- `GET /api/ai/telemetry?limit=100`

## Canary Rollout

Set in environment:

```env
OLLAMA_MODEL=gemma3:latest
OLLAMA_MODEL_CANDIDATE=gemma3-tuned:v1
OLLAMA_CANARY_PERCENT=10
```

Routing is sticky by `sessionId`.

## Vertex AI Tuning Orchestration

Use:

```bash
python scripts/ai/vertex_tune_and_export.py --help
```

The script validates inputs, writes job specs, and prints/executes the commands needed for:

- training job submission
- evaluation dataset scoring
- model artifact registration for Ollama packaging
