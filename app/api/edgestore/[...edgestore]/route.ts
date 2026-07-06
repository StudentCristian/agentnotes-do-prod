import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function getEdgeStoreHandler() {
	const { handler } = await import("@/lib/edgestore-server")
	return handler
}

export async function GET(request: NextRequest) {
	const { userId } = await auth()

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const handler = await getEdgeStoreHandler()
	return handler(request)
}

export async function POST(request: NextRequest) {
	const { userId } = await auth()

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const handler = await getEdgeStoreHandler()
	return handler(request)
}
