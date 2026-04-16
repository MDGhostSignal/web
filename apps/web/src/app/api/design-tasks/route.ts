import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "design_tasks";

interface TaskPayload {
  id?: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date?: string | null;
  created_by?: string;
}

// Founder mapping based on country
const FOUNDER_BY_COUNTRY: Record<string, { name: string; location: string }> = {
  GB: { name: "Jack W Harding", location: "UK" },
  DE: { name: "Martin Drexler", location: "Germany" },
  US: { name: "Jeremy Reeves", location: "US" },
  CZ: { name: "Mike Sense", location: "Czech Republic" },
};

// Get founder from IP using free ip-api.com service
async function getFounderFromIP(ip: string): Promise<string | null> {
  // Skip for localhost/development
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const countryCode = data.countryCode;

    if (countryCode && FOUNDER_BY_COUNTRY[countryCode]) {
      return FOUNDER_BY_COUNTRY[countryCode].name;
    }

    return null;
  } catch {
    return null;
  }
}

// Extract client IP from request headers
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP (in order of reliability)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "127.0.0.1";
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    url: supabaseUrl,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };
}

// GET - Fetch all tasks with comment counts
export async function GET() {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    // Fetch tasks
    const tasksResponse = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}?select=*&order=created_at.desc`,
      {
        method: "GET",
        headers: config.headers,
        cache: "no-store",
      }
    );

    if (!tasksResponse.ok) {
      const detail = await tasksResponse.text();
      return NextResponse.json(
        { error: "Failed to fetch tasks.", detail },
        { status: 502 }
      );
    }

    const tasks = await tasksResponse.json();

    // Fetch comment counts and latest comment timestamps for all tasks
    const commentsResponse = await fetch(
      `${config.url}/rest/v1/design_task_comments?select=task_id,created_at`,
      {
        method: "GET",
        headers: config.headers,
        cache: "no-store",
      }
    );

    let commentCounts: Record<string, number> = {};
    let latestCommentAt: Record<string, string> = {};

    if (commentsResponse.ok) {
      const comments = await commentsResponse.json();
      // Count comments per task and track latest comment timestamp
      comments.forEach((comment: { task_id: string; created_at: string }) => {
        commentCounts[comment.task_id] = (commentCounts[comment.task_id] || 0) + 1;

        // Track latest comment timestamp
        if (!latestCommentAt[comment.task_id] || comment.created_at > latestCommentAt[comment.task_id]) {
          latestCommentAt[comment.task_id] = comment.created_at;
        }
      });
    }

    // Add comment counts and latest timestamps to tasks
    const tasksWithCounts = tasks.map((task: { id: string }) => ({
      ...task,
      comment_count: commentCounts[task.id] || 0,
      latest_comment_at: latestCommentAt[task.id] || null,
    }));

    return NextResponse.json({
      ok: true,
      tasks: tasksWithCounts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks.", detail: String(error) },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    const body: TaskPayload = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    // Use creator from request body, or detect from IP as fallback
    let founderName = body.created_by;
    if (!founderName || founderName === "Unknown") {
      const clientIP = getClientIP(request);
      founderName = await getFounderFromIP(clientIP) || "Unknown";
    }

    const taskData = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || "pending",
      priority: body.priority || "medium",
      due_date: body.due_date || null,
      created_by: founderName,
    };

    const response = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}`,
      {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify(taskData),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Failed to create task.", detail },
        { status: 502 }
      );
    }

    const [task] = await response.json();

    return NextResponse.json({
      ok: true,
      task,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create task.", detail: String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing task
export async function PATCH(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    const body: TaskPayload = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Task ID is required." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null;

    const response = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}?id=eq.${body.id}`,
      {
        method: "PATCH",
        headers: config.headers,
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Failed to update task.", detail },
        { status: 502 }
      );
    }

    const [task] = await response.json();

    return NextResponse.json({
      ok: true,
      task,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update task.", detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}?id=eq.${id}`,
      {
        method: "DELETE",
        headers: config.headers,
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Failed to delete task.", detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete task.", detail: String(error) },
      { status: 500 }
    );
  }
}
