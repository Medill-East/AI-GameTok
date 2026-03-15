import snapshot from "@/data/store.json";
import { dbBootstrapStore, dbReadStore, isDatabaseConfigured } from "@/lib/db";
import type { StoreData } from "@/lib/types";

function summarizeStore(store: StoreData) {
  return {
    channels: store.channels.length,
    videos: store.videos.length,
    clips: store.clips.length,
    transcripts: Object.keys(store.transcripts).length,
  };
}

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL first.",
    );
  }

  const source = snapshot as unknown as StoreData;
  const expected = summarizeStore(source);

  console.log("Bootstrapping GameTok database from data/store.json ...");
  console.log("Source counts:", expected);

  await dbBootstrapStore(source);

  const next = await dbReadStore();
  const actual = summarizeStore(next);

  console.log("Database counts:", actual);

  if (
    expected.channels !== actual.channels ||
    expected.videos !== actual.videos ||
    expected.clips !== actual.clips ||
    expected.transcripts !== actual.transcripts
  ) {
    throw new Error(
      `Bootstrap verification failed. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }

  console.log("Database bootstrap completed successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap failed.");
  process.exit(1);
});
