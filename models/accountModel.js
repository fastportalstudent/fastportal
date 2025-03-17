const mongoose = require("mongoose");
const accountSchema = new mongoose.Schema(
    {
        name: { type: String },
        pass: { type: String },
        fullname:{type: String},
        section: { type: String },
        lrn:{type: String},
        strand:{type: String},
        profile: { type: String },
        isTeach: { type: Boolean },
        gradesPdf:{type:String},
    },
    { versionKey: false }
);
const accountModel = mongoose.model("account", accountSchema);
module.exports = accountModel;