import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function getBackendClient() {
  const { backendClient } = await import("@/lib/edgestore-server")
  return backendClient
}

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const backendClient = await getBackendClient()
    const response = await backendClient.templates.listFiles({
      pagination: {
        currentPage: 1,
        pageSize: 100,
      },
    })

    const templates = response.data.map((file) => ({
      id: file.url,
      name:
        typeof file.metadata?.fileName === "string" && file.metadata.fileName.length > 0
          ? file.metadata.fileName
          : "Plantilla sin nombre",
      size: file.size,
      url: file.url,
      uploadedAt:
        file.uploadedAt instanceof Date
          ? file.uploadedAt.toISOString()
          : new Date(file.uploadedAt).toISOString(),
    }))

    return NextResponse.json({ templates })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron listar las plantillas"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}