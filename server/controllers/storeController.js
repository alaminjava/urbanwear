const mongoose = require("mongoose");
const Collection = require("../models/Collection");
const InventoryMovement = require("../models/InventoryMovement");
const Order = require("../models/Order");
const Product = require("../models/Product");
const SiteSetting = require("../models/SiteSetting");
const { normalizeEmail } = require("../utils/users");

const STORE_ADMIN_ROLES = ["admin", "manager"];
const PRODUCT_MANAGER_ROLES = ["admin", "manager", "inventory"];
const ORDER_MANAGER_ROLES = ["admin", "manager", "fulfillment", "support"];
const STAFF_ROLES = [...new Set([...STORE_ADMIN_ROLES, ...PRODUCT_MANAGER_ROLES, ...ORDER_MANAGER_ROLES])];
const TAX_RATE = 0.08;
const FASHION_CATEGORIES = ["Men", "Women", "Streetwear", "Accessories"];
const COUPONS = {
  WELCOME10: { type: "percent", value: 10, label: "10% off" },
  SAVE25: { type: "fixed", value: 25, label: "$25 off" },
  FREESHIP: { type: "shipping", value: 0, label: "Free delivery" },
};

function canManageProducts(user) {
  return PRODUCT_MANAGER_ROLES.includes(user?.role);
}

function canManageOrders(user) {
  return ORDER_MANAGER_ROLES.includes(user?.role);
}

function canViewStoreAdmin(user) {
  return STAFF_ROLES.includes(user?.role);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || `product-${Date.now()}`;
}

function money(value) {
  return Number(Math.max(Number(value || 0), 0).toFixed(2));
}

function calculateDiscount(subtotal, deliveryFee, couponCode) {
  const cleanCode = String(couponCode || "").trim().toUpperCase();
  const coupon = COUPONS[cleanCode];
  if (!coupon) return { discount: 0, deliveryDiscount: 0, couponCode: "" };
  if (coupon.type === "percent") return { discount: money(subtotal * (coupon.value / 100)), deliveryDiscount: 0, couponCode: cleanCode };
  if (coupon.type === "fixed") return { discount: Math.min(money(coupon.value), subtotal), deliveryDiscount: 0, couponCode: cleanCode };
  if (coupon.type === "shipping") return { discount: 0, deliveryDiscount: deliveryFee, couponCode: cleanCode };
  return { discount: 0, deliveryDiscount: 0, couponCode: "" };
}

function parseArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (!value) return [];
  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    } catch {
      // Fall through to comma/newline parsing for normal admin input.
    }
  }
  return text
    .split("\n")
    .flatMap((line) => line.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}


function normalizeVariant(variant) {
  return {
    size: String(variant.size || "").trim().toUpperCase(),
    color: String(variant.color || "").trim(),
    stock: Math.max(Number(variant.stock || 0), 0),
  };
}

function parseVariants(value, fallbackStock = 0) {
  if (Array.isArray(value)) {
    return value.map(normalizeVariant).filter((variant) => variant.size && variant.color);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(normalizeVariant).filter((variant) => variant.size && variant.color);
    } catch {
      return value
        .split("\n")
        .flatMap((line) => line.split(","))
        .map((entry) => {
          const [size, color, stock] = entry.split(/[|/:]/).map((part) => String(part || "").trim());
          return normalizeVariant({ size, color, stock });
        })
        .filter((variant) => variant.size && variant.color);
    }
  }

  return fallbackStock > 0 ? [{ size: "FREE", color: "Default", stock: fallbackStock }] : [];
}

function totalVariantStock(variants = []) {
  return variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
}

function generateTrackingNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `UW-${datePart}-${randomPart}`;
}

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

function productPayload(body) {
  const name = String(body.name || "").trim();
  const slug = slugify(body.slug || name);
  const sku = String(body.sku || "").trim().toUpperCase();
  const fallbackStock = Math.max(Number(body.stock || 0), 0);
  const variants = parseVariants(body.variants ?? body.variantText ?? body.variantsText, fallbackStock);
  const derivedStock = variants.length ? totalVariantStock(variants) : fallbackStock;
  return {
    name,
    slug,
    sku,
    category: String(body.category || "").trim(),
    brand: String(body.brand || "UrbanWear").trim(),
    description: String(body.description || "").trim(),
    highlights: parseArray(body.highlights),
    price: money(body.price),
    compareAtPrice: money(body.compareAtPrice),
    stock: derivedStock,
    variants,
    lowStockThreshold: Math.max(Number(body.lowStockThreshold || 5), 0),
    images: parseArray(body.images),
    tags: parseArray(body.tags).map((tag) => tag.toLowerCase()),
    isFeatured: Boolean(body.isFeatured),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    seoTitle: String(body.seoTitle || "").trim() || `${name} | UrbanWear`,
    seoDescription: String(body.seoDescription || "").trim(),
  };
}

function validateProductPayload(payload) {
  if (!payload.name || !payload.sku || !payload.category || !payload.description) {
    return "Name, SKU, category, and description are required.";
  }
  if (!FASHION_CATEGORIES.includes(payload.category)) {
    return `Category must be one of: ${FASHION_CATEGORIES.join(", ")}.`;
  }
  if (payload.price <= 0) return "Product price must be greater than 0.";
  if (!payload.variants.length) return "At least one size/color variant is required.";
  return "";
}

function getProductFilters(products) {
  const categories = new Set(FASHION_CATEGORIES);
  const sizes = new Set();
  const colors = new Set();
  products.forEach((product) => {
    if (product.category) categories.add(product.category);
    (product.variants || []).forEach((variant) => {
      if (variant.size) sizes.add(variant.size);
      if (variant.color) colors.add(variant.color);
    });
  });
  return {
    categories: [...categories].filter(Boolean),
    sizes: [...sizes].sort(),
    colors: [...colors].sort(),
  };
}

function buildProductQuery(reqQuery = {}) {
  const query = { isActive: true };
  const search = String(reqQuery.search || "").trim();
  const category = String(reqQuery.category || "").trim();
  const size = String(reqQuery.size || "").trim().toUpperCase();
  const color = String(reqQuery.color || "").trim();
  const featured = String(reqQuery.featured || "").trim();
  const minPriceText = String(reqQuery.minPrice ?? "").trim();
  const maxPriceText = String(reqQuery.maxPrice ?? "").trim();
  const minPrice = minPriceText === "" ? null : Number(minPriceText);
  const maxPrice = maxPriceText === "" ? null : Number(maxPriceText);
  const inStock = String(reqQuery.inStock || "").trim();

  if (category) query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  if (featured === "true") query.isFeatured = true;
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    query.price = {};
    if (Number.isFinite(minPrice)) query.price.$gte = Math.max(minPrice, 0);
    if (Number.isFinite(maxPrice)) query.price.$lte = Math.max(maxPrice, 0);
  }
  if (inStock === "true") query.stock = { $gt: 0 };
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    query.$or = [
      { name: searchRegex },
      { category: searchRegex },
      { brand: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
    ];
  }
  if (size && color) query.variants = { $elemMatch: { size, color: new RegExp(`^${escapeRegex(color)}$`, "i"), stock: { $gt: 0 } } };
  else if (size) query["variants.size"] = size;
  else if (color) query["variants.color"] = new RegExp(`^${escapeRegex(color)}$`, "i");

  return query;
}

async function getSiteSettings(_req, res, next) {
  try {
    const settings = await SiteSetting.findOneAndUpdate(
      { key: "main" },
      { $setOnInsert: { key: "main" } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
}

async function updateSiteSettings(req, res, next) {
  try {
    if (!STORE_ADMIN_ROLES.includes(req.user?.role)) return res.status(403).json({ message: "Admin access is required to update site settings." });
    const allowed = ["logoText", "logoSubtext", "phonePrimary", "phoneSecondary", "supportEmail", "address", "announcement", "couponCode", "footerNote"];
    const payload = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) payload[field] = String(req.body[field] || "").trim();
    });
    if (payload.couponCode) payload.couponCode = payload.couponCode.toUpperCase();
    const settings = await SiteSetting.findOneAndUpdate(
      { key: "main" },
      { $set: payload, $setOnInsert: { key: "main" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
}

async function listProducts(req, res, next) {
  try {
    const query = buildProductQuery(req.query);
    const sort = String(req.query.sort || "featured").trim();
    const sortMap = {
      featured: { isFeatured: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { name: 1 },
    };

    const [products, allActiveProducts] = await Promise.all([
      Product.find(query).sort(sortMap[sort] || sortMap.featured).limit(100),
      Product.find({ isActive: true }).select("category variants"),
    ]);
    const filters = getProductFilters(allActiveProducts);
    return res.json({ products, ...filters });
  } catch (error) {
    return next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const identifier = String(req.params.slug || req.params.id || "").trim();
    const lookup = mongoose.Types.ObjectId.isValid(identifier) ? { _id: identifier } : { slug: identifier };
    const product = await Product.findOne({ ...lookup, isActive: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({ product });
  } catch (error) {
    return next(error);
  }
}

async function listAdminProducts(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Product management access is required." });
    const products = await Product.find({}).sort({ createdAt: -1 });
    return res.json({ products, categories: FASHION_CATEGORIES });
  } catch (error) {
    return next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Product management access is required." });
    const payload = productPayload(req.body);
    const error = validateProductPayload(payload);
    if (error) return res.status(400).json({ message: error });

    const product = await Product.create(payload);
    if (payload.stock > 0) {
      await InventoryMovement.create({
        product: product._id,
        sku: product.sku,
        type: "restock",
        quantity: payload.stock,
        previousStock: 0,
        newStock: payload.stock,
        reason: "Initial variant stock",
        createdBy: req.user._id,
      });
    }
    return res.status(201).json({ product });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "SKU or slug already exists." });
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Product management access is required." });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid product id." });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    const payload = productPayload({ ...product.toObject(), ...req.body });
    const error = validateProductPayload(payload);
    if (error) return res.status(400).json({ message: error });

    const previousStock = product.stock;
    Object.assign(product, payload);
    await product.save();

    if (Number(previousStock) !== Number(payload.stock)) {
      await InventoryMovement.create({
        product: product._id,
        sku: product.sku,
        type: payload.stock > previousStock ? "restock" : "adjustment",
        quantity: payload.stock - previousStock,
        previousStock,
        newStock: payload.stock,
        reason: String(req.body.stockReason || "Variant stock update").trim(),
        createdBy: req.user._id,
      });
    }

    return res.json({ product });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "SKU or slug already exists." });
    return next(error);
  }
}

async function updateStock(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Inventory access is required." });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid product id." });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });

    const previousStock = Number(product.stock || 0);
    const size = String(req.body.size || "").trim().toUpperCase();
    const color = String(req.body.color || "").trim();
    const newStock = Math.max(Number(req.body.stock || 0), 0);

    if (size && color && product.variants?.length) {
      const variant = product.variants.find((item) => item.size === size && item.color.toLowerCase() === color.toLowerCase());
      if (!variant) return res.status(404).json({ message: "Variant not found." });
      variant.stock = newStock;
      product.stock = totalVariantStock(product.variants);
    } else if (product.variants?.length === 1) {
      product.variants[0].stock = newStock;
      product.stock = newStock;
    } else {
      product.stock = newStock;
    }

    await product.save();

    const movement = await InventoryMovement.create({
      product: product._id,
      sku: product.sku,
      type: String(req.body.type || (product.stock >= previousStock ? "restock" : "adjustment")),
      quantity: product.stock - previousStock,
      previousStock,
      newStock: product.stock,
      reason: String(req.body.reason || "Stock updated").trim(),
      createdBy: req.user._id,
    });

    return res.json({ product, movement });
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Product management access is required." });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid product id." });
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({ message: "Product unpublished.", product });
  } catch (error) {
    return next(error);
  }
}

function findVariant(product, size, color) {
  if (!product.variants?.length) return null;
  return product.variants.find((variant) => variant.size === size && variant.color.toLowerCase() === color.toLowerCase()) || null;
}

async function createOrder(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Please login before checkout." });
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: "Your cart is empty." });

    const address = normalizeAddress(req.body.customerInfo || req.body.shippingAddress || {});
    const addressError = validateAddress(address);
    if (addressError) return res.status(400).json({ message: addressError });

    const productIds = items.map((item) => item.productId || item.product).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const orderItems = [];
    for (const item of items) {
      const productId = String(item.productId || item.product || "");
      const quantity = Math.max(Number(item.quantity || 1), 1);
      const size = String(item.size || "").trim().toUpperCase();
      const color = String(item.color || "").trim();
      const product = productMap.get(productId);
      if (!product) return res.status(400).json({ message: "One or more cart items are no longer available." });

      if (product.variants?.length) {
        if (!size || !color) return res.status(400).json({ message: `Select size and color for ${product.name}.` });
        const variant = findVariant(product, size, color);
        if (!variant) return res.status(400).json({ message: `${product.name} is not available in ${size}/${color}.` });
        if (variant.stock < quantity) return res.status(409).json({ message: `${product.name} ${size}/${color} has only ${variant.stock} item(s) in stock.` });
      } else if (product.stock < quantity) {
        return res.status(409).json({ message: `${product.name} has only ${product.stock} item(s) in stock.` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        size,
        color,
        price: product.price,
        quantity,
        image: product.images?.[0] || "",
      });
    }

    const subtotal = money(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const baseDeliveryFee = subtotal >= 200 ? 0 : 7;
    const couponCode = String(req.body.couponCode || "").trim().toUpperCase();
    const { discount, deliveryDiscount, couponCode: appliedCouponCode } = calculateDiscount(subtotal, baseDeliveryFee, couponCode);
    const deliveryFee = Math.max(money(baseDeliveryFee - deliveryDiscount), 0);
    const taxableSubtotal = Math.max(subtotal - discount, 0);
    const tax = money(taxableSubtotal * TAX_RATE);
    const total = money(taxableSubtotal + tax + deliveryFee);
    const expectedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      trackingNumber: generateTrackingNumber(),
      customer: req.user._id,
      customerInfo: address,
      shippingAddress: address,
      items: orderItems,
      subtotal,
      tax,
      deliveryFee,
      discount,
      couponCode: appliedCouponCode,
      total,
      paymentMethod: String(req.body.paymentMethod || "cash_on_delivery"),
      paymentStatus: "pending",
      paymentReference: String(req.body.paymentReference || "").trim(),
      status: "pending",
      deliveryNote: String(req.body.deliveryNote || "").trim(),
      expectedDeliveryDate,
      statusHistory: [{ status: "pending", note: "Order placed", updatedBy: req.user._id }],
    });

    for (const item of orderItems) {
      const product = productMap.get(String(item.product));
      const previousStock = Number(product.stock || 0);
      if (product.variants?.length) {
        const variant = findVariant(product, item.size, item.color);
        variant.stock = Math.max(Number(variant.stock || 0) - item.quantity, 0);
        product.stock = totalVariantStock(product.variants);
      } else {
        product.stock = Math.max(previousStock - item.quantity, 0);
      }
      await product.save();
      await InventoryMovement.create({
        product: product._id,
        sku: product.sku,
        type: "sale",
        quantity: -item.quantity,
        previousStock,
        newStock: product.stock,
        reason: `Order ${order.orderNumber}${item.size || item.color ? ` (${item.size}/${item.color})` : ""}`,
        order: order._id,
        createdBy: req.user._id,
      });
    }

    return res.status(201).json({ order });
  } catch (error) {
    return next(error);
  }
}

async function trackOrder(req, res, next) {
  try {
    const trackingNumber = String(req.params.trackingNumber || "").trim().toUpperCase();
    const order = await Order.findOne({ trackingNumber }).populate("items.product", "name slug images variants");
    if (!order) return res.status(404).json({ message: "Order not found. Check your tracking number." });
    return res.json({ order });
  } catch (error) {
    return next(error);
  }
}

async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(50);
    return res.json({ orders });
  } catch (error) {
    return next(error);
  }
}

async function listAdminOrders(req, res, next) {
  try {
    if (!canManageOrders(req.user)) return res.status(403).json({ message: "Order management access is required." });
    const status = String(req.query.status || "").trim();
    const query = status ? { status } : {};
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(200);
    return res.json({ orders });
  } catch (error) {
    return next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    if (!canManageOrders(req.user)) return res.status(403).json({ message: "Order management access is required." });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid order id." });

    const allowed = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];
    const status = String(req.body.status || "").trim();
    if (!allowed.includes(status)) return res.status(400).json({ message: "Choose a valid order status." });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const wasCancelled = order.status === "cancelled";
    order.status = status;
    if (req.body.paymentStatus) order.paymentStatus = String(req.body.paymentStatus);
    if (req.body.expectedDeliveryDate) order.expectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
    order.statusHistory.push({
      status,
      note: String(req.body.note || "Status updated").trim(),
      updatedBy: req.user._id,
      at: new Date(),
    });
    await order.save();

    if (status === "cancelled" && !wasCancelled) {
      await restockCancelledOrder(order, req.user._id);
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
}

async function getAdminDashboard(req, res, next) {
  try {
    if (!canViewStoreAdmin(req.user)) return res.status(403).json({ message: "Store staff access is required." });
    const [productCount, activeProducts, orderCount, pendingOrders, deliveredOrders, lowStockProducts, recentOrders, inventoryMovements, collectionCount] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({}),
      Order.countDocuments({ status: { $in: ["pending", "confirmed", "processing"] } }),
      Order.countDocuments({ status: "delivered" }),
      Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).sort({ stock: 1 }).limit(10),
      Order.find({}).sort({ createdAt: -1 }).limit(8),
      InventoryMovement.find({}).sort({ createdAt: -1 }).limit(10).populate("product", "name sku"),
      Collection.countDocuments({ isActive: true }),
    ]);

    const revenue = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    return res.json({
      stats: {
        productCount,
        activeProducts,
        orderCount,
        pendingOrders,
        deliveredOrders,
        collectionCount,
        lowStockCount: lowStockProducts.length,
        revenue: money(revenue[0]?.total || 0),
      },
      lowStockProducts,
      recentOrders,
      inventoryMovements,
    });
  } catch (error) {
    return next(error);
  }
}

async function getInventory(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Inventory access is required." });
    const [products, movements] = await Promise.all([
      Product.find({}).sort({ stock: 1, name: 1 }),
      InventoryMovement.find({}).sort({ createdAt: -1 }).limit(100).populate("product", "name sku"),
    ]);
    return res.json({ products, movements });
  } catch (error) {
    return next(error);
  }
}

async function listCollections(req, res, next) {
  try {
    const query = req.user && canManageProducts(req.user) ? {} : { isActive: true };
    const collections = await Collection.find(query).populate("products", "name slug sku price stock images category variants").sort({ createdAt: -1 });
    return res.json({ collections });
  } catch (error) {
    return next(error);
  }
}

async function saveCollection(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Collection management access is required." });
    const name = String(req.body.name || "").trim();
    const season = String(req.body.season || "").trim();
    const description = String(req.body.description || "").trim();
    const products = Array.isArray(req.body.products) ? req.body.products.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];
    const isActive = req.body.isActive === undefined ? true : Boolean(req.body.isActive);
    if (!name) return res.status(400).json({ message: "Collection name is required." });

    let collection;
    if (req.params.id) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid collection id." });
      collection = await Collection.findByIdAndUpdate(req.params.id, { name, season, description, products, isActive }, { new: true, runValidators: true });
      if (!collection) return res.status(404).json({ message: "Collection not found." });
    } else {
      collection = await Collection.create({ name, season, description, products, isActive });
    }
    await collection.populate("products", "name slug sku price stock images category variants");
    return res.status(req.params.id ? 200 : 201).json({ collection });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A collection with this name already exists." });
    return next(error);
  }
}

async function deleteCollection(req, res, next) {
  try {
    if (!canManageProducts(req.user)) return res.status(403).json({ message: "Collection management access is required." });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid collection id." });
    const collection = await Collection.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!collection) return res.status(404).json({ message: "Collection not found." });
    return res.json({ message: "Collection unpublished.", collection });
  } catch (error) {
    return next(error);
  }
}

function normalizeAddress(input) {
  return {
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    email: normalizeEmail(input.email),
    line1: String(input.line1 || input.address || "").trim(),
    line2: String(input.line2 || "").trim(),
    city: String(input.city || "").trim(),
    area: String(input.area || "").trim(),
    postalCode: String(input.postalCode || "").trim(),
    country: String(input.country || "Bangladesh").trim(),
  };
}

function validateAddress(address) {
  if (!address.name || !address.phone || !address.email || !address.line1 || !address.city) {
    return "Name, phone, email, address, and city are required for delivery.";
  }
  return "";
}

async function restockCancelledOrder(order, userId) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    const previousStock = Number(product.stock || 0);
    if (product.variants?.length && item.size && item.color) {
      const variant = findVariant(product, item.size, item.color);
      if (variant) variant.stock = Number(variant.stock || 0) + item.quantity;
      product.stock = totalVariantStock(product.variants);
    } else {
      product.stock = previousStock + item.quantity;
    }
    await product.save();
    await InventoryMovement.create({
      product: product._id,
      sku: product.sku,
      type: "cancel_restock",
      quantity: item.quantity,
      previousStock,
      newStock: product.stock,
      reason: `Cancelled ${order.orderNumber}`,
      order: order._id,
      createdBy: userId,
    });
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  createOrder,
  createProduct,
  deleteCollection,
  deleteProduct,
  getAdminDashboard,
  getInventory,
  getSiteSettings,
  getProduct,
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
};
