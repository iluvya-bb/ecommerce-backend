export const isNumeric = (value) => {
  return /^-?\d+$/.test(value);
};

export const titleToSlug = (title) => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${baseSlug}-${Date.now()}`;
};