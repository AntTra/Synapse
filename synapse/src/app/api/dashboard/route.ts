import { isTopic, loadDashboard } from "@/lib/feed";
export async function GET(request: Request) {
  const topic = new URL(request.url).searchParams.get("topic") ?? "tech";
  if (!isTopic(topic))
    return Response.json({ error: "Unknown topic" }, { status: 400 });
  return Response.json(await loadDashboard(topic));
}
