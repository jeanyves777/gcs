// Test direct URL construction and HEAD checks for Yelp and BBB

function makeYelpSlug(businessName, city) {
  // Yelp URL pattern: yelp.com/biz/business-name-city
  const slug = (businessName + " " + city)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.yelp.com/biz/${slug}`;
}

async function testYelpDirect() {
  const businessName = "Integrity Tax & Accounting Services";
  const city = "Pittsfield";

  // Try various slug variants
  const slugs = [
    makeYelpSlug(businessName, city),
    makeYelpSlug("Integrity Tax", city),
    makeYelpSlug("Integrity Tax Service", city),
    makeYelpSlug("Integrity Tax and Accounting Services", city),
  ];

  console.log("=== YELP DIRECT URL PROBING ===\n");
  for (const url of slugs) {
    try {
      console.log("Testing: " + url);
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      console.log(`  Status: ${res.status}, Final URL: ${res.url}`);
      if (res.status === 200) {
        console.log("  => FOUND!");
      }
    } catch (e) {
      console.log("  Error: " + e.message);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function testYelpSearch() {
  // Try Yelp's search page directly (might work for HEAD/redirect check)
  console.log("\n=== YELP SEARCH API ===\n");
  const searchUrl =
    "https://www.yelp.com/search?find_desc=" +
    encodeURIComponent("Integrity Tax") +
    "&find_loc=" +
    encodeURIComponent("Pittsfield, MA");
  console.log("Testing: " + searchUrl);
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    // Look for biz URLs
    const bizUrls = [...html.matchAll(/\/biz\/[a-z0-9_-]+/gi)];
    console.log(
      "Biz URLs found:",
      [...new Set(bizUrls.map((m) => m[0]))].slice(0, 5)
    );
  } catch (e) {
    console.log("Error:", e.message);
  }
}

async function testBBBSearch() {
  console.log("\n=== BBB SEARCH ===\n");
  // Try BBB's search endpoint
  const searchUrl =
    "https://www.bbb.org/search?find_text=" +
    encodeURIComponent("Integrity Tax") +
    "&find_loc=" +
    encodeURIComponent("Pittsfield, MA") +
    "&find_type=Category";
  console.log("Testing: " + searchUrl);
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    // Look for profile URLs
    const profileUrls = [
      ...html.matchAll(/\/us\/[a-z]{2}\/[^"'\s<>]+/gi),
    ];
    console.log(
      "Profile URLs found:",
      profileUrls.map((m) => m[0]).slice(0, 5)
    );
  } catch (e) {
    console.log("Error:", e.message);
  }

  // Try BBB's API endpoint
  console.log("\nTesting BBB API...");
  try {
    const apiUrl =
      "https://www.bbb.org/api/search?find_text=" +
      encodeURIComponent("Integrity Tax") +
      "&find_loc=" +
      encodeURIComponent("Pittsfield, MA") +
      "&find_type=Category&page=1&size=3";
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/html",
      },
    });
    console.log("API Status:", res.status);
    const text = await res.text();
    console.log("Response length:", text.length);
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      console.log("JSON keys:", Object.keys(data));
      if (data.results) {
        console.log("Results count:", data.results.length);
        data.results.slice(0, 3).forEach((r) => {
          console.log(
            `  - ${r.businessName || r.name || "?"} | ${r.reportUrl || r.url || "?"}`
          );
        });
      }
    } catch {
      console.log("Not JSON. First 300 chars:", text.substring(0, 300));
    }
  } catch (e) {
    console.log("API Error:", e.message);
  }
}

async function main() {
  await testYelpDirect();
  await testYelpSearch();
  await testBBBSearch();
}

main();
