import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { cookies } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AppProviders } from "@/components/app-providers"

function getRequiredEnv(name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" | "CLERK_SECRET_KEY") {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing required Clerk environment variable: ${name}. Define it in .env.local before rendering auth routes.`
    )
  }

  return value
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AgentNotes",
  description: "Consultas clínicas por voz para Dr. Efraín Román",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkPublishableKey = getRequiredEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
  getRequiredEnv("CLERK_SECRET_KEY")
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get("theme")?.value
  const initialThemeClass =
    themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${initialThemeClass ? ` ${initialThemeClass}` : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          appearance={{ theme: shadcn }}
        >
          <AppProviders>{children}</AppProviders>
        </ClerkProvider>
      </body>
    </html>
  )
}
