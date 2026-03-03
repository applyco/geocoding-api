import { getESClient } from "./src/es/client.ts";

const client = getESClient();

const indices = ["geo_countries", "geo_admin1", "geo_zones", "geo_cities"];

for (const index of indices) {
  try {
    const result = await client.search({
      index,
      size: 5,
      query: { match_all: {} },
    });
    
    console.log(`\n${index}:`);
    const docs = result.hits?.hits || [];
    docs.forEach((doc: any) => {
      console.log(`  ID: ${doc._id}`);
      if (doc._source?.names) {
        console.log(`    names: ${JSON.stringify(doc._source.names)}`);
      } else {
        console.log(`    name: ${doc._source?.NAME || doc._source?.canonical || 'N/A'}`);
      }
    });
  } catch (e) {
    console.error(`Error querying ${index}:`, (e as any).message);
  }
}
