import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

// Resolver __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from "fs/promises";
const respuestasPath = new URL("./respuestas.json", import.meta.url);

let respuestas = [];


// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

try {
  const data = await fs.readFile(respuestasPath, "utf-8");
  respuestas = JSON.parse(data);
} catch (err) {
  console.error("Error al leer respuestas.json:", err);
}

// Función de similitud
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
    }
  }
  return matrix[b.length][a.length];
}

// Endpoint con lógica de respuesta
app.post("/api/responder", (req, res) => {
  const input = (req.body.input || "").toLowerCase().replace(/[^\w\s]/gi, "").trim();
  let mejorRespuesta = null;
  let mejorSimilitud = 0;

  for (const item of respuestas) {
    const distancia = levenshtein(input, item.clave);
    const similitud = 1 - distancia / Math.max(input.length, item.clave.length);
    if (similitud > mejorSimilitud) {
      mejorSimilitud = similitud;
      mejorRespuesta = item.respuesta;
    }
  }

  res.json({
    respuesta:
      mejorSimilitud >= 0.32
        ? mejorRespuesta
        : "No entendí eso, ¿podrías repetirlo?"
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
