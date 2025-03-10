import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ui/theme-provider";
import { Toaster } from "~/components/ui/toaster";
import { Header } from "~/components/layout/header";
import { Footer } from "~/components/layout/footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "~/app/providers";
export const metadata: Metadata = {
  title: "Winona Envios",
  description: "Track your shipments with Winona Envios",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`bg-background font-sans antialiased ${GeistSans.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="winona-theme"
        >
          <SpeedInsights />
          <TRPCReactProvider>
            <PostHogProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex min-h-max flex-1 flex-col p-5">
                  {children}
                </main>
                <Footer />
              </div>
              <Toaster />
            </PostHogProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
