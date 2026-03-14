const { GoogleGenAI } = require("@google/genai");
const Document = require("../models/Document");

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-004";
const VISION_MODEL = "gemini-1.5-flash";

/**
 * Generate an embedding vector for the provided text.
 */
async function generateEmbedding(text) {
    try {
        const response = await ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text,
        });
        
        // Return the embedding array
        return response.embeddings[0].values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}

/**
 * Perform a semantic search using MongoDB Atlas Vector Search
 */
async function similaritySearch(query, limit = 5) {
    try {
        const queryEmbedding = await generateEmbedding(query);

        // Run the $vectorSearch aggregation pipeline
        const results = await Document.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index", // Name of the index created in Atlas UI
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: limit,
                }
            },
            {
                $project: {
                    _id: 1,
                    text: 1,
                    metadata: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ]);

        return results;
    } catch (error) {
        console.error("Error performing similarity search:", error);
        throw error;
    }
}

/**
 * High-level function to ingest new text
 */
async function ingestDocument(text, metadata = {}) {
    try {
        const embedding = await generateEmbedding(text);
        const doc = new Document({ text, metadata, embedding });
        await doc.save();
        return doc;
    } catch (error) {
        console.error("Error ingesting document:", error);
        throw error;
    }
}

/**
 * Multimodal Visual QA using Gemini
 * Accepts a base64 encoded image and a text prompt.
 */
async function analyzeImage(base64Image, promptText) {
    try {
        // The SDK expects inlineData for base64 images
        const systemPrompt = `You are the SimuIDE UI Navigator. 
Analyze the provided screenshot of a circuit canvas and code editor.
If the user intent involves performing an action (like making a connection, adding a component, or running the simulation), include a JSON block in your response using the following format:

\`\`\`json
{
  "actions": [
    { "type": "PLACE_COMPONENT", "componentType": "led", "x": 100, "y": 100, "label": "Status LED" },
    { "type": "ADD_WIRE", "from": "id1:out-0", "to": "id2:in-0" },
    { "type": "START_SIMULATION" },
    { "type": "STOP_SIMULATION" }
  ]
}
\`\`\`

If no action is required, just provide a text analysis. Always prioritize accuracy regarding component types and pin locations.`;

        const response = await ai.models.generateContent({
            model: VISION_MODEL,
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\n\nUser Request: " + promptText }] },
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: "image/jpeg"
                    }
                }
            ]
        });
        
        return response.response.text();
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw error;
    }
}

module.exports = {
    generateEmbedding,
    similaritySearch,
    ingestDocument,
    analyzeImage
};
