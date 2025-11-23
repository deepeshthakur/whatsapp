const mongoose = require("mongoose");


const connectDb = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URL),{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
        console.log("MongoDB connected successfully");  
    }catch(error){
        console.log("MongoDB connection failed",error.message);
        process.exit(1);
    }
};

module.exports = connectDb;