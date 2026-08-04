import mongoose from "mongoose";

const connectDB = async (databaseUri = process.env.MONGO_URI) => {
  try {
    await mongoose.connect(databaseUri);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error", error);
    process.exit(1);
  }
};

export default connectDB;
