#!/usr/bin/env node
// Ferramenta de desenvolvimento: abre a loja no Chrome headless, tira um print e
// acusa erros de JavaScript. Sem dependências (usa o protocolo DevTools direto).
//
// Uso:
//   node tools/shot.mjs --out inicio.png
//   node tools/shot.mjs --route "catalogo?cat=feminino" --out catalogo.png
//   node tools/shot.mjs --route carrinho --width 390 --seed "cart.add(1,'M',1)" --out sacola.png
//
// Opções:
//   --route  rota      rota a abrir, sem "#/" (padrão: página inicial)
//   --width  N         largura da janela (padrão 1440; abaixo de 700 emula celular)
//   --height N         altura da janela (padrão 900)
//   --full             captura a página inteira, não só a janela
//   --seed   "js"      roda antes de renderizar (ex.: encher a sacola); a página recarrega depois
//   --after  "js"      roda depois de renderizar (ex.: "openDrawer()")
//   --print  "js"      avalia a expressão e imprime o resultado
//   --wait   ms        espera antes do print (padrão 900)
//   --out    arquivo   onde salvar o PNG (sem --out, só checa erros)
// Sai com código 1 se a página lançar exceções ou escrever console.error.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Aceita "catalogo?cat=feminino" ou "#/catalogo"; sem a barra inicial o Git Bash não converte em caminho do Windows
const route = "#/" + opt("route", "").replace(/^#?\/?/, "");
const width = Number(opt("width", 1440));
const height = Number(opt("height", 900));
const wait = Number(opt("wait", 900));
const out = opt("out");
const url = pathToFileURL(join(root, "index.html")).href + route;

const candidates = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chromePath = candidates.find((p) => existsSync(p));
if (!chromePath) {
  console.error("Chrome não encontrado. Defina a variável CHROME com o caminho do executável.");
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), "trama-shot-"));
const chrome = spawn(chromePath, [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];

function cleanup() {
  chrome.kill();
  // O Chrome demora um instante para soltar os arquivos do perfil no Windows
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* perfil temporário */ } }, 300);
}

const port = await new Promise((ok, fail) => {
  let buf = "";
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
    if (m) ok(m[1]);
  });
  chrome.on("exit", () => fail(new Error("O Chrome fechou antes de abrir a porta de depuração.")));
  setTimeout(() => fail(new Error("Tempo esgotado esperando o Chrome.")), 20000);
});

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener("open", ok, { once: true }));

let seq = 0;
const pending = new Map();
const waiters = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); return; }
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    problems.push(`exceção: ${d.exception?.description || d.text}`);
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    problems.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  }
  waiters.get(msg.method)?.(msg.params);
});
const send = (method, params = {}) => new Promise((ok, fail) => {
  const id = ++seq;
  pending.set(id, (msg) => (msg.error ? fail(new Error(`${method}: ${msg.error.message}`)) : ok(msg.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const once = (method) => new Promise((ok) => waiters.set(method, (p) => { waiters.delete(method); ok(p); }));
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

let code = 0;
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  if (width < 700) await send("Emulation.setTouchEmulationEnabled", { enabled: true });

  let loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;

  if (opt("seed")) {
    await sleep(300);
    await evaluate(opt("seed"));
    loaded = once("Page.loadEventFired");
    await send("Page.reload");
    await loaded;
  }
  await sleep(wait);
  if (opt("after")) { await evaluate(opt("after")); await sleep(500); }
  if (opt("print")) console.log(JSON.stringify(await evaluate(opt("print")), null, 2));

  if (out) {
    const params = { format: "png" };
    if (flag("full")) {
      const { cssContentSize: s } = await send("Page.getLayoutMetrics");
      params.captureBeyondViewport = true;
      params.clip = { x: 0, y: 0, width: s.width, height: s.height, scale: 1 };
    }
    const { data } = await send("Page.captureScreenshot", params);
    writeFileSync(resolve(out), Buffer.from(data, "base64"));
    console.log(`print salvo em ${resolve(out)}`);
  }
} catch (err) {
  problems.push(`ferramenta: ${err.message}`);
}

if (problems.length) {
  console.error(`${problems.length} problema(s) na página:\n- ${problems.join("\n- ")}`);
  code = 1;
} else {
  console.log("sem erros de JavaScript");
}
ws.close();
cleanup();
setTimeout(() => process.exit(code), 400);
