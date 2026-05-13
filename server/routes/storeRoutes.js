const express = require("express");
const {
  createOrder,
  createProduct,
  deleteCollection,
  deleteProduct,
  getAdminDashboard,
  getInventory,
  getProduct,
  getSiteSettings,
  listAdminOrders,
  listAdminProducts,
  listCollections,
  listProducts,
  myOrders,
  saveCollection,
  trackOrder,
  updateOrderStatus,
  updateProduct,
  updateSiteSettings,
  updateStock,
} = require("../controllers/storeController");
const { optionalAuth, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/settings", getSiteSettings);
router.put("/admin/settings", protect, updateSiteSettings);
router.get("/products", listProducts);
router.get("/products/:slug", getProduct);
router.post("/orders", protect, createOrder);
router.get("/orders/track/:trackingNumber", trackOrder);
router.get("/orders/my", protect, myOrders);
router.get("/collections", optionalAuth, listCollections);

router.get("/admin/dashboard", protect, getAdminDashboard);
router.get("/admin/products", protect, listAdminProducts);
router.post("/admin/products", protect, createProduct);
router.put("/admin/products/:id", protect, updateProduct);
router.patch("/admin/products/:id/stock", protect, updateStock);
router.delete("/admin/products/:id", protect, deleteProduct);
router.get("/admin/orders", protect, listAdminOrders);
router.patch("/admin/orders/:id/status", protect, updateOrderStatus);
router.get("/admin/inventory", protect, getInventory);
router.get("/admin/collections", protect, listCollections);
router.post("/admin/collections", protect, saveCollection);
router.put("/admin/collections/:id", protect, saveCollection);
router.delete("/admin/collections/:id", protect, deleteCollection);

module.exports = router;
