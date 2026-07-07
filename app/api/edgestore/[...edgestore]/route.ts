import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function getEdgeStoreHandler() {
	const { handler } = await import("@/lib/edgestore-server")
	return handler
}

function isEdgeStoreHealthCheck(request: NextRequest) {
	return new URL(request.url).pathname === "/api/edgestore/health"
}

export async function GET(request: NextRequest) {
	const handler = await getEdgeStoreHandler()

	if (isEdgeStoreHealthCheck(request)) {
		return handler(request)
	}

	const { userId } = await auth()

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

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
