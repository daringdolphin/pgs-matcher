/*
The root server layout for the app.
  */

import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/utilities/providers"
import { TailwindIndicator } from "@/components/utilities/tailwind-indicator"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PG&S EF Matcher"
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body
        suppressHydrationWarning
        className={cn(
          "bg-background mx-auto min-h-screen w-full scroll-smooth antialiased"
        )}
      >
        <Providers
          attribute="class"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}

          <TailwindIndicator />

          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
