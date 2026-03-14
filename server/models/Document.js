const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
