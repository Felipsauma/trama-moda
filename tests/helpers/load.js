// Carrega os scripts da loja (sem interface) num contexto isolado do Node.
// Cada chamada devolve um contexto novo, com localStorage vazio.
//
//   load()                              scripts padrão, localStorage vazio
//   load(arquivos)                      só esses scripts
//   load({ seed })  /  load(arquivos, { seed })
//       seed: { chave: valor } gravado no localStorage ANTES de os scripts rodarem
//       (serve para testar o que roda no carregamento, como catalog.apply()).
//       Texto vai como está (o conteúdo cru do localStorage); qualquer outro valor vai em JSON.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { webcrypto } = require("node:crypto");

const root = path.resolve(__dirname, "..", "..");
const DEFAULT_FILES = ["config.js", "products.js", "js/core.js", "js/domain.js", "js/catalog.js", "js/reports.js"];

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => data.clear(),
  };
}

function load(...args) {
  const files = Array.isArray(args[0]) ? args[0] : DEFAULT_FILES;
  const { seed = {} } = (Array.isArray(args[0]) ? args[1] : args[0]) || {};
  const localStorage = memoryStorage();
  for (const [key, value] of Object.entries(seed)) {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  }
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
