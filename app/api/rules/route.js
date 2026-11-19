import { calcular } from "../../../lib/apriori.mjs";
import { hayNeo4j, leerReglas } from "../../../lib/neo4j.mjs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const sup = Number(q.get("sup") ?? 0.15), conf = Number(q.get("conf") ?? 0.5), lift = Number(q.get("lift") ?? 1);
  try {
    if (hayNeo4j()) {
      const reglas = await leerReglas(sup, conf, lift);
      return Response.json({ fuente: "Neo4j", reglas });
    }
  } catch (e) {
    console.error("Neo4j fallo, usando calculo local:", e.message);
  }
  const { reglas, total } = calcular(sup, conf);
  return Response.json({ fuente: "Calculo local (sin Neo4j)", total, reglas: reglas.filter((r) => r.lift >= lift) });
}
