const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    type: {
      type: String,
      enum: ["restock", "sale", "adjustment", "return", "cancel_restock"],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "", trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);
