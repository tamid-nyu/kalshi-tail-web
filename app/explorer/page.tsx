"use client";
import { useState, useEffect } from "react";
import { Shell, Table, API } from "../../components/Lab";
import { response } from "../../components/client";
export default function Explorer() {
  const [market, setMarket] = useState("BTC");
  const [day, setDay] = useState("");
  const [est, setEst] = useState("S");
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<any>();
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setData(
        await fetch(
          `${API}/kalshi/ladder?market=${market}&estimator=${est}${day ? "&day=" + day : ""}`,
        ).then(response),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [market, est]);
  async function inspect(ticker: string, type: string) {
    setError("");
    setDetail(null);
    try {
      const url =
        type === "trades"
          ? `/kalshi/trades?ticker=${ticker}&limit=30`
          : `/kalshi/markets/${ticker}${type === "orderbook" ? "/orderbook" : ""}`;
      setDetail({ ticker, type, data: await fetch(API + url).then(response) });
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <Shell active="Kalshi explorer">
      <section className="page-heading">
        <div>
          <p className="breadcrumb">Market data / Kalshi</p>
          <h1>Explore the ladder</h1>
          <p className="intro">
            Current quotes, longshots and frozen-rule eligibility.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="actions">
          <label>
            Series
            <select value={market} onChange={(e) => setMarket(e.target.value)}>
              {[
                ["BTC", "BTC · KXBTCD"],
                ["SPX", "S&P 500 · KXINXU"],
                ["GOLD", "Gold · KXGOLDD"],
                ["WTI", "WTI · KXWTI"],
                ["NATGAS", "Natural gas · KXNATGASD"],
                ["NDX", "Nasdaq-100 · KXNASDAQ100U"],
                ["SILVER", "Silver · KXSILVERD"],
              ].map(([k, n]) => (
                <option value={k} key={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expiry date
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <label>
            Estimator
            <select value={est} onChange={(e) => setEst(e.target.value)}>
              <option value="S">S · separate</option>
              <option value="P">P · pooled</option>
            </select>
          </label>
          <button onClick={refresh} disabled={busy}>
            {busy ? "Loading…" : "Refresh ladder"}
          </button>
        </div>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {data && (
        <>
          <section className="panel">
            <div className="section-title">
              <h2>{data.event}</h2>
              <span className="badge">
                {data.history_days} prior observed expiry days
              </span>
            </div>
            <p className="muted">{data.note}</p>
            {!data.items.length ? (
              <p>
                No ladder is listed for this date. Choose another expiry date.
              </p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Contract",
                        "Strike",
                        "Bid",
                        "Ask",
                        "Signal",
                        "Eligibility",
                        "Inspect",
                      ].map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r: any) => (
                      <tr
                        key={r.ticker}
                        style={
                          r.longshot ? { background: "var(--subtle)" } : {}
                        }
                      >
                        <td>
                          {r.ticker}
                          {r.longshot && (
                            <span className="badge">Longshot</span>
                          )}
                        </td>
                        <td>{r.floor}</td>
                        <td>
                          {r.bid == null ? "" : (r.bid * 100).toFixed(1) + "¢"}
                        </td>
                        <td>
                          {r.ask == null ? "" : (r.ask * 100).toFixed(1) + "¢"}
                        </td>
                        <td>{r.side || "No estimate"}</td>
                        <td>{r.reason}</td>
                        <td>
                          <div className="actions">
                            {["market", "orderbook", "trades"].map((s) => (
                              <button
                                key={s}
                                onClick={() => inspect(r.ticker, s)}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {detail && (
            <section className="panel">
              <h2>
                {detail.type}: {detail.ticker}
              </h2>
              <pre>{JSON.stringify(detail.data, null, 2)}</pre>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}
