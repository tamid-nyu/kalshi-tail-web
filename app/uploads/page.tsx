"use client";
import { useState, useEffect } from "react";
import { Shell, Table, API } from "../../components/Lab";
import { response } from "../../components/client";
export default function Uploads() {
  const [file, setFile] = useState<File>();
  const [kind, setKind] = useState("custom");
  const [name, setName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>();
  const [sourceColumns, setSourceColumns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      setItems(await fetch(API + "/uploads").then(response));
    } catch (e) {
      setMessage(String(e));
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  function pick(f?: File) {
    setFile(f);
    setPreview(null);
    setSourceColumns([]);
    setMapping({});
    setMessage("");
  }
  async function send(save: boolean) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("name", name);
    form.set(
      "mapping",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(mapping).filter(([k, v]) => v && v !== k),
        ),
      ),
    );
    try {
      const r = await fetch("/api/lab/uploads" + (save ? "" : "/preview"), {
        method: "POST",
        body: form,
      }).then(response);
      setPreview(r);
      if (!sourceColumns.length) setSourceColumns(r.columns);
      setMessage(
        save
          ? `Saved version ${r.id}. Available as a backtest input when its type is observations.`
          : "Preview validated. Review the schema and sample before saving.",
      );
      if (save) await refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function activate(id: string, active: boolean) {
    setBusy(true);
    try {
      await fetch(
        "/api/lab/uploads/" + id + (active ? "/deactivate" : "/activate"),
        { method: "POST" },
      ).then(response);
      setMessage(
        active
          ? "Removed from shared forward history."
          : "Activated as shared forward history.",
      );
      await refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch("/api/lab/uploads/" + id, { method: "DELETE" }).then(
        response,
      );
      setMessage("Dataset deleted.");
      await refresh();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell active="Datasets">
      <section className="page-heading">
        <div>
          <p className="breadcrumb">Data / Manual uploads</p>
          <h1>Bring your own observations</h1>
          <p className="intro">
            Preview, map and save versioned CSV or JSON datasets. Reads are
            public; upload research data you intend to share.
          </p>
        </div>
      </section>
      <section className="panel">
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          <h2>Drop a CSV or JSON file</h2>
          <p className="muted">
            Up to 4 MB. JSON must be an array of row objects.
          </p>
          <input
            aria-label="Choose CSV or JSON"
            type="file"
            accept=".csv,.json"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file && (
            <p>
              {file.name} · {(file.size / 1000).toFixed(1)} KB
            </p>
          )}
        </div>
        <div className="form-grid">
          <label>
            Dataset name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional name"
            />
          </label>
          <label>
            Dataset type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="custom">Custom dataset</option>
              <option value="observations">Strategy observations</option>
              <option value="trades">Trades</option>
              <option value="candles">Price / candle data</option>
            </select>
          </label>
        </div>
        <p className="muted">
          For column mapping, preview as a custom dataset first. Map source
          names below, then select the observation type and validate again.
          Required observation fields: ticker, expiry, day, H, y, bid, ask,
          bid_f, ask_f, floor, strike_type. Prices are probabilities from 0 to
          1; H is 6 or 3 for trading (source 12h rows are accepted and ignored);
          y is the settled 0/1 outcome.
        </p>
        {preview && (
          <>
            <h3>Column mapping</h3>
            <div className="form-grid">
              {sourceColumns.map((c: any) => (
                <label key={c.name}>
                  {c.name} ({c.dtype})
                  <input
                    aria-label={`Map ${c.name}`}
                    value={mapping[c.name] ?? c.name}
                    onChange={(e) =>
                      setMapping({ ...mapping, [c.name]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <p>{preview.rows} rows</p>
            <Table rows={preview.sample} />
          </>
        )}
        <div className="actions">
          <button disabled={!file || busy} onClick={() => send(false)}>
            {busy ? "Working…" : "Validate & preview"}
          </button>
          <button
            className="primary"
            disabled={!file || !preview || busy}
            onClick={() => send(true)}
          >
            Save dataset version
          </button>
        </div>
        {message && (
          <p className="result" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Saved dataset versions</h2>
        {items.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Name",
                    "Type",
                    "Rows",
                    "Version",
                    "Input ID",
                    "Actions",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.kind}</td>
                    <td>{r.rows}</td>
                    <td>{r.version}</td>
                    <td>{r.id}</td>
                    <td>
                      <div className="actions">
                        {r.kind === "observations" && (
                          <button
                            disabled={busy}
                            onClick={() => activate(r.id, !!r.active)}
                          >
                            {r.active
                              ? "Remove from forward history"
                              : "Use in forward history"}
                          </button>
                        )}
                        <button disabled={busy} onClick={() => remove(r.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No uploaded datasets yet. Add one above.</p>
        )}
      </section>
    </Shell>
  );
}
