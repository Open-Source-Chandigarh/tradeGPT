import mongoose from "mongoose"; 


const chatSchema = new mongoose.Schema({
    userid:{
        type: String,
        required: true,
    },
    chatid:{
        type: String,
        required: true,
        unique:true
    },
    chats:{
    type: Array,
    default: [],
    },
    date:{
        type: Date,
        default:Date.now()
    },
    title:{
        type:String,
        default:"New Chat"
    }
    })

const Chat =  mongoose.models.Chat || mongoose.model('Chat',chatSchema)

export default Chat