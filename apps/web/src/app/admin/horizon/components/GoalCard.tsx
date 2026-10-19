"use client";

import { CADENCE_LABEL, STATUS_LABEL, type Goal } from "../types";
import styles from "../horizon.module.css";

type Props = {
  goal: Goal;
  dimmed: boolean;
  onOpen: (goal: Goal) => void;
  onHover: (id: string | null) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
};

export function GoalCard({
  goal,
  dimmed,
  onOpen,
  onHover,
  onDragStart,
  onDragEnd,
}: Props) {
  const initial = goal.owner.trim().slice(0, 1).toUpperCase();
  return (
    <article
      className={`${styles.card} ${styles[`card_${goal.horizon}`]} ${dimmed ? styles.cardDim : ""}`}
      data-goal-id={goal.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", goal.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(goal.id);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => onHover(goal.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onOpen(goal)}
    >
      <div className={styles.cardTop}>
        <span className={styles.cadence}>{CADENCE_LABEL[goal.cadence]}</span>
        <span className={styles.cardMeta}>
          {initial ? (
            <span className={styles.owner} title={goal.owner}>
              {initial}
            </span>
          ) : null}
          <span className={`${styles.pip} ${styles[`pip_${goal.status}`]}`}>
            {STATUS_LABEL[goal.status]}
          </span>
        </span>
      </div>
      <h3 className={styles.cardTitle}>{goal.title}</h3>
    </article>
  );
}
