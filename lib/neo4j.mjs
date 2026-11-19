import neo4j from "neo4j-driver";
let driver;
export const hayNeo4j = () => !!process.env.NEO4J_URI;
export function getDriver() {
  if (!driver) driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
  return driver;
}
export const dbName = () => process.env.NEO4J_DATABASE || "neo4j";

// Modelo: (Transaccion)-[:CONTIENE]->(Producto) ; (Producto)-[:ANTECEDENTE]->(Regla)-[:CONSECUENTE]->(Producto)
export async function cargarGrafo(tx, reglas) {
  const s = getDriver().session({ database: dbName() });
  try {
    await s.run("MATCH (n) WHERE n:Producto OR n:Transaccion OR n:Regla DETACH DELETE n");
    await s.run("CREATE CONSTRAINT producto_nombre IF NOT EXISTS FOR (p:Producto) REQUIRE p.nombre IS UNIQUE");
    await s.run(
      `UNWIND $tx AS t
       MERGE (x:Transaccion {id: t.id})
       WITH x, t UNWIND t.items AS i
       MERGE (p:Producto {nombre: i})
       MERGE (x)-[:CONTIENE]->(p)`, { tx });
    await s.run(
      `UNWIND $reglas AS r
       CREATE (g:Regla {id: r.id, lhs: r.lhs, rhs: r.rhs, soporte: r.soporte, confianza: r.confianza, lift: r.lift})
       WITH g, r
       CALL { WITH g, r UNWIND r.lhs AS a MATCH (p:Producto {nombre: a}) MERGE (p)-[:ANTECEDENTE]->(g) }
       CALL { WITH g, r UNWIND r.rhs AS c MATCH (p:Producto {nombre: c}) MERGE (g)-[:CONSECUENTE]->(p) }`,
      { reglas: reglas.map((r, i) => ({ ...r, id: i + 1 })) });
  } finally { await s.close(); }
}

export async function leerReglas(sup, conf, lift) {
  const s = getDriver().session({ database: dbName(), defaultAccessMode: neo4j.session.READ });
  try {
    const r = await s.run(
      `MATCH (g:Regla) WHERE g.soporte >= $sup AND g.confianza >= $conf AND g.lift >= $lift
       RETURN g.lhs AS lhs, g.rhs AS rhs, g.soporte AS soporte, g.confianza AS confianza, g.lift AS lift
       ORDER BY g.lift DESC, g.confianza DESC`, { sup, conf, lift });
    return r.records.map((x) => x.toObject());
  } finally { await s.close(); }
}
