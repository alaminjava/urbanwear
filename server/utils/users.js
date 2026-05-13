function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    id: raw._id?.toString?.() || raw.id,
    _id: raw._id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    photoUrl: raw.photoUrl || "",
    wishlist: raw.wishlist || [],
    addresses: raw.addresses || [],
    createdAt: raw.createdAt,
  };
}

module.exports = {
  normalizeEmail,
  publicUser,
};
