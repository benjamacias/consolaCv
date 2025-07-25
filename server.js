import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const app = express();
const PORT = process.env.PORT || 3000;

// Para __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAFE_DIR = path.join(__dirname, "public", "documentos");

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, "public")));

// --------- API: Leer contenido real de archivos para comando cat ---------
app.get("/api/cat", async (req, res) => {
  const { archivo } = req.query;
  if (!archivo) return res.status(400).json({ error: "Falta nombre de archivo" });

  // Bloquea rutas peligrosas y solo permite txt y nombres válidos
  if (archivo.includes("..") || archivo.includes("/") || archivo.includes("\\") || !archivo.endsWith(".txt")) {
    return res.status(400).json({ error: "Archivo no permitido" });
  }

  const ruta = path.join(SAFE_DIR, archivo);
  try {
    const contenido = await fs.readFile(ruta, "utf-8");
    res.json({ contenido });
  } catch {
    res.status(404).json({ error: "Archivo no encontrado" });
  }
});

// --------- API: Respuestas inteligentes (puede leer de un json si querés) ----------
import respuestas from "./respuestas.json" assert { type: "json" };

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

app.post("/api/responder", express.json(), (req, res) => {
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
    respuesta: mejorSimilitud >= 0.32
      ? mejorRespuesta
      : "No entendí eso, ¿podrías repetirlo?"
  });
});

// --------- API: Anotaciones (simple en un JSON local) ---------
const anotacionesPath = path.join(__dirname, "anotaciones.json");

// GET todas las anotaciones
app.get("/api/anotaciones", async (req, res) => {
  try {
    let data = await fs.readFile(anotacionesPath, "utf-8");
    if (!data) data = "[]";
    res.json(JSON.parse(data));
  } catch {
    // Si no existe, devolvé []
    res.json([]);
  }
});

// POST una nueva anotación
app.post("/api/anotaciones", async (req, res) => {
  const { titulo, contenido } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: "Faltan datos" });
  let anotaciones = [];
  try {
    let data = await fs.readFile(anotacionesPath, "utf-8");
    if (data) anotaciones = JSON.parse(data);
  } catch { anotaciones = []; }
  anotaciones.push({ titulo, contenido, fecha: new Date() });
  await fs.writeFile(anotacionesPath, JSON.stringify(anotaciones, null, 2));
  res.json({ ok: true });
});

// --------- HOME: servir tu index.html si la ruta no es API ---------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
