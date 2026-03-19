async function testBing() {
  const q = 'site:yelp.com "Integrity Tax" Pittsfield MA';
  console.log("Query: " + q);

  const url =
    "https://www.bing.com/search?q=" + encodeURIComponent(q) + "&count=10";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();

  // Find all href links
  const allHrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
  const yelpLinks = allHrefs.filter((u) => u.includes("yelp"));
  console.log("\nAll yelp-related hrefs:");
  yelpLinks.forEach((u) => console.log("  " + u));

  // Try broader pattern - look for yelp mentions in text
  const yelpMentions = [...html.matchAll(/yelp[^"'\s<>]{0,100}/gi)];
  console.log("\nYelp mentions in HTML (first 10):");
  yelpMentions.slice(0, 10).forEach((m) => console.log("  " + m[0]));

  // Try looking at result anchors
  console.log("\n--- Searching for <a> tags with yelp ---");
  const anchorPattern =
    /<a[^>]*href="([^"]*yelp[^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;
  const anchors = [...html.matchAll(anchorPattern)];
  anchors.slice(0, 5).forEach((m) => {
    console.log("  href: " + m[1]);
    console.log("  text: " + m[2].replace(/<[^>]+>/g, "").trim());
  });

  // Check for cite tags (Bing often puts URLs in <cite>)
  console.log("\n--- <cite> tags ---");
  const cites = [...html.matchAll(/<cite[^>]*>([^<]+)<\/cite>/gi)];
  cites.slice(0, 10).forEach((m) => console.log("  " + m[1]));

  // Now test BBB
  console.log("\n\n=== BBB TEST ===");
  const q2 = 'site:bbb.org "Integrity Tax" Pittsfield MA';
  const res2 = await fetch(
    "https://www.bing.com/search?q=" + encodeURIComponent(q2),
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    }
  );
  const html2 = await res2.text();
  const bbbMentions = [...html2.matchAll(/bbb\.org[^"'\s<>]{0,150}/gi)];
  console.log("BBB mentions:");
  bbbMentions.slice(0, 10).forEach((m) => console.log("  " + m[0]));

  const cites2 = [...html2.matchAll(/<cite[^>]*>([^<]+)<\/cite>/gi)];
  console.log("\nBBB <cite> tags:");
  cites2.slice(0, 10).forEach((m) => console.log("  " + m[1]));
}
testBing();
