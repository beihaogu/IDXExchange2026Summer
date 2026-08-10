export function formatPrice(price) {
  if (!price) return "Price unavailable";
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
