"use client"

import Link from "next/link"
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { BadgeCheckIcon, ChevronsUpDownIcon, LogInIcon, UserPlusIcon } from "lucide-react"

function getInitials(fullName?: string | null, email?: string | null) {
  const source = fullName?.trim() || email?.trim() || "AN"
  const words = source.split(/\s+/).filter(Boolean)

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, isLoaded } = useUser()
  const isSignedIn = Boolean(user)

  const fullName = user?.fullName || user?.firstName || "Cuenta"
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || ""
  const avatarUrl = user?.imageUrl || ""
  const initials = getInitials(fullName, primaryEmail)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {!isSignedIn ? (
          <div className="flex flex-col gap-2 p-2">
            <SignInButton mode="redirect" forceRedirectUrl="/nueva-consulta">
              <Button className="w-full justify-start gap-2" size="sm">
                <LogInIcon className="h-4 w-4" />
                Iniciar sesión
              </Button>
            </SignInButton>
            <SignUpButton mode="redirect" forceRedirectUrl="/nueva-consulta">
              <Button className="w-full justify-start gap-2" size="sm" variant="outline">
                <UserPlusIcon className="h-4 w-4" />
                Crear cuenta
              </Button>
            </SignUpButton>
          </div>
        ) : null}

        {isSignedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{isLoaded ? fullName : "Cargando cuenta..."}</span>
                  <span className="truncate text-xs">{primaryEmail || "Sesión activa"}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl} alt={fullName} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{fullName}</span>
                    <span className="truncate text-xs">{primaryEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/configuracion" className="cursor-pointer">
                    <BadgeCheckIcon />
                    Configuración de cuenta
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <div className="px-1 py-1.5">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-8 w-8",
                    },
                  }}
                  afterSignOutUrl="/"
                  showName={false}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
