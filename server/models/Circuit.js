const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema({
    nodeId: String,
    type: { type: String, default: "componentNode" },
    componentType: String,
    label: String,
    position: {
        x: Number,
        y: Number,
    },
    properties: mongoose.Schema.Types.Mixed,
    handles: {
        inputs: [String],
        outputs: [String],
    },
}, { _id: false });

const connectionSchema = new mongoose.Schema({
    edgeId: String,
    from: {
        nodeId: String,
        componentType: String,
        handle: String,
    },
    to: {
        nodeId: String,
        componentType: String,
        handle: String,
    },
    type: { type: String, default: "connection" },
}, { _id: false });

const circuitSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    code: { type: String, default: "" },
    language: { type: String, default: "cpp", enum: ["c", "cpp", "python"] },
    components: [componentSchema],
    connections: [connectionSchema],
    metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model("Circuit", circuitSchema);
