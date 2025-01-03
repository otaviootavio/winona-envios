import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ui/theme-provider";
import { Toaster } from "~/components/ui/toaster";
import { Header } from "~/components/layout/header";
import { Footer } from "~/components/layout/footer";

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
      <body className={`min-h-screen bg-background font-sans antialiased ${GeistSans.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="winona-theme"
        >
          <TRPCReactProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 p-20">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}