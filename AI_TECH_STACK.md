# AI Tech Stack: UI Navigator ☸️

## Focus: Visual UI Understanding & Interaction

The UI Navigator is a multimodal AI agent designed to act as the user's "hands on screen." It observes the application's visual state and performs actions based on user intent, without necessarily relying on underlying APIs or DOM access.

### Mandatory Technology Stack

1.  **Multimodal Intelligence**: 
    *   **Model**: Google Gemini 1.5 Flash (or Pro).
    *   **Capability**: Interprets screenshots and screen recordings to understand visual context and output structured, executable actions.
2.  **Development SDK**: 
    *   **Google GenAI SDK**: Used for seamless integration with Gemini models in the Node.js backend.
3.  **Hosting & Infrastructure**: 
    *   **Google Cloud Platform (GCP)**: The agent and backend services are hosted on Google Cloud (e.g., Cloud Run for serverless execution, Artifact Registry for container management).

### Core Requirements Check

- [x] **Leverage a Gemini model**: Uses `gemini-1.5-flash` for high-speed multimodal reasoning.
- [x] **Google GenAI SDK**: Implemented via `@google/genai` library in the backend service.
- [x] **Google Cloud Service**: Fully containerized with Docker, ready for deployment on **Google Cloud Run**.

### Implementation Details: UI Navigator Agent

The agent functions by:
1.  **Capturing Context**: Taking high-resolution snapshots of the circuit canvas using `html2canvas`.
2.  **Visual Reasoning**: Sending the snapshot + user intent to Gemini via the GenAI SDK.
3.  **Action Execution**: Parsing structured JSON responses from Gemini to:
    *   `PLACE_COMPONENT`: Add new elements to the canvas.
    *   `ADD_WIRE`: Link component pins.
    *   `START_SIMULATION` / `STOP_SIMULATION`: Control the simulation lifecycle.

### Use Cases
- **Universal Web Navigator**: Automating workflows by "looking" at the screen.
- **Cross-Application Workflow Automator**: Bridging different UI elements through visual recognition.
- **Visual QA Testing Agent**: Automatically identifying visual discrepancies in circuit layouts.
