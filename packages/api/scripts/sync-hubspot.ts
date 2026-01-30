#!/usr/bin/env tsx
/**
 * Quick script to run HubSpot sync
 * Run with: DATABASE_URL="..." HUBSPOT_ACCESS_TOKEN="..." npx tsx scripts/sync-hubspot.ts
 */

import { bulkImportContactsFromHubSpot, bulkImportDealsFromHubSpot } from "../src/services/hubspot";

const ORG_ID = process.argv[2] || "2c01e721-e367-41da-b8f0-ea71458870ac";

async function main() {
  console.log("Starting HubSpot sync for organization:", ORG_ID);
  console.log("==========================================\n");

  // Import contacts first
  console.log("📥 Importing contacts from HubSpot...");
  const contactsResult = await bulkImportContactsFromHubSpot(ORG_ID);
  console.log("Contacts result:", contactsResult);
  console.log("");

  // Then import deals
  console.log("📥 Importing deals from HubSpot...");
  const dealsResult = await bulkImportDealsFromHubSpot(ORG_ID);
  console.log("Deals result:", dealsResult);
  console.log("");

  console.log("==========================================");
  console.log("✅ Sync complete!");
  console.log(`   Contacts: ${contactsResult.imported} imported, ${contactsResult.updated} updated, ${contactsResult.errors} errors`);
  console.log(`   Deals: ${dealsResult.imported} imported, ${dealsResult.updated} updated, ${dealsResult.errors} errors`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
