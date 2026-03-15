const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const systemPrompt = "Hello";

async function test() {
    try {
        const chat = ai.chats.create({
            model: "gemini-1.5-pro",
            config: {
                systemInstruction: systemPrompt,
                tools: [{
                    functionDeclarations: [
                        {
                            name: "get_canvas_state",
                            description: "Returns the current state of the canvas.",
                            parameters: { type: "OBJECT", properties: {} }
                        }
                    ]
                }]
            }
        });
        
        let response = await chat.sendMessage("What is the canvas state?");
        console.log("Response:", JSON.stringify(response, null, 2));

        if (response.candidates[0].content.parts[0].functionCall) {
            let funcResp = await chat.sendMessage([{
                functionResponse: {
                    name: "get_canvas_state",
                    response: { test: "data" }
                }
            }]);
            console.log("Final Response:", JSON.stringify(funcResp, null, 2));
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
