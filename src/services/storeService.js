import { api } from "../api";

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const storeService = {
  async login(payload) {
    const { data } = await api.post("/api/auth/login", payload);
    return data;
  },
  async register(payload) {
    const { data } = await api.post("/api/auth/register", payload);
    return data;
  },
  async getSettings() {
    const { data } = await api.get("/api/store/settings");
    return data;
  },
  async updateSettings(payload, token) {
    const { data } = await api.put("/api/store/admin/settings", payload, { headers: authHeader(token) });
    return data;
  },
  async listProducts(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined),
    );
    const { data } = await api.get("/api/store/products", { params: cleanParams });
    return data;
  },
  async getProduct(slug) {
    const { data } = await api.get(`/api/store/products/${slug}`);
    return data;
  },
  async createOrder(payload, token) {
    const { data } = await api.post("/api/store/orders", payload, { headers: authHeader(token) });
    return data;
  },
  async trackOrder(trackingNumber) {
    const { data } = await api.get(`/api/store/orders/track/${encodeURIComponent(trackingNumber)}`);
    return data;
  },
  async myOrders(token) {
    const { data } = await api.get("/api/store/orders/my", { headers: authHeader(token) });
    return data;
  },

  async collections(token) {
    const config = token ? { headers: authHeader(token) } : {};
    const { data } = await api.get("/api/store/collections", config);
    return data;
  },
  async adminCollections(token) {
    const { data } = await api.get("/api/store/admin/collections", { headers: authHeader(token) });
    return data;
  },
  async saveCollection(collection, token) {
    const config = { headers: authHeader(token) };
    if (collection._id) {
      const { data } = await api.put(`/api/store/admin/collections/${collection._id}`, collection, config);
      return data;
    }
    const { data } = await api.post("/api/store/admin/collections", collection, config);
    return data;
  },
  async deleteCollection(collectionId, token) {
    const { data } = await api.delete(`/api/store/admin/collections/${collectionId}`, { headers: authHeader(token) });
    return data;
  },
  async getWishlist(token) {
    const { data } = await api.get("/api/users/wishlist", { headers: authHeader(token) });
    return data;
  },
  async updateWishlist(products, token) {
    const { data } = await api.put("/api/users/wishlist", { products }, { headers: authHeader(token) });
    return data;
  },
  async updateProfile(payload, token) {
    const { data } = await api.put("/api/users/profile", payload, { headers: authHeader(token) });
    return data;
  },
  async updateAddresses(addresses, token) {
    const { data } = await api.put("/api/users/addresses", { addresses }, { headers: authHeader(token) });
    return data;
  },
  async adminDashboard(token) {
    const { data } = await api.get("/api/store/admin/dashboard", { headers: authHeader(token) });
    return data;
  },
  async adminProducts(token) {
    const { data } = await api.get("/api/store/admin/products", { headers: authHeader(token) });
    return data;
  },
  async saveProduct(product, token) {
    const config = { headers: authHeader(token) };
    if (product._id) {
      const { data } = await api.put(`/api/store/admin/products/${product._id}`, product, config);
      return data;
    }
    const { data } = await api.post("/api/store/admin/products", product, config);
    return data;
  },
  async updateStock(productId, payload, token) {
    const { data } = await api.patch(`/api/store/admin/products/${productId}/stock`, payload, { headers: authHeader(token) });
    return data;
  },
  async deleteProduct(productId, token) {
    const { data } = await api.delete(`/api/store/admin/products/${productId}`, { headers: authHeader(token) });
    return data;
  },
  async adminOrders(token) {
    const { data } = await api.get("/api/store/admin/orders", { headers: authHeader(token) });
    return data;
  },
  async updateOrderStatus(orderId, payload, token) {
    const { data } = await api.patch(`/api/store/admin/orders/${orderId}/status`, payload, { headers: authHeader(token) });
    return data;
  },
  async inventory(token) {
    const { data } = await api.get("/api/store/admin/inventory", { headers: authHeader(token) });
    return data;
  },
  async users(token) {
    const { data } = await api.get("/api/users", { headers: authHeader(token) });
    return data;
  },
  async createUser(payload, token) {
    const { data } = await api.post("/api/users", payload, { headers: authHeader(token) });
    return data;
  },
  async updateUser(id, payload, token) {
    const { data } = await api.put(`/api/users/${id}`, payload, { headers: authHeader(token) });
    return data;
  },
};
