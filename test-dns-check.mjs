import dns from "dns";

const domain = "itatgcs.com";
const DKIM_SELECTORS = ["hostingermail-a", "hostingermail-b", "hostingermail-c", "google", "selector1"];

const resolver = new dns.promises.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);
const safe = (p, fb) => p.catch(() => fb);

// DMARC
const dmarcTxt = await safe(resolver.resolve(`_dmarc.${domain}`, "TXT"), []);
const dmarcFlat = dmarcTxt.flat().map(t => t.replace(/^"|"$/g, "").toLowerCase());
const dmarcRecord = dmarcFlat.find(t => t.startsWith("v=dmarc1")) || null;
const dmarcPolicy = dmarcRecord?.match(/p=([a-z]+)/)?.[1] || null;
console.log("DMARC:", { found: Boolean(dmarcRecord), policy: dmarcPolicy, raw: dmarcFlat });

// DKIM
const dkimResults = await Promise.allSettled(
  DKIM_SELECTORS.map(async (sel) => {
    const host = `${sel}._domainkey.${domain}`;
    try {
      const recs = await resolver.resolve(host, "TXT");
      const flat = recs.flat().join(" ").toLowerCase();
      if (flat.includes("v=dkim1") || flat.includes("k=rsa") || flat.length > 10) return sel;
    } catch {}
    try {
      const cnames = await resolver.resolve(host, "CNAME");
      if (Array.isArray(cnames) && cnames.length > 0) return sel;
    } catch {}
    return null;
  })
);
let hasDkim = false, dkimSel = null;
for (const r of dkimResults) {
  if (r.status === "fulfilled" && r.value) { hasDkim = true; dkimSel = r.value; break; }
}
console.log("DKIM:", { found: hasDkim, selector: dkimSel });

// DoH fallback test
if (!dmarcRecord) {
  console.log("Trying DoH for DMARC...");
  const res = await fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`, { headers: { Accept: "application/dns-json" } });
  const data = await res.json();
  console.log("DoH DMARC:", data);
}
