import { calcular } from "../lib/apriori.mjs";
import { cargarGrafo, getDriver } from "../lib/neo4j.mjs";
// Se cargan reglas con umbrales bajos; la app filtra despues desde Neo4j.
const { transacciones, reglas } = calcular(0.1, 0.3);
await cargarGrafo(transacciones, reglas);
console.log(`Cargadas ${transacciones.length} transacciones y ${reglas.length} reglas en Neo4j`);
await getDriver().close();
