const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "account", required: true },
        receiver: { type: mongoose.Schema.Types.ObjectId, ref: "account", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
