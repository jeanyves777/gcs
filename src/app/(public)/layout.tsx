import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AIChatWidget } from "@/components/portal/ai-chat-widget";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main style={{ paddingTop: "var(--header-height)" }}>{children}</main>
      <Footer />
      <AIChatWidget apiEndpoint="/api/ai/chat" />
    </>
  );
}
