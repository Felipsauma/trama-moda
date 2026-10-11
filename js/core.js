// ===== Armazenamento (localStorage) =====
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
  },
};

const KEYS = {
  users: "trama_users", session: "trama_session", cart: "trama_cart", orders: "trama_orders",
  stock: "trama_stock", favs: "trama_favs", recent: "trama_recent", reviews: "trama_reviews",
  ship: "trama_ship", coupon: "trama_coupon",
  catalog: "trama_catalog", searches: "trama_searches", measures: "trama_measures", waitlist: "trama_waitlist", gift: "trama_gift", theme: "trama_theme",
};

// ===== Barramento de eventos (o domínio avisa, a interface escuta) =====
const bus = {
  _fns: [],
  on(fn) { this._fns.push(fn); },
  emit(topic) { this._fns.slice().forEach((fn) => fn(topic)); },
};

// ===== Utilitários =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => stripAccents(String(s).toLowerCase());
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtDate = (ts) => new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const fmtDay = (d) => new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });

async function hashPassword(pass) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("trama:" + pass));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback simples para contextos sem crypto.subtle
  let h = 0;
  for (const c of "trama:" + pass) h = (h * 31 + c.charCodeAt(0)) | 0;
  return "f" + h;
}

// ===== Máscaras e validações =====
const maskCep = (v) => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
const maskCard = (v) => onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const maskExp = (v) => onlyDigits(v).slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
const maskCpf = (v) => onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
function maskInput(input, fn) { input?.addEventListener("input", () => (input.value = fn(input.value))); }

function luhn(num) {
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function cardBrand(num) {
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(num)) return "Elo";
  if (/^4/.test(num)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  return "Cartão";
}

function validCpf(cpf) {
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(cpf[len])) return false;
  }
  return true;
}

