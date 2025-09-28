import mongoose from "mongoose"; 


const chatSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique:true
    },
    chats:{
        type: Array,
    },
    date:{
        type: Date,
        default:Date.now()
    }
    })

const Chat =  mongoose.models.Chat || mongoose.model('Chat',chatSchema)

export default Chat