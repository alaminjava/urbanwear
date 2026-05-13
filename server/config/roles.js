const ALLOWED_ROLES = [
  "customer",
  "admin",
  "manager",
  "inventory",
  "fulfillment",
  "support",
  // Legacy roles are kept so existing databases/users from the school app still load safely.
  "student",
  "teacher",
  "employee",
  "staff",
  "audit",
  "accounts",
  "accountant",
];

module.exports = ALLOWED_ROLES;
