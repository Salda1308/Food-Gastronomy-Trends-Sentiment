import { NextResponse } from "next/server"
import { getRecipeById } from "@/lib/api"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numId = Number(id)
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const recipe = await getRecipeById(numId)
    return NextResponse.json(recipe)
  } catch {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
  }
}
