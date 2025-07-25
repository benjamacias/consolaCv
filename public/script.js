document.addEventListener("DOMContentLoaded", () => {
  // ---------------- TERMINAL LOGIC ----------------
  const output = document.getElementById('terminal-output');
  const input = document.getElementById('terminal-input');
  const prompt = document.getElementById('prompt');
  const audio = new Audio("audio_ebce1a60c1.mp3"); // Usar archivo local, ponerlo en /public/

  const currentUser = "user";
  const hostname = "webhost";
  let currentPath = "~/home";
  const benjaUser = "benja@benja1";
  let history = [];
  let historyIndex = -1;
  const comandosDisponibles = ["help", "clear", "cd", "ls", "cat", "exit", "msg", "info", "ia", "python", "benja", "cv"];

  const archivos = {
    "~/home": ["documentos", "cv.pdf"],
    "~/home/documentos": ["proyectos.txt", "skills.txt"]
  };

  function updatePrompt() {
    prompt.textContent = `${currentUser}@${hostname}:${currentPath}$`;
  }

  function appendLine(text, className = "") {
    const p = document.createElement("p");
    if (className) p.className = className;
    p.textContent = text;
    output.appendChild(p);
    scrollToBottom();
  }

  function appendPre(text, className = "") {
    const pre = document.createElement("pre");
    if (className) pre.className = className;
    pre.textContent = text;
    output.appendChild(pre);
    scrollToBottom();
  }

  function scrollToBottom() {
    const container = document.getElementById("terminal-container");
    container.scrollTop = container.scrollHeight;
  }

  async function typeLine(text, className = "", delay = 25) {
    const p = document.createElement("p");
    if (className) p.className = className;
    output.appendChild(p);

    for (let i = 0; i < text.length; i++) {
      p.textContent += text[i];
      if (text[i] !== " ") {
        try { audio.play(); } catch {}
      }
      await new Promise(r => setTimeout(r, delay));
    }
    scrollToBottom();
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(" ")[0].slice(0, 5);
  }

  async function showLoginMessage() {
    const time = getCurrentTime();
    await typeLine(`Message from ${benjaUser} on pts/9 at ${time}`, "text-purple-400", 0);
    await new Promise(r => setTimeout(r, 400));
    await typeLine("Bienvenido/a a mi consola, para más información puedes escribir help", "text-purple-400", 40);
    updatePrompt();
  }

  function getAutocomplete(inputValue) {
    const tokens = inputValue.trim().split(" ");
    if (tokens.length === 1) {
      const match = comandosDisponibles.find(cmd => cmd.startsWith(tokens[0]));
      if (match) tokens[0] = match;
    } else if (tokens[0] === "cd" || tokens[0] === "cat") {
      const pathList = archivos[currentPath] || [];
      const partial = tokens[1] || "";
      const match = pathList.find(item => item.startsWith(partial));
      if (match) tokens[1] = match;
    }
    return tokens.join(" ");
  }

  function getSimilarCommand(cmd) {
    let bestMatch = "";
    let bestScore = 0;
    for (const c of comandosDisponibles) {
      const dist = levenshtein(cmd, c);
      const score = 1 - dist / Math.max(c.length, cmd.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }
    return bestScore > 0.6 ? bestMatch : null;
  }

  function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  async function simulatedBenjaResponse(input) {
    const response = await fetch("/api/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input })
    });

    const data = await response.json();
    return data.respuesta;
  }

  async function handleCommand(cmd) {
    const args = cmd.trim().split(" ");
    const command = args[0];

    if (!command) return;

    if (command === "help") {
      appendLine("Comandos disponibles: help, clear, cd, ls, cat, exit, msg benja <mensaje>, cv");
    } else if (command === "clear") {
      output.innerHTML = "";
    } else if (command === "exit") {
      appendLine("Sesión finalizada. Cierra la pestaña para salir.");
    } else if (command === "cd") {
      const destino = args[1];
      if (!destino || destino === "~") {
        currentPath = "~/home";
      } else if (destino === "..") {
        if (currentPath === "~/home") {
          appendLine("Permiso denegado para salir de home.");
          return;
        } else {
          const parts = currentPath.split("/");
          parts.pop();
          currentPath = parts.join("/");
        }
      } else {
        const newPath = `${currentPath}/${destino}`;
        if (archivos[newPath]) {
          currentPath = newPath;
        } else {
          appendLine(`Directorio no encontrado: ${destino}`);
        }
      }
      updatePrompt();
    } else if (command === "ls") {
      const lista = archivos[currentPath] || [];
      appendLine(lista.join("  ") || "(vacío)");
    } else if (command === "cat") {
      const archivo = args[1];
      const pathActual = archivos[currentPath];
      if (pathActual && pathActual.includes(archivo)) {
        try {
          const res = await fetch(`/api/cat?archivo=${encodeURIComponent(archivo)}`);
          if (res.ok) {
            const data = await res.json();
            appendLine(`Contenido de ${archivo}:`);
            appendPre(data.contenido, "bg-gray-900 text-green-200 rounded px-2 py-1 my-1 overflow-x-auto");
          } else {
            appendLine("No se pudo leer el archivo.");
          }
        } catch {
          appendLine("No se pudo leer el archivo.");
        }
      } else {
        appendLine("Archivo no encontrado.");
      }
    } else if (command === "msg" && args[1] === "benja") {
      const msg = args.slice(2).join(" ");
      appendLine(`${currentUser}@${hostname}:${currentPath}$ msg benja ${msg}`, "text-green-400");
      setTimeout(async () => {
        const respuesta = await simulatedBenjaResponse(msg);
        appendLine(`${benjaUser}: ${respuesta}`, "text-purple-400");
      }, 800);
    } else if (command === "cv") {
      appendLine("Descargando archivo 'cv.pdf'...");
      const a = document.createElement("a");
      a.href = "CurriculumMacias-2024.pdf";
      a.download = "CurriculumMacias-2024.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const sugerencia = getSimilarCommand(command);
      if (sugerencia) {
        appendLine(`¿Quizás quisiste decir: ${sugerencia}?`);
      } else {
        appendLine(`Comando no reconocido: ${cmd}`);
      }
    }
  }

  document.getElementById("terminal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const command = input.value.trim();
    history.push(command);
    historyIndex = history.length;
    handleCommand(command);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      if (historyIndex > 0) {
        historyIndex--;
        input.value = history[historyIndex];
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        input.value = history[historyIndex];
      } else {
        input.value = "";
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      input.value = getAutocomplete(input.value);
    }
  });

  showLoginMessage();

  // ---------------- ANOTACIONES LOGIC ----------------

  // Cargar y mostrar anotaciones
  async function cargarAnotaciones() {
    const res = await fetch("/api/anotaciones");
    const anotaciones = await res.json();
    const lista = document.getElementById("anotaciones-list");
    lista.innerHTML = "";
    anotaciones.slice().reverse().forEach(a => {
      const div = document.createElement("div");
      div.className = "bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 hover:border-green-400 transition";
      div.innerHTML = `<div class="font-bold text-green-400 text-lg mb-1">${a.titulo}</div>
                       <div class="text-gray-200 mb-1">${a.contenido}</div>
                       <div class="text-xs text-gray-400 text-right">${new Date(a.fecha).toLocaleString()}</div>`;
      lista.appendChild(div);
    });
  }

  // Guardar anotación nueva
  document.getElementById("anotacion-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = document.getElementById("titulo").value;
    const contenido = document.getElementById("contenido").value;
    const res = await fetch("/api/anotaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, contenido })
    });
    if (res.ok) {
      document.getElementById("anotacion-form").reset();
      cargarAnotaciones();
    } else {
      alert("No se pudo guardar la anotación");
    }
  });

  cargarAnotaciones(); // Cargar al inicio
});
