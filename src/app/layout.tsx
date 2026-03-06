import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const siteUrl = "https://www.itatgcs.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GCS — Managed IT Services & Software Provider",
    template: "%s | GCS",
  },
  description:
    "GCS delivers end-to-end technology management — managed IT services, custom software development, cloud management, and cybersecurity.",
  keywords: [
    "managed IT services",
    "custom software development",
    "enterprise solutions",
    "IT support",
    "cloud management",
    "cybersecurity",
    "GCS",
    "itatgcs",
  ],
  authors: [{ name: "General Computing Solutions" }],
  creator: "GCS",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "GCS — General Computing Solutions",
    title: "GCS — Managed IT Services & Software Provider",
    description:
      "GCS delivers end-to-end technology management — managed IT, custom software, and cybersecurity.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GCS — General Computing Solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GCS — Managed IT Services & Software Provider",
    description: "End-to-end technology management — IT services, custom software, cloud.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <AnalyticsTracker />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
