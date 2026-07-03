import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div>
              <p className="text-sm font-medium text-foreground">Dashboard clínico</p>
              <p className="text-xs text-muted-foreground">
                Consulta, plantillas y generación documental en un mismo flujo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!userId ? (
              <>
              <SignInButton mode="redirect" forceRedirectUrl="/nueva-consulta">
                <Button size="sm" variant="outline">Iniciar sesión</Button>
              </SignInButton>
              <SignUpButton mode="redirect" forceRedirectUrl="/nueva-consulta">
                <Button size="sm">Crear cuenta</Button>
              </SignUpButton>
              </>
            ) : (
              <UserButton afterSignOutUrl="/" />
            )}
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
