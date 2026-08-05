import app from "../src/app.js";
import connectDB from "../src/db/index.js";

let databaseConnection;

export default async function handler(req, res) {
  databaseConnection ||= connectDB(process.env.MONGO_URI);
  await databaseConnection;
  return app(req, res);
}
