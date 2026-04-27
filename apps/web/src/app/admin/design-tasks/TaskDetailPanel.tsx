"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { Badge, Button, ErrorCard, type BadgeVariant } from "@/components/admin";
import { LinkifiedText } from "@/lib/linkify";

import { DueDateBadge } from "./DueDateBadge";
import styles from "./TaskDetailPanel.module.css";

type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "in_review"
  | "archived";
type TaskPriority = "low" | "medium" | "high";
type Founder = "Mike Sense" | "Jack W Harding" | "Martin Drexler" | "Jeremy Reeves";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  due_date?: string | null;
  created_by?: string;
}

interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  reactions: { emoji: string; users: string[] }[];
}

interface TaskDetailPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (task: Task) => void;
  currentUser: Founder;
}

const FOUNDERS: { name: Founder; initials: string; color: string }[] = [
  { name: "Mike Sense", initials: "MS", color: "#8b5cf6" },
  { name: "Jack W Harding", initials: "JH", color: "#3b82f6" },
  { name: "Martin Drexler", initials: "MD", color: "#10b981" },
  { name: "Jeremy Reeves", initials: "JR", color: "#f59e0b" },
];

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "🤔", "👀", "🚀", "✅", "💯"];

// Priority → Badge variant, same mapping as the parent page so the
// pill styling is consistent across the list and the detail panel.
const priorityBadge: Record<TaskPriority, BadgeVariant> = {
  low: "success",
  medium: "warn",
  high: "danger",
};

function getFounderInfo(name: string) {
  return FOUNDERS.find((f) => f.name === name) || { name, initials: "??", color: "#6b7280" };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
  currentUser,
}: TaskDetailPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showCommenterPicker, setShowCommenterPicker] = useState(false);
  const [selectedCommenter, setSelectedCommenter] = useState<Founder>(currentUser);
  const [error, setError] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const commenterPickerRef = useRef<HTMLDivElement>(null);

  // Fetch comments when panel opens
  const fetchComments = useCallback(async () => {
    if (!task?.id) return;

    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/design-tasks/comments?task_id=${task.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch comments");
      }

      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (isOpen && task) {
      fetchComments();
    }
  }, [isOpen, task, fetchComments]);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length]);

  // Close panel on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close commenter picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commenterPickerRef.current && !commenterPickerRef.current.contains(e.target as Node)) {
        setShowCommenterPicker(false);
      }
    };

    if (showCommenterPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCommenterPicker]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/design-tasks/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          author: selectedCommenter,
          content: newComment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add comment");
      }

      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch("/api/design-tasks/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: commentId,
          content: editContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit comment");
      }

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data.comment : c))
      );
      setEditingCommentId(null);
      setEditContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/design-tasks/comments?id=${commentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete comment");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const reactions = [...(comment.reactions || [])];
    const existingReaction = reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      if (existingReaction.users.includes(currentUser)) {
        // Remove user from reaction
        existingReaction.users = existingReaction.users.filter((u) => u !== currentUser);
        if (existingReaction.users.length === 0) {
          reactions.splice(reactions.indexOf(existingReaction), 1);
        }
      } else {
        // Add user to reaction
        existingReaction.users.push(currentUser);
      }
    } else {
      // Create new reaction
      reactions.push({ emoji, users: [currentUser] });
    }

    try {
      const response = await fetch("/api/design-tasks/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: commentId,
          reactions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update reaction");
      }

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data.comment : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reaction");
    }

    setShowEmojiPicker(null);
  };

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      const response = await fetch("/api/design-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      onTaskUpdate(data.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`${styles.overlay} admin-root`} />
      <div ref={panelRef} className={`${styles.panel} admin-root`}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className={styles.headerActions}>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className={`${styles.statusSelect} ${styles[`status_${task.status}`]}`}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="in_review">In Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Task Details */}
        <div className={styles.taskDetails}>
          <h2 className={styles.taskTitle}>{task.title}</h2>

          <div className={styles.taskMeta}>
            <Badge variant={priorityBadge[task.priority]}>{task.priority}</Badge>
            {task.created_by && (
              <span className={styles.createdBy}>
                Created by {task.created_by}
              </span>
            )}
            <span className={styles.taskDate}>
              {new Date(task.created_at).toLocaleDateString()}
            </span>
            <DueDateBadge
              isoDate={task.due_date}
              isInactive={
                task.status === "completed" || task.status === "archived"
              }
            />
          </div>

          {task.description && (
            <p className={styles.taskDescription}>
              <LinkifiedText text={task.description} />
            </p>
          )}
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLabel}>Comments ({comments.length})</span>
        </div>

        {/* Error Message */}
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

        {/* Comments List */}
        <div className={styles.commentsContainer}>
          {isLoadingComments ? (
            <div className={styles.loadingComments}>Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className={styles.noComments}>
              No comments yet. Start the conversation!
            </div>
          ) : (
            <div className={styles.commentsList}>
              {comments.map((comment) => {
                const founderInfo = getFounderInfo(comment.author);
                const isOwnComment = comment.author === currentUser;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className={styles.comment}>
                    <div
                      className={styles.commentAvatar}
                      style={{ backgroundColor: founderInfo.color }}
                    >
                      {founderInfo.initials}
                    </div>
                    <div className={styles.commentContent}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>{comment.author}</span>
                        <span className={styles.commentTime}>
                          {formatRelativeTime(comment.created_at)}
                          {comment.updated_at && " (edited)"}
                        </span>
                        {isOwnComment && !isEditing && (
                          <div className={styles.commentActions}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditContent(comment.content);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className={styles.editForm}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className={styles.editTextarea}
                            autoFocus
                          />
                          <div className={styles.editActions}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditContent("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleEditComment(comment.id)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.commentText}>{comment.content}</p>
                      )}

                      {/* Reactions */}
                      <div className={styles.reactions}>
                        {comment.reactions?.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleToggleReaction(comment.id, reaction.emoji)}
                            className={`${styles.reactionBadge} ${
                              reaction.users.includes(currentUser) ? styles.reactionActive : ""
                            }`}
                            title={reaction.users.join(", ")}
                          >
                            {reaction.emoji} {reaction.users.length}
                          </button>
                        ))}
                        <div className={styles.addReactionWrapper}>
                          <button
                            onClick={() => setShowEmojiPicker(
                              showEmojiPicker === comment.id ? null : comment.id
                            )}
                            className={styles.addReactionBtn}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" />
                              <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                          </button>
                          {showEmojiPicker === comment.id && (
                            <div className={styles.emojiPicker}>
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(comment.id, emoji)}
                                  className={styles.emojiOption}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmitComment} className={styles.commentForm}>
          <div className={styles.commenterPickerWrapper} ref={commenterPickerRef}>
            <button
              type="button"
              onClick={() => setShowCommenterPicker(!showCommenterPicker)}
              className={styles.commenterPickerButton}
              style={{ backgroundColor: getFounderInfo(selectedCommenter).color }}
              title={`Commenting as ${selectedCommenter}`}
            >
              {getFounderInfo(selectedCommenter).initials}
              <span className={styles.commenterDropdownIcon}>▼</span>
            </button>
            {showCommenterPicker && (
              <div className={styles.commenterDropdown}>
                <div className={styles.commenterDropdownHeader}>Comment as:</div>
                {FOUNDERS.map((founder) => (
                  <button
                    key={founder.name}
                    type="button"
                    onClick={() => {
                      setSelectedCommenter(founder.name);
                      setShowCommenterPicker(false);
                    }}
                    className={`${styles.commenterOption} ${
                      selectedCommenter === founder.name ? styles.commenterOptionActive : ""
                    }`}
                  >
                    <span
                      className={styles.commenterOptionAvatar}
                      style={{ backgroundColor: founder.color }}
                    >
                      {founder.initials}
                    </span>
                    <span className={styles.commenterOptionName}>{founder.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Comment as ${selectedCommenter}...`}
            className={styles.commentInput}
            disabled={isSubmitting}
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? "…" : "Send"}
          </Button>
        </form>
      </div>
    </>
  );
}
