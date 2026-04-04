export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    status: "placeholder",
    message: "Future public chatbot config endpoint will serve safe widget settings per location."
  });
}

