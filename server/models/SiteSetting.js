const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    logoText: { type: String, default: "UrbanWear", trim: true },
    logoSubtext: { type: String, default: "Studio", trim: true },
    phonePrimary: { type: String, default: "+880 1700 000 000", trim: true },
    phoneSecondary: { type: String, default: "+880 1800 000 000", trim: true },
    supportEmail: { type: String, default: "support@urbanwear.test", trim: true },
    address: { type: String, default: "Banani, Dhaka, Bangladesh", trim: true },
    announcement: { type: String, default: "Use coupon WELCOME10 for 10% off your first UrbanWear order.", trim: true },
    couponCode: { type: String, default: "WELCOME10", trim: true, uppercase: true },
    footerNote: { type: String, default: "Clean fashion essentials, precise size/color selection, secure checkout, and order tracking.", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
