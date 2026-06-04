import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id, expiresAt: { gt: now } },
    orderBy: { savedAt: "desc" },
  })
  return NextResponse.json(favorites)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).recipeId !== "number" ||
    typeof (body as Record<string, unknown>).recipeTitle !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields: recipeId (number), recipeTitle (string)" }, { status: 400 })
  }

  const { recipeId, recipeTitle, recipeImage } = body as {
    recipeId: number
    recipeTitle: string
    recipeImage?: string
  }

  const savedAt = new Date()
  const expiresAt = new Date(savedAt)
  expiresAt.setDate(expiresAt.getDate() + 30)

  const favorite = await db.favorite.upsert({
    where: { userId_recipeId: { userId: session.user.id, recipeId } },
    create: {
      userId: session.user.id,
      recipeId,
      recipeTitle,
      recipeImage: recipeImage ?? null,
      savedAt,
      expiresAt,
    },
    update: { expiresAt },
  })
  return NextResponse.json(favorite, { status: 201 })
}
