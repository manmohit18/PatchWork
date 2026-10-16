export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">P</div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Patchwork</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Bring your team’s work together.</h1>
        <p className="mt-4 text-slate-600">Sign in to create a workspace and start tracking tasks. Repository activity and project health arrive in later milestones.</p>
        <a href="/auth/github/start" className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          Continue with GitHub
        </a>
        <p className="mt-4 text-xs text-slate-500">Patchwork requests profile access for sign-in. It does not request repository access at this stage.</p>
      </section>
    </div>
  );
}
