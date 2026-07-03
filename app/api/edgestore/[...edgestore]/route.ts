import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { handler } from "@/lib/edgestore-server"

export async function GET(request: NextRequest) {
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

	return handler(request)
}
