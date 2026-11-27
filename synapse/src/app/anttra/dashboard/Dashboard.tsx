"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { topics, isTopic, describeWeather, type Topic, type DashboardData, type Weather } from "@/lib/feed";
import { projects } from "@/lib/projects";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });

// Next 24 h as two stacked charts on one time axis: temperature line on top, rain bars
// below. Two charts, not one with two y-scales: °C and mm don't share a scale.
const TEMP_COLOR = "#d95926"; // reference dark-mode orange, validated on the panel surface
const RAIN_COLOR = "#3987e5"; // reference dark-mode blue

function WeatherChart({ series }: { series: Weather["series"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = series.length;
  if (n < 2) return null;

  const W = 300, L = 30, R = 6, plotW = W - L - R;
  const TT = 18, TH = 62;           // temperature plot: top, height
  const RT = TT + TH + 26, RH = 34; // rain plot: top, height
  const H = RT + RH + 16;
  const slot = plotW / n;
  const x = (i: number) => L + (i + 0.5) * slot;

  const temps = series.map((p) => p.temperature);
  let tMin = Math.floor(Math.min(...temps)), tMax = Math.ceil(Math.max(...temps));
  if (tMax - tMin < 2) { tMin -= 1; tMax += 1; }
  const yT = (t: number) => TT + (1 - (t - tMin) / (tMax - tMin)) * TH;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yT(p.temperature).toFixed(1)}`).join("");

  const rMax = Math.max(1, Math.ceil(Math.max(...series.map((p) => p.precipitation))));
  const anyRain = series.some((p) => p.precipitation > 0);
  const barW = Math.max(2, slot - 2); // 2px gap between bars
  const bar = (i: number, mm: number) => {
    const top = RT + RH - (mm / rMax) * RH, x0 = x(i) - barW / 2, x1 = x0 + barW, base = RT + RH;
    const r = Math.min(2, barW / 2, base - top); // rounded data end, anchored to the baseline
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
  };

  const hourOf = (iso: string) => new Date(iso).getHours();
  const pick = (clientX: number, el: SVGSVGElement) => {
    const box = el.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    setHover(Math.min(n - 1, Math.max(0, Math.floor((px - L) / slot))));
  };
  const h = hover === null ? null : series[hover];

  return (
    <figure className="wchart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Temperature and rain for the next 24 hours"
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((v) => v ?? 0)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setHover((v) => Math.min(n - 1, (v ?? -1) + 1));
          if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? 1) - 1));
        }}
      >
        <text className="wchart-title" x={L} y={10}>Temperature °C</text>
        <line className="wchart-grid" x1={L} x2={W - R} y1={yT(tMax)} y2={yT(tMax)} />
        <line className="wchart-grid" x1={L} x2={W - R} y1={yT(tMin)} y2={yT(tMin)} />
        <text className="wchart-axis" x={L - 5} y={yT(tMax) + 3} textAnchor="end">{tMax}°</text>
        <text className="wchart-axis" x={L - 5} y={yT(tMin) + 3} textAnchor="end">{tMin}°</text>
        <path d={line} fill="none" stroke={TEMP_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <text className="wchart-title" x={L} y={RT - 8}>Rain mm/h</text>
        <line className="wchart-grid" x1={L} x2={W - R} y1={RT + RH} y2={RT + RH} />
        <text className="wchart-axis" x={L - 5} y={RT + 3} textAnchor="end">{rMax}</text>
        <text className="wchart-axis" x={L - 5} y={RT + RH + 3} textAnchor="end">0</text>
        {anyRain
          ? series.map((p, i) => p.precipitation > 0 && <path key={p.time} d={bar(i, p.precipitation)} fill={RAIN_COLOR} />)
          : <text className="wchart-axis" x={L + plotW / 2} y={RT + RH / 2 + 3} textAnchor="middle">No rain expected</text>}

        {series.map((p, i) => hourOf(p.time) % 6 === 0 && (
          <text key={p.time} className="wchart-axis" x={x(i)} y={H - 3} textAnchor="middle">
            {String(hourOf(p.time)).padStart(2, "0")}
          </text>
        ))}

        {h && hover !== null && (
          <g pointerEvents="none">
            <line className="wchart-cross" x1={x(hover)} x2={x(hover)} y1={TT - 4} y2={RT + RH} />
            <circle cx={x(hover)} cy={yT(h.temperature)} r={4} fill={TEMP_COLOR} className="wchart-dot" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="wchart-tip" style={{ left: `${(x(hover) / W) * 100}%` }} aria-hidden="true">
          <strong>{clock(h.time)}</strong> {Math.round(h.temperature)}° · {h.precipitation.toFixed(1)} mm
        </div>
      )}
      {/* Hide via a wrapper: sr-only on a <table> itself lets its <caption> render outside the clip. */}
      <div className="sr-only">
      <table>
        <caption>Forecast for the next 24 hours</caption>
        <thead><tr><th>Time</th><th>Temperature (°C)</th><th>Rain (mm)</th></tr></thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.time}><td>{clock(p.time)}</td><td>{p.temperature}</td><td>{p.precipitation}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

function WeatherNow({ weather }: { weather: Weather }) {
  const now = describeWeather(weather.symbol);
  return (
    <>
      <div className="weather-now">
        <span className="weather-icon" aria-hidden="true">{now.icon}</span>
        <div>
          <p className="weather-temp">{Math.round(weather.temperature)}°</p>
          <p className="weather-label">{now.label}</p>
        </div>
      </div>
      <p className="weather-meta">
        Wind {weather.windSpeed.toFixed(1)} m/s · {weather.precipitation.toFixed(1)} mm next hour
      </p>
      <ol className="weather-hours" aria-label="Next hours">
        {weather.hours.map((hour) => {
          const d = describeWeather(hour.symbol);
          return (
            <li key={hour.time}>
              <time dateTime={hour.time}>{clock(hour.time)}</time>
              <span role="img" aria-label={d.label}>{d.icon}</span>
              <span>{Math.round(hour.temperature)}°</span>
            </li>
          );
        })}
      </ol>
      <WeatherChart series={weather.series} />
      <p className="weather-credit">
        Yr forecast, data from <a href="https://www.met.no/en">MET Norway</a> · updated {clock(weather.updatedAt)}
      </p>
    </>
  );
}

export default function Dashboard() {
  const [topic, setTopic] = useState<Topic>("tech");
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("synapse-topic");
      if (isTopic(saved)) setTopic(saved);
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch("/api/dashboard?topic=" + topic, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Could not load your dashboard. Check your connection and try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [topic, ready, refresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    }, 300000);
    return () => clearInterval(timer);
  }, []);
  function selectTopic(next: Topic) {
    setTopic(next);
    try {
      localStorage.setItem("synapse-topic", next);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <>
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">Your daily reading desk</p>
          <h1>
            A little more <em>signal.</em>
          </h1>
          <p>
            Fresh links, familiar interests, and a way back to what you’re
            building.
          </p>
        </div>
        <button
          className="button"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh feeds"}
        </button>
      </section>
      <div className="dashboard-layout">
        <section className="news-panel" aria-labelledby="news-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">On your radar</p>
              <h2 id="news-title">The reading feed</h2>
            </div>
            <span className="source-badge">Hacker News</span>
          </div>
          <div className="topic-tabs" role="group" aria-label="News topic">
            {Object.entries(topics).map(([id, item]) => (
              <button
                key={id}
                aria-pressed={topic === id}
                onClick={() => selectTopic(id as Topic)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="feed-status" role="status">
            {loading
              ? "Finding recent stories…"
              : error ||
                data?.newsError ||
                (data
                  ? "Checked " +
                    new Date(data.checkedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) +
                    " · Newest first · Updates every 5 minutes"
                  : "")}
          </div>
          {storageError && (
            <p className="muted">
              Your browser cannot save your topic preference for next time.
            </p>
          )}
          {loading ? (
            <div className="loading-feed" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton" />
              ))}
            </div>
          ) : (
            data &&
            !data.newsError && (
              <div className="news-list">
                {data.articles.length ? (
                  data.articles.map((article) => (
                    <article className="news-item" key={article.id}>
                      <div>
                        <div className="news-meta">
                          <span>{article.domain}</span>
                          <time dateTime={article.date}>
                            {date(article.date)}
                          </time>
                        </div>
                        <h3>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {article.title}
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        </h3>
                        <div className="news-meta">
                          <span>{article.points} points</span>
                          <a
                            href={
                              "https://news.ycombinator.com/item?id=" +
                              article.id
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {article.comments} comments
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        </div>
                      </div>
                      <span className="article-mark" aria-hidden="true">
                        ↗
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>No stories for this topic yet.</h3>
                    <p>Try Technology for a broader feed.</p>
                  </div>
                )}
              </div>
            )
          )}
          <p className="feed-disclaimer">
            Community-submitted links via HN Search. Topic matches are
            keyword-based; niche topics may include older stories. This is a
            reading feed, not a comprehensive research review.
          </p>
        </section>
        <aside className="dashboard-sidebar">
          <section className="panel weather-panel" aria-labelledby="weather-title">
            <div className="section-heading">
              <h2 id="weather-title">Weather in Trondheim</h2>
              <span className="source-badge">Yr</span>
            </div>
            {loading ? (
              <p role="status">Loading weather…</p>
            ) : data?.weather ? (
              <WeatherNow weather={data.weather} />
            ) : (
              <p role="status">{data?.weatherError ?? "Weather is unavailable right now."}</p>
            )}
          </section>
          <section className="panel transit-panel">
            <p className="eyebrow">Out in the real world</p>
            <h2>Catch your next bus.</h2>
            <p>Open the Trondheim map for positions, stops, and departures.</p>
            <Link className="button primary" href="/anttra/busroutes">
              Open transit map
            </Link>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>On the workbench</h2>
              <span className="source-badge">GitHub</span>
            </div>
            <p className="muted">
              Your most recently pushed public repositories.
            </p>
            {loading ? (
              <p role="status">Loading projects…</p>
            ) : data?.reposError ? (
              <p role="status">{data.reposError}</p>
            ) : data?.repositories.length ? (
              data.repositories.map((repo) => (
                <a className="repo-item" key={repo.url} href={repo.url}>
                  <h3>{repo.name}</h3>
                  <p>{repo.description}</p>
                  <span>
                    {repo.language} · {date(repo.date)}
                  </span>
                </a>
              ))
            ) : (
              <p>No repository updates available.</p>
            )}
            <a
              className="text-link"
              href="https://github.com/AntTra?tab=repositories"
            >
              All repositories
            </a>
          </section>
          <section className="panel">
            <p className="eyebrow">Quick launch</p>
            {projects.map((project) => (
              <Link
                className="quick-link"
                key={project.slug}
                href={"/anttra/" + project.slug}
              >
                {project.title}
                <span>{project.category}</span>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
