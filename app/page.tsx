import Link from "next/link"
import { redirect } from "next/navigation"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowRightIcon, ShieldCheckIcon, StethoscopeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect("/nueva-consulta")
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-background via-background to-muted/60 px-4 py-16">
      <div className="w-full max-w-5xl rounded-3xl border border-border bg-card/90 p-8 shadow-sm backdrop-blur md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground">
              <ShieldCheckIcon className="h-4 w-4" />
              Acceso seguro para el flujo clínico
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                AgentNotes centraliza grabación, transcripción y documentos clínicos en una sola sesión.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Inicia sesión para entrar al dashboard protegido, gestionar plantillas DOCX y transformar la consulta en un documento listo para descargar.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SignInButton mode="redirect" forceRedirectUrl="/nueva-consulta">
                <Button size="lg" className="gap-2">
                  Iniciar sesión
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </SignInButton>
              <SignUpButton mode="redirect" forceRedirectUrl="/nueva-consulta">
                <Button size="lg" variant="outline">
                  Crear cuenta
                </Button>
              </SignUpButton>
            </div>
            <p className="text-sm text-muted-foreground">
              El acceso autenticado protege las rutas clínicas, las plantillas y los endpoints de transcripción.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <StethoscopeIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Acceso mínimo público</p>
                <p className="text-sm text-muted-foreground">Solo login, signup y landing permanecen abiertos.</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="font-medium text-foreground">Rutas privadas</p>
                <p className="mt-1">Nueva consulta, historial, plantillas, configuración y APIs clínicas.</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="font-medium text-foreground">Sesión</p>
                <p className="mt-1">Clerk gestiona sign in, sign up y cierre de sesión sin exponer secretos al cliente.</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="font-medium text-foreground">Dashboard</p>
                <p className="mt-1">
                  Una vez autenticado, el destino principal es
                  {" "}
                  <Link href="/nueva-consulta" className="font-medium text-foreground underline underline-offset-4">
                    /nueva-consulta
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
