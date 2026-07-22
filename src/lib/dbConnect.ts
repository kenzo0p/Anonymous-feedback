import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
  if (connection.isConnected) {
    console.log("Already connected to database");
    return;
  }
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI || "");
    connection.isConnected = db.connections[0].readyState;

    console.log("Db connected successfully.");
  } catch (error) {
    console.log("Database connection failed", error);

    // Don't kill the whole server process on a transient DB error;
    // let the caller surface a 500 for this request instead.
    throw new Error("Database connection failed");
  }
}

export default dbConnect;
