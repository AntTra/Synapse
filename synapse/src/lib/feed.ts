export const topics = {
  tech: { label: "Technology", query: "" },
  ai: { label: "AI & machine learning", query: "machine learning" },
  robotics: { label: "Robotics", query: "robot" },
  vision: { label: "Computer vision", query: "computer vision" },
  systems: { label: "Systems & C++", query: "C++" },
};
export type Topic = keyof typeof topics;
export type Article = {
  id: string;
  title: string;
  url: string;
  domain: string;
  date: string;
  points: number;
  comments: number;
};
export type Repository = {
  name: string;
  url: string;
  description: string;
  language: string;
  date: string;
};
export type DashboardData = {
  articles: Article[];
  repositories: Repository[];
  newsError: string | null;
  reposError: string | null;
  checkedAt: string;
};
export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && Object.hasOwn(topics, value);
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
export function parseArticles(payload: unknown): Article[] {
  const hits = record(payload).hits;
  if (!Array.isArray(hits)) throw new Error("Invalid news response");
  const articles: Article[] = [];
  const seen = new Set<string>();
  for (const value of hits) {
    const hit = record(value);
    if (
      typeof hit.objectID !== "string" ||
      !/^\d+$/.test(hit.objectID) ||
      typeof hit.title !== "string" ||
      !hit.title.trim() ||
      !validDate(hit.created_at)
    )
      continue;
    const url =
      hit.url == null
        ? `https://news.ycombinator.com/item?id=${hit.objectID}`
        : safeUrl(hit.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    articles.push({
      id: hit.objectID,
      title: hit.title,
      url,
      domain: new URL(url).hostname.replace(/^www\./, ""),
      date: hit.created_at,
      points: typeof hit.points === "number" ? hit.points : 0,
      comments: typeof hit.num_comments === "number" ? hit.num_comments : 0,
    });
  }
  return articles.slice(0, 15);
}
export function parseRepositories(payload: unknown): Repository[] {
  if (!Array.isArray(payload)) throw new Error("Invalid GitHub response");
  return payload
    .flatMap((value) => {
      const repo = record(value);
      const url = safeUrl(repo.html_url);
      if (
        !url ||
        new URL(url).hostname !== "github.com" ||
        typeof repo.name !== "string" ||
        !validDate(repo.pushed_at)
      )
        return [];
      return [
        {
          name: repo.name,
          url,
          description:
            typeof repo.description === "string"
              ? repo.description
              : "Explore the repository on GitHub.",
          language:
            typeof repo.language === "string" ? repo.language : "Repository",
          date: repo.pushed_at,
        },
      ];
    })
    .slice(0, 4);
}
export async function loadDashboard(
  topic: Topic,
  request: typeof fetch = fetch,
): Promise<DashboardData> {
  async function json(url: string) {
    const response = await request(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Synapse-Dashboard",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error("Upstream unavailable");
    return response.json() as Promise<unknown>;
  }
  const params = new URLSearchParams({
    tags: "story",
    hitsPerPage: "30",
    query: topics[topic].query,
    numericFilters: "points>2",
    restrictSearchableAttributes: "title",
    typoTolerance: "false",
  });
  const [news, repos] = await Promise.allSettled([
    json("https://hn.algolia.com/api/v1/search_by_date?" + params).then(
      parseArticles,
    ),
    json(
      "https://api.github.com/users/AntTra/repos?sort=pushed&direction=desc&per_page=4&type=owner",
    ).then(parseRepositories),
  ]);
  return {
    articles: news.status === "fulfilled" ? news.value : [],
    repositories: repos.status === "fulfilled" ? repos.value : [],
    newsError:
      news.status === "rejected"
        ? "News is unavailable right now. Try refreshing shortly."
        : null,
    reposError:
      repos.status === "rejected"
        ? "GitHub is unavailable or its public rate limit was reached."
        : null,
    checkedAt: new Date().toISOString(),
  };
}
