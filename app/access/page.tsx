"use client";
import { useEffect, useState } from "react";
import { Shell } from "../../components/Lab";
import { response } from "../../components/client";
export default function Access() {
  const [password, setPassword] = useState("");
  const [signed, setSigned] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/session")
      .then(response)
      .then((r) => setSigned(r.signedIn))
      .catch((e) => setMessage(String(e)));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }).then(response);
      setSigned(r.signedIn);
      setPassword("");
      setMessage(
        "Signed in for eight hours. You can upload datasets, run ingestion and create backtests.",
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await fetch("/api/session", { method: "DELETE" }).then(response);
      setSigned(false);
      setMessage("Signed out. Public research remains available.");
    } catch (e) {
      setMessage(String(e));
    }
  }
  return (
    <Shell active="Write access">
      <section className="page-heading">
        <div>
          <p className="breadcrumb">Lab / Write access</p>
          <h1>
            {signed ? "Write access is active" : "Sign in to make changes"}
          </h1>
          <p className="intro">
            Research reads are public. Uploads, ingestion and backtest creation
            require sign-in.
          </p>
        </div>
      </section>
      <section className="panel access-panel">
        {signed ? (
          <>
            <p>
              Your session lasts eight hours. The API bearer token stays on the
              server.
            </p>
            <div className="actions">
              <a href="/uploads">Upload a dataset</a>
              <a href="/runs">Run a backtest</a>
              <button onClick={logout}>Sign out</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>
              Lab sign-in password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <p className="muted">
              Use the separate lab sign-in password supplied by the project
              administrator.
            </p>
            <button className="primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
        <p role="status">{message}</p>
      </section>
    </Shell>
  );
}
