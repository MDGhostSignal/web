"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  ErrorCard,
  Loading,
  Modal,
} from "@/components/admin";
import type {
  SocialPostRow,
  SocialPostWithImages,
} from "@/lib/social-posts-types";

import { PostComposer } from "../components/social/PostComposer";
import { PostDetail } from "../components/social/PostDetail";
import {
  startOfWeek,
  WeekCalendar,
} from "../components/social/WeekCalendar";
import styles from "../marketing.module.css";

type ListResponse = {
  ok: true;
  posts: SocialPostRow[];
  count: number;
};

type DetailResponse = {
  ok: true;
  post: SocialPostWithImages;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

type CreatePayload = Parameters<
  React.ComponentProps<typeof PostComposer>["onSubmit"]
>[0];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Social Media Scheduler section. Loads a wide window of posts
 * (current week ± 4 weeks) on mount so the calendar can scrub
 * forward / backward without re-fetching, and refreshes on every
 * write.
 */
export function SocialSection() {
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] =
    useState<SocialPostWithImages | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composeDay, setComposeDay] = useState<Date | null>(null);
  const [composeInitial, setComposeInitial] = useState<
    SocialPostWithImages | null
  >(null);
  const [composing, setComposing] = useState(false);

  const loadList = useCallback(async () => {
    // Window: last 8 weeks → next 12 weeks. Generous; users rarely
    // scrub further. We can revisit with proper viewport-driven
    // fetching if it ever bites.
    const now = Date.now();
    const from = new Date(now - 8 * WEEK_MS).toISOString();
    const to = new Date(now + 12 * WEEK_MS).toISOString();
    try {
      const res = await fetch(
        `/api/admin/marketing-social?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=500`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status} — ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as ListResponse;
      setPosts(json.posts);
      setState({ kind: "ready" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(
      `/api/admin/marketing-social/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as DetailResponse;
    return json.post;
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedPost(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setSelectedPost(null);
    (async () => {
      try {
        const post = await loadDetail(selectedId);
        if (!cancelled) setSelectedPost(post);
      } catch {
        if (!cancelled) setSelectedPost(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadDetail]);

  const refreshSelected = useCallback(async () => {
    if (selectedId) {
      try {
        const post = await loadDetail(selectedId);
        setSelectedPost(post);
      } catch {
        // ignore; user can close + reopen
      }
    }
    loadList();
  }, [selectedId, loadDetail, loadList]);

  const handleDeleted = useCallback(() => {
    setSelectedId(null);
    setSelectedPost(null);
    loadList();
  }, [loadList]);

  async function handleCreate(payload: CreatePayload): Promise<void> {
    const res = await fetch("/api/admin/marketing-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Create failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as { post: SocialPostRow };
    setComposing(false);
    setComposeDay(null);
    await loadList();
    setSelectedId(json.post.id);
  }

  const scheduledCount = useMemo(
    () => posts.filter((p) => p.status === "scheduled").length,
    [posts],
  );
  const draftCount = useMemo(
    () => posts.filter((p) => p.status === "draft").length,
    [posts],
  );

  function goPrev(): void {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }
  function goNext(): void {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }
  function goToday(): void {
    setWeekStart(startOfWeek(new Date()));
  }
  function startCompose(day: Date | null): void {
    setComposeDay(day);
    setComposeInitial(null);
    setComposing(true);
  }

  function startDuplicate(source: SocialPostWithImages): void {
    // Pre-fill the composer with this post's contents, scheduled one
    // week later. The composer creates a fresh row — original is
    // untouched. Images are NOT carried over (we keep the original's
    // Storage objects unique to the original post).
    const sourcedDate = new Date(source.scheduled_at);
    if (!Number.isNaN(sourcedDate.getTime())) {
      sourcedDate.setDate(sourcedDate.getDate() + 7);
    }
    setComposeDay(
      Number.isNaN(sourcedDate.getTime()) ? null : sourcedDate,
    );
    setComposeInitial({
      ...source,
      // Strip identity + scheduling so the composer treats this as a
      // template rather than an edit. The composer's `initial` prop is
      // SocialPostRow-shaped; we keep the body / title / platforms /
      // notes that it actually reads, and clear the rest.
      id: "",
      scheduled_at: sourcedDate.toISOString(),
      posted_at: null,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: [],
    });
    setSelectedId(null);
    setComposing(true);
  }

  return (
    <>
      <div className={styles.sectionToolbar}>
        <div className={styles.sectionMeta}>
          {scheduledCount} scheduled
          <span className={styles.sectionMetaDim}>
            {" "}
            · {draftCount} {draftCount === 1 ? "draft" : "drafts"} · {posts.length} total
          </span>
        </div>
        <Button variant="primary" onClick={() => startCompose(null)}>
          Add post
        </Button>
      </div>

      {state.kind === "loading" && <Loading message="Loading social posts…" />}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load posts">
          <p>{state.message}</p>
          <p>
            <button
              type="button"
              onClick={() => {
                setState({ kind: "loading" });
                loadList();
              }}
            >
              Retry
            </button>
          </p>
        </ErrorCard>
      )}

      {state.kind === "ready" && (
        <WeekCalendar
          weekStart={weekStart}
          posts={posts}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          onSelectPost={(id) => setSelectedId(id)}
          onAddOnDay={(day) => startCompose(day)}
        />
      )}

      {composing && (
        <Modal
          open
          title={composeInitial ? "Duplicate post" : "Add post"}
          onClose={() => {
            setComposing(false);
            setComposeDay(null);
            setComposeInitial(null);
          }}
          size="lg"
        >
          <PostComposer
            initial={composeInitial}
            initialDate={composeDay}
            onSubmit={handleCreate}
            onCancel={() => {
              setComposing(false);
              setComposeDay(null);
              setComposeInitial(null);
            }}
            submitLabel={composeInitial ? "Create duplicate" : "Save draft"}
          />
        </Modal>
      )}

      {selectedId && (
        <Modal
          open
          title={selectedPost?.title ?? "Post"}
          onClose={() => setSelectedId(null)}
          size="lg"
        >
          {detailLoading && <Loading message="Loading post…" />}
          {!detailLoading && !selectedPost && (
            <ErrorCard title="Couldn't load post">
              <p>The post failed to load. Close and try again.</p>
            </ErrorCard>
          )}
          {!detailLoading && selectedPost && (
            <PostDetail
              post={selectedPost}
              onSaved={refreshSelected}
              onDeleted={handleDeleted}
              onDuplicate={() => startDuplicate(selectedPost)}
            />
          )}
        </Modal>
      )}
    </>
  );
}
