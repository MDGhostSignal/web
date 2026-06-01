"use client";

import { useState, useEffect, useCallback } from "react";

import {
  Badge,
  Button,
  ErrorCard,
  Modal,
  type BadgeVariant,
} from "@/components/admin";
import { LinkifiedText } from "@/lib/linkify";

import { DueDateBadge } from "./DueDateBadge";
import styles from "./page.module.css";
import { TaskDetailPanel } from "./TaskDetailPanel";

type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "in_review"
  | "archived";
type TaskPriority = "low" | "medium" | "high";
type Founder = "Mike Sense" | "Jack W Harding" | "Martin Drexler" | "Jeremy Reeves";

const FOUNDERS: { name: Founder; location: string }[] = [
  { name: "Mike Sense", location: "Prague, CZ" },
  { name: "Jack W Harding", location: "Cambridge, UK" },
  { name: "Martin Drexler", location: "Munich, DE" },
  { name: "Jeremy Reeves", location: "Colorado, US" },
];

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  due_date?: string | null;
  created_by?: string;
  /** Founder the task is assigned to. Null/undefined = unassigned. */
  assigned_to?: string | null;
  comment_count?: number;
  latest_comment_at?: string | null;
}

// Map task priority to a Badge variant so the pill styling comes from
// the shared admin tokens rather than a local CSS class.
const priorityBadge: Record<TaskPriority, BadgeVariant> = {
  low: "success",
  medium: "warn",
  high: "danger",
};

// Local storage key for tracking viewed comments
const VIEWED_COMMENTS_KEY = "ghostsignal_viewed_comments";

// Local storage key for the user-defined task order. Stored as an
// ordered array of task ids; tasks not in the array sort to the end
// (so newly created tasks land at the bottom by default).
const TASK_ORDER_KEY = "ghostsignal_design_task_order";

function getTaskOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TASK_ORDER_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTaskOrder(order: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TASK_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

function getViewedComments(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(VIEWED_COMMENTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markCommentsViewed(taskId: string, timestamp: string) {
  if (typeof window === "undefined") return;
  try {
    const viewed = getViewedComments();
    viewed[taskId] = timestamp;
    localStorage.setItem(VIEWED_COMMENTS_KEY, JSON.stringify(viewed));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Build a YYYY-MM-DD string for `today + offsetDays` in local time.
 * Used by the form's quick-set chips. ISO-8601 date-only format, which
 * is what `<input type="date">` expects as its value.
 */
function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hasNewComments(task: Task, viewedComments: Record<string, string>): boolean {
  if (!task.latest_comment_at || task.comment_count === 0) return false;
  const lastViewed = viewedComments[task.id];
  if (!lastViewed) return true;
  return task.latest_comment_at > lastViewed;
}

export default function DesignTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  // Second filter row — by assignee. "all" shows every task regardless
  // of assignment; a founder name shows only tasks assigned to them.
  const [assigneeFilter, setAssigneeFilter] = useState<Founder | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewedComments, setViewedComments] = useState<Record<string, string>>({});
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
  // Drag-and-drop state — both refs in id form so we don't have to
  // hold onto DOM nodes between events.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [createdBy, setCreatedBy] = useState<Founder>("Mike Sense");
  // Empty string = unassigned. On create the default mirrors createdBy
  // (user assigns to themselves unless they pick someone else); on
  // edit, seeded from the row's current assigned_to.
  const [assignedTo, setAssignedTo] = useState<Founder | "">("");

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/design-tasks");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tasks");
      setTasks(data.tasks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setViewedComments(getViewedComments());
    setTaskOrder(getTaskOrder());
  }, []);

  // Reorder helper. Insertion point is direction-aware:
  //  - dragging back-to-front (source after target) → land BEFORE target
  //  - dragging front-to-back (source before target) → land AFTER target
  // Without this, a front-to-back drag visually inserted at the slot
  // immediately before the target — looking like the drag failed.
  const reorderTasks = useCallback(
    (sourceId: string, targetId: string | null) => {
      setTaskOrder((prev) => {
        // Build a complete order based on current task list so any
        // task not yet in `prev` (e.g. newly created) gets placed.
        const fullOrder = [
          ...prev.filter((id) => tasks.some((t) => t.id === id)),
          ...tasks.map((t) => t.id).filter((id) => !prev.includes(id)),
        ];
        const sourceIdx = fullOrder.indexOf(sourceId);
        const targetIdx = targetId === null ? -1 : fullOrder.indexOf(targetId);
        const next = fullOrder.filter((id) => id !== sourceId);
        let insertAt: number;
        if (targetId === null || targetIdx === -1) {
          insertAt = next.length;
        } else if (sourceIdx < targetIdx) {
          // Source was originally before target → land AFTER target.
          insertAt = next.indexOf(targetId) + 1;
        } else {
          // Source was originally after target → land BEFORE target.
          insertAt = next.indexOf(targetId);
        }
        next.splice(insertAt, 0, sourceId);
        saveTaskOrder(next);
        return next;
      });
    },
    [tasks],
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setCreatedBy("Mike Sense");
    setAssignedTo("");
    setEditingId(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || isSaving) return;

      setIsSaving(true);
      setError(null);

      try {
        if (editingId) {
          const response = await fetch("/api/design-tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingId,
              title: title.trim(),
              description: description.trim(),
              priority,
              due_date: dueDate || null,
              assigned_to: assignedTo || null,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to update task");
          setTasks((prev) =>
            prev.map((task) => (task.id === editingId ? data.task : task)),
          );
        } else {
          const response = await fetch("/api/design-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim(),
              status: "pending",
              priority,
              due_date: dueDate || null,
              created_by: createdBy,
              assigned_to: assignedTo || null,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to create task");
          setTasks((prev) => [data.task, ...prev]);
        }
        closeModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Operation failed");
      } finally {
        setIsSaving(false);
      }
    },
    [title, description, priority, dueDate, createdBy, assignedTo, editingId, isSaving, closeModal],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date || "");
    setCreatedBy((task.created_by as Founder) || "Mike Sense");
    setAssignedTo((task.assigned_to as Founder | "" | undefined) ?? "");
    setIsModalOpen(true);
  }, []);

  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
    if (task.latest_comment_at) {
      markCommentsViewed(task.id, task.latest_comment_at);
      setViewedComments((prev) => ({
        ...prev,
        [task.id]: task.latest_comment_at!,
      }));
    }
  }, []);

  const handleStatusChange = useCallback(
    async (id: string, status: TaskStatus) => {
      try {
        const response = await fetch("/api/design-tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update status");
        setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update status");
      }
    },
    [],
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/design-tasks?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }, []);

  // Apply the user's saved order to the task list. Tasks not yet in
  // the order array (e.g. just-created) sort to the end. Filter is
  // applied AFTER sorting so the user's order is preserved within
  // each filter view.
  const orderedTasks = (() => {
    if (taskOrder.length === 0) return tasks;
    const indexById = new Map<string, number>();
    taskOrder.forEach((id, i) => indexById.set(id, i));
    return [...tasks].sort((a, b) => {
      const ia = indexById.has(a.id) ? indexById.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const ib = indexById.has(b.id) ? indexById.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  })();

  const filteredTasks = orderedTasks.filter((task) => {
    // "All" excludes terminal statuses (completed + archived) — those
    // tasks are only visible when the user explicitly picks that filter.
    // Keeps the default overview focused on active work.
    if (filter === "all") {
      if (task.status === "archived" || task.status === "completed") {
        return false;
      }
    } else if (task.status !== filter) {
      return false;
    }
    if (assigneeFilter !== "all" && task.assigned_to !== assigneeFilter) {
      return false;
    }
    return true;
  });

  const taskCounts = {
    all: tasks.filter(
      (t) => t.status !== "archived" && t.status !== "completed",
    ).length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    in_review: tasks.filter((t) => t.status === "in_review").length,
    archived: tasks.filter((t) => t.status === "archived").length,
  };

  if (!isLoaded) {
    return <div className={styles.loading}>Loading tasks…</div>;
  }

  return (
    <>
      <div className={styles.container}>
        {error && (
          <div className={styles.errorSlot}>
            <ErrorCard>{error}</ErrorCard>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Two-column layout — sidebar with all filters on the left,
            main column with the "New Task" action + task grid on the
            right. The sidebar is sticky so filters stay reachable
            while scrolling the task list. Collapses to a single
            column under 900 px. */}
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Task filters">
            <div className={styles.sidebarSection}>
              <h2 className={styles.sidebarSectionTitle}>Status</h2>
              <div className={styles.sidebarFilters}>
                {(
                  [
                    "all",
                    "pending",
                    "in_progress",
                    "completed",
                    "in_review",
                    "archived",
                  ] as const
                ).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`${styles.filterTab} ${filter === status ? styles.filterTabActive : ""}`}
                  >
                    <span>
                      {status === "all"
                        ? "All"
                        : status === "in_progress"
                          ? "In Progress"
                          : status === "in_review"
                            ? "In Review"
                            : status.charAt(0).toUpperCase() +
                              status.slice(1)}
                    </span>
                    <span className={styles.filterCount}>
                      {taskCounts[status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <h2 className={styles.sidebarSectionTitle}>Assignee</h2>
              <div className={styles.sidebarFilters}>
                <button
                  onClick={() => setAssigneeFilter("all")}
                  className={`${styles.filterTab} ${assigneeFilter === "all" ? styles.filterTabActive : ""}`}
                >
                  <span>Everyone</span>
                  <span className={styles.filterCount}>{tasks.length}</span>
                </button>
                {FOUNDERS.map((f) => {
                  const count = tasks.filter(
                    (t) => t.assigned_to === f.name,
                  ).length;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setAssigneeFilter(f.name)}
                      className={`${styles.filterTab} ${assigneeFilter === f.name ? styles.filterTabActive : ""}`}
                    >
                      <span>{f.name.split(" ")[0]}</span>
                      <span className={styles.filterCount}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className={styles.main}>
            <div className={styles.toolbar}>
              <Button variant="primary" onClick={openCreateModal}>
                + New Task
              </Button>
            </div>

        {/* Task List — render real tiles first, then numbered empty
            placeholders to round out the grid up to MIN_VISIBLE_TILES.
            The placeholders make empty grid slots visible and let the
            user see at a glance the "shape" of the list. */}
        <section className={styles.taskList}>
          {filteredTasks.map((task, index) => {
              const isNewComment = hasNewComments(task, viewedComments);
              const dragging = draggingId === task.id;
              const dragOver = dragOverId === task.id && draggingId !== null && draggingId !== task.id;
              return (
                <div
                  key={task.id}
                  className={[
                    styles.taskCard,
                    // Left-border color comes from status (not priority).
                    // Helper key matches the CSS class names below:
                    //   pending → borderPending, in_progress →
                    //   borderIn_progress, etc.
                    styles[
                      `border${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`
                    ],
                    dragging ? styles.taskCardDragging : "",
                    dragOver ? styles.taskCardDragOver : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(task.id);
                    e.dataTransfer.effectAllowed = "move";
                    // Some browsers need any data to be set for drag
                    // to actually fire across other elements.
                    e.dataTransfer.setData("text/plain", task.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragOver={(e) => {
                    if (!draggingId || draggingId === task.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverId !== task.id) setDragOverId(task.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverId === task.id) setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingId && draggingId !== task.id) {
                      reorderTasks(draggingId, task.id);
                    }
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onClick={() => handleSelectTask(task)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectTask(task);
                    }
                  }}
                >
                  <div className={styles.taskHeader}>
                    <div className={styles.taskTitleRow}>
                      <span className={styles.taskNumber}>{index + 1}</span>
                      <h3 className={styles.taskTitle}>{task.title}</h3>
                    </div>
                    <div className={styles.taskHeaderRight}>
                      {(task.comment_count ?? 0) > 0 && (
                        <span
                          className={`${styles.commentCount} ${isNewComment ? styles.newCommentIndicator : ""}`}
                        >
                          💬 {task.comment_count}
                          {isNewComment && (
                            <span className={styles.newBadge}>NEW</span>
                          )}
                        </span>
                      )}
                      <Badge variant={priorityBadge[task.priority]}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>

                  {task.description && (
                    <p className={styles.taskDescription}>
                      <LinkifiedText text={task.description} />
                    </p>
                  )}

                  <div className={styles.taskMeta}>
                    {task.created_by && (
                      <span className={styles.taskCreator}>
                        By: {task.created_by}
                      </span>
                    )}
                    {task.assigned_to ? (
                      <span className={styles.taskAssignee}>
                        → {task.assigned_to}
                      </span>
                    ) : (
                      <span className={styles.taskAssigneeUnset}>
                        → Unassigned
                      </span>
                    )}
                    <DueDateBadge
                      isoDate={task.due_date}
                      isInactive={
                        task.status === "completed" ||
                        task.status === "archived"
                      }
                    />
                  </div>

                  <div
                    className={styles.taskActions}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value as TaskStatus)
                      }
                      className={`${styles.statusSelect} ${styles[`status${task.status}`]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="in_review">In Review</option>
                      <option value="archived">Archived</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmId(task.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          {/* Numbered empty placeholders — round out to at least 12
              visible tiles so the grid reads as "this is the slot
              shape" even with few real tasks. Each shows its 1-indexed
              position in the same numbering as real tiles. */}
          {(() => {
            const MIN_VISIBLE_TILES = 12;
            const empties = Math.max(
              0,
              MIN_VISIBLE_TILES - filteredTasks.length,
            );
            return Array.from({ length: empties }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={styles.taskCardEmpty}
                aria-hidden="true"
              >
                {filteredTasks.length + i + 1}
              </div>
            ));
          })()}
        </section>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        dismissible={!isSaving}
        size="lg"
        title={editingId ? "Edit Task" : "Create New Task"}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="task-form"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : editingId ? "Update Task" : "Create Task"}
            </Button>
          </>
        }
      >
        <form
          id="task-form"
          onSubmit={handleSubmit}
          className={styles.form}
        >
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title…"
              className={styles.input}
              required
              disabled={isSaving}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description…"
              className={styles.textarea}
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className={styles.formRow}>
            {!editingId && (
              <div className={styles.formGroup}>
                <label htmlFor="createdBy" className={styles.label}>
                  Created By
                </label>
                <select
                  id="createdBy"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value as Founder)}
                  className={styles.select}
                  disabled={isSaving}
                >
                  {FOUNDERS.map((founder) => (
                    <option key={founder.name} value={founder.name}>
                      {founder.name} ({founder.location})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.formGroup}>
              <label htmlFor="assignedTo" className={styles.label}>
                Assigned To
              </label>
              <select
                id="assignedTo"
                value={assignedTo}
                onChange={(e) =>
                  setAssignedTo(e.target.value as Founder | "")
                }
                className={styles.select}
                disabled={isSaving}
              >
                <option value="">— Unassigned —</option>
                {FOUNDERS.map((founder) => (
                  <option key={founder.name} value={founder.name}>
                    {founder.name} ({founder.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="priority" className={styles.label}>
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={styles.select}
                disabled={isSaving}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="dueDate" className={styles.label}>
                Due Date
              </label>
              {/* Quick-set chips for the common cases (one tap covers
                  ~80% of due-date entries in modern task tools). The
                  native date picker below stays for arbitrary dates. */}
              <div className={styles.dueQuickPicks}>
                <button
                  type="button"
                  className={styles.dueQuickPickBtn}
                  onClick={() => setDueDate(isoDateOffset(0))}
                  disabled={isSaving}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={styles.dueQuickPickBtn}
                  onClick={() => setDueDate(isoDateOffset(1))}
                  disabled={isSaving}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className={styles.dueQuickPickBtn}
                  onClick={() => setDueDate(isoDateOffset(7))}
                  disabled={isSaving}
                >
                  Next week
                </button>
                <button
                  type="button"
                  className={styles.dueQuickPickBtn}
                  onClick={() => setDueDate("")}
                  disabled={isSaving}
                >
                  Clear
                </button>
              </div>
              <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={styles.input}
                disabled={isSaving}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
            );
            setSelectedTask(updatedTask);
          }}
          currentUser={createdBy}
        />
      )}

      {/* Delete Confirmation */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        size="sm"
        title="Delete task?"
        subtitle="This action cannot be undone."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructiveSolid"
              onClick={() => {
                if (deleteConfirmId) handleDelete(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>
          Permanently removes this task and all of its comments. There&rsquo;s
          no undo — the row is dropped from Supabase.
        </p>
      </Modal>
    </>
  );
}
