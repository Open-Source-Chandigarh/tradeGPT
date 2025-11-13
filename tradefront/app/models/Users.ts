import mongoose from "mongoose"; 


const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique:true
    },
    username:{
        type: String,
        required: true,
    },
    subscriptiontill:{
        type: Date,
        required: false,
    },
    freechats:{
        type: Number,
        default: 0,
    },
    chats: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
    },
    ],
    date:{
        type: Date,
        default:Date.now()
    },
    paidacc:{
        type: Boolean,
    },
    razorpayPaymentId:{
        type: String,
    },
    allchatstitle:{
        type:Array
    },
    chatids:{
        type:Array
    },
    })

const User =  mongoose.models.User || mongoose.model('User',userSchema)

export default User