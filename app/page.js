"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const pct = (x) => (x * 100).toFixed(0) + "%";
const card = { background: "#1e293b", borderRadius: 12, padding: 16 };

export default function Home() {
  const [sup, setSup] = useState(0.15);
  const [conf, setConf] = useState(0.5);
  const [lift, setLift] = useState(1);
  const [data, setData] = useState({ reglas: [], fuente: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/rules?sup=${sup}&conf=${conf}&lift=${lift}`)
      .then((r) => r.json()).then(setData).catch((e) => setError(String(e)));
  }, [sup, conf, lift]);

  const graph = useMemo(() => {
    const nodes = new Map(), links = [];
    data.reglas.forEach((r, i) => {
      const id = "R" + i;
      nodes.set(id, { id, tipo: "regla", label: `lift ${r.lift.toFixed(2)}`, val: 3 + r.lift * 2 });
      [...r.lhs, ...r.rhs].forEach((p) => nodes.has(p) || nodes.set(p, { id: p, tipo: "producto", label: p, val: 8 }));
      r.lhs.forEach((p) => links.push({ source: p, target: id }));
      r.rhs.forEach((p) => links.push({ source: id, target: p }));
    });
    return { nodes: [...nodes.values()], links };
  }, [data]);

  const top = data.reglas.slice(0, 3);
  const acciones = top.map((r, i) => {
    const a = r.lhs.join(" + "), b = r.rhs.join(" + ");
    const t = [
      `Ubicar ${b} junto a ${a} en la misma góndola o pasillo: quien compra ${a} también lleva ${b} el ${pct(r.confianza)} de las veces (lift ${r.lift.toFixed(2)}).`,
      `Crear un combo/promoción ${a} + ${b} y recomendarlo en caja o en la app: ${pct(r.soporte)} de todas las compras ya incluyen ambos.`,
      `Planear inventario y descuentos cruzados: al promocionar ${a}, asegurar stock de ${b} para no perder la venta asociada.`,
    ];
    return t[i];
  });

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24, display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0 }}>Reglas de asociación del supermercado</h1>
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>Algoritmo Apriori · reglas duplicadas y redundantes eliminadas · fuente: <b>{data.fuente || "..."}</b></p>
        <p style={{ margin: "8px 0 0" }}><b>Iván Velandia</b> · Maestría en Analítica de Datos · Universidad Central · Materia: Marketing Digital</p>
      </header>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Introducción</h2>
        <p>Los supermercados registran qué productos se compran juntos en cada venta. Analizar esas canastas permite decidir cómo ubicar los productos, qué combos ofrecer y qué recomendar al cliente, que es la base de los sistemas de recomendación del marketing digital.</p>
        <p>Este trabajo analiza 12 transacciones y 10 productos (archivo <i>DatosCompras.csv</i>) con el algoritmo Apriori, guarda el resultado en una base de grafos Neo4j y lo muestra como un grafo interactivo.</p>
        <h3>Conceptos clave</h3>
        <ul>
          <li><b>Soporte:</b> proporción de compras que contienen los productos de la regla.</li>
          <li><b>Confianza:</b> de las compras que incluyen el antecedente, proporción que también incluye el consecuente.</li>
          <li><b>Lift:</b> cuánto más probable es la compra conjunta que si fueran independientes. Mayor que 1 indica asociación real.</li>
          <li><b>Reglas redundantes:</b> se elimina una regla si otra más simple tiene igual o mayor confianza para el mismo consecuente.</li>
          <li><b>Grafo:</b> los productos y las reglas son nodos; las flechas van del antecedente a la regla y de la regla al consecuente.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Hallazgos</h2>
        <ul>
          <li><b>Pan, Leche y Mantequilla</b> aparecen en 9 de las 12 compras (75 % cada uno). Son los productos ancla de la tienda y forman el núcleo del grafo.</li>
          <li><b>Salchichas → Catsup</b> tiene lift 4,0: la asociación más fuerte, aunque en pocas compras. Toda compra de salchichas incluyó catsup.</li>
          <li><b>Leche + Mantequilla → Pan</b> ocurre en el 50 % de las compras con 100 % de confianza. Es la regla más frecuente.</li>
          <li><b>Huevos</b> siempre se compran con Pan y Mantequilla, pero es un producto de baja rotación (2 compras).</li>
          {data.reglas[0] && <li>Con los umbrales actuales hay <b>{data.reglas.length} reglas</b>; la de mayor lift es <b>{data.reglas[0].lhs.join(" + ")} → {data.reglas[0].rhs.join(" + ")}</b> (lift {data.reglas[0].lift.toFixed(2)}).</li>}
          <li><b>Limitación:</b> con solo 12 transacciones las reglas son indicativas. Con más datos habría que validar su estabilidad.</li>
        </ul>
      </section>

      <section style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        {[["Soporte mínimo", sup, setSup, 0.05, 0.6, 0.05], ["Confianza mínima", conf, setConf, 0.1, 1, 0.05], ["Lift mínimo", lift, setLift, 0.5, 3, 0.1]].map(([n, v, f, mi, ma, st]) => (
          <label key={n}>{n}: <b>{Number(v).toFixed(2)}</b>
            <input type="range" min={mi} max={ma} step={st} value={v} onChange={(e) => f(Number(e.target.value))} style={{ width: "100%" }} />
          </label>))}
      </section>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        <ForceGraph2D graphData={graph} height={460} backgroundColor="#1e293b" linkDirectionalArrowLength={6} linkDirectionalArrowRelPos={1} linkColor={() => "#64748b"}
          nodeRelSize={4} nodeVal="val" nodeLabel="label"
          nodeCanvasObject={(n, ctx, k) => {
            const r = Math.sqrt(n.val) * 2.2;
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = n.tipo === "producto" ? "#38bdf8" : "#f59e0b"; ctx.fill();
            if (n.tipo === "producto") { ctx.font = `${12 / k}px sans-serif`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(n.label, n.x, n.y + r + 10 / k); }
          }} />
        <p style={{ margin: 0, padding: "8px 16px", fontSize: 12, color: "#94a3b8" }}>Azul = producto · Naranja = regla (tamaño según lift) · flecha: antecedente → regla → consecuente</p>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Tres acciones como gerente</h2>
        {acciones.length ? <ol>{acciones.map((a, i) => <li key={i} style={{ marginBottom: 8 }}>{a}</li>)}</ol> : <p>Baja los umbrales para obtener reglas.</p>}
      </section>

      <section style={{ ...card, overflowX: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Reglas ({data.reglas.length})</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", color: "#94a3b8" }}><th>Si compra</th><th>Entonces compra</th><th>Soporte</th><th>Confianza</th><th>Lift</th></tr></thead>
          <tbody>{data.reglas.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid #334155" }}>
              <td>{r.lhs.join(", ")}</td><td>{r.rhs.join(", ")}</td><td>{pct(r.soporte)}</td><td>{pct(r.confianza)}</td><td>{r.lift.toFixed(2)}</td>
            </tr>))}</tbody>
        </table>
      </section>
    </main>
  );
}
