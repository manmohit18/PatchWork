"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, ApiRequestError, type Workspace } from "@/lib/api";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<{ githubLogin: string }>("/api/v1/me"),
      apiRequest<Workspace[]>("/api/v1/workspaces"),
    ]).then(([user, items]) => { setLogin(user.githubLogin); setWorkspaces(items); })
      .catch((reason: unknown) => {
        if (reason instanceof ApiRequestError && reason.status === 401) router.replace("/login");
        else setError(reason instanceof Error ? reason.message : "Could not load workspaces");
      }).finally(() => setLoading(false));
  }, [router]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const workspace = await apiRequest<Workspace>("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({ name, slug, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      setWorkspaces((items) => [workspace, ...items]);
      setName(""); setSlug("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create workspace");
    } finally { setSaving(false); }
  }

  async function logout() {
    try { await apiRequest("/auth/logout", { method: "POST" }); router.replace("/login"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign out"); }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Patchwork</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Your workspaces</h1></div>
        <div className="flex items-center gap-4 text-sm text-slate-600"><span>{login ? `@${login}` : ""}</span><button onClick={logout} className="font-semibold text-slate-800 underline underline-offset-4">Sign out</button></div>
      </header>
      {error && <p role="alert" className="mb-6 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
      <div className="grid gap-7 md:grid-cols-[1fr_340px]">
        <section aria-label="Workspace list" className="space-y-4">
          {loading ? <p className="text-slate-600">Loading workspaces…</p> : workspaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">No workspaces yet. Create one to begin.</div>
          ) : workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/workspaces/${workspace.id}`} className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-900">{workspace.name}</h2><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{workspace.role.toLowerCase()}</span></div>
              <p className="mt-2 text-sm text-slate-500">/{workspace.slug}</p>
            </Link>
          ))}
        </section>
        <form onSubmit={create} className="self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create workspace</h2>
          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="workspace-name">Name</label>
          <input id="workspace-name" value={name} onChange={(event) => { setName(event.target.value); setSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} required maxLength={100} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Software project" />
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="workspace-slug">URL name</label>
          <input id="workspace-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="software-project" />
          <button disabled={saving} className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{saving ? "Creating…" : "Create workspace"}</button>
        </form>
      </div>
    </div>
  );
}
