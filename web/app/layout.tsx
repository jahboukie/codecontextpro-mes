import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeContextPro-MES - AI Memory Enhancement System",
  description:
    "Persistent memory and context management for AI coding assistants. Never lose context again with our advanced memory engine.",
  openGraph: {
    title: "CodeContextPro-MES",
    description:
      "Persistent memory and context management for AI coding assistants. Never lose context again with our advanced memory engine.",
    url: "codecontextpro.com",
    siteName: "CodeContextPro-MES",
    locale: "en-US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-[-apple-system,BlinkMacSystemFont]antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
