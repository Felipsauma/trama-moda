const sortSizes = (list) => {
  const order = ["PP", "P", "M", "G", "GG"];
  return [...list].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return (Number(a) - Number(b)) || a.localeCompare(b);
  });
};

function searchProducts(q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return PRODUCTS;
  return PRODUCTS.filter((p) => {
    const text = norm(`${p.name} ${p.desc} ${CATEGORIES[p.cat]}`);
    return terms.every((t) => text.includes(t));
  });
}
