"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, ApiRequestError, type Task, type Workspace } from "@/lib/api";

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<Workspace[]>("/api/v1/workspaces"),
      apiRequest<{ items: Task[]; nextCursor: string | null }>(`/api/v1/workspaces/${workspaceId}/tasks`),
    ]).then(([workspaces, result]) => {
      setWorkspace(workspaces.find((item) => item.id === workspaceId) ?? null);
      setTasks(result.items);
      setNextCursor(result.nextCursor);
    }).catch((reason: unknown) => {
      if (reason instanceof ApiRequestError && reason.status === 401) router.replace("/login");
      else setError(reason instanceof Error ? reason.message : "Could not load tasks");
    }).finally(() => setLoading(false));
  }, [router, workspaceId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const task = await apiRequest<Task>(`/api/v1/workspaces/${workspaceId}/tasks`, {
        method: "POST", body: JSON.stringify({ title, description, priority, ...(dueDate ? { dueDate } : {}) }),
      });
      setTasks((items) => [task, ...items]);
      setTitle(""); setDescription(""); setDueDate(""); setPriority("MEDIUM");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create task"); }
    finally { setSaving(false); }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setError("");
    try {
      const result = await apiRequest<{ items: Task[]; nextCursor: string | null }>(`/api/v1/workspaces/${workspaceId}/tasks?cursor=${encodeURIComponent(nextCursor)}`);
      setTasks((items) => [...items, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load more tasks"); }
  }

  const canCreate = workspace !== null && workspace.role !== "VIEWER";
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link href="/workspaces" className="text-sm font-semibold text-indigo-700 hover:underline">← All workspaces</Link>
      <header className="mt-6 mb-8"><p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{workspace?.name ?? (loading ? "Loading…" : "Workspace")}</h1><p className="mt-2 text-slate-600">Tasks persist in your team workspace.</p></header>
      {error && <p role="alert" className="mb-6 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
      <div className="grid gap-7 md:grid-cols-[1fr_340px]">
        <section aria-label="Tasks" className="space-y-4">
          {loading ? <p className="text-slate-600">Loading tasks…</p> : tasks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">No tasks yet. Add the first piece of work.</div> : tasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{task.title}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{task.status.replaceAll("_", " ").toLowerCase()}</span></div>
              {task.description && <p className="mt-3 whitespace-pre-wrap text-slate-600">{task.description}</p>}
              <p className="mt-4 text-sm text-slate-500">Priority: {task.priority.toLowerCase()}{task.dueDate ? ` · Due ${task.dueDate}` : ""}</p>
            </article>
          ))}
          {nextCursor && <button onClick={loadMore} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-indigo-700 hover:border-indigo-400">Load more tasks</button>}
        </section>
        {canCreate && <form onSubmit={create} className="self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create task</h2>
          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="task-title">Title</label>
          <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Define API contracts" />
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="task-description">Description</label>
          <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="task-priority">Priority</label>
          <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select>
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="task-due">Due date</label>
          <input id="task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button disabled={saving} className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{saving ? "Creating…" : "Create task"}</button>
        </form>}
      </div>
    </div>
  );
}
