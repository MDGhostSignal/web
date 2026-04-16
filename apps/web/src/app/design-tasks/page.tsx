"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { TaskDetailPanel } from "./TaskDetailPanel";

type TaskStatus = "pending" | "in_progress" | "completed";
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
  comment_count?: number;
  latest_comment_at?: string | null;
}

// Local storage key for tracking viewed comments
const VIEWED_COMMENTS_KEY = "ghostsignal_viewed_comments";

// Get viewed timestamps from localStorage
function getViewedComments(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(VIEWED_COMMENTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save viewed timestamp to localStorage
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

// Check if task has new comments
function hasNewComments(task: Task, viewedComments: Record<string, string>): boolean {
  if (!task.latest_comment_at || task.comment_count === 0) return false;
  const lastViewed = viewedComments[task.id];
  if (!lastViewed) return true; // Never viewed = new
  return task.latest_comment_at > lastViewed;
}

export default function DesignTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewedComments, setViewedComments] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [createdBy, setCreatedBy] = useState<Founder>("Mike Sense");

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/design-tasks");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tasks");
      }

      setTasks(data.tasks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Load tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Load viewed comments from localStorage on mount
  useEffect(() => {
    setViewedComments(getViewedComments());
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setCreatedBy("Mike Sense");
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
          // Update existing task
          const response = await fetch("/api/design-tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingId,
              title: title.trim(),
              description: description.trim(),
              priority,
              due_date: dueDate || null,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to update task");
          }

          setTasks((prev) =>
            prev.map((task) => (task.id === editingId ? data.task : task))
          );
        } else {
          // Create new task
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
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to create task");
          }

          setTasks((prev) => [data.task, ...prev]);
        }

        closeModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Operation failed");
      } finally {
        setIsSaving(false);
      }
    },
    [title, description, priority, dueDate, createdBy, editingId, isSaving, closeModal]
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date || "");
    setCreatedBy((task.created_by as Founder) || "Mike Sense");
    setIsModalOpen(true);
  }, []);

  // Handle task selection and mark comments as viewed
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
    // Mark comments as viewed when opening the task
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

        if (!response.ok) {
          throw new Error(data.error || "Failed to update status");
        }

        setTasks((prev) =>
          prev.map((task) => (task.id === id ? data.task : task))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update status");
      }
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/design-tasks?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }, []);

  const filteredTasks = tasks.filter(
    (task) => filter === "all" || task.status === filter
  );

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  if (!isLoaded) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Loading tasks...</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <Image
              src="/images/home/figma/logo-black-1.svg"
              alt="GhostSignal"
              width={57}
              height={48}
              className={styles.headerLogo}
            />
            <span className={styles.titleText}>Design Tasks</span>
          </div>
          <Link href="/" className={styles.backLink}>
            Back to Home
          </Link>
        </div>
      </header>

      <div className={styles.container}>
        {/* Error Message */}
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)} className={styles.errorClose}>
              &times;
            </button>
          </div>
        )}

        {/* Filter Tabs + Create Button */}
        <div className={styles.toolbar}>
          <div className={styles.filterTabs}>
            {(["all", "pending", "in_progress", "completed"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`${styles.filterTab} ${filter === status ? styles.filterTabActive : ""}`}
                >
                  {status === "all"
                    ? "All"
                    : status === "in_progress"
                      ? "In Progress"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className={styles.filterCount}>{taskCounts[status]}</span>
                </button>
              )
            )}
          </div>
          <button onClick={openCreateModal} className={styles.createButton}>
            + New Task
          </button>
        </div>

        {/* Task List */}
        <section className={styles.taskList}>
          {filteredTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                {filter === "all"
                  ? "No tasks yet. Create your first task!"
                  : `No ${filter === "in_progress" ? "in progress" : filter} tasks.`}
              </p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const isNewComment = hasNewComments(task, viewedComments);
              return (
              <div
                key={task.id}
                className={`${styles.taskCard} ${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`]} ${isNewComment ? styles.hasNewComments : ""}`}
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
                      <span className={`${styles.commentCount} ${isNewComment ? styles.newCommentIndicator : ""}`}>
                        💬 {task.comment_count}
                        {isNewComment && <span className={styles.newBadge}>NEW</span>}
                      </span>
                    )}
                    <span
                      className={`${styles.priorityBadge} ${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}Badge`]}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>

                {task.description && (
                  <p className={styles.taskDescription}>{task.description}</p>
                )}

                <div className={styles.taskMeta}>
                  {task.created_by && (
                    <span className={styles.taskCreator}>
                      By: {task.created_by}
                    </span>
                  )}
                  <span className={styles.taskDate}>
                    Created: {new Date(task.created_at).toLocaleDateString()}
                  </span>
                  {task.due_date && (
                    <span className={styles.taskDue}>
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className={styles.taskActions} onClick={(e) => e.stopPropagation()}>
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
                  </select>

                  <button
                    onClick={() => handleEdit(task)}
                    className={styles.editButton}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(task.id)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
            })
          )}
        </section>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId ? "Edit Task" : "Create New Task"}
              </h2>
              <button onClick={closeModal} className={styles.modalClose}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.label}>
                  Task Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title..."
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
                  placeholder="Enter task description..."
                  className={styles.textarea}
                  rows={3}
                  disabled={isSaving}
                />
              </div>

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

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.cancelButton}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Update Task"
                      : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
            );
            setSelectedTask(updatedTask);
          }}
          currentUser={createdBy}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠️</div>
            <h3 className={styles.confirmTitle}>Delete Task?</h3>
            <p className={styles.confirmText}>
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className={styles.confirmDeleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
