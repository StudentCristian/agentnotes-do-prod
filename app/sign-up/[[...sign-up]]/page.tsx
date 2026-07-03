import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/30 px-4 py-12">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/nueva-consulta"
      />
    </main>
  )
}