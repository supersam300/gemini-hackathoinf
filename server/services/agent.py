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
1. ALWAYS start by calling 'get_canvas_state' to understand the current circuit.
2. If the user asks to connect components that are NOT on the canvas, YOU MUST FIRST PLACE THEM using 'update_canvas_state' with 'PLACE_COMPONENT'.
3. Assign clear IDs (e.g., 'UNO1', 'LED1', 'R1') to placed components so you can refer to them in 'ADD_WIRE'.
4. Perform all required actions (placing and connecting) in a single 'update_canvas_state' call if possible, or across multiple turns.
5. For connections, use format 'id:pin'. INFER pins if not specified (Arduino '13', LED 'anode', etc.).
DO NOT ASK FOR PERMISSION TO PLACE COMPONENTS. If the user says 'Connect X to Y' and they are missing, place them and connect them immediately."""

        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[get_canvas_state_tool, update_canvas_state_tool],
            )
        )

        response = chat.send_message(prompt)
        
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
                if hasattr(p, 'text') and p.text:
                    agent_text += p.text + " "
                if hasattr(p, 'function_call') and p.function_call:
                    tool_calls.append(p.function_call)

            # If no tool calls, the model is done responding
            if not tool_calls:
                break

            # Build responses for each tool call
            tool_responses = []
            for func_call in tool_calls:
                if func_call.name == "get_canvas_state":
                    tool_responses.append(
                        types.Part.from_function_response(
                            name="get_canvas_state",
                            response={"canvas": canvas_state} if canvas_state else {"canvas": {"components": [], "wires": []}}
                        )
                    )
                elif func_call.name == "update_canvas_state":
                    args = func_call.args
                    if "actions" in args:
                        pending_actions.extend(args["actions"])
                    tool_responses.append(
                        types.Part.from_function_response(
                            name="update_canvas_state",
                            response={"success": True, "message": "Actions applied to canvas."}
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
