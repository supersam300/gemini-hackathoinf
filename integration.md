# Vector Database Integration

This document outlines the integration of MongoDB Atlas Vector Search and Google's Gemini AI into the `simulide-web` project.

## Overview
The goal is to enable semantic search and Retrieval-Augmented Generation (RAG) by storing text embeddings in MongoDB and querying them via Gemini.

## 1. MongoDB Setup
- **Database**: MongoDB Atlas (required for `$vectorSearch`).
- **Collection**: `documents` (or a similar collection specifically for storing vector embeddings).
- **Index**: A Vector Search Index must be configured on the `documents` collection in the Atlas UI, targeting the `embedding` field.

Sample Atlas Vector Search Index Definition:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

## 2. Application Architecture

### Models (`server/models/Document.js`)
A new Mongoose schema stores the source text, metadata, and the embedding array.

### AI Service (`server/services/geminiService.js`)
Uses the `@google/genai` SDK to:
1. Generate embeddings for the provided text using a Gemini embedding model (e.g., `text-embedding-004`).
2. Generate semantic responses based on retrieved context.

### API Routes (`server/routes/ai.js`)
Exposes endpoints for:
- `POST /api/ai/ingest`: Takes raw text/data, generates an embedding via Gemini, and saves it to MongoDB.
- `POST /api/ai/search`: Takes a query string, generates its embedding, and performs a `$vectorSearch` aggregation in MongoDB to find the most relevant documents.
- `POST /api/ai/vision`: Accepts a base64 image and a text prompt. Uses Gemini 1.5 Flash to perform multimodal reasoning on the visual circuit state.

## 3. Usage & Testing
- Make sure `MONGODB_URI` and `GEMINI_API_KEY` are present in your `.env` file.
- Start the server using `npm run dev:full`.
- Use the provided API endpoints to ingest context and perform semantic similarity searches.

