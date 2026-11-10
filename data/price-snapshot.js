(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PRICE_SNAPSHOT = api;
})(globalThis, function () {
  const format = "shawarma-bakr-prices";

  function normalize(value) {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const ascii = String(value).trim()
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
      .replace(/[٫,]/g, ".");
    if (!/^\d{1,4}(\.\d{1,2})?$/.test(ascii)) return null;
    return String(Number(ascii));
  }

  function create(prices) {
    return { format, version: 1, savedAt: new Date().toISOString(), prices };
  }

  function validate(snapshot, items) {
    const prices = snapshot?.prices;
    if (snapshot?.format !== format || snapshot.version !== 1 ||
        !Number.isFinite(Date.parse(snapshot.savedAt)) ||
        !prices || typeof prices !== "object" || Array.isArray(prices)) {
      throw new Error("Invalid price snapshot");
    }

    const knownPrices = Object.create(null);
    for (const item of items) {
      if (!Object.hasOwn(prices, item.id)) continue;
      const price = normalize(prices[item.id]);
      if (price === null) throw new Error(`Invalid price: ${item.id}`);
      knownPrices[item.id] = price;
    }
    if (Object.keys(knownPrices).length === 0) throw new Error("No matching menu prices");
    return { format, version: 1, savedAt: new Date(snapshot.savedAt).toISOString(), prices: knownPrices };
  }

  return { normalize, create, validate };
});
