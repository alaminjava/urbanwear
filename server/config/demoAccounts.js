const DEMO_PASSWORD = "test1234";

const DEMO_ACCOUNTS = [
  { name: "Store Admin", email: "admin@store.test", password: DEMO_PASSWORD, role: "admin" },
  { name: "Store Manager", email: "manager@store.test", password: DEMO_PASSWORD, role: "manager" },
  { name: "Inventory Lead", email: "inventory@store.test", password: DEMO_PASSWORD, role: "inventory" },
  { name: "Fulfillment Agent", email: "fulfillment@store.test", password: DEMO_PASSWORD, role: "fulfillment" },
  { name: "Customer Demo", email: "customer@store.test", password: DEMO_PASSWORD, role: "customer" },
];

module.exports = {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
};
