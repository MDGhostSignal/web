"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  ErrorCard,
  Loading,
  Modal,
} from "@/components/admin";
import type { CalendarView } from "@/lib/social-calendar";
import {
  fetchRangeForView,
  startOfDay,
  stepAnchor,
} from "@/lib/social-calendar";
import type {
  SocialPostRow,
  SocialPostWithImages,
} from "@/lib/social-posts-types";

import { CalendarHeader } from "../components/social/CalendarHeader";
import { DayCalendar } from "../components/social/DayCalendar";
import { MonthCalendar } from "../components/social/MonthCalendar";
import { PostComposer } from "../components/social/PostComposer";
import { PostDetail } from "../components/social/PostDetail";
import { WeekCalendar } from "../components/social/WeekCalendar";
import { YearCalendar } from "../components/social/YearCalendar";
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

/**
 * Social Media Scheduler section. Four views (Day / Week / Month /
 * Year) swap inside a shared CalendarHeader. Month is always the
 * entry view — the planner is most useful at-a-glance over a month,
 * and a deterministic entry point beats a remembered one for shared
 * admin UX (founders look at the same screen). Each (view, anchor)
 * change triggers a refetch of the relevant time window.
 */
export function SocialSection() {
  // Always enter on Month view. The switcher still lets the user
  // pick Day / Week / Year within the session, but the choice is not
  // persisted — every fresh open of the page lands back on Month.
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] =
    useState<SocialPostWithImages | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composeDate, setComposeDate] = useState<Date | null>(null);
  const [composeInitial, setComposeInitial] = useState<
    SocialPostWithImages | null
  >(null);
  const [composing, setComposing] = useState(false);

  function handleViewChange(next: CalendarView): void {
    setView(next);
  }

  const loadList = useCallback(async () => {
    const { start, end } = fetchRangeForView(view, anchor);
    const from = start.toISOString();
    const to = end.toISOString();
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
  }, [view, anchor]);

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
    setComposeDate(null);
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
    setAnchor((a) => stepAnchor(view, a, -1));
  }
  function goNext(): void {
    setAnchor((a) => stepAnchor(view, a, 1));
  }
  function goToday(): void {
    setAnchor(startOfDay(new Date()));
  }

  function startCompose(when: Date | null): void {
    setComposeDate(when);
    setComposeInitial(null);
    setComposing(true);
  }

  function drillToDay(day: Date): void {
    setAnchor(startOfDay(day));
    handleViewChange("day");
  }

  function drillToMonth(month: Date): void {
    setAnchor(startOfDay(month));
    handleViewChange("month");
  }

  function startDuplicate(source: SocialPostWithImages): void {
    // Pre-fill the composer with this post's contents, scheduled one
    // week later. The composer creates a fresh row — original is
    // untouched. Images are NOT carried over.
    const sourcedDate = new Date(source.scheduled_at);
    if (!Number.isNaN(sourcedDate.getTime())) {
      sourcedDate.setDate(sourcedDate.getDate() + 7);
    }
    setComposeDate(Number.isNaN(sourcedDate.getTime()) ? null : sourcedDate);
    setComposeInitial({
      ...source,
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
            · {draftCount} {draftCount === 1 ? "draft" : "drafts"} ·{" "}
            {posts.length} total
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
        <div className={styles.calendarWrap}>
          <CalendarHeader
            view={view}
            anchor={anchor}
            onViewChange={handleViewChange}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
          />

          {view === "day" && (
            <DayCalendar
              day={anchor}
              posts={posts}
              onSelectPost={(id) => setSelectedId(id)}
              onAddAt={(when) => startCompose(when)}
            />
          )}

          {view === "week" && (
            <WeekCalendar
              weekStart={anchor}
              posts={posts}
              onSelectPost={(id) => setSelectedId(id)}
              onAddOnDay={(day) => startCompose(day)}
            />
          )}

          {view === "month" && (
            <MonthCalendar
              anchor={anchor}
              posts={posts}
              onSelectPost={(id) => setSelectedId(id)}
              onDrillToDay={drillToDay}
              onAddOnDay={(day) => startCompose(day)}
            />
          )}

          {view === "year" && (
            <YearCalendar
              anchor={anchor}
              posts={posts}
              onSelectMonth={drillToMonth}
              onSelectDay={drillToDay}
            />
          )}
        </div>
      )}

      {composing && (
        <Modal
          open
          title={composeInitial ? "Duplicate post" : "Add post"}
          onClose={() => {
            setComposing(false);
            setComposeDate(null);
            setComposeInitial(null);
          }}
          size="lg"
        >
          <PostComposer
            initial={composeInitial}
            initialDate={composeDate}
            onSubmit={handleCreate}
            onCancel={() => {
              setComposing(false);
              setComposeDate(null);
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
