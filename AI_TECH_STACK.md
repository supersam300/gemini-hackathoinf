# AI Tech Stack: UI Navigator ☸️

## Focus: Visual UI Understanding & Interaction

The UI Navigator is a multimodal AI agent designed to act as the user's "hands on screen." It observes the application's visual state and performs actions based on user intent, without necessarily relying on underlying APIs or DOM access.

### Mandatory Technology Stack

1.  **Multimodal Intelligence**: 
    *   **Model**: Google Gemini 2.0 Flash (Experimental) / 1.5 Flash.
    *   **Capability**: Interprets screenshots and reads direct canvas state to output structured, executable actions.
2.  **Development SDK**: 
    *   **Google GenAI Python SDK**: The core agent logic (`agent.py`) uses the official `google-genai` library for robust tool-calling and multimodal support.
3.  **Hosting & Infrastructure**: 
    *   **Google Cloud Platform (GCP)**: Optimized for Cloud Run.

### Core Requirements Check

- [x] **Leverage a Gemini model**: Uses `gemini-1.5-flash` for high-speed multimodal reasoning.
- [x] **Google GenAI SDK**: Implemented via `google-genai` Python library.
- [x] **Google Cloud Service**: Ready for deployment on **Google Cloud Run**.

### Implementation Details: UI Navigator Agent

The agent functions by:
1.  **Capturing Context**: Taking snapshots of the canvas using `html2canvas`.
2.  **Visual Reasoning**: Sending snapshots + structured state to Gemini.
3.  **Action Execution**: Parsing JSON responses to:
    *   `PLACE_COMPONENT`: Add elements.
    *   `ADD_WIRE`: Link pins.
    *   `UPDATE_CODE`: Write/Update Arduino snippets in the IDE.
    *   `START_SIMULATION`: Initiate the digital twin logic.

### Use Cases
- **Universal Web Navigator**: Automating workflows by "looking" at the screen.
- **Cross-Application Workflow Automator**: Bridging different UI elements through visual recognition.
- **Visual QA Testing Agent**: Automatically identifying visual discrepancies in circuit layouts.
