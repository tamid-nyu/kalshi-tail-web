"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { API, Shell, Table, money } from "../../components/Lab";
import { response } from "../../components/client";
type Params = {
  markets: string[];
  cap: number;
  k: number;
  C: number;
  slip: number;
  q_max: number;
  estimator: string;
  start: string;
  end: string;
  variant: string;
  upload_id: string;
  min_history_days: number;
};
export default function Runs() {
  const [params, setParams] = useState<Params>({
    markets: ["BTC"],
    cap: 3,
    k: 1,
    C: 3,
    slip: 2,
    q_max: 50,
    estimator: "S",
    start: "",
    end: "2026-11-11",
    variant: "base",
    upload_id: "",
    min_history_days: 150,
  });
  const [markets, setMarkets] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [run, setRun] = useState<any>();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [comparison, setComparison] = useState<any>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function field(key: keyof Params, value: any) {
    setParams((p) => ({ ...p, [key]: value }));
  }
  async function refresh() {
    try {
      const [m, u, r] = await Promise.all([
        fetch(API + "/strategies/kalshi-tail/markets").then(response),
        fetch(API + "/uploads").then(response),
        fetch(API + "/strategies/kalshi-tail/runs").then(response),
      ]);
      setMarkets(m);
      setUploads(u.filter((d: any) => d.kind === "observations"));
      setRuns(r);
    } catch (e) {
      setMessage(String(e));
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (selected)
      fetch(API + "/strategies/kalshi-tail/runs/" + selected)
        .then(response)
        .then(setRun)
        .catch((e) => setMessage(String(e)));
  }, [selected]);
  async function create() {
    setBusy(true);
    setMessage(
      "Running the original walk-forward engine. Results and input provenance will be saved.",
    );
    try {
      const body = {
        ...params,
        cap: params.cap / 100,
        C: params.C / 100,
        slip: params.slip / 100,
        start: params.start || null,
        end: params.end || null,
        upload_id: params.upload_id || null,
      };
      const r = await fetch("/api/lab/strategies/kalshi-tail/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(response);
      setRun(r);
      setSelected(r.id);
      const held = r.result?.forward_rows_held_back ?? 0;
      setMessage(
        `Completed: ${r.summary.trades} trades, ${money(r.summary.pnl)} P&L.` +
          (held
            ? ` ${held} forward observations were held back (V2/V3 forward results open May 12, 2027).`
            : ""),
      );
      await refresh();
    } catch (e) {
      setMessage(String(e));
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    setMessage("Loading comparison…");
    try {
      setComparison(
        await fetch(
          `${API}/strategies/kalshi-tail/compare?left=${left}&right=${right}`,
        ).then(response),
      );
      setMessage("Comparison loaded.");
    } catch (e) {
      setMessage(String(e));
    }
  }
  const compareData: Record<string, any> = {};
  if (comparison) {
    for (const d of comparison.left.result?.daily || [])
      compareData[d.day] = { day: d.day, left: d.equity };
    for (const d of comparison.right.result?.daily || [])
      compareData[d.day] = {
        ...compareData[d.day],
        day: d.day,
        right: d.equity,
      };
  }
  return (
    <Shell active="Backtests">
      <section className="page-heading">
        <div>
          <p className="breadcrumb">Strategy / Backtests</p>
          <h1>Test a configuration</h1>
          <p className="intro">
            The original walk-forward engine, with stored inputs and
            reproducible runs.
          </p>
        </div>
      </section>
      <section className="panel">
        <h2>Run settings</h2>
        <p className="muted">
          The default is the committed BTC baseline through November 11. Earlier
          observations always train the estimator; the start date only changes
          the reported window. Caps and slippage below are percentages of
          bankroll and price, respectively.
        </p>
        <fieldset>
          <legend>Markets</legend>
          <div className="market-options">
            {markets.map((m) => (
              <label key={m.key}>
                <input
                  type="checkbox"
                  checked={params.markets.includes(m.key)}
                  onChange={(e) =>
                    field(
                      "markets",
                      e.target.checked
                        ? [...params.markets, m.key]
                        : params.markets.filter((k) => k !== m.key),
                    )
                  }
                />
                <span>
                  {m.key}
                  <small>
                    {m.expiry_days} stored expiry days
                    {m.history_gate
                      ? " · gate passed"
                      : " · below history gate"}
                    {!m.frozen ? " · exploratory" : ""}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid">
          {[
            ["cap", "Per-market cap c (%)", 0.1, 20, 0.1],
            ["k", "Worst markets k", 1, 7, 1],
            ["C", "Combined cap C (%)", 0.1, 50, 0.1],
            ["slip", "Slippage buffer (%)", 0, 20, 0.1],
            ["q_max", "Maximum contracts per order", 1, 1000, 1],
            ["min_history_days", "Minimum history days", 30, 1000, 1],
          ].map(([key, label, min, max, step]) => (
            <label key={String(key)}>
              {label}
              <input
                type="number"
                min={Number(min)}
                max={Number(max)}
                step={Number(step)}
                value={Number(params[key as keyof Params])}
                onChange={(e) =>
                  field(key as keyof Params, Number(e.target.value))
                }
              />
            </label>
          ))}
          <label>
            Estimator
            <select
              value={params.estimator}
              onChange={(e) => field("estimator", e.target.value)}
            >
              <option value="S">S · separate learning</option>
              <option value="P">P · partial pooling</option>
              <option value="V2">V2 · predictor v2 (pooled logistic, F1)</option>
              <option value="V3">V3 · predictor v3 (v2 + P blend)</option>
            </select>
          </label>
          <label>
            Variant
            <select
              value={params.variant}
              onChange={(e) => field("variant", e.target.value)}
            >
              <option value="base">Base · multi-market engine</option>
              <option value="#5">#5 · BTC model prior</option>
              <option value="#7">#7 · BTC learned logistic</option>
            </select>
          </label>
          <label>
            Additional observation dataset
            <select
              value={params.upload_id}
              onChange={(e) => field("upload_id", e.target.value)}
            >
              <option value="">Stored observations only</option>
              {uploads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.rows} rows
                </option>
              ))}
            </select>
          </label>
          <label>
            Report from
            <input
              type="date"
              value={params.start}
              onChange={(e) => field("start", e.target.value)}
            />
          </label>
          <label>
            Report through
            <input
              type="date"
              value={params.end}
              onChange={(e) => field("end", e.target.value)}
            />
          </label>
        </div>
        <p className="muted">
          A history threshold below 150 days is exploratory. #5 and #7 require
          BTC alone, estimator S, k = 1, C = c, and complete model
          probabilities. Markets with missing history produce a validation
          error. V2 and V3 are frozen for a forward verdict read on or after
          May 12, 2027; until then their runs stop at November 11, 2026.
        </p>
        <button
          className="primary"
          disabled={busy || !params.markets.length}
          onClick={create}
        >
          {busy ? "Running backtest…" : "Run backtest"}
        </button>
        <p role="status" className="result">
          {message}
        </p>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>Saved runs</h2>
          <button onClick={refresh}>Refresh</button>
        </div>
        {runs.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Created",
                    "Markets / model",
                    "Status",
                    "Trades",
                    "P&L",
                    "Details",
                  ].map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.created}</td>
                    <td>
                      {r.parameters.markets.join(", ")} ·{" "}
                      {r.parameters.estimator} · {r.parameters.variant}
                    </td>
                    <td>{r.status}</td>
                    <td>{r.summary?.trades ?? ""}</td>
                    <td>{r.summary ? money(r.summary.pnl) : ""}</td>
                    <td>
                      <button onClick={() => setSelected(r.id)}>
                        Open run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No saved runs yet.</p>
        )}
      </section>
      {run && (
        <section className="panel">
          <div className="section-title">
            <h2>Run {run.id.slice(0, 8)}</h2>
            <span className="badge">{run.status}</span>
          </div>
          {run.error && (
            <pre role="alert">{JSON.stringify(run.error, null, 2)}</pre>
          )}
          {run.result && (
            <>
              <div className="stats">
                {[
                  ["Net P&L", money(run.result.summary.pnl)],
                  ["Return", run.result.summary.return_pct.toFixed(3) + "%"],
                  [
                    "Max drawdown",
                    run.result.summary.max_drawdown_pct.toFixed(3) + "%",
                  ],
                  ["Trades", run.result.summary.trades],
                ].map(([l, v]) => (
                  <div key={l}>
                    <span>{l}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={run.result.daily}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="day" minTickGap={90} />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line
                      dataKey="equity"
                      stroke="#4677db"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="provenance">
                Engine {run.result.engine} · Source{" "}
                {run.result.source_commit.slice(0, 12)}
                <br />
                Ordered input SHA-256: {run.result.input_sha256}
              </p>
              {run.result.warning && (
                <p className="muted">{run.result.warning}</p>
              )}
              <details>
                <summary>Parameters</summary>
                <pre>{JSON.stringify(run.parameters, null, 2)}</pre>
              </details>
              <details>
                <summary>Trades</summary>
                <Table
                  rows={run.result.trades}
                  columns={[
                    "day",
                    "market",
                    "ticker",
                    "H",
                    "side",
                    "q",
                    "fill",
                    "fee",
                    "pnl",
                  ]}
                />
              </details>
              <details>
                <summary>Daily P&L and risk</summary>
                <Table rows={run.result.daily} />
              </details>
            </>
          )}
        </section>
      )}
      <section className="panel">
        <h2>Compare two runs</h2>
        <div className="form-grid">
          {[
            ["Left run", left, setLeft],
            ["Right run", right, setRight],
          ].map(([label, value, setter]: any) => (
            <label key={label}>
              {label}
              <select value={value} onChange={(e) => setter(e.target.value)}>
                <option value="">Select a completed run</option>
                {runs
                  .filter((r) => r.status === "completed")
                  .map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.id.slice(0, 8)} · {r.parameters.markets.join(",")} ·{" "}
                      {r.parameters.estimator} · {money(r.summary.pnl)}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <button disabled={!left || !right} onClick={compare}>
          Compare runs
        </button>
        {comparison && (
          <>
            <p>Right minus left P&L: {money(comparison.pnl_difference)}</p>
            <div className="two-col">
              {[
                ["Left", comparison.left],
                ["Right", comparison.right],
              ].map(([label, r]: any) => (
                <div key={label}>
                  <h3>
                    {label}: {r.id.slice(0, 8)}
                  </h3>
                  <Table rows={[r.result.summary]} />
                  <pre>{JSON.stringify(r.parameters, null, 2)}</pre>
                </div>
              ))}
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={Object.values(compareData).sort((a, b) =>
                    a.day.localeCompare(b.day),
                  )}
                >
                  <XAxis dataKey="day" minTickGap={80} />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line
                    name="Left account value"
                    dataKey="left"
                    stroke="#4677db"
                    dot={false}
                  />
                  <Line
                    name="Right account value"
                    dataKey="right"
                    stroke="#c45d73"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="muted">
              Curves use each run’s reported window. Compare matching dates and
              inputs for a meaningful result.
            </p>
          </>
        )}
      </section>
    </Shell>
  );
}
