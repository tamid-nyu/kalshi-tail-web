"use client";
import { useEffect, useState } from "react";
import { API, Shell } from "../../components/Lab";
import { response } from "../../components/client";
export default function Docs() {
  const [schema, setSchema] = useState<any>();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => {
    fetch(API + "/api/openapi.json")
      .then(response)
      .then(setSchema)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <Shell active="API docs">
      <section className="page-heading">
        <div>
          <p className="breadcrumb">Developers / REST API</p>
          <h1>One API for the lab</h1>
          <p className="intro">
            Market data, observations, uploads, ingestion and reproducible
            strategy runs.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="actions">
          <a href={API + "/docs"} target="_blank" rel="noreferrer">
            Open interactive Swagger docs
          </a>
          <a href={API + "/api/openapi.json"}>Download OpenAPI JSON</a>
          <a href={API + "/"}>Resource catalog</a>
        </div>
        <h3>Read data</h3>
        <p>
          Reads are public. Both bare paths and /api-prefixed paths work.
          Settlement endpoints expose public market outcomes.
        </p>
        <pre>{`curl '${API}/strategies/kalshi-tail/summary'\ncurl '${API}/kalshi/markets?series_ticker=KXBTCD&limit=10'\ncurl '${API}/strategies/kalshi-tail/observations?market=BTC&limit=10'`}</pre>
        <h3>Create a reproducible backtest</h3>
        <p>
          Write requests require a bearer token. Keep it in a local environment
          variable or server secret. Browser write actions use the lab’s
          signed-in server proxy.
        </p>
        <pre>{`curl -X POST '${API}/strategies/kalshi-tail/runs' \\\n  -H "Authorization: Bearer $LAB_API_TOKEN" \\\n  -H 'Content-Type: application/json' \\\n  -d '{"markets":["BTC"],"cap":0.03,"k":1,"C":0.03,"slip":0.02,"q_max":50,"estimator":"S","end":"2026-11-11","variant":"base"}'`}</pre>
        <p className="muted">
          The committed baseline returns 402 trades and +$52.61. Start dates
          filter reporting while earlier data remains available for training.
          Each saved run records its ordered input hash and source commit.
        </p>
        <h3>Upload and activate observations</h3>
        <pre>{`curl -X POST '${API}/uploads' \\\n  -H "Authorization: Bearer $LAB_API_TOKEN" \\\n  -F 'file=@observations.csv' -F 'kind=observations' \\\n  -F 'mapping={"symbol":"ticker"}'`}</pre>
        <p>
          Saved uploads are separate inputs until explicitly activated as shared
          history. Activate with POST /uploads/{"{id}"}/activate, or remove from
          shared history with POST /uploads/{"{id}"}/deactivate. Deletion
          removes the version. Dataset reads are public through this research
          API.
        </p>
        <h3>Ingestion and forward coverage</h3>
        <p>
          The daily job pulls yesterday’s settled ladders at 23:00 UTC. Trigger
          a day with POST /ingest/trigger and inspect /ingest/logs. Ingestion
          and shared-history changes recompute the forward snapshot. Historical
          non-BTC observation inputs were not included in the source repository;
          use the market availability endpoint to check each history gate.
        </p>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>Endpoint reference</h2>
          <input
            aria-label="Filter endpoints"
            placeholder="Filter endpoints"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        {!schema && !error ? (
          <p>Loading the live API contract…</p>
        ) : (
          schema &&
          Object.entries(schema.paths)
            .filter(([path]) => path.includes(filter))
            .map(([path, operations]: any) => (
              <div className="endpoint" key={path}>
                {Object.entries(operations).map(([method, operation]: any) => (
                  <details key={method}>
                    <summary>
                      <span className={"method " + method}>
                        {method.toUpperCase()}
                      </span>
                      <code>{path}</code>
                      <span className="muted">{operation.summary}</span>
                    </summary>
                    <p>{operation.description || operation.summary}</p>
                    {operation.security && (
                      <p className="badge">Bearer token required</p>
                    )}
                    {operation.parameters?.length > 0 && (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Parameter</th>
                              <th>Location</th>
                              <th>Required</th>
                              <th>Schema</th>
                            </tr>
                          </thead>
                          <tbody>
                            {operation.parameters.map((p: any) => (
                              <tr key={p.name}>
                                <td>{p.name}</td>
                                <td>{p.in}</td>
                                <td>{p.required ? "yes" : "no"}</td>
                                <td>
                                  <code>{JSON.stringify(p.schema)}</code>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {operation.requestBody && (
                      <pre>
                        {JSON.stringify(operation.requestBody, null, 2)}
                      </pre>
                    )}
                    <p className="muted">
                      Responses: {Object.keys(operation.responses).join(", ")}
                    </p>
                  </details>
                ))}
              </div>
            ))
        )}
      </section>
    </Shell>
  );
}
