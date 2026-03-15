import sys
import json
import os
from google import genai
from google.genai import types

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input provided"}))
            return
            
        data = json.loads(input_data)
        prompt = data.get("prompt", "")
        canvas_state = data.get("canvasState", {})

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
             print(json.dumps({"success": False, "error": "GEMINI_API_KEY not found in environment"}))
             return
             
        client = genai.Client(api_key=api_key)

        get_canvas_state_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_canvas_state",
                    description="Returns the current state of the canvas, including all placed components and their connections (wires) in JSON format.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={}
                    )
                )
            ]
        )

        update_canvas_state_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="update_canvas_state",
                    description="Propose an update to make changes to the circuit canvas. Returns the list of actions to perform.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "actions": types.Schema(
                                type=types.Type.ARRAY,
                                description="List of actions to perform on the canvas",
                                items=types.Schema(
                                    type=types.Type.OBJECT,
                                    properties={
                                        "type": types.Schema(
                                            type=types.Type.STRING,
                                            description="The type of action to perform. Examples: 'PLACE_COMPONENT', 'ADD_WIRE', 'DELETE_COMPONENT', 'DELETE_WIRE', 'START_SIMULATION', 'STOP_SIMULATION'."
                                        ),
                                        "componentType": types.Schema(
                                            type=types.Type.STRING,
                                            description="Type of component (e.g., 'led', 'resistor', 'arduino-uno'). Required for PLACE_COMPONENT."
                                        ),
                                        "x": types.Schema(
                                            type=types.Type.NUMBER,
                                            description="X coordinate. Required for PLACE_COMPONENT."
                                        ),
                                        "y": types.Schema(
                                            type=types.Type.NUMBER,
                                            description="Y coordinate. Required for PLACE_COMPONENT."
                                        ),
                                        "label": types.Schema(
                                            type=types.Type.STRING,
                                            description="Label for the component (e.g., 'D1', 'R1'). Required for PLACE_COMPONENT."
                                        ),
                                        "componentId": types.Schema(
                                            type=types.Type.STRING,
                                            description="ID of the component to delete. Required for DELETE_COMPONENT."
                                        ),
                                        "from": types.Schema(
                                            type=types.Type.STRING,
                                            description="Source pin for new wire in format 'componentId:pinName' (e.g. 'u1:13'). Required for ADD_WIRE."
                                        ),
                                        "to": types.Schema(
                                            type=types.Type.STRING,
                                            description="Target pin for new wire in format 'componentId:pinName' (e.g. 'd1:anode'). Required for ADD_WIRE."
                                        ),
                                        "wireId": types.Schema(
                                            type=types.Type.STRING,
                                            description="ID of the wire to delete. Required for DELETE_WIRE."
                                        )
                                    },
                                    required=["type"]
                                )
                            )
                        },
                        required=["actions"]
                    )
                )
            ]
        )

        system_instruction = """You are a helpful AI assistant for a circuit simulator called SimuIDE. 
You can interact with the user's circuit canvas by using tools.
If you need to know what components are on the canvas, call the get_canvas_state tool.
If the user asks you to add, connect, or delete components, call the update_canvas_state tool.
When adding wires, make sure both components exist and use the correct pin names.
If the user asks to connect two components but doesn't specify the pins, you must INFER the most logical pins logically automatically!
Common pins:
- LED: 'anode' or 'cathode' (or 'in-0', 'out-0')
- Resistor: '1' or '2' (or 'in-0', 'out-0')
- Arduino: '0' to '13', 'A0' to 'A5', 'GND', '5V', '3.3V'
- Battery/VCC: 'vcc', 'gnd' 
DO NOT ASK THE USER FOR CLARIFICATION ON PINS unless absolutely necessary. Pick the first available open logical pin!"""

        chat = client.chats.create(
            model="gemini-3",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[get_canvas_state_tool, update_canvas_state_tool],
            )
        )

        response = chat.send_message(prompt)
        
        agent_text = ""
        pending_actions = []

        # Multi-turn tool calling loop
        max_turns = 5
        turn_count = 0
        
        while turn_count < max_turns:
            if not (response.candidates and response.candidates[0].content and response.candidates[0].content.parts):
                break
                
            parts = response.candidates[0].content.parts
            
            tool_calls = [p.function_call for p in parts if p.function_call]
            
            for p in parts:
                if p.text:
                    agent_text += p.text + " "

            if not tool_calls:
                break

            tool_responses = []
            for func_call in tool_calls:
                if func_call.name == "get_canvas_state":
                    tool_responses.append(
                        types.Part.from_function_response(
                            name="get_canvas_state",
                            response=canvas_state
                        )
                    )
                elif func_call.name == "update_canvas_state":
                    args = func_call.args
                    if "actions" in args:
                        pending_actions.extend(args["actions"])
                    tool_responses.append(
                        types.Part.from_function_response(
                            name="update_canvas_state",
                            response={"success": True}
                        )
                    )
            
            response = chat.send_message(tool_responses)
            turn_count += 1

        print(json.dumps({
            "success": True,
            "text": agent_text.strip(),
            "actions": pending_actions
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
