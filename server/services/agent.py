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
        image_base64 = data.get("image")

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
                    description="Propose updates to the circuit canvas or code editor. Use this to place components, connect wires, or write Arduino code.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "actions": types.Schema(
                                type=types.Type.ARRAY,
                                description="List of actions to perform",
                                items=types.Schema(
                                    type=types.Type.OBJECT,
                                    properties={
                                        "type": types.Schema(
                                            type=types.Type.STRING,
                                            description="Action type: 'PLACE_COMPONENT', 'ADD_WIRE', 'DELETE_COMPONENT', 'DELETE_WIRE', 'UPDATE_CODE', 'START_SIMULATION', 'STOP_SIMULATION'."
                                        ),
                                        "componentType": types.Schema(
                                            type=types.Type.STRING,
                                            description="Type of component (e.g., 'led', 'resistor', 'arduino-uno')."
                                        ),
                                        "x": types.Schema(type=types.Type.NUMBER),
                                        "y": types.Schema(type=types.Type.NUMBER),
                                        "label": types.Schema(type=types.Type.STRING),
                                        "componentId": types.Schema(type=types.Type.STRING),
                                        "from": types.Schema(type=types.Type.STRING),
                                        "to": types.Schema(type=types.Type.STRING),
                                        "wireId": types.Schema(type=types.Type.STRING),
                                        "code": types.Schema(
                                            type=types.Type.STRING,
                                            description="The source code to write to the editor. Required for UPDATE_CODE."
                                        ),
                                        "fileName": types.Schema(
                                            type=types.Type.STRING,
                                            description="The name of the file (e.g., 'blink.ino'). Required for UPDATE_CODE."
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

        system_instruction = """You are a Multimodal AI Developer for SimuIDE.
You can see the circuit canvas via screenshots and read its structured state (components and wires).
Your goal is to help the user build working electronic projects by placing components, wiring them, and WRITING EXEUTABLE CODE.

1. ALWAYS 'get_canvas_state' to see exactly what is connected.
2. Use vision context (if provided) to cross-reference with the structured state.
3. If the user wants a working project or says "make it work", you MUST:
   - Identify the microcontroller (e.g., Arduino Uno) and the connected components (LEDs, Sensors, etc.). 
   - Write the correspondiong Arduino C++ code using the 'UPDATE_CODE' action.
   - The code MUST match the pins used on the canvas. 
   - Trigger 'START_SIMULATION' once the code and circuit are ready.
4. If the user prompt specifically asks for logic (e.g., "blink the red LED every 2 seconds"), prioritize that in your 'UPDATE_CODE' output.
5. You can perform multiple actions in one call: PLACE_COMPONENT, ADD_WIRE, and UPDATE_CODE."""

        chat = client.chats.create(
            model="gemini-2.0-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[get_canvas_state_tool, update_canvas_state_tool],
            )
        )

        initial_parts = [types.Part(text=prompt)]
        if image_base64:
            initial_parts.append(types.Part(
                inline_data=types.Blob(
                    data=image_base64,
                    mime_type="image/jpeg"
                )
            ))

        response = chat.send_message(initial_parts)
        
        agent_text = ""
        pending_actions = []

        # Multi-turn tool calling loop - process the initial response AND subsequent responses
        max_turns = 8
        turn_count = 0
        current_response = response
        
        while turn_count < max_turns:
            if not (current_response.candidates and
                    current_response.candidates[0].content and
                    current_response.candidates[0].content.parts):
                break

            parts = current_response.candidates[0].content.parts

            # Collect text and function calls from this turn
            tool_calls = []
            for p in parts:
                if p.text:
                    agent_text += p.text + " "
                if p.function_call:
                    tool_calls.append(p.function_call)

            # If no tool calls, the model is done responding
            if not tool_calls:
                break

            # Build responses for each tool call
            tool_responses = []
            for func_call in tool_calls:
                if func_call.name == "get_canvas_state":
                    tool_responses.append(
                        types.Part(
                            function_response=types.FunctionResponse(
                                name="get_canvas_state",
                                response={"canvas": canvas_state} if canvas_state else {"canvas": {"components": [], "wires": []}}
                            )
                        )
                    )
                elif func_call.name == "update_canvas_state":
                    args = func_call.args
                    if "actions" in args:
                        pending_actions.extend(args["actions"])
                    tool_responses.append(
                        types.Part(
                            function_response=types.FunctionResponse(
                                name="update_canvas_state",
                                response={"success": True, "message": "Actions applied to canvas."}
                            )
                        )
                    )

            current_response = chat.send_message(tool_responses)
            turn_count += 1

        def normalize_pin(pin_str):
            """Convert 'id.pins.pinName' or 'id.pinName' to 'id:pinName' format."""
            if not pin_str:
                return pin_str
            # Already correct format
            if ':' in pin_str:
                return pin_str
            # Handle 'id.pins.pinName'
            parts = pin_str.split('.')
            if len(parts) >= 3 and parts[1] == 'pins':
                return f"{parts[0]}:{parts[2]}"
            elif len(parts) == 2:
                return f"{parts[0]}:{parts[1]}"
            return pin_str

        def normalize_action(action):
            """Normalize action types and pin formats to match the frontend's expected schema."""
            action_type = action.get('type', '').upper()
            # Map model-generated action types to frontend types
            type_map = {
                'ADD': 'PLACE_COMPONENT',
                'PLACE': 'PLACE_COMPONENT',
                'PLACE_COMPONENT': 'PLACE_COMPONENT',
                'CONNECT': 'ADD_WIRE',
                'ADD_WIRE': 'ADD_WIRE',
                'REMOVE': 'DELETE_COMPONENT',
                'DELETE': 'DELETE_COMPONENT',
                'DELETE_COMPONENT': 'DELETE_COMPONENT',
                'REMOVE_WIRE': 'DELETE_WIRE',
                'DELETE_WIRE': 'DELETE_WIRE',
                'START_SIMULATION': 'START_SIMULATION',
                'STOP_SIMULATION': 'STOP_SIMULATION',
                'UPDATE_CODE': 'UPDATE_CODE',
                'WRITE_CODE': 'UPDATE_CODE',
            }
            normalized_type = type_map.get(action_type, action.get('type'))
            result = {**action, 'type': normalized_type}

            # Normalize pin format for wire connections
            if normalized_type == 'ADD_WIRE':
                # Also handle 'from1' as fallback for 'from'
                from_str = action.get('from') or action.get('from1') or ''
                to_str = action.get('to', '')
                result['from'] = normalize_pin(from_str)
                result['to'] = normalize_pin(to_str)
            
            # Ensure UPDATE_CODE specific fields are present if it's an UPDATE_CODE action
            if normalized_type == 'UPDATE_CODE':
                result['code'] = action.get('code', '')
                result['fileName'] = action.get('fileName', 'blink.ino')

            return result

        normalized_actions = [normalize_action(a) for a in pending_actions]

        print(json.dumps({
            "success": True,
            "text": agent_text.strip(),
            "actions": normalized_actions
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
