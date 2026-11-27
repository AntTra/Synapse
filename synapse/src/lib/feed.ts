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
export type WeatherHour = { time: string; temperature: number; symbol: string };
export type Weather = {
  updatedAt: string;
  temperature: number;   // °C, now
  symbol: string;        // MET symbol code for the coming hour, e.g. "partlycloudy_day"
  windSpeed: number;     // m/s
  precipitation: number; // mm in the coming hour
  hours: WeatherHour[];  // the next 6 hours
  series: { time: string; temperature: number; precipitation: number }[]; // now + next 24 h, for the graph
};
export type DashboardData = {
  articles: Article[];
  repositories: Repository[];
  weather: Weather | null;
  newsError: string | null;
  reposError: string | null;
  weatherError: string | null;
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
// MET Norway locationforecast "compact" → what the weather panel shows.
export function parseWeather(payload: unknown): Weather {
  const props = record(record(payload).properties);
  const series = props.timeseries;
  if (!Array.isArray(series) || !series.length) throw new Error("Invalid weather response");
  const point = (value: unknown) => {
    const entry = record(value);
    const data = record(entry.data);
    const now = record(record(data.instant).details);
    const next = record(data.next_1_hours);
    const temperature = now.air_temperature;
    const symbol = record(next.summary).symbol_code;
    if (!validDate(entry.time) || typeof temperature !== "number" || typeof symbol !== "string") return null;
    const rain = record(next.details).precipitation_amount;
    return {
      time: entry.time,
      temperature,
      symbol,
      windSpeed: typeof now.wind_speed === "number" ? now.wind_speed : 0,
      precipitation: typeof rain === "number" ? rain : 0,
    };
  };
  const points = series.slice(0, 25).map(point).filter((p) => p !== null);
  const current = points[0];
  if (!current) throw new Error("Invalid weather response");
  const updated = record(props.meta).updated_at;
  return {
    updatedAt: validDate(updated) ? updated : current.time,
    temperature: current.temperature,
    symbol: current.symbol,
    windSpeed: current.windSpeed,
    precipitation: current.precipitation,
    hours: points.slice(1, 7).map(({ time, temperature, symbol }) => ({ time, temperature, symbol })),
    series: points.map(({ time, temperature, precipitation }) => ({ time, temperature, precipitation })),
  };
}

// MET symbol code ("lightrainshowers_night") → glyph and plain-language label.
export function describeWeather(symbol: string): { icon: string; label: string } {
  const night = symbol.endsWith("_night");
  const base = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (base.includes("thunder")) return { icon: "⛈", label: "Thunder" };
  if (base.includes("snow")) return { icon: "❄", label: base.startsWith("heavy") ? "Heavy snow" : "Snow" };
  if (base.includes("sleet")) return { icon: "🌨", label: "Sleet" };
  if (base.includes("rain")) {
    const label = base.startsWith("heavy") ? "Heavy rain" : base.startsWith("light") ? "Light rain" : "Rain";
    return { icon: base.includes("showers") ? "🌦" : "🌧", label: base.includes("showers") ? label + " showers" : label };
  }
  if (base === "fog") return { icon: "🌫", label: "Fog" };
  if (base === "cloudy") return { icon: "☁", label: "Cloudy" };
  if (base === "partlycloudy") return { icon: night ? "☁" : "⛅", label: "Partly cloudy" };
  if (base === "fair") return { icon: night ? "🌙" : "🌤", label: "Fair" };
  if (base === "clearsky") return { icon: night ? "🌙" : "☀", label: "Clear" };
  return { icon: "·", label: base };
}

// Trondheim city centre. MET asks for at most 4 decimals.
const WEATHER_URL =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=63.4305&lon=10.3951";

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
  // MET Norway's terms: identify the app (with a way to reach its owner) and cache.
  // Forecasts update about every 30 minutes, so the response is reused that long.
  async function weatherJson() {
    const response = await request(WEATHER_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Synapse-Dashboard/1.0 (+https://github.com/AntTra/Synapse)",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 1800 },
    });
    if (!response.ok) throw new Error("Weather unavailable");
    return response.json() as Promise<unknown>;
  }
  const [news, repos, weather] = await Promise.allSettled([
    json("https://hn.algolia.com/api/v1/search_by_date?" + params).then(
      parseArticles,
    ),
    json(
      "https://api.github.com/users/AntTra/repos?sort=pushed&direction=desc&per_page=4&type=owner",
    ).then(parseRepositories),
    weatherJson().then(parseWeather),
  ]);
  return {
    articles: news.status === "fulfilled" ? news.value : [],
    repositories: repos.status === "fulfilled" ? repos.value : [],
    weather: weather.status === "fulfilled" ? weather.value : null,
    newsError:
      news.status === "rejected"
        ? "News is unavailable right now. Try refreshing shortly."
        : null,
    reposError:
      repos.status === "rejected"
        ? "GitHub is unavailable or its public rate limit was reached."
        : null,
    weatherError:
      weather.status === "rejected" ? "Weather is unavailable right now." : null,
    checkedAt: new Date().toISOString(),
  };
}
