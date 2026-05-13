const mongoose = require("mongoose");
const ALLOWED_ROLES = require("../config/roles");
const Product = require("../models/Product");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");
const { normalizeEmail, publicUser } = require("../utils/users");

function sanitizeRole(role) {
  const cleanRole = String(role || "").trim().toLowerCase();
  return ALLOWED_ROLES.includes(cleanRole) ? cleanRole : "";
}

function normalizeAddress(input = {}) {
  return {
    label: String(input.label || "Home").trim(),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    line1: String(input.line1 || input.address || "").trim(),
    line2: String(input.line2 || "").trim(),
    city: String(input.city || "").trim(),
    area: String(input.area || "").trim(),
    postalCode: String(input.postalCode || "").trim(),
    country: String(input.country || "Bangladesh").trim(),
  };
}

async function updateProfile(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const photoUrl = String(req.body.photoUrl || "").trim();
    if (!name || !email) return res.status(400).json({ message: "Name and email are required." });

    const duplicateUser = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (duplicateUser) return res.status(409).json({ message: "An account with this email already exists." });

    req.user.name = name;
    req.user.email = email;
    req.user.photoUrl = photoUrl;
    await req.user.save();
    return res.json({ message: "Profile updated.", user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
}

async function updateWishlist(req, res, next) {
  try {
    const productIds = Array.isArray(req.body.products) ? req.body.products : Array.isArray(req.body.wishlist) ? req.body.wishlist : [];
    const validIds = [...new Set(productIds.map((id) => String(id || "")).filter((id) => mongoose.Types.ObjectId.isValid(id)))];
    const products = await Product.find({ _id: { $in: validIds }, isActive: true }).select("_id");
    const validProductIds = products.map((product) => product._id);
    req.user.wishlist = validProductIds.map((product) => ({ product }));
    await req.user.save();
    await req.user.populate("wishlist.product", "name slug sku price stock images variants category");
    return res.json({ message: "Wishlist updated.", wishlist: req.user.wishlist, user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
}

async function getWishlist(req, res, next) {
  try {
    await req.user.populate("wishlist.product", "name slug sku price stock images variants category");
    return res.json({ wishlist: req.user.wishlist });
  } catch (error) {
    return next(error);
  }
}

async function updateAddresses(req, res, next) {
  try {
    const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : [];
    req.user.addresses = addresses.map(normalizeAddress).filter((address) => address.name || address.line1 || address.city || address.phone).slice(0, 5);
    await req.user.save();
    return res.json({ message: "Addresses updated.", addresses: req.user.addresses, user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const role = sanitizeRole(req.query.role);
    const query = role ? { role } : {};
    const users = await User.find(query).sort({ createdAt: -1, name: 1 });

    return res.json({ users: users.map(publicUser) });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = sanitizeRole(req.body.role) || "customer";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordData = hashPassword(password);
    const user = await User.create({
      name,
      email,
      role,
      addresses: Array.isArray(req.body.addresses) ? req.body.addresses.map(normalizeAddress) : [],
      salt: passwordData.salt,
      passwordHash: passwordData.hash,
    });

    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const role = sanitizeRole(req.body.role);
    const password = String(req.body.password || "");

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email, and role are required." });
    }

    const duplicateUser = await User.findOne({ email, _id: { $ne: user.id } });
    if (duplicateUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    user.name = name;
    user.email = email;
    user.role = role;
    if (Array.isArray(req.body.addresses)) user.addresses = req.body.addresses.map(normalizeAddress);

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }

      const passwordData = hashPassword(password);
      user.salt = passwordData.salt;
      user.passwordHash = passwordData.hash;
    }

    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ message: "User deleted.", user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUsers,
  getWishlist,
  updateAddresses,
  updateProfile,
  updateUser,
  updateWishlist,
};
