"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./chat-shell.module.css";
import LogMovieModal from "./log-movie-modal";
import { formatFilterLabel } from "@/lib/filters";
import type { HouseholdMember } from "@/lib/households";
import type { ChatMessage, RecommendationMovie } from "@/types/db";

type FilterSummary = {
  labelKey: string;
  maxIntensity: number;
  hardNo: boolean;
  label?: string;
};

type ChatShellProps = {
  householdId: string;
  householdName: string | null;
  filters: FilterSummary[];
  members: HouseholdMember[];
  initialMessages: ChatMessage[];
};

type ToastState = { kind: "success" | "error"; message: string } | null;

type ChatApiResponse = {
  id?: string;
  message: string;
  recommendations?: RecommendationMovie[];
};

const QUICK_ACTIONS = [
  {
    label: "Recommend something new",
    prompt: "Recommend a family-friendly movie that matches our current filters.",
  },
  {
    label: "Short movie night",
    prompt: "Suggest a movie under 100 minutes that fits our household preferences.",
  },
  {
    label: "Log last night's movie",
    prompt: "We watched [movie title] together last night.",
  },
];

function renderContent(content: string) {
  const parts = content.split(/(https?:\/\/\S+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a key={index} href={part} target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function formatTimeLabel(timestamp: string) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatShell({
  householdId,
  householdName,
  filters,
  members,
  initialMessages,
}: ChatShellProps) {
  const filterSummaries = useMemo(
    () =>
      filters.map((filter) => ({
        ...filter,
        label: formatFilterLabel(filter.labelKey),
      })),
    [filters]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [modalState, setModalState] = useState<{ open: boolean; movie: RecommendationMovie | null }>({
    open: false,
    movie: null,
  });
  const [isLoggingMovie, setIsLoggingMovie] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, pendingMessageId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const showToast = useCallback((kind: "success" | "error", message: string) => {
    setToast({ kind, message });
  }, []);

  const removePending = useCallback((pendingId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== pendingId));
  }, []);

  const updateAssistantMessage = useCallback((pendingId: string, assistantMessage: ChatMessage) => {
    setMessages((prev) => {
      const withoutPending = prev.filter((message) => message.id !== pendingId);
      return [...withoutPending, assistantMessage];
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsSending(true);

      const optimisticAssistantId = `assistant-pending-${Date.now()}`;
      setPendingMessageId(optimisticAssistantId);
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticAssistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            householdId,
            filters: filters.map((filter) => ({
              labelKey: filter.labelKey,
              maxIntensity: filter.maxIntensity,
              hardNo: filter.hardNo,
            })),
            history: messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Request failed");
        }

        const payload = (await response.json()) as ChatApiResponse;
        const assistantMessage: ChatMessage = {
          id: payload.id ?? `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.message ?? "",
          createdAt: new Date().toISOString(),
          recommendations: payload.recommendations,
        };
        updateAssistantMessage(optimisticAssistantId, assistantMessage);
      } catch (error) {
        removePending(optimisticAssistantId);
        showToast("error", "We couldn't reach the movie assistant. Please try again.");
      } finally {
        setPendingMessageId(null);
        setIsSending(false);
      }
    },
    [filters, householdId, isSending, messages, removePending, showToast, updateAssistantMessage]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const openLogModal = (movie: RecommendationMovie) => {
    setModalState({ open: true, movie });
  };

  const closeLogModal = () => {
    setModalState({ open: false, movie: null });
  };

  const handleLogMovie = async (input: { movieId: string; watchDate: string; watchedBy: string[]; rating: number | null }) => {
    setIsLoggingMovie(true);
    try {
      const response = await fetch("/api/log-movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          householdId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to log movie");
      }

      showToast("success", "Saved to your family log.");
      closeLogModal();
    } catch (error) {
      showToast("error", "Unable to log the movie right now.");
    } finally {
      setIsLoggingMovie(false);
    }
  };

  const handleBlockRecommendation = async (movie: RecommendationMovie) => {
    try {
      const response = await fetch("/api/recommendations/do-not-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: movie.movieId, householdId }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Request failed");
      }
      showToast("success", `We'll skip ${movie.title} going forward.`);
    } catch (error) {
      showToast("error", "Couldn't update that preference yet.");
    }
  };

  return (
    <>
      <div className={styles.container}>
        <section className={styles.chatCard}>
          <header className={styles.chatHeader}>
            <div className={styles.chatHeaderTitle}>
              <h1>{householdName ? `${householdName} · Movie Concierge` : "Movie Concierge"}</h1>
              <span>Ask for recommendations, log what you watched, or refine tonight’s plan.</span>
            </div>
            <div className={styles.connectionBadge}>
              <span className={styles.connectionDot} />
              N8n agent · 3–15s latency
            </div>
          </header>
          <div className={styles.messageLog}>
            <div ref={scrollerRef} className={styles.messageScroller}>
              {messages.map((message) => {
                const bubbleClass =
                  message.role === "user"
                    ? styles.userBubble
                    : message.role === "assistant"
                    ? styles.assistantBubble
                    : styles.systemBubble;
                return (
                  <div key={message.id} className={`${styles.messageGroup} ${message.role === "user" ? styles.messageRowUser : styles.messageRow}`}>
                    <div className={`${styles.messageBubble} ${bubbleClass}`}>
                      {message.pending ? (
                        <span className={styles.pendingDotContainer}>
                          <span className={styles.pendingDot} />
                          <span className={styles.pendingDot} />
                          <span className={styles.pendingDot} />
                        </span>
                      ) : (
                        renderContent(message.content)
                      )}
                      {message.recommendations && message.recommendations.length ? (
                        <div className={styles.recommendations}>
                          {message.recommendations.map((movie) => (
                            <div key={movie.movieId ?? movie.title} className={styles.recommendationCard}>
                              {movie.posterUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={movie.posterUrl}
                                  alt={movie.title}
                                  className={styles.posterImage}
                                />
                              ) : (
                                <div className={styles.posterPlaceholder}>Poster</div>
                              )}
                              <div className={styles.recommendationMeta}>
                                <div>
                                  <h3>{movie.title}</h3>
                                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    {movie.releaseYear ? <span>{movie.releaseYear}</span> : null}
                                    {movie.mpaaRating ? <span>{movie.mpaaRating}</span> : null}
                                    {movie.runtimeMinutes ? <span>{movie.runtimeMinutes} min</span> : null}
                                  </div>
                                </div>
                                {movie.overview ? <p>{movie.overview}</p> : null}
                                {movie.links && movie.links.length ? (
                                  <div className={styles.recommendationLinks}>
                                    {movie.links.map((link) => (
                                      <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                                        {link.label}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                                <div className={styles.recommendationActions}>
                                  <button type="button" onClick={() => openLogModal(movie)}>
                                    Mark watched
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => handleBlockRecommendation(movie)}
                                  >
                                    Don’t recommend
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {!message.pending ? (
                      <span className={styles.messageTimestamp}>{formatTimeLabel(message.createdAt)}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <form className={styles.composer} onSubmit={handleSubmit}>
            <textarea
              className={styles.composerInput}
              placeholder="Ask for family-friendly suggestions or tell the agent what you watched…"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={isSending}
            />
            <div className={styles.composerActions}>
              <div className={styles.quickActions}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    type="button"
                    key={action.label}
                    className="secondary"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isSending}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={isSending || !inputValue.trim()}>
                {isSending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </section>
        <aside className={styles.sidebarCard}>
          <div className={styles.sidebarHeader}>
            <h2>Household filters</h2>
            <span className="badge">Synced with Supabase</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Filters help the agent tailor recommendations to your family’s comfort level.
          </p>
          <div className={styles.filterList}>
            {filterSummaries.length ? (
              filterSummaries.map((filter) => (
                <div key={filter.labelKey} className={styles.filterRow}>
                  <div>
                    <div className={styles.filterName}>{filter.label}</div>
                    <div className={styles.filterIntensity}>
                      <span>Intensity</span>
                      <strong>{filter.maxIntensity}</strong>
                    </div>
                  </div>
                  {filter.hardNo ? <span className={styles.hardNoTag}>Hard no</span> : null}
                </div>
              ))
            ) : (
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                No filters set yet. Add some from the Preferences page.
              </span>
            )}
          </div>
          <p className={styles.feedback}>
            Tip: Update filters or intensities any time from the Preferences tab. Changes sync instantly.
          </p>
        </aside>
      </div>
      <LogMovieModal
        open={modalState.open}
        movie={modalState.movie}
        members={members}
        pending={isLoggingMovie}
        onClose={closeLogModal}
        onConfirm={handleLogMovie}
      />
      {toast ? (
        <div className={`${styles.toast} ${toast.kind === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
