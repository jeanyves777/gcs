async function testBing() {
  const queries = [
    'site:yelp.com "Integrity Tax" Pittsfield MA',
    'site:bbb.org "Integrity Tax" Pittsfield MA',
  ];

  for (const q of queries) {
    console.log("\nQuery: " + q);
    try {
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
      console.log("Status:", res.status);
      const html = await res.text();
      console.log("HTML length:", html.length);

      // Extract URLs
      const yelpUrls = [...html.matchAll(/yelp\.com\/biz\/[a-z0-9_-]+/gi)];
      const bbbUrls = [
        ...html.matchAll(/bbb\.org\/us\/[a-z]{2}\/[^"'\s<>]+/gi),
      ];
      if (yelpUrls.length)
        console.log(
          "Yelp URLs:",
          yelpUrls.map((m) => m[0]).slice(0, 3)
        );
      if (bbbUrls.length)
        console.log(
          "BBB URLs:",
          bbbUrls.map((m) => m[0]).slice(0, 3)
        );
      if (yelpUrls.length === 0 && bbbUrls.length === 0) {
        const hasResults =
          html.includes("b_algo") || html.includes("b_results");
        console.log("Has Bing result elements:", hasResults);
      }
    } catch (e) {
      console.log("Error:", e.message);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}
testBing();
