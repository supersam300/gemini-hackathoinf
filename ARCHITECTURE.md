# System Architecture - SimuIDE Web (UI Navigator)

SimuIDE Web is a high-performance IDE and electronic simulator featuring the **UI Navigator**, a multimodal AI agent built on Gemini 2.0/1.5 Flash. The system is designed for massive scalability on Google Cloud Run.

```mermaid
graph TD
    subgraph "Client Side (Browser)"
        UI["React Frontend (Vite)"]
        HTML2C["Snapshot Engine (html2canvas)"]
        Canvas["Wokwi Circuit Canvas"]
    end

    subgraph "Google Cloud Container (Express.js)"
        Server["Express.js Server"]
        
        subgraph "AI Core & UI Navigator"
            Agent["UI Navigator Agent (Python)"]
            GenAISDK["Google GenAI SDK (2.0)"]
            Gemini["Gemini 2.0/1.5 Flash"]
        end

        subgraph "Search & Intelligence"
            GeminiSvc["Gemini Node.js Service"]
            Embed["Embeddings (text-embedding-004)"]
        end

        subgraph "Tools & Toolchains"
            Arduino["Arduino CLI"]
            SimEngine["AVR8js Simulation"]
        end

        subgraph "Observability Layer"
            Tele["Telemetry Store"]
            Feed["Feedback Engine"]
            Metrics["Metrics Aggregator"]
        end
    end

    subgraph "External & Persistence"
        DB[("MongoDB Atlas")]
        Vector["Vector Search Index"]
    end

    %% Client Operations
    UI <-->|Capture State| HTML2C
    UI <-->|REST API| Server
    
    %% AI Pipeline
    Server <-->|Shell / Stdin| Agent
    Agent <-->|SDK 2.0| GenAISDK
    GenAISDK <--> Gemini
    Server <-->|Embed/Search| GeminiSvc
    GeminiSvc <--> Embed
    Embed <--> Vector
    Server <-->|Mongoose| DB
    
    %% Monitoring & Feedback
    Server -->|Logs Events| Tele
    Tele --> Metrics
    Server <---|"User Feedback"| Feed
    
    %% Hardware
    Server -->|Compile| Arduino
    
    %% Styling
    style UI fill:#60a5fa,stroke:#2563eb,color:#fff
    style Gemini fill:#f59e0b,stroke:#d97706,color:#fff
    style Agent fill:#f59e0b,stroke:#d97706,color:#fff
    style DB fill:#10b981,stroke:#059669,color:#fff
    style Server fill:#4b5563,stroke:#1f2937,color:#fff
    style Tele fill:#ef4444,stroke:#dc2626,color:#fff
```

### Core Architectural Pillars

1.  **UI Navigator (Multimodal Agent)**: Instead of basic API-chained logic, the agent "observes" the UI via snapshots. It uses Gemini 2.0 Flash to reason about the visual circuit state and outputs structured actions (`PLACE_COMPONENT`, `ADD_WIRE`, etc.) delivered via the Google GenAI SDK.
2.  **Vector Search (Semantic Discovery)**: Powered by MongoDB Atlas Vector Search and `text-embedding-004`, the system allows users to search the circuit database semantically (e.g., "find circuits with three LEDs in parallel").
3.  **Observability & Telemetry**: Every AI interaction is hashed, logged, and analyzed. A dedicated telemetry store tracks latency, token usage, and successful action execution.
4.  **Unified Deployment**: The entire stack—Node.js backend, Python agent, and Arduino toolchain—is co-located within a single optimized Docker image for rapid scaling on Google Cloud Run.
