import test from "node:test";
import assert from "node:assert/strict";
import {
  isTopic,
  safeUrl,
  parseArticles,
  parseRepositories,
  loadDashboard,
  parseWeather,
  describeWeather,
} from "../src/lib/feed.ts";
const hit = {
  objectID: "123",
  title: "Robotics research",
  created_at: "2026-11-19T12:00:00Z",
  url: "https://example.com/research",
  points: 12,
  num_comments: 3,
};
test("untrusted URLs and unknown topics are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,bad",
    "file:///secret",
    "https://user:pass@example.com",
    "broken",
  ])
    assert.equal(safeUrl(url), null);
  assert.equal(isTopic("__proto__"), false);
  assert.equal(isTopic("constructor"), false);
  assert.equal(isTopic("robotics"), true);
});
test("news parsing deduplicates and rejects invalid dates and unsafe links", () => {
  const articles = parseArticles({
    hits: [
      hit,
      hit,
      { ...hit, objectID: "124", url: "javascript:alert(1)" },
      { ...hit, objectID: "125", created_at: "invalid" },
      { ...hit, objectID: "126", url: null },
    ],
  });
  assert.equal(articles.length, 2);
  assert.equal(articles[1].url, "https://news.ycombinator.com/item?id=126");
  assert.throws(() => parseArticles({ error: "bad" }));
});
test("GitHub parser rejects unexpected destinations", () => {
  assert.deepEqual(
    parseRepositories([
      {
        name: "fake",
        html_url: "https://evil.example/a",
        pushed_at: hit.created_at,
      },
    ]),
    [],
  );
});
test("GitHub failure leaves news available", async () => {
  const result = await loadDashboard("robotics", async (url) =>
    url.includes("algolia")
      ? Response.json({ hits: [hit] })
      : new Response("", { status: 403 }),
  );
  assert.equal(result.articles.length, 1);
  assert.equal(result.newsError, null);
  assert.match(result.reposError, /rate limit/);
});
test("news failure leaves repositories available", async () => {
  const result = await loadDashboard("tech", async (url) =>
    url.includes("algolia")
      ? Response.json({ unexpected: true })
      : Response.json([
          {
            name: "Synapse",
            html_url: "https://github.com/AntTra/Synapse",
            pushed_at: hit.created_at,
          },
        ]),
  );
  assert.equal(result.repositories.length, 1);
  assert.ok(result.newsError);
  assert.equal(result.reposError, null);
});

const forecast = (n) => ({
  properties: {
    meta: { updated_at: "2026-11-27T02:00:00Z" },
    timeseries: Array.from({ length: n }, (_, i) => ({
      time: `2026-11-27T0${i}:00:00Z`,
      data: {
        instant: { details: { air_temperature: -2 + i, wind_speed: 3.4 } },
        next_1_hours: { summary: { symbol_code: i ? "lightrainshowers_night" : "partlycloudy_night" }, details: { precipitation_amount: 0.4 } },
      },
    })),
  },
});
test("weather parser reads now and the next six hours", () => {
  const w = parseWeather(forecast(9));
  assert.equal(w.temperature, -2);
  assert.equal(w.symbol, "partlycloudy_night");
  assert.equal(w.windSpeed, 3.4);
  assert.equal(w.precipitation, 0.4);
  assert.equal(w.hours.length, 6);
  assert.equal(w.hours[0].temperature, -1);
  assert.throws(() => parseWeather({ properties: { timeseries: [] } }));
  assert.deepEqual(describeWeather("lightrainshowers_night"), { icon: "🌦", label: "Light rain showers" });
  assert.equal(describeWeather("clearsky_day").label, "Clear");
});
test("weather failure leaves news and repositories available", async () => {
  const result = await loadDashboard("tech", async (url) =>
    url.includes("met.no")
      ? new Response("", { status: 503 })
      : url.includes("algolia")
        ? Response.json({ hits: [hit] })
        : Response.json([]),
  );
  assert.equal(result.weather, null);
  assert.ok(result.weatherError);
  assert.equal(result.newsError, null);
  assert.equal(result.articles.length, 1);
});
