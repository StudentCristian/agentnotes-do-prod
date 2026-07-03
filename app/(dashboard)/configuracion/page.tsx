import { UserProfile } from "@clerk/nextjs"

export default function ConfiguracionPage() {
  return (
    <div className="h-full w-full p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Configuración</h1>
        <p className="mb-8 text-muted-foreground">
          Administra tu cuenta autenticada y revisa la sesión actual desde Clerk.
        </p>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Cuenta</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Actualiza tu perfil, correo, seguridad y preferencias de sesión con la UI preconstruida de Clerk.
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <UserProfile
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 rounded-none w-full",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
