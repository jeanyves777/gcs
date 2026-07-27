import { redirect } from "next/navigation";

// The Local SEO / Google Business service was retired from the public site.
// Redirect any existing links to the services overview.
export default function LocalSEOPage() {
  redirect("/services");
}
