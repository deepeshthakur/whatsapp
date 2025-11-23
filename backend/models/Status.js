const moongoose = require("mongoose");


const statusSchema = new moongoose.Schema({
    user:{
        type: moongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    content:{
        type: String,
        required: true,
    },
    contentType:{
        type: String,
        enum:["image","video","text"],
        default:"text",
    },
    viewers:{
        type: [moongoose.Schema.Types.ObjectId],
        ref: "User",
    },
    expiresAt:{
        type: Date,
        required: true,
    }
},
{timestamps:true}
);


const Status = moongoose.model("Status", statusSchema);

module.exports = Status;