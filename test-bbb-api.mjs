// Test the BBB API approach with the actual matching logic

function extractCoreName(businessName) {
  let core = businessName
    .replace(
      /\b(LLC|Inc\.?|Corp\.?|Corporation|Company|Co\.?|Services|Solutions|Group|Associates|Enterprises|International|Ltd\.?)\b/gi,
      ""
    )
    .replace(/\s*[&,]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const words = core.split(/\s+/).filter((w) => w.length > 1);
  if (words.length > 3) core = words.slice(0, 3).join(" ");
  return core || businessName;
}

async function testBBBApi(businessName, location) {
  console.log(`\n=== BBB API TEST ===`);
  console.log(`Business: ${businessName}`);
  console.log(`Location: ${location}`);

  const params = new URLSearchParams({
    find_text: businessName,
    find_loc: location || "",
    find_type: "Category",
    page: "1",
    size: "5",
  });

  const url = `https://www.bbb.org/api/search?${params}`;
  console.log(`URL: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)",
      },
    });
    console.log(`Status: ${res.status}`);

    if (res.ok) {
      const data = await res.json();
      console.log(`Total results: ${data.totalResults}`);
      console.log(`Results on page: ${data.results?.length || 0}`);

      if (data.results?.length > 0) {
        // Use the same matching logic as the code
        const coreName = extractCoreName(businessName).toLowerCase();
        console.log(`Core name for matching: "${coreName}"`);

        const best =
          data.results.find((r) => {
            const rCore = extractCoreName(r.businessName ?? "").toLowerCase();
            return (
              rCore.includes(coreName) ||
              coreName.includes(rCore) ||
              (r.businessName ?? "").toLowerCase().includes(coreName)
            );
          }) ?? data.results[0];

        console.log(`\nBest match: ${best.businessName}`);
        console.log(`Profile URL: https://www.bbb.org${best.reportUrl}`);
        console.log(`Rating: ${best.rating || "N/A"}`);

        console.log("\nAll results:");
        data.results.forEach((r, i) => {
          console.log(
            `  ${i + 1}. ${r.businessName} | ${r.reportUrl} | rating: ${r.rating || "N/A"}`
          );
        });
      } else {
        console.log("No results found");
      }
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

// Test with various businesses
async function main() {
  await testBBBApi("Integrity Tax & Accounting Services", "Pittsfield, MA");
  await testBBBApi("General Computing Solutions", "");
  await testBBBApi("Starbucks", "Seattle, WA");
}

main();
