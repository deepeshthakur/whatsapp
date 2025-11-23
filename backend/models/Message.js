const moongoose = require("mongoose");


const message = new moongoose.Schema({
    conversation:{
        type: moongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    sender:{
        type: moongoose.Schema.Types.ObjectId,  
        ref: "User",
        required: true,
    },
    receiver :{
        type: moongoose.Schema.Types.ObjectId,  
        ref: "User",
        required: true,
    },
    content:{
        type: String,
    },
    imageOrVideoUrl:{
        type: String,
    },
    contentType:{
        type: String,
        enum: ["text", "image", "video"],
    },
    reactions:[
        {
            user:{
                type: moongoose.Schema.Types.ObjectId,
                ref: "User",},
                emoji:String,
        }
    ],
    messsageStatus:{type:String,default:"sent"},
},
{timestamps:true}
);

const Message = moongoose.model("Message", message);

module.exports = Message;