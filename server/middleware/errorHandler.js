function errorHandler(error, _req, res, next) {
  void next;

  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with this unique value already exists." });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (/not found|required|valid|select/i.test(error.message || "")) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({
    message: error.message || "Server error.",
  });
}

module.exports = errorHandler;
