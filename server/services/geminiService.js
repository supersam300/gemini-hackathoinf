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

/**
 * Agent specifically for the circuit canvas
 * Allows the user to interact with the canvas via function calling
 */
async function runCanvasAgent(promptText, canvasState) {
    try {
        const tools = [{
            functionDeclarations: [
                {
                    name: "get_canvas_state",
                    description: "Returns the current state of the canvas, including all placed components and their connections (wires) in JSON format.",
                    parameters: {
                        type: "OBJECT",
                        properties: {}
                    }
                },
                {
                    name: "update_canvas_state",
                    description: "Propose an update to make changes to the circuit canvas. Returns the list of actions to perform.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            actions: {
                                type: "ARRAY",
                                description: "List of actions to perform on the canvas",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        type: {
                                            type: "STRING",
                                            description: "The type of action to perform. Examples: 'PLACE_COMPONENT', 'ADD_WIRE', 'DELETE_COMPONENT', 'DELETE_WIRE', 'START_SIMULATION', 'STOP_SIMULATION'."
                                        },
                                        componentType: {
                                            type: "STRING",
                                            description: "Type of component (e.g., 'led', 'resistor', 'arduino-uno'). Required for PLACE_COMPONENT."
                                        },
                                        x: {
                                            type: "NUMBER",
                                            description: "X coordinate. Required for PLACE_COMPONENT."
                                        },
                                        y: {
                                            type: "NUMBER",
                                            description: "Y coordinate. Required for PLACE_COMPONENT."
                                        },
                                        label: {
                                            type: "STRING",
                                            description: "Label for the component (e.g., 'D1', 'R1'). Required for PLACE_COMPONENT."
                                        },
                                        componentId: {
                                            type: "STRING",
                                            description: "ID of the component to delete. Required for DELETE_COMPONENT."
                                        },
                                        from: {
                                            type: "STRING",
                                            description: "Source pin for new wire in format 'componentId:pinName' (e.g. 'u1:13'). Required for ADD_WIRE."
                                        },
                                        to: {
                                            type: "STRING",
                                            description: "Target pin for new wire in format 'componentId:pinName' (e.g. 'd1:anode'). Required for ADD_WIRE."
                                        },
                                        wireId: {
                                            type: "STRING",
                                            description: "ID of the wire to delete. Required for DELETE_WIRE."
                                        }
                                    },
                                    required: ["type"]
                                }
                            }
                        },
                        required: ["actions"]
                    }
                }
            ]
        }];

        const systemPrompt = `You are a helpful AI assistant for a circuit simulator called SimuIDE. 
You can interact with the user's circuit canvas by using tools.
If you need to know what components are on the canvas, call the get_canvas_state tool.
If the user asks you to add, connect, or delete components, call the update_canvas_state tool.
When adding wires, make sure both components exist and use the correct pin names.`;

        const chat = ai.chats.create({
            model: "gemini-1.5-pro",
            config: {
                systemInstruction: systemPrompt,
                tools: tools,
            }
        });

        // initial message
        let response = await chat.sendMessage({ text: promptText });
        
        let pendingToolCalls = [];
        let functionResponses = [];
        let agentText = "";
        
        const processResponse = async (resp) => {
            if (resp.candidates && resp.candidates[0].content.parts) {
                for (const part of resp.candidates[0].content.parts) {
                    if (part.text) {
                        agentText += part.text;
                    }
                    if (part.functionCall) {
                        if (part.functionCall.name === "get_canvas_state") {
                            functionResponses.push({
                                functionResponse: {
                                    name: "get_canvas_state",
                                    response: canvasState
                                }
                            });
                        } else if (part.functionCall.name === "update_canvas_state") {
                            pendingToolCalls.push(part.functionCall.args);
                            functionResponses.push({
                                functionResponse: {
                                    name: "update_canvas_state",
                                    response: { success: true }
                                }
                            });
                        }
                    }
                }
            }
        };

        await processResponse(response);

        // If the model called tools, we need to send the results back to get a final response
        if (functionResponses.length > 0) {
            response = await chat.sendMessage(functionResponses);
            await processResponse(response);
        }

        return {
            text: agentText.trim(),
            actions: pendingToolCalls.length > 0 ? pendingToolCalls.flatMap(t => t.actions) : []
        };
    } catch (error) {
        console.error("Error in runCanvasAgent:", error);
        throw error;
    }
}

module.exports = {
    generateEmbedding,
    similaritySearch,
    ingestDocument,
    analyzeImage,
    runCanvasAgent
};
