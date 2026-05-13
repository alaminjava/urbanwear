const mongoose = require("mongoose");
const ALLOWED_ROLES = require("../config/roles");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home", trim: true },
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    line1: { type: String, default: "", trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    area: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    country: { type: String, default: "Bangladesh", trim: true },
  },
  { timestamps: true },
);

const wishlistItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ALLOWED_ROLES, default: "customer" },
    photoUrl: { type: String, default: "", trim: true },
    wishlist: [wishlistItemSchema],
    addresses: [addressSchema],
    salt: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
