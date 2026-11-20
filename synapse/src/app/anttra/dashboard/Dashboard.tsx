"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { topics, isTopic, type Topic, type DashboardData } from "@/lib/feed";
import { projects } from "@/lib/projects";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
