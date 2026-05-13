const express = require("express");
const {
  createOrder,
  createProduct,
  getProduct,
  listAdminOrders,
  listProducts,
  myOrders,
} = require("../controllers/storeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/products", listProducts);
router.get("/products/:slug", getProduct);
router.post("/products", protect, createProduct);
router.post("/orders", protect, createOrder);
router.get("/orders/user", protect, myOrders);
router.get("/orders", protect, listAdminOrders);

module.exports = router;
