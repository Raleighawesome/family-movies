"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./chat-shell.module.css";
import type { RecommendationMovie } from "@/types/db";
import type { HouseholdMember } from "@/lib/households";

type LogMovieModalProps = {
  open: boolean;
  movie: RecommendationMovie | null;
  members: HouseholdMember[];
  pending?: boolean;
  onClose: () => void;
  onConfirm: (input: {
    movieId: string;
    watchDate: string;
    watchedBy: string[];
    rating: number | null;
  }) => Promise<void> | void;
};

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMemberLabel(member: HouseholdMember): string {
  return member.displayName ?? member.email ?? "Household member";
}

export default function LogMovieModal({
  open,
  movie,
  members,
  pending = false,
  onClose,
  onConfirm,
}: LogMovieModalProps) {
  const [watchDate, setWatchDate] = useState<string>(todayISO());
  const [rating, setRating] = useState<string>("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const memberOptions = useMemo(() => members.map((m) => ({ id: m.id, label: formatMemberLabel(m) })), [members]);

  useEffect(() => {
    if (!open) return;
    setWatchDate(todayISO());
    setRating("");
    setSelectedMembers(memberOptions.map((m) => m.id));
  }, [open, memberOptions]);

  if (!open || !movie) return null;

  const handleToggleMember = (id: string, checked: boolean) => {
    setSelectedMembers((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((memberId) => memberId !== id);
    });
  };

  const handleConfirm = async () => {
    await onConfirm({
      movieId: movie.movieId,
      watchDate,
      watchedBy: selectedMembers,
      rating: rating ? Number(rating) : null,
    });
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal aria-labelledby="log-movie-title">
      <div className={styles.modalContent}>
        <div>
          <h3 id="log-movie-title">Log “{movie.title}”</h3>
          <p style={{ margin: "0.25rem 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Record who watched this movie and when. N8n will update Supabase for you.
          </p>
        </div>
        <div>
          <label htmlFor="watch-date">Watch date</label>
          <input
            id="watch-date"
            type="date"
            value={watchDate}
            onChange={(event) => setWatchDate(event.target.value)}
          />
        </div>
        <div>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)" }}>Who watched?</span>
          <div className={styles.memberChips} style={{ marginTop: "0.45rem" }}>
            {memberOptions.length ? (
              memberOptions.map((member) => (
                <label key={member.id} className={styles.memberChip}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={(event) => handleToggleMember(member.id, event.target.checked)}
                  />
                  {member.label}
                </label>
              ))
            ) : (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No household members yet.</span>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="movie-rating">Family rating</label>
          <select
            id="movie-rating"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} star{value > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.modalActions}>
          <button type="button" className="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={pending}>
            {pending ? "Saving…" : "Log watch"}
          </button>
        </div>
      </div>
    </div>
  );
}
