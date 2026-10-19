"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { GoalCard } from "./GoalCard";
import { HORIZON_META, type Goal, type Horizon } from "../types";
import styles from "../horizon.module.css";

const BANDS: Horizon[] = ["short", "mid", "long"];

type Link = { id: string; d: string; active: boolean };

type Props = {
  goals: Goal[];
  cadence: "all" | Goal["cadence"];
  onOpen: (goal: Goal) => void;
  onMove: (id: string, horizon: Horizon, beforeId: string | null) => void;
};

function chainOf(goals: Goal[], id: string): Set<string> {
  const byId = new Map(goals.map((goal) => [goal.id, goal]));
  const ids = new Set<string>([id]);
  let cursor = byId.get(id);
  const guard = new Set<string>();
  while (cursor?.parent_id && !guard.has(cursor.id)) {
    guard.add(cursor.id);
    ids.add(cursor.parent_id);
    cursor = byId.get(cursor.parent_id);
  }
  const children = new Map<string, string[]>();
  for (const goal of goals) {
    if (!goal.parent_id) continue;
    const list = children.get(goal.parent_id) ?? [];
    list.push(goal.id);
    children.set(goal.parent_id, list);
  }
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of children.get(current) ?? []) {
      if (ids.has(child)) continue;
      ids.add(child);
      stack.push(child);
    }
  }
  return ids;
}

export function HorizonBoard({ goals, cadence, onOpen, onMove }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);

  const focus = useMemo(
    () => (hoverId ? chainOf(goals, hoverId) : null),
    [goals, hoverId],
  );

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    function measure() {
      if (!board) return;
      const origin = board.getBoundingClientRect();
      const next: Link[] = [];
      for (const goal of goals) {
        if (!goal.parent_id) continue;
        const from = board.querySelector<HTMLElement>(
          `[data-goal-id="${goal.id}"]`,
        );
        const to = board.querySelector<HTMLElement>(
          `[data-goal-id="${goal.parent_id}"]`,
        );
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.right - origin.left + board.scrollLeft;
        const y1 = a.top + a.height / 2 - origin.top + board.scrollTop;
        const x2 = b.left - origin.left + board.scrollLeft;
        const y2 = b.top + b.height / 2 - origin.top + board.scrollTop;
        const bend = Math.max(48, (x2 - x1) / 2);
        next.push({
          id: `${goal.id}-${goal.parent_id}`,
          d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
          active: !focus || (focus.has(goal.id) && focus.has(goal.parent_id)),
        });
      }
      setLinks(next);
      setBoardSize({ w: board.scrollWidth, h: board.scrollHeight });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    board.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      board.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [goals, cadence, focus, draggingId]);

  function cardsFor(horizon: Horizon) {
    return goals
      .filter((goal) => goal.horizon === horizon)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  return (
    <div className={styles.board} ref={boardRef}>
      <svg
        className={styles.links}
        width={boardSize.w}
        height={boardSize.h}
        aria-hidden
      >
        {links.map((link) => (
          <path
            key={link.id}
            d={link.d}
            className={link.active ? styles.linkActive : styles.linkDim}
          />
        ))}
      </svg>
      {BANDS.map((horizon) => {
        const cards = cardsFor(horizon);
        return (
          <section
            key={horizon}
            className={`${styles.band} ${styles[`band_${horizon}`]} ${
              dropKey === horizon ? styles.bandDrop : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropKey(horizon);
            }}
            onDragLeave={() => {
              setDropKey((current) => (current === horizon ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain") || draggingId;
              setDropKey(null);
              if (id) onMove(id, horizon, null);
            }}
          >
            <header className={styles.bandHead}>
              <h2>{HORIZON_META[horizon].label}</h2>
              <p>{HORIZON_META[horizon].hint}</p>
            </header>
            <div className={styles.stack}>
              {cards.map((goal) => (
                <div
                  key={goal.id}
                  className={dropKey === goal.id ? styles.dropSlot : undefined}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setDropKey(goal.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const id = event.dataTransfer.getData("text/plain") || draggingId;
                    setDropKey(null);
                    if (id && id !== goal.id) onMove(id, horizon, goal.id);
                  }}
                >
                  <GoalCard
                    goal={goal}
                    dimmed={
                      (cadence !== "all" && goal.cadence !== cadence) ||
                      (focus !== null && !focus.has(goal.id))
                    }
                    onOpen={onOpen}
                    onHover={setHoverId}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                  />
                </div>
              ))}
              {cards.length === 0 ? (
                <p className={styles.bandEmpty}>Drop a goal here.</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
