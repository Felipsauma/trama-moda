// Carrega os scripts da loja (sem interface) num contexto isolado do Node.
// Cada chamada devolve um contexto novo, com localStorage vazio.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { webcrypto } = require("node:crypto");

const root = path.resolve(__dirname, "..", "..");
const DEFAULT_FILES = ["config.js", "products.js", "js/core.js", "js/domain.js", "js/catalog.js"];

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => data.clear(),
  };
}

function load(files = DEFAULT_FILES) {
  const localStorage = memoryStorage();
  const sandbox = {
    localStorage,
    crypto: webcrypto,
    TextEncoder,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    console,
    fetch: () => Promise.reject(new TypeError("sem internet")),
  };
  const ctx = vm.createContext(sandbox);
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  }
  // Objetos e listas do contexto têm outros protótipos: copia por JSON para o deepEqual funcionar.
  // Promises e datas passam direto.
  const get = (expr) => {
    const r = vm.runInContext(expr, ctx);
    if (r === null || typeof r !== "object" || typeof r.then === "function" || r instanceof Date) return r;
    return JSON.parse(JSON.stringify(r));
  };
  return { get, localStorage };
}

module.exports = { load };
