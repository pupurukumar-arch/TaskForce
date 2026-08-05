import mongoose from "mongoose";

const getMongoDatabaseIdentity = (databaseUri) => {
  if (!databaseUri) return null;

  try {
    const parsedUri = new URL(databaseUri);
    return {
      host: parsedUri.host.toLowerCase(),
      database: decodeURIComponent(
        parsedUri.pathname.replace(/^\/+|\/+$/g, "") || "test",
      ),
    };
  } catch {
    throw new Error("MongoDB connection string is invalid");
  }
};

const assertSeparateTestDatabase = (
  testDatabaseUri,
  developmentDatabaseUri,
) => {
  if (!testDatabaseUri) {
    throw new Error("TEST_MONGO_URI is required for automated tests");
  }

  if (!developmentDatabaseUri) return;

  const testDatabase = getMongoDatabaseIdentity(testDatabaseUri);
  const developmentDatabase = getMongoDatabaseIdentity(developmentDatabaseUri);
  const pointsToDevelopmentDatabase =
    testDatabase.host === developmentDatabase.host &&
    testDatabase.database === developmentDatabase.database;

  if (pointsToDevelopmentDatabase) {
    throw new Error(
      "TEST_MONGO_URI must use a different database name from MONGO_URI",
    );
  }
};

const connectDB = async (databaseUri = process.env.MONGO_URI) => {
  try {
    await mongoose.connect(databaseUri);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error", error);
    throw error;
  }
};

export default connectDB;
export { assertSeparateTestDatabase, getMongoDatabaseIdentity };
