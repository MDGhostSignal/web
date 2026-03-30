import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "design_tasks";

interface TaskPayload {
  id?: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date?: string | null;
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

// GET - Fetch all tasks
export async function GET() {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}?select=*&order=created_at.desc`,
      {
        method: "GET",
        headers: config.headers,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Failed to fetch tasks.", detail },
        { status: 502 }
      );
    }

    const tasks = await response.json();

    return NextResponse.json({
      ok: true,
      tasks,
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

    const taskData = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || "pending",
      priority: body.priority || "medium",
      due_date: body.due_date || null,
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
