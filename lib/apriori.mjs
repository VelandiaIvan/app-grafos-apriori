import fs from "node:fs";
import path from "node:path";

export function cargarTransacciones() {
  const txt = fs.readFileSync(path.join(process.cwd(), "data", "DatosCompras.csv"), "utf8");
  const m = new Map();
  for (const l of txt.split(/\r?\n/).slice(1)) {
    const [t, p] = l.split(",").map((s) => s?.trim());
    if (!t || !p) continue;
    if (!m.has(t)) m.set(t, new Set());
    m.get(t).add(p);
  }
  return [...m.entries()].map(([id, s]) => ({ id, items: [...s].sort() }));
}

const key = (a) => a.join("|");
const subset = (a, b) => a.every((x) => b.includes(x));

export function apriori(tx, minSup, minConf) {
  const n = tx.length;
  const sup = new Map(); // key -> {items, count}
  const count = (c) => tx.filter((t) => subset(c, t.items)).length;
  let nivel = [...new Set(tx.flatMap((t) => t.items))].sort().map((i) => [i]);
  while (nivel.length) {
    const ok = [];
    for (const c of nivel) {
      const k = count(c);
      if (k / n >= minSup) { sup.set(key(c), { items: c, count: k }); ok.push(c); }
    }
    const next = new Map();
    for (let i = 0; i < ok.length; i++)
      for (let j = i + 1; j < ok.length; j++) {
        const u = [...new Set([...ok[i], ...ok[j]])].sort();
        if (u.length === ok[0].length + 1) next.set(key(u), u);
      }
    nivel = [...next.values()];
  }
  const reglas = [];
  for (const { items, count: c } of sup.values()) {
    if (items.length < 2) continue;
    const N = items.length;
    for (let mask = 1; mask < (1 << N) - 1; mask++) {
      const lhs = items.filter((_, i) => mask & (1 << i));
      const rhs = items.filter((_, i) => !(mask & (1 << i)));
      const cl = sup.get(key(lhs)).count, cr = sup.get(key(rhs)).count;
      const conf = c / cl;
      if (conf < minConf) continue;
      reglas.push({ lhs, rhs, soporte: c / n, confianza: conf, lift: conf / (cr / n), conteo: c });
    }
  }
  return reglas;
}

// Quita duplicadas y redundantes (criterio de arules::is.redundant):
// A=>C es redundante si existe B=>C con B subconjunto propio de A y confianza(B=>C) >= confianza(A=>C).
export function limpiar(reglas) {
  const vistas = new Set();
  const unicas = reglas.filter((r) => {
    const k = key(r.lhs) + "=>" + key(r.rhs);
    if (vistas.has(k)) return false;
    vistas.add(k); return true;
  });
  return unicas.filter(
    (r) => !unicas.some((o) => o !== r && key(o.rhs) === key(r.rhs) && o.lhs.length < r.lhs.length && subset(o.lhs, r.lhs) && o.confianza >= r.confianza)
  );
}

export function calcular(minSup = 0.15, minConf = 0.5) {
  const tx = cargarTransacciones();
  const crudas = apriori(tx, minSup, minConf);
  const reglas = limpiar(crudas).sort((a, b) => b.lift - a.lift || b.confianza - a.confianza);
  return { transacciones: tx, total: crudas.length, reglas };
}
