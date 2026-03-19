// Test BBB API with the updated extractCoreName and matching logic

function extractCoreName(name) {
  let core = name
    .replace(
      /\b(LLC|Inc\.?|Corp\.?|Corporation|Company|Co\.?|Services|Solutions|Group|Associates|Enterprises|International|Ltd\.?|Accounting|Bookkeeping|Consulting|Management|Professional|Agency|Firm|Partners|Practice)\b/gi,
      ""
    )
    .replace(/\s*[&,]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const words = core.split(/\s+/).filter((w) => w.length > 1);
  if (words.length > 3) core = words.slice(0, 3).join(" ");
  return core || name;
}

async function testBBB(businessName, location) {
  console.log(`\n=== BBB: "${businessName}" in ${location} ===`);

  const coreName = extractCoreName(businessName);
  const searchNames = [businessName];
  if (coreName !== businessName) searchNames.push(coreName);
  console.log(`  Core name: "${coreName}"`);
  console.log(`  Search names: ${JSON.stringify(searchNames)}`);

  for (const searchName of searchNames) {
    const params = new URLSearchParams({
      find_text: searchName,
      find_loc: location || "",
      find_type: "Category",
      page: "1",
      size: "5",
    });

    try {
      const res = await fetch(
        `https://www.bbb.org/api/search?${params}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)",
          },
        }
      );
      const data = await res.json();
      console.log(
        `  Search "${searchName}": ${data.totalResults} total results`
      );

      if (data.results?.length > 0) {
        const coreNameLower = coreName.toLowerCase();

        // Use the new matching logic (no fallback to results[0])
        const best = data.results.find((r) => {
          const rName = (r.businessName ?? "")
            .replace(/<[^>]+>/g, "")
            .toLowerCase();
          const rCore = extractCoreName(r.businessName ?? "").toLowerCase();
          const matches =
            rCore.includes(coreNameLower) ||
            coreNameLower.includes(rCore) ||
            rName.includes(coreNameLower) ||
            coreNameLower.includes(rName);
          return matches;
        });

        if (best) {
          const cleanName = (best.businessName || "").replace(/<[^>]+>/g, "");
          console.log(`  MATCH FOUND: ${cleanName}`);
          console.log(`  URL: https://www.bbb.org${best.reportUrl}`);
          return;
        } else {
          console.log("  No name match in results:");
          data.results.slice(0, 3).forEach((r) => {
            const cleanName = (r.businessName || "").replace(/<[^>]+>/g, "");
            const rCore = extractCoreName(cleanName).toLowerCase();
            console.log(
              `    "${cleanName}" (core: "${rCore}") — matches "${coreNameLower}"? ${rCore.includes(coreNameLower) || coreNameLower.includes(rCore)}`
            );
          });
        }
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  console.log("  RESULT: NOT FOUND");
}

async function main() {
  await testBBB("Integrity Tax & Accounting Services", "Pittsfield, MA");
  await testBBB("General Computing Solutions", "");
  await testBBB("Starbucks", "Seattle, WA");
  await testBBB("Joe's Plumbing & Heating Services LLC", "Boston, MA");
}

main();
