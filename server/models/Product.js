const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true, uppercase: true },
    color: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    brand: { type: String, default: "UrbanWear", trim: true },
    description: { type: String, required: true, trim: true },
    highlights: [{ type: String, trim: true }],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    variants: [variantSchema],
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    images: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true, lowercase: true }],
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

productSchema.pre("validate", function syncVariantStock(next) {
  if (Array.isArray(this.variants) && this.variants.length) {
    this.stock = this.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  }
  next();
});

productSchema.index({ name: "text", category: "text", description: "text", tags: "text", brand: "text" });
productSchema.index({ category: 1, stock: 1 });
productSchema.index({ "variants.size": 1, "variants.color": 1 });

productSchema.virtual("availableSizes").get(function availableSizes() {
  return [...new Set((this.variants || []).filter((variant) => Number(variant.stock || 0) > 0).map((variant) => variant.size).filter(Boolean))];
});

productSchema.virtual("availableColors").get(function availableColors() {
  return [...new Set((this.variants || []).filter((variant) => Number(variant.stock || 0) > 0).map((variant) => variant.color).filter(Boolean))];
});

productSchema.virtual("isLowStock").get(function isLowStock() {
  return Number(this.stock || 0) <= Number(this.lowStockThreshold || 0);
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
