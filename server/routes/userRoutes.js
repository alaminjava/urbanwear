const express = require("express");
const {
  createUser,
  deleteUser,
  getUsers,
  getWishlist,
  updateAddresses,
  updateProfile,
  updateUser,
  updateWishlist,
} = require("../controllers/userController");
const { adminOnly, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/profile", protect, updateProfile);
router.get("/wishlist", protect, getWishlist);
router.put("/wishlist", protect, updateWishlist);
router.put("/addresses", protect, updateAddresses);

router.use(protect, adminOnly);
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
