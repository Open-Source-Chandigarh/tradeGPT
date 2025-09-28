import mongoose from "mongoose"; 


const stockSchema = new mongoose.Schema({
    stockname:{
        type: String,
        required: true,
        unique:true
    },
    data:{
        type: Object,
    },
    date:{
        type: Date,
        default:Date.now()
    }
    })

const Stock =  mongoose.models.Stock || mongoose.model('Stock',stockSchema)

export default Stock