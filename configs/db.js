import mongoose from "mongoose";
import process from "node:process";

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {});

  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

export default connectDB;