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
    freechats:{
        type: Number,
        default: 0,
    },
    chats:{
        type: Array,
    },
    date:{
        type: Date,
        default:Date.now()
    },
    paidacc:{
        type: Boolean,
    },
    razorpayPaymentId:{
        type: String,
    }
    })

const User =  mongoose.models.User || mongoose.model('User',userSchema)

export default User