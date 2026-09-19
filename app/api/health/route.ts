export async function GET() {
  return Response.json({
    status: "ok",
    product: "Serena",
    safety: { diagnosis: false, prescriptions: false, crisisRouting: true },
  });
}
