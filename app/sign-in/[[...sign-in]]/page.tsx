import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/30 px-4 py-12">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/nueva-consulta"
      />
    </main>
  )
}