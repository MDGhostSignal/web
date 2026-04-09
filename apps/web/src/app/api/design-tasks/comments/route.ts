import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "design_task_comments";

interface CommentPayload {
  id?: string;
  task_id?: string;
  author?: string;
  content?: string;
  reactions?: { emoji: string; users: string[] }[];
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

// GET - Fetch comments for a task
export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");

  if (!taskId) {
    return NextResponse.json(
      { error: "task_id is required." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}?task_id=eq.${taskId}&select=*&order=created_at.asc`,
      {
        method: "GET",
        headers: config.headers,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Failed to fetch comments.", detail },
        { status: 502 }
      );
    }

    const comments = await response.json();

    return NextResponse.json({
      ok: true,
      comments,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch comments.", detail: String(error) },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    const body: CommentPayload = await request.json();

    if (!body.task_id) {
      return NextResponse.json(
        { error: "task_id is required." },
        { status: 400 }
      );
    }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }

    if (!body.author) {
      return NextResponse.json(
        { error: "Author is required." },
        { status: 400 }
      );
    }

    const commentData = {
      task_id: body.task_id,
      author: body.author,
      content: body.content.trim(),
      reactions: [],
    };

    const response = await fetch(
      `${config.url}/rest/v1/${TABLE_NAME}`,
      {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify(commentData),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "Failed to create comment.", detail },
        { status: 502 }
      );
    }

    const [comment] = await response.json();

    return NextResponse.json({
      ok: true,
      comment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create comment.", detail: String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update a comment (edit content or add reaction)
export async function PATCH(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  try {
    const body: CommentPayload = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Comment ID is required." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.content !== undefined) {
      updateData.content = body.content.trim();
      updateData.updated_at = new Date().toISOString();
    }

    if (body.reactions !== undefined) {
      updateData.reactions = body.reactions;
    }

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
        { error: "Failed to update comment.", detail },
        { status: 502 }
      );
    }

    const [comment] = await response.json();

    return NextResponse.json({
      ok: true,
      comment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update comment.", detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment
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
        { error: "Comment ID is required." },
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
        { error: "Failed to delete comment.", detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete comment.", detail: String(error) },
      { status: 500 }
    );
  }
}
