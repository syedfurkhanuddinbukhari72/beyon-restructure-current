// Simple slugify utility used for building item detail routes
export function slugify(name = "") {
  return name
    .toString()
    .trim()
    .toLowerCase()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Remove any character that's not alphanumeric or hyphen
    .replace(/[^a-z0-9-]/g, "")
    // Collapse multiple hyphens
    .replace(/-{2,}/g, "-")
    // Trim hyphens from ends
    .replace(/^-+|-+$/g, "");
}

export function unslugify(slug = "") {
  // Basic unslugify for display if needed
  return slug
    .toString()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
