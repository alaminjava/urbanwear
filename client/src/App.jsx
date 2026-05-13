import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./App.css";
import { brandTiles, footerColumns, paymentBadges, tabCategories, topCategories, visualIconMap } from "./data/homepageData";
import { getErrorMessage } from "./api";
import { storeService } from "./services/storeService";

const STAFF_ROLES = ["admin", "manager", "inventory", "fulfillment", "support"];
const PRODUCT_ROLES = ["admin", "manager", "inventory"];
const ORDER_ROLES = ["admin", "manager", "fulfillment", "support"];
const ALL_STORE_ROLES = ["customer", "admin", "manager", "inventory", "fulfillment", "support"];
const FREE_DELIVERY_THRESHOLD = 200;
const DELIVERY_FEE = 7;
const TAX_RATE = 0.08;
const COUPONS = {
  WELCOME10: { label: "10% off", type: "percent", value: 10 },
  SAVE25: { label: "$25 off", type: "fixed", value: 25 },
  FREESHIP: { label: "Free delivery", type: "shipping", value: 0 },
};
const FASHION_CATEGORIES = ["Men", "Women", "Kids", "Streetwear", "Accessories"];
const DEFAULT_VARIANTS_TEXT = "S/Black/10, M/Black/8, L/Black/5";
const EMPTY_PRODUCT = {
  name: "",
  sku: "",
  slug: "",
  category: "",
  brand: "",
  description: "",
  highlights: "",
  price: "",
  compareAtPrice: "",
  stock: 0,
  variants: DEFAULT_VARIANTS_TEXT,
  lowStockThreshold: 5,
  images: "gradient-box",
  tags: "",
  isFeatured: false,
  isActive: true,
  seoTitle: "",
  seoDescription: "",
};

const DEFAULT_SETTINGS = {
  logoText: "UrbanWear",
  logoSubtext: "Studio",
  phonePrimary: "+880 1700 000 000",
  phoneSecondary: "+880 1800 000 000",
  supportEmail: "support@urbanwear.test",
  address: "Banani, Dhaka, Bangladesh",
  announcement: "Use coupon WELCOME10 for 10% off your first order.",
  couponCode: "WELCOME10",
  footerNote: "Clean fashion essentials, precise size/color selection, secure checkout, and order tracking.",
};

const publicNavLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/products" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const recentBuyNames = ["Ayesha", "Rafi", "Nabila", "Sajid", "Maya", "Tanim", "Farhan", "Jerin"];
const recentBuyCities = ["Dhaka", "Chittagong", "Sylhet", "Khulna", "Rajshahi", "Cumilla", "Barishal", "Gazipur"];

function parseImagesForPreview(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return text.split("\n").flatMap((line) => line.split(",")).map((item) => item.trim()).filter(Boolean);
}

function fileToWebpDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Please upload image files only."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not process image file."));
      image.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value));
}

function roleLabel(role) {
  return String(role || "customer").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCartKey(user) {
  return user?.email ? `urbanwear-cart:${user.email}` : "urbanwear-cart:guest";
}

function getWishlistKey(user) {
  return user?.email ? `urbanwear-wishlist:${user.email}` : "urbanwear-wishlist:guest";
}

function calculateOrderTotals(cart, couponCode = "") {
  const subtotal = Number(cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const baseDeliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE;
  const coupon = COUPONS[String(couponCode || "").trim().toUpperCase()];
  let discount = 0;
  let deliveryDiscount = 0;
  if (coupon?.type === "percent") discount = Number((subtotal * (coupon.value / 100)).toFixed(2));
  if (coupon?.type === "fixed") discount = Math.min(Number(coupon.value || 0), subtotal);
  if (coupon?.type === "shipping") deliveryDiscount = baseDeliveryFee;
  const taxableSubtotal = Math.max(subtotal - discount, 0);
  const tax = Number((taxableSubtotal * TAX_RATE).toFixed(2));
  const deliveryFee = Math.max(Number((baseDeliveryFee - deliveryDiscount).toFixed(2)), 0);
  const total = Number((taxableSubtotal + tax + deliveryFee).toFixed(2));
  return { subtotal, discount, tax, deliveryFee, total, coupon };
}

function normalizeVariantSelection(product, selection = {}) {
  const variants = product?.variants || [];
  const firstAvailable = variants.find((variant) => Number(variant.stock || 0) > 0) || variants[0] || {};
  const size = String(selection.size || firstAvailable.size || "").trim().toUpperCase();
  const color = String(selection.color || firstAvailable.color || "").trim();
  const selectedVariant = variants.find((variant) => variant.size === size && String(variant.color).toLowerCase() === color.toLowerCase());
  const hasExplicitSelection = Boolean(selection.size || selection.color);
  const fallbackStock = hasExplicitSelection && variants.length ? 0 : product?.stock ?? 0;
  const stock = Number(selection.stock ?? selectedVariant?.stock ?? fallbackStock);
  return { size, color, stock };
}

function cartKeyFor(product, selection = {}) {
  const variant = normalizeVariantSelection(product, selection);
  return `${product._id || product.id || product.sku}-${variant.size || "one"}-${variant.color || "default"}`;
}

function variantLabel(item) {
  return [item.size, item.color].filter(Boolean).join(" / ") || "Default";
}

function uniqueVariantValues(product, key) {
  return [...new Set((product?.variants || []).map((variant) => variant[key]).filter(Boolean))];
}

function useSEO(title, description) {
  useEffect(() => {
    document.title = title;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", description);
  }, [title, description]);
}

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) return null;
    try {
      return { token, user: JSON.parse(storedUser) };
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
  });

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("urbanwear-cart:guest") || "[]");
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("urbanwear-wishlist:guest") || "[]");
    } catch {
      return [];
    }
  });
  const cartKey = getCartKey(session?.user);
  const wishlistKey = getWishlistKey(session?.user);

  useEffect(() => {
    if (!session) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return;
    }
    localStorage.setItem("token", session.token);
    localStorage.setItem("user", JSON.stringify(session.user));
  }, [session]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey) || "[]");
      setCart(saved);
    } catch {
      setCart([]);
    }
  }, [cartKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(wishlistKey) || "[]");
      setWishlist(saved);
    } catch {
      setWishlist([]);
    }
  }, [wishlistKey]);

  useEffect(() => {
    localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
  }, [wishlist, wishlistKey]);

  useEffect(() => {
    if (!session?.token) return;
    let ignore = false;
    storeService.getWishlist(session.token)
      .then((data) => {
        if (ignore) return;
        const saved = (data.wishlist || []).map((item) => item.product).filter(Boolean).map((product) => ({
          id: product._id || product.id || product.sku || product.slug,
          _id: product._id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: product.price,
          stock: product.stock,
          variants: product.variants || [],
          image: product.images?.[0] || product.image || "gradient-box",
        }));
        if (saved.length) setWishlist(saved);
      })
      .catch(() => undefined);
    return () => { ignore = true; };
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token) return;
    const productIds = wishlist.map((item) => item._id).filter(Boolean);
    storeService.updateWishlist(productIds, session.token).catch(() => undefined);
  }, [wishlist, session?.token]);

  const addToCart = (product, quantity = 1, selection = {}) => {
    const variant = normalizeVariantSelection(product, selection);
    const cartKey = cartKeyFor(product, variant);
    setCart((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);
      const maxStock = Number(variant.stock || product.stock || 0);
      const nextQuantity = Math.min(maxStock || 1, Number(existing?.quantity || 0) + quantity);
      if (existing) return current.map((item) => (item.cartKey === cartKey ? { ...item, quantity: nextQuantity, stock: maxStock } : item));
      return [
        ...current,
        {
          cartKey,
          _id: product._id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: product.price,
          size: variant.size,
          color: variant.color,
          stock: maxStock,
          image: product.images?.[0] || product.image || "gradient-box",
          quantity: Math.max(1, Math.min(quantity, maxStock || 1)),
        },
      ];
    });
  };

  const updateCartQuantity = (cartKey, quantity) => {
    setCart((current) => current.map((item) => (item.cartKey === cartKey ? { ...item, quantity: Math.max(1, Math.min(Number(quantity || 1), item.stock || 1)) } : item)));
  };

  const removeFromCart = (cartKey) => setCart((current) => current.filter((item) => item.cartKey !== cartKey));
  const clearCart = () => setCart([]);
  const toggleWishlist = (product) => {
    setWishlist((current) => {
      const id = product._id || product.sku || product.slug;
      if (current.some((item) => item.id === id)) return current.filter((item) => item.id !== id);
      return [
        ...current,
        {
          id,
          _id: product._id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: product.price,
          stock: product.stock,
          variants: product.variants || [],
          image: product.images?.[0] || product.image || "gradient-box",
        },
      ];
    });
  };
  const removeFromWishlist = (productId) => setWishlist((current) => current.filter((item) => item.id !== productId));
  const logout = () => {
    setSession(null);
    setCart([]);
    setWishlist([]);
  };

  return (
    <BrowserRouter>
      <StoreShell session={session} cart={cart} wishlist={wishlist} onLogout={logout}>
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
          <Route path="/products" element={<Products addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
          <Route path="/products/:slug" element={<ProductDetail addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
          <Route path="/cart" element={<Cart cart={cart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} session={session} clearCart={clearCart} />} />
          <Route path="/wishlist" element={<Wishlist wishlist={wishlist} addToCart={addToCart} removeFromWishlist={removeFromWishlist} />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/collections" element={<CollectionsPage addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/account" element={session ? <Account session={session} setSession={setSession} onLogout={logout} /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage mode="login" onAuth={setSession} />} />
          <Route path="/register" element={session ? <Navigate to="/" replace /> : <AuthPage mode="register" onAuth={setSession} />} />
          <Route path="/admin" element={session && STAFF_ROLES.includes(session.user.role) ? <AdminPanel session={session} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreShell>
    </BrowserRouter>
  );
}

function StoreShell({ session, cart, wishlist, onLogout, children }) {
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const wishlistCount = wishlist.length;
  const isStaff = Boolean(session && STAFF_ROLES.includes(session.user.role));
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    storeService.getSettings()
      .then((data) => !ignore && setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) }))
      .catch(() => undefined);
    return () => { ignore = true; };
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    const query = search.trim();
    setMobileMenuOpen(false);
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.classList.toggle("menu-lock", mobileMenuOpen);
    return () => document.body.classList.remove("menu-lock");
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const categoryLinks = [
    { label: "Men", to: "/products?category=Men" },
    { label: "Women", to: "/products?category=Women" },
    { label: "Kids", to: "/products?category=Kids" },
    { label: "Accessories", to: "/products?category=Accessories" },
    { label: "Sale / Offers", to: "/products?maxPrice=80" },
  ];
  const featureLinks = [
    { label: "New Arrivals", to: "/products?sort=newest" },
    { label: "Collections", to: "/collections" },
    { label: "Best Sellers", to: "/products?sort=featured" },
    { label: "Sale under $80", to: "/products?maxPrice=80" },
  ];
  const headerNavLinks = isStaff
    ? [{ label: "Admin", to: "/admin" }, { label: "Shop", to: "/products" }]
    : publicNavLinks;

  return (
    <div className="site-shell luxury-shell">
      <div className={`lux-announcement coupon-announcement ${isStaff ? "staff-announcement" : ""}`} role="region" aria-label="Store announcements">
        <span>{settings.announcement || "Use coupon WELCOME10 for 10% off your first UrbanWear order."}</span>
        <Link to="/products?maxPrice=80">Use code <strong>{settings.couponCode || "WELCOME10"}</strong></Link>
        {!isStaff && <Link to="/contact">Need help? {settings.phonePrimary}</Link>}
      </div>

      <header className="lux-header ecommerce-header" aria-label="UrbanWear main header">
        <Link to="/" className="lux-brand ecommerce-logo" aria-label="UrbanWear home">
          <span>{settings.logoText || "UrbanWear"}</span>
          <small>{settings.logoSubtext || "Studio"}</small>
        </Link>

        <div className="lux-header-left ecommerce-nav-wrap">
          <button
            className="lux-menu-button"
            type="button"
            aria-label="Open menu"
            aria-controls="lux-mobile-menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span></span><span></span><span></span>
          </button>

          <nav className="lux-desktop-nav" aria-label="Desktop navigation">
            {!isStaff && <NavLink to="/" end>Home</NavLink>}
            <div className="lux-nav-item">
              <Link to="/products">Shop</Link>
              <div className="lux-mega-panel shop-mega-panel" role="menu">
                <div>
                  <span className="mega-title">Shop by category</span>
                  {categoryLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
                </div>
                <div>
                  <span className="mega-title">Featured links</span>
                  {featureLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
                </div>
                <div className="mega-feature">
                  <span>Sale / Offers</span>
                  <strong>Use {settings.couponCode || "WELCOME10"} on selected drops and seasonal edits.</strong>
                  <Link to="/products?maxPrice=80">Shop offers</Link>
                </div>
              </div>
            </div>
            {isStaff ? (
              <NavLink to="/admin">Admin</NavLink>
            ) : (
              <>
                <NavLink to="/about">About</NavLink>
                <NavLink to="/blog">Blog</NavLink>
                <NavLink to="/contact">Contact</NavLink>
              </>
            )}
          </nav>
        </div>

        <div className="lux-header-right">
          <form className={`lux-header-search ${searchOpen ? "open" : ""}`} onSubmit={submitSearch} role="search">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" aria-label="Search clothing" />
            <button aria-label={searchOpen ? "Submit search" : "Open search"}><UiIcon name="search" /></button>
          </form>
          {session ? (
            <>
              <Link className="lux-utility-link icon-only" to="/account" aria-label="Account"><UiIcon name="user" /></Link>
              <button className="lux-utility-link logout-link icon-text" type="button" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <Link className="lux-utility-link icon-only" to="/login" aria-label="Login"><UiIcon name="user" /></Link>
          )}
          {!isStaff && <Link className="lux-utility-link compact icon-only" to="/wishlist" aria-label={`Wishlist has ${wishlistCount} items`}><UiIcon name="heart" /><strong>{wishlistCount}</strong></Link>}
          {!isStaff && <Link className="lux-utility-link cart icon-only" to="/cart" aria-label={`Cart has ${cartCount} items`}><UiIcon name="bag" /><strong>{cartCount}</strong></Link>}
        </div>
      </header>

      <button
        className={`lux-drawer-overlay ${mobileMenuOpen ? "open" : ""}`}
        type="button"
        aria-label="Close mobile menu overlay"
        onClick={closeMobileMenu}
      />

      <aside id="lux-mobile-menu" className={`lux-mobile-drawer ${mobileMenuOpen ? "open" : ""}`} aria-hidden={!mobileMenuOpen}>
        <div className="lux-drawer-head">
          <Link to="/" className="lux-brand drawer-brand" aria-label="UrbanWear home"><span>{settings.logoText || "UrbanWear"}</span><small>{settings.logoSubtext || "Studio"}</small></Link>
          <button className="lux-drawer-close" type="button" aria-label="Close menu" onClick={closeMobileMenu}>Close</button>
        </div>

        <div className="drawer-coupon-card">
          <span>Today's offer</span>
          <strong>{settings.couponCode || "WELCOME10"}</strong>
          <p>{settings.announcement || "Use this coupon at checkout."}</p>
        </div>

        <form className="lux-drawer-search" onSubmit={submitSearch} role="search">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clothing" aria-label="Search clothing" />
          <button aria-label="Search">Search</button>
        </form>

        <nav className="lux-drawer-nav" aria-label="Mobile navigation">
          {headerNavLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          {session ? <Link to="/account">Account</Link> : <Link to="/login">Login</Link>}
        </nav>

        <div className="lux-drawer-section">
          <span>Shop mega menu</span>
          {categoryLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
          {featureLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </div>

        <div className="lux-drawer-actions">
          {session ? <button type="button" onClick={() => { onLogout(); closeMobileMenu(); }}>Logout</button> : <Link to="/register">Create account</Link>}
          {!isStaff && <Link to="/wishlist">Wishlist <strong>{wishlistCount}</strong></Link>}
          {!isStaff && <Link to="/cart">Bag <strong>{cartCount}</strong></Link>}
          {!isStaff && <Link to="/track">Track order</Link>}
        </div>
      </aside>

      <main>{children}</main>
      <RecentBuyToast />
      <SiteFooter settings={settings} />
    </div>
  );
}

function UiIcon({ name }) {
  const paths = {
    search: <><path d="m21 21-4.35-4.35" /><circle cx="11" cy="11" r="7" /></>,
    user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
    heart: <path d="M20.8 4.6a5.2 5.2 0 0 0-7.4 0L12 6l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 20.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />,
    bag: <><path d="M6 8h12l-1 13H7L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
    sparkles: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /><path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" /></>,
    adjustments: <><path d="M4 7h10" /><path d="M18 7h2" /><path d="M16 5v4" /><path d="M4 17h2" /><path d="M10 17h10" /><path d="M8 15v4" /></>,
  };
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.search}
    </svg>
  );
}

function SiteFooter({ settings = DEFAULT_SETTINGS }) {
  const footerLinks = {
    Shop: [
      { label: "All products", to: "/products" },
      { label: "Men", to: "/products?category=Men" },
      { label: "Women", to: "/products?category=Women" },
      { label: "Streetwear", to: "/products?category=Streetwear" },
      { label: "Accessories", to: "/products?category=Accessories" },
    ],
    Company: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Contact", to: "/contact" },
      { label: "Wishlist", to: "/wishlist" },
    ],
    Support: [
      { label: "Track order", to: "/track" },
      { label: "My account", to: "/account" },
      { label: "Cart", to: "/cart" },
      { label: "Checkout", to: "/checkout" },
    ],
  };
  return (
    <footer className="lux-footer rich-footer">
      <div className="lux-footer-main rich-footer-main">
        <div className="footer-about-block">
          <Link to="/" className="lux-brand footer-lux-brand" aria-label="UrbanWear home"><span>{settings.logoText || "UrbanWear"}</span><small>{settings.logoSubtext || "Studio"}</small></Link>
          <p>{settings.footerNote || DEFAULT_SETTINGS.footerNote}</p>
          <div className="footer-contact-card">
            <span>Customer care</span>
            <strong>{settings.phonePrimary}</strong>
            <small>{settings.supportEmail}</small>
            <small>{settings.address}</small>
          </div>
        </div>
        {Object.entries(footerLinks).map(([title, links]) => (
          <nav key={title} aria-label={`Footer ${title}`}>
            <span>{title}</span>
            {links.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}
          </nav>
        ))}
        <div className="footer-payment-block">
          <span>Payment methods</span>
          <div className="payment-brand-grid" aria-label="Accepted payment methods">
            {paymentBadges.map((badge) => <strong key={badge}>{badge}</strong>)}
            <strong>GPay</strong>
          </div>
        </div>
      </div>
      <div className="lux-footer-bottom"><span>© 2026 {settings.logoText || "UrbanWear"}. All rights reserved.</span><span>Secure checkout / Variant stock / Fast delivery</span></div>
    </footer>
  );
}

function RecentBuyToast() {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    storeService.listProducts({ sort: "featured" })
      .then((data) => !ignore && setProducts((data.products || []).slice(0, 12)))
      .catch(() => undefined);
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!products.length) return undefined;
    const timer = window.setInterval(() => setIndex((current) => current + 1), 6500);
    return () => window.clearInterval(timer);
  }, [products.length]);

  if (!products.length) return null;
  const product = products[index % products.length];
  const name = recentBuyNames[index % recentBuyNames.length];
  const city = recentBuyCities[index % recentBuyCities.length];
  const minutes = 2 + (index % 8);
  return (
    <Link className="recent-buy-toast" to={`/products/${product.slug}`} aria-label="Recent purchase notification">
      <ProductVisual image={product.images?.[0]} name={product.name} />
      <span><strong>{name} from {city}</strong> bought <b>{product.name}</b> {minutes} minutes ago</span>
    </Link>
  );
}

function Home({ addToCart, wishlist, toggleWishlist }) {
  useSEO("UrbanWear Studio | Modern Fashion Ecommerce", "A clean luxury-inspired fashion ecommerce homepage for men, women, streetwear, and accessories.");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(FASHION_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    storeService.listProducts({ sort: "featured" })
      .then((data) => {
        if (ignore) return;
        setProducts(data.products || []);
        setCategories((data.categories || FASHION_CATEGORIES).filter((category) => FASHION_CATEGORIES.includes(category)).slice(0, 4));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, []);

  const featuredProducts = products.filter((product) => product.isFeatured);
  const activeProducts = featuredProducts.length ? featuredProducts : products;
  const arrivalProducts = activeProducts.slice(0, 4);
  const cleanCategories = (categories.length ? categories : FASHION_CATEGORIES).slice(0, 4).map((category) => {
    const product = products.find((item) => item.category === category);
    return { name: category, product };
  });

  return (
    <div className="lux-home">
      <HeroSlider products={activeProducts} />

      <section className="lux-focus-row" aria-label="Featured categories">
        <Link to="/products?category=Men" className="lux-focus-card focus-men">
          <span>Men</span>
          <strong>Sharp essentials for every day.</strong>
          <small>Discover</small>
        </Link>
        <Link to="/products?category=Women" className="lux-focus-card focus-women">
          <span>Women</span>
          <strong>Clean silhouettes, softer structure.</strong>
          <small>Discover</small>
        </Link>
      </section>

      <section className="lux-section lux-categories-section">
        <div className="lux-section-head">
          <span className="lux-kicker">Categories</span>
          <h2>Shop by edit</h2>
          <Link to="/products">See all products</Link>
        </div>
        <div className="lux-category-grid">
          {cleanCategories.map(({ name, product }) => (
            <Link key={name} to={`/products?category=${encodeURIComponent(name)}`} className="lux-category-tile">
              <ProductVisual image={product?.images?.[0] || topCategories.find((item) => item.name === name)?.image} name={name} />
              <span>{name}</span>
              <strong>{product ? `From ${formatMoney(product.price)}` : "Explore collection"}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="lux-editorial-band refined-edit-band">
        <div className="edit-copy">
          <span className="lux-kicker">The edit</span>
          <h2>Built for clean daily outfits.</h2>
          <p>Explore sharp city layers, relaxed essentials, and accessories with real product photos, live variant stock, and a faster route to checkout.</p>
          <Link className="lux-primary-btn light" to="/products?category=Streetwear">Explore streetwear</Link>
        </div>
        <div className="edit-feature-grid" aria-label="UrbanWear shopping highlights">
          <div><UiIcon name="sparkles" /><strong>Curated drops</strong><span>Focused edits for men, women, streetwear, and accessories.</span></div>
          <div><UiIcon name="adjustments" /><strong>Live variants</strong><span>Sizes and colors stay connected to available stock.</span></div>
          <div><UiIcon name="bag" /><strong>Quick shopping</strong><span>Save favorites, add to bag, and checkout with less friction.</span></div>
        </div>
      </section>

      <section className="lux-section lux-arrivals-section">
        <div className="lux-section-head">
          <span className="lux-kicker">New arrivals</span>
          <h2>Ready for your wardrobe</h2>
          <Link to="/products?sort=featured">Shop all</Link>
        </div>
        {error && <Alert message={error} />}
        {loading ? <SkeletonGrid /> : <HomeProductGrid products={arrivalProducts} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />}
      </section>

      <section className="lux-story-grid" aria-label="UrbanWear stories">
        <Link to="/products?category=Streetwear" className="lux-story-card story-dark">
          <span>Streetwear</span>
          <strong>Oversized layers, cargos, and bold sneakers.</strong>
          <small>Shop the drop</small>
        </Link>
        <Link to="/products?category=Accessories" className="lux-story-card story-light">
          <span>Accessories</span>
          <strong>Finishing details that keep the look clean.</strong>
          <small>Shop accessories</small>
        </Link>
        <Link to="/products?sort=newest" className="lux-story-card story-neutral">
          <span>Seasonal edit</span>
          <strong>Lightweight pieces for warm city days.</strong>
          <small>View edit</small>
        </Link>
      </section>

      <section className="lux-services" aria-label="UrbanWear benefits">
        <div><strong>Exact variant stock</strong><span>Size and color are selected before checkout.</span></div>
        <div><strong>Secure shopping</strong><span>Authenticated checkout and protected account flow.</span></div>
        <div><strong>Order tracking</strong><span>Check your order progress anytime.</span></div>
      </section>
    </div>
  );
}

function HeroSlider({ products = [] }) {
  const slides = (products.length ? products : [
    { name: "Men's City Edit", category: "Men", price: 58, slug: "", images: ["https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=80"] },
    { name: "Streetwear Drop", category: "Streetwear", price: 59, slug: "", images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80"] },
    { name: "Accessories Edit", category: "Accessories", price: 49, slug: "", images: ["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80"] },
  ]).slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] || slides[0];

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const slideLink = activeSlide?.slug ? `/products/${activeSlide.slug}` : "/products";

  return (
    <section className="uw-hero-slider" aria-label="Featured UrbanWear products">
      <div className="uw-hero-copy">
        <span className="lux-kicker">UrbanWear 2026</span>
        <h1>Street-ready essentials, built around real stock.</h1>
        <p>Shop men, women, streetwear, and accessories with live size/color variants, sharp product imagery, and a faster path from browse to bag.</p>
        <div className="uw-hero-actions">
          <Link className="lux-primary-btn" to="/products?category=Men">Shop men</Link>
          <Link className="lux-text-link" to="/products?sort=newest">New arrivals</Link>
        </div>
        <div className="uw-slide-dots" aria-label="Hero slides">
          {slides.map((slide, index) => (
            <button
              key={slide.sku || slide.slug || slide.name}
              className={activeIndex === index ? "active" : ""}
              type="button"
              aria-label={`Show ${slide.name}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
      <Link className="uw-hero-slide-card" to={slideLink}>
        <ProductVisual image={activeSlide?.images?.[0]} name={activeSlide?.name} />
        <div className="uw-hero-slide-caption">
          <span>{activeSlide?.category || "Featured"}</span>
          <strong>{activeSlide?.name || "UrbanWear edit"}</strong>
          <small>{activeSlide?.price ? formatMoney(activeSlide.price) : "Shop now"}</small>
        </div>
      </Link>
    </section>
  );
}

function HeroShowcase({ products }) {
  const heroItems = products.slice(0, 6);
  const fallback = [
    { name: "Men", images: ["visual-fashion"] },
    { name: "Women", images: ["visual-sneakers"] },
    { name: "Streetwear", images: ["visual-travel"] },
    { name: "Accessories", images: ["visual-bag"] },
  ];
  const items = heroItems.length ? heroItems : fallback;
  return (
    <div className="hero-showcase" aria-label="UrbanWear fashion product showcase">
      <div className="hero-platform platform-one" />
      <div className="hero-platform platform-two" />
      <div className="hero-platform platform-three" />
      {items.slice(0, 5).map((product, index) => (
        <div key={product._id || product.name} className={`hero-floating-item item-${index + 1}`}>
          <ProductVisual image={product.images?.[0]} name={product.name} />
        </div>
      ))}
    </div>
  );
}

function CategoryTile({ category }) {
  return (
    <Link to={`/products?search=${encodeURIComponent(category.name)}`} className={`category-tile ${category.image}`}>
      <strong>{category.name}</strong>
      <span>{visualIconMap[category.image] || "◼"}</span>
      <small>{category.subtitle}</small>
    </Link>
  );
}

function BrandTile({ brand }) {
  return (
    <Link to={`/products?search=${encodeURIComponent(brand.name)}`} className="brand-tile">
      <span className={`brand-logo ${brand.className}`}>{brand.mark}</span>
      <span><strong>{brand.name}</strong><small>{brand.note}</small></span>
    </Link>
  );
}

function DiscountCard({ card }) {
  return (
    <Link to="/products?search=discount" className={`discount-card ${card.tone}`}>
      <span>Save</span>
      <strong>{card.amount}</strong>
      <p>{card.title}</p>
      <div className={`discount-visual ${card.image}`}><span>{visualIconMap[card.image] || "◼"}</span></div>
    </Link>
  );
}

function PromoBanner({ title, text, image, dark = false }) {
  return (
    <section className={`promo-banner ${dark ? "dark" : "light"}`}>
      <div className={`promo-visual ${image}`}><span>{visualIconMap[image] || "◼"}</span></div>
      <div className="promo-copy-card">
        <h2>{title}</h2>
        <p>{text}</p>
        <Link className={dark ? "outline-light-btn" : "dark-btn"} to="/products">Learn More</Link>
      </div>
    </section>
  );
}

function TrendCard({ card }) {
  return (
    <Link to={`/products?category=${encodeURIComponent(card.category)}`} className="trend-card">
      <div className={`trend-image ${card.image}`}><span>{visualIconMap[card.image] || "◼"}</span></div>
      <div>
        <h3>{card.title}</h3>
        <p>{card.text}</p>
        <span className="dark-btn small-static">Shop Now</span>
      </div>
    </Link>
  );
}

function StoreCard({ store }) {
  return (
    <Link to={`/products?search=${encodeURIComponent(store.name)}`} className="store-card">
      <div className={`store-image ${store.image}`}><span>{visualIconMap[store.image] || "◼"}</span></div>
      <span className={`store-badge ${store.className}`}>{store.badge}</span>
      <h3>{store.name}</h3>
      <p>{store.category}</p>
      <small>🏷 Delivery within 24 hours</small>
    </Link>
  );
}

function ServiceCard({ service }) {
  return (
    <article className="service-card">
      <div className="service-copy">
        <h3>{service.title}</h3>
        <p>{service.text}</p>
      </div>
      <div className={`service-image ${service.image}`}><span>{visualIconMap[service.image] || "◼"}</span></div>
    </article>
  );
}

function Products({ addToCart, wishlist, toggleWishlist }) {
  useSEO("Shop Products | UrbanWear", "Explore products by category with real-time stock and fast online checkout.");
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "featured";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const size = searchParams.get("size") || "";
  const color = searchParams.get("color") || "";
  const inStock = searchParams.get("inStock") === "true";
  const heroAction = category
    ? { label: "All products", to: "/products" }
    : { label: "View men", to: "/products?category=Men" };

  useEffect(() => {
    setLoading(true);
    setError("");
    storeService.listProducts({ search, category, sort, minPrice, maxPrice, size, color, inStock: inStock ? "true" : "" })
      .then((data) => {
        setProducts(data.products || []);
        setCategories(data.categories || FASHION_CATEGORIES);
        setSizes(data.sizes || []);
        setColors(data.colors || []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, category, sort, minPrice, maxPrice, size, color, inStock]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  return (
    <section className="shop-page page-section">
      <div className="shop-page-hero">
        <div>
          <span className="eyebrow">{category || "Shop"}</span>
          <h1>{category ? `${category} collection` : "Shop UrbanWear"}</h1>
          <p>Browse a cleaner catalog with real product images, live stock, and quick filters that stay out of the way.</p>
        </div>
        <Link className="secondary-btn" to={heroAction.to}>{heroAction.label}</Link>
      </div>
      <div className="filters shop-filter-bar">
        <input value={search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search products, tags, categories..." />
        <select value={category} onChange={(event) => updateFilter("category", event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={sort} onChange={(event) => updateFilter("sort", event.target.value)}>
          <option value="featured">Featured first</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name_asc">Name A-Z</option>
        </select>
        <select value={size} onChange={(event) => updateFilter("size", event.target.value)}>
          <option value="">All sizes</option>
          {sizes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={color} onChange={(event) => updateFilter("color", event.target.value)}>
          <option value="">All colors</option>
          {colors.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input type="number" min="0" value={minPrice} onChange={(event) => updateFilter("minPrice", event.target.value)} placeholder="Min price" />
        <input type="number" min="0" value={maxPrice} onChange={(event) => updateFilter("maxPrice", event.target.value)} placeholder="Max price" />
        <label className="checkbox-filter"><input type="checkbox" checked={inStock} onChange={(event) => updateFilter("inStock", event.target.checked ? "true" : "")} /> In stock</label>
      </div>
      {error && <Alert message={error} />}
      {loading ? <SkeletonGrid /> : <ProductGrid products={products} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} category={category} />}
    </section>
  );
}

function ProductDetail({ addToCart, wishlist, toggleWishlist }) {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    storeService.getProduct(slug)
      .then((data) => setProduct(data.product))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const initial = normalizeVariantSelection(product);
    setSelectedSize(initial.size);
    setSelectedColor(initial.color);
    setQuantity(1);
  }, [product]);

  useSEO(product?.seoTitle || product?.name || "Product | UrbanWear", product?.seoDescription || product?.description || "Product details and checkout at UrbanWear.");

  if (loading) return <section className="page-section"><div className="skeleton large" /></section>;
  if (error || !product) return <section className="page-section"><Alert message={error || "Product not found."} /></section>;
  const wishlistId = product._id || product.sku || product.slug;
  const isWishlisted = wishlist.some((item) => item.id === wishlistId);
  const sizes = uniqueVariantValues(product, "size");
  const colors = uniqueVariantValues(product, "color");
  const selectedVariant = normalizeVariantSelection(product, { size: selectedSize, color: selectedColor });
  const selectedStock = selectedVariant.stock;

  return (
    <section className="product-detail page-section">
      <ProductVisual image={product.images?.[0]} name={product.name} large />
      <div className="detail-copy">
        <span className="eyebrow">{product.category} / {product.sku}</span>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <div className="price-row">
          <strong>{formatMoney(product.price)}</strong>
          {product.compareAtPrice > product.price && <span>{formatMoney(product.compareAtPrice)}</span>}
        </div>
        <StockBadge product={product} />
        <ul className="highlight-list">
          {(product.highlights || []).map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="variant-picker">
          <label>Size<select value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}>{sizes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Color<select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>{colors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <span className={selectedStock > 0 ? "stock-badge ok" : "stock-badge danger"}>{selectedStock > 0 ? `${selectedStock} available for ${selectedSize}/${selectedColor}` : "Variant out of stock"}</span>
        </div>
        <div className="quantity-row">
          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" type="number" min="1" max={selectedStock || 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
        </div>
        <div className="detail-actions">
          <button className="primary-btn" disabled={!selectedStock} onClick={() => addToCart(product, quantity, { size: selectedSize, color: selectedColor, stock: selectedStock })}>{selectedStock ? "Add to cart" : "Out of stock"}</button>
          <button className="secondary-btn" onClick={() => toggleWishlist(product)}>{isWishlisted ? "Saved" : "Add to wishlist"}</button>
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products, addToCart, wishlist = [], toggleWishlist = () => {}, category = "" }) {
  if (!products.length) return <EmptyState title={category ? `No ${category} products found` : "No products found"} text="Clear the filters or add/publish products from the admin product manager." />;
  return (
    <div className="product-grid">
      {products.map((product) => <ProductCard key={product._id || product.sku || product.slug} product={product} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />)}
    </div>
  );
}

function HomeProductGrid({ products, addToCart, wishlist = [], toggleWishlist = () => {} }) {
  if (!products.length) return <EmptyState title="No featured products yet" text="Add featured UrbanWear products from the admin panel." />;
  return (
    <div className="lux-product-rail">
      {products.map((product) => <HomeProductCard key={product._id || product.sku || product.slug} product={product} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />)}
    </div>
  );
}

function HomeProductCard({ product, addToCart, wishlist, toggleWishlist }) {
  const defaultVariant = normalizeVariantSelection(product);
  const canCart = Boolean(product._id && defaultVariant.stock);
  const wishlistId = product._id || product.sku || product.slug;
  const isWishlisted = wishlist.some((item) => item.id === wishlistId);
  return (
    <article className="lux-product-card">
      <Link to={`/products/${product.slug}`} className="lux-product-media" aria-label={`View ${product.name}`}>
        <ProductVisual image={product.images?.[0]} name={product.name} />
      </Link>
      <div className="lux-product-copy">
        <span>{product.category}</span>
        <h3><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
        <div className="lux-product-meta">
          <strong>{formatMoney(product.price)}</strong>
          <button type="button" className={isWishlisted ? "active" : ""} onClick={() => toggleWishlist(product)} aria-label={`Save ${product.name}`}>Save</button>
        </div>
        <button type="button" onClick={() => addToCart(product, 1, defaultVariant)} disabled={!canCart}>{defaultVariant.stock ? "Add to bag" : "Sold out"}</button>
      </div>
    </article>
  );
}

function ProductCard({ product, addToCart, wishlist, toggleWishlist }) {
  const ratingCount = 121 + Math.abs(String(product.sku || product.name).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 42);
  const defaultVariant = normalizeVariantSelection(product);
  const canCart = Boolean(product._id && defaultVariant.stock);
  const wishlistId = product._id || product.sku || product.slug;
  const isWishlisted = wishlist.some((item) => item.id === wishlistId);
  return (
    <article className="product-card">
      <div className="product-media">
        <button className={`wishlist-btn ${isWishlisted ? "active" : ""}`} aria-label={`Save ${product.name}`} onClick={() => toggleWishlist(product)}>Save</button>
        <Link to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
          <ProductVisual image={product.images?.[0]} name={product.name} />
        </Link>
      </div>
      <div className="product-copy">
        <div className="product-title-row">
          <h3><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
          <strong>{formatMoney(product.price)}</strong>
        </div>
        <p>{product.description}</p>
        <div className="variant-chip-row">
          {uniqueVariantValues(product, "size").slice(0, 4).map((item) => <span key={item}>{item}</span>)}
          {uniqueVariantValues(product, "color").slice(0, 3).map((item) => <span key={item}>{item}</span>)}
        </div>
        <div className="rating-row" aria-label="Product rating">
          <span>Top rated</span>
          <small>({ratingCount} reviews)</small>
        </div>
        <div className="card-bottom">
          <StockBadge product={product} />
          <button onClick={() => addToCart(product, 1, defaultVariant)} disabled={!canCart}>{defaultVariant.stock ? "Add to Cart" : "Sold out"}</button>
        </div>
      </div>
    </article>
  );
}

function ProductVisual({ image = "gradient-box", name, large = false }) {
  const imageValue = String(image || "gradient-box");
  const isRealImage = imageValue.startsWith("http") || imageValue.startsWith("/") || imageValue.startsWith("data:");
  const icon = visualIconMap[imageValue] || String(name || "Product").slice(0, 2).toUpperCase();
  return (
    <div className={`product-visual ${isRealImage ? "has-image" : imageValue} ${large ? "large" : ""}`}>
      {isRealImage ? <img src={imageValue} alt={name || "Product image"} loading="lazy" /> : <span>{icon}</span>}
    </div>
  );
}

function StockBadge({ product }) {
  const stock = Number(product.stock || 0);
  if (stock <= 0) return <span className="stock-badge danger">Out of stock</span>;
  if (stock <= Number(product.lowStockThreshold || 5)) return <span className="stock-badge warn">Low stock: {stock}</span>;
  return <span className="stock-badge ok">In stock: {stock}</span>;
}

function Cart({ cart, updateCartQuantity, removeFromCart }) {
  useSEO("Shopping Cart | UrbanWear", "Review your cart and continue to secure checkout.");
  const totals = calculateOrderTotals(cart);

  return (
    <section className="page-section two-column">
      <div className="panel">
        <div className="section-heading compact">
          <span className="eyebrow">Cart</span>
          <h1>Your selected products</h1>
        </div>
        {!cart.length ? <EmptyState title="Your cart is empty" text="Add products to continue checkout." /> : cart.map((item) => (
          <div className="cart-item" key={item.cartKey || item._id}>
            <ProductVisual image={item.image} name={item.name} />
            <div>
              <h3>{item.name}</h3>
              <p>{item.sku} / {variantLabel(item)} / {formatMoney(item.price)}</p>
            </div>
            <input type="number" min="1" max={item.stock || 1} value={item.quantity} onChange={(event) => updateCartQuantity(item.cartKey || item._id, event.target.value)} />
            <strong>{formatMoney(item.price * item.quantity)}</strong>
            <button className="ghost-btn danger" onClick={() => removeFromCart(item.cartKey || item._id)}>Remove</button>
          </div>
        ))}
      </div>
      <OrderSummary totals={totals} checkoutDisabled={!cart.length} />
    </section>
  );
}

function Wishlist({ wishlist, addToCart, removeFromWishlist }) {
  useSEO("Wishlist | UrbanWear", "Save products for later and move them into your cart when ready.");
  return (
    <section className="page-section">
      <div className="section-heading stacked">
        <span className="eyebrow">Wishlist</span>
        <h1>Saved products</h1>
        <p>Keep a shortlist of products, then add them to cart when you are ready to checkout.</p>
      </div>
      {!wishlist.length ? (
        <EmptyState title="No saved products" text="Save items from product cards to build your wishlist." action={<Link className="primary-btn" to="/products">Browse products</Link>} />
      ) : (
        <div className="product-grid">
          {wishlist.map((item) => (
            <article className="product-card" key={item.id}>
              <div className="product-media">
                <Link to={`/products/${item.slug}`} aria-label={`View ${item.name}`}>
                  <ProductVisual image={item.image} name={item.name} />
                </Link>
              </div>
              <div className="product-copy">
                <div className="product-title-row">
                  <h3><Link to={`/products/${item.slug}`}>{item.name}</Link></h3>
                  <strong>{formatMoney(item.price)}</strong>
                </div>
                <p>{item.sku} saved for later.</p>
                <div className="card-bottom">
                  <button onClick={() => addToCart(item, 1, normalizeVariantSelection(item))} disabled={!item.stock}>{item.stock ? "Add to Cart" : "Sold out"}</button>
                  <button className="ghost-btn danger" onClick={() => removeFromWishlist(item.id)}>Remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OrderSummary({ totals, checkoutDisabled, couponCode = "" }) {
  return (
    <aside className="summary-card">
      <h2>Order summary</h2>
      <div><span>Subtotal</span><strong>{formatMoney(totals.subtotal)}</strong></div>
      {!!totals.discount && <div><span>Discount</span><strong>-{formatMoney(totals.discount)}</strong></div>}
      <div><span>Tax</span><strong>{formatMoney(totals.tax)}</strong></div>
      <div><span>Delivery</span><strong>{totals.deliveryFee ? formatMoney(totals.deliveryFee) : "Free"}</strong></div>
      <div className="summary-total"><span>Total</span><strong>{formatMoney(totals.total)}</strong></div>
      <Link className={`primary-btn full ${checkoutDisabled ? "disabled" : ""}`} to={checkoutDisabled ? "/cart" : "/checkout"}>Checkout</Link>
      <p>{couponCode && totals.coupon ? `${couponCode.toUpperCase()} applied: ${totals.coupon.label}.` : "Try WELCOME10, SAVE25, or FREESHIP at checkout."}</p>
    </aside>
  );
}

function Checkout({ cart, session, clearCart }) {
  useSEO("Checkout | UrbanWear", "Complete your order with delivery details and receive a tracking number.");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
    line1: "",
    line2: "",
    city: "Dhaka",
    area: "",
    postalCode: "",
    country: "Bangladesh",
    paymentMethod: "cash_on_delivery",
    paymentReference: "",
    couponCode: "",
    deliveryNote: "",
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const totals = calculateOrderTotals(cart, form.couponCode);

  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setPlacing(true);
    try {
      const payload = {
        items: cart.map((item) => ({ productId: item._id, quantity: item.quantity, size: item.size, color: item.color })),
        customerInfo: form,
        shippingAddress: form,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        couponCode: form.couponCode,
        deliveryNote: form.deliveryNote,
      };
      const { order } = await storeService.createOrder(payload, session.token);
      clearCart();
      navigate(`/track?tracking=${encodeURIComponent(order.trackingNumber)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  if (!cart.length) return <section className="page-section"><EmptyState title="Cart is empty" text="Add products before checkout." action={<Link className="primary-btn" to="/products">Shop now</Link>} /></section>;
  if (!session) return <section className="page-section"><EmptyState title="Login required" text="Guest users can browse products, but UrbanWear checkout is only available for authenticated customers." action={<Link className="primary-btn" to="/login">Login to checkout</Link>} /></section>;

  return (
    <section className="page-section two-column">
      <form className="panel form-grid" onSubmit={submit}>
        <div className="section-heading compact">
          <span className="eyebrow">Checkout</span>
          <h1>Delivery details</h1>
        </div>
        {error && <Alert message={error} />}
        <label>Name<input name="name" value={form.name} onChange={onChange} required /></label>
        <label>Email<input name="email" type="email" value={form.email} onChange={onChange} required /></label>
        <label>Phone<input name="phone" value={form.phone} onChange={onChange} required /></label>
        <label>City<input name="city" value={form.city} onChange={onChange} required /></label>
        <label className="wide">Address line 1<input name="line1" value={form.line1} onChange={onChange} required /></label>
        <label>Area<input name="area" value={form.area} onChange={onChange} /></label>
        <label>Postal code<input name="postalCode" value={form.postalCode} onChange={onChange} /></label>
        <label>Country<input name="country" value={form.country} onChange={onChange} /></label>
        <label>Payment<select name="paymentMethod" value={form.paymentMethod} onChange={onChange}><option value="cash_on_delivery">Cash on delivery</option><option value="bkash">bKash manual</option><option value="nagad">Nagad manual</option><option value="card">Card placeholder</option></select></label>
        <label>Payment reference<input name="paymentReference" value={form.paymentReference} onChange={onChange} placeholder="Transaction ID or last 4 digits" /></label>
        <label className="wide">Coupon code<input name="couponCode" value={form.couponCode} onChange={onChange} placeholder="WELCOME10, SAVE25, FREESHIP" /></label>
        <label className="wide">Delivery note<textarea name="deliveryNote" value={form.deliveryNote} onChange={onChange} placeholder="Optional delivery instruction" /></label>
        <button className="primary-btn wide" disabled={placing}>{placing ? "Placing order..." : "Place order"}</button>
      </form>
      <OrderSummary totals={totals} couponCode={form.couponCode} />
    </section>
  );
}

function TrackOrder() {
  useSEO("Delivery Status | UrbanWear", "Track your order delivery status with a tracking number.");
  const [searchParams] = useSearchParams();
  const [tracking, setTracking] = useState(searchParams.get("tracking") || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async (event) => {
    event?.preventDefault();
    if (!tracking.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const data = await storeService.trackOrder(tracking.trim());
      setOrder(data.order);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("tracking")) lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="page-section delivery-page">
      <div className="section-heading stacked centered">
        <span className="eyebrow">Delivery status</span>
        <h1>Track your order</h1>
        <p>Enter the tracking number generated at checkout. Staff can update each delivery stage from the admin panel.</p>
      </div>
      <form className="tracking-form" onSubmit={lookup}>
        <input value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Example: UW-20260508-DEMO1" />
        <button className="primary-btn" disabled={loading}>{loading ? "Checking..." : "Track"}</button>
      </form>
      {error && <Alert message={error} />}
      {order && <OrderTrackingCard order={order} />}
    </section>
  );
}

function OrderTrackingCard({ order }) {
  const statuses = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];
  const activeIndex = statuses.indexOf(order.status);
  return (
    <div className="tracking-card">
      <div className="tracking-head">
        <div>
          <span className="eyebrow">{order.orderNumber}</span>
          <h2>{order.trackingNumber}</h2>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="timeline">
        {statuses.map((status, index) => (
          <div className={`timeline-step ${index <= activeIndex ? "active" : ""}`} key={status}>
            <span />
            <strong>{roleLabel(status)}</strong>
          </div>
        ))}
      </div>
      <div className="order-meta-grid">
        <div><span>Expected delivery</span><strong>{formatDate(order.expectedDeliveryDate)}</strong></div>
        <div><span>Subtotal</span><strong>{formatMoney(order.subtotal)}</strong></div>
        <div><span>Discount</span><strong>{order.discount ? `-${formatMoney(order.discount)}` : "None"}</strong></div>
        <div><span>Tax</span><strong>{formatMoney(order.tax)}</strong></div>
        <div><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
        <div><span>Payment</span><strong>{roleLabel(order.paymentStatus)}</strong></div>
      </div>
      <h3>Items</h3>
      {order.items.map((item) => <p key={`${item.sku}-${item.size}-${item.color}-${item.quantity}`}>{item.quantity} x {item.name} ({variantLabel(item)}) - {formatMoney(item.price * item.quantity)}</p>)}
      <h3>Status history</h3>
      <div className="history-list">
        {order.statusHistory?.map((item, index) => <div key={`${item.status}-${index}`}><strong>{roleLabel(item.status)}</strong><span>{formatDate(item.at)} / {item.note || "Updated"}</span></div>)}
      </div>
    </div>
  );
}

function Account({ session, setSession, onLogout }) {
  useSEO("My Account | UrbanWear", "Manage your profile, saved address, wishlist, and previous orders.");
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({ name: session.user.name || "", email: session.user.email || "", photoUrl: session.user.photoUrl || "" });
  const [addresses, setAddresses] = useState(session.user.addresses?.length ? session.user.addresses : [{ label: "Home", name: session.user.name || "", phone: "", line1: "", city: "Dhaka", area: "", postalCode: "", country: "Bangladesh" }]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    storeService.myOrders(session.token)
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(getErrorMessage(err)));
  }, [session.token]);

  const updateProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const data = await storeService.updateProfile(profile, session.token);
      setSession({ ...session, user: data.user });
      setMessage("Profile updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateAddressField = (index, field, value) => {
    setAddresses((current) => current.map((address, addressIndex) => (addressIndex === index ? { ...address, [field]: value } : address)));
  };

  const saveAddresses = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const data = await storeService.updateAddresses(addresses, session.token);
      setSession({ ...session, user: { ...session.user, addresses: data.addresses } });
      setMessage("Address saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="page-section two-column account-page">
      <div className="panel">
        <span className="eyebrow">Account</span>
        <h1>{session.user.name}</h1>
        <p>{session.user.email}</p>
        <span className="role-pill inline">{roleLabel(session.user.role)}</span>
        <button type="button" className="secondary-btn account-logout-btn" onClick={onLogout}>Logout</button>
        {message && <Alert type="success" message={message} />}
        {error && <Alert message={error} />}
        <form className="form-grid compact-form" onSubmit={updateProfile}>
          <label>Name<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} required /></label>
          <label>Email<input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label className="wide">Photo URL<input value={profile.photoUrl} onChange={(event) => setProfile((current) => ({ ...current, photoUrl: event.target.value }))} /></label>
          <button className="primary-btn wide">Update profile</button>
        </form>
        <form className="form-grid compact-form" onSubmit={saveAddresses}>
          <h2 className="wide">Address management</h2>
          {addresses.map((address, index) => (
            <div className="wide address-editor" key={index}>
              <label>Label<input value={address.label || ""} onChange={(event) => updateAddressField(index, "label", event.target.value)} /></label>
              <label>Name<input value={address.name || ""} onChange={(event) => updateAddressField(index, "name", event.target.value)} /></label>
              <label>Phone<input value={address.phone || ""} onChange={(event) => updateAddressField(index, "phone", event.target.value)} /></label>
              <label>City<input value={address.city || ""} onChange={(event) => updateAddressField(index, "city", event.target.value)} /></label>
              <label className="wide">Address<input value={address.line1 || ""} onChange={(event) => updateAddressField(index, "line1", event.target.value)} /></label>
            </div>
          ))}
          <button type="button" className="secondary-btn wide" onClick={() => setAddresses((current) => [...current, { label: "Other", name: session.user.name || "", phone: "", line1: "", city: "Dhaka", country: "Bangladesh" }].slice(0, 5))}>Add another address</button>
          <button className="primary-btn wide">Save addresses</button>
        </form>
      </div>
      <div className="panel">
        <h2>My orders</h2>
        {!orders.length ? <EmptyState title="No orders yet" text="Your logged-in orders will appear here." /> : orders.map((order) => (
          <Link className="order-row" key={order._id} to={`/track?tracking=${encodeURIComponent(order.trackingNumber)}`}>
            <span>{order.orderNumber}</span><strong>{formatMoney(order.total)}</strong><StatusPill status={order.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function AuthPage({ mode, onAuth }) {
  useSEO(mode === "login" ? "Login | UrbanWear" : "Create Account | UrbanWear", "Access your customer account or staff admin panel.");
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const [form, setForm] = useState({ name: "", email: isLogin ? "admin@store.test" : "", password: isLogin ? "test1234" : "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = isLogin ? await storeService.login(form) : await storeService.register({ ...form, role: "customer" });
      onAuth(data);
      navigate(STAFF_ROLES.includes(data.user.role) ? "/admin" : "/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page page-section">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{isLogin ? "Welcome back" : "Create account"}</span>
        <h1>{isLogin ? "Login to your store" : "Start shopping faster"}</h1>
        {error && <Alert message={error} />}
        {!isLogin && <label>Name<input name="name" value={form.name} onChange={onChange} required /></label>}
        <label>Email<input name="email" type="email" value={form.email} onChange={onChange} required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={onChange} required minLength="6" /></label>
        <button className="primary-btn full" disabled={loading}>{loading ? "Please wait..." : isLogin ? "Login" : "Create account"}</button>
        <p>{isLogin ? "Need a customer account?" : "Already have an account?"} <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Register" : "Login"}</Link></p>
        {isLogin && <DemoAccounts />}
      </form>
    </section>
  );
}

function DemoAccounts() {
  return (
    <div className="demo-box">
      <strong>Demo logins</strong>
      <p>Password for all: <code>test1234</code></p>
      <span>admin@store.test</span>
      <span>manager@store.test</span>
      <span>inventory@store.test</span>
      <span>fulfillment@store.test</span>
      <span>customer@store.test</span>
    </div>
  );
}

function AdminPanel({ session }) {
  useSEO("Store Admin | UrbanWear", "Manage products, inventory, delivery statuses, orders, users, and role-based access.");
  const canProducts = PRODUCT_ROLES.includes(session.user.role);
  const canOrders = ORDER_ROLES.includes(session.user.role);
  const canUsers = session.user.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = canProducts ? "catalog" : canOrders ? "orders" : "dashboard";
  const allowedTabs = useMemo(() => {
    const tabs = ["dashboard"];
    if (canProducts) tabs.push("catalog", "addProduct", "collections");
    if (canOrders) tabs.push("orders");
    if (canUsers) tabs.push("users", "settings");
    return tabs;
  }, [canOrders, canProducts, canUsers]);
  const [tab, setTab] = useState(() => allowedTabs.includes(searchParams.get("tab")) ? searchParams.get("tab") : defaultTab);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [movements, setMovements] = useState([]);
  const [collections, setCollections] = useState([]);
  const [users, setUsers] = useState([]);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [collectionForm, setCollectionForm] = useState({ name: "", season: "", description: "", products: [] });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "test1234", role: "customer" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const requests = [storeService.adminDashboard(session.token), storeService.getSettings()];
      if (canProducts) requests.push(storeService.adminProducts(session.token), storeService.inventory(session.token), storeService.adminCollections(session.token));
      if (canOrders) requests.push(storeService.adminOrders(session.token));
      if (canUsers) requests.push(storeService.users(session.token));
      const results = await Promise.all(requests);
      setDashboard(results[0]);
      setSettingsForm({ ...DEFAULT_SETTINGS, ...(results[1]?.settings || {}) });
      let index = 2;
      if (canProducts) {
        setProducts(results[index]?.products || []);
        index += 1;
        setMovements(results[index]?.movements || []);
        index += 1;
        setCollections(results[index]?.collections || []);
        index += 1;
      }
      if (canOrders) {
        setOrders(results[index]?.orders || []);
        index += 1;
      }
      if (canUsers) setUsers(results[index]?.users || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab && allowedTabs.includes(requestedTab) && requestedTab !== tab) setTab(requestedTab);
  }, [allowedTabs, searchParams, tab]);

  const selectTab = (nextTab) => {
    setTab(nextTab);
    setSearchParams(nextTab === defaultTab ? {} : { tab: nextTab });
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await storeService.saveProduct({ ...productForm, stock: Number(productForm.stock), price: Number(productForm.price), compareAtPrice: Number(productForm.compareAtPrice || 0), lowStockThreshold: Number(productForm.lowStockThreshold || 0) }, session.token);
      setProductForm(EMPTY_PRODUCT);
      setMessage("Product saved.");
      refresh();
      selectTab("catalog");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const saveCollection = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await storeService.saveCollection(collectionForm, session.token);
      setCollectionForm({ name: "", season: "", description: "", products: [] });
      setMessage("Collection saved.");
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };


  const saveSettings = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const data = await storeService.updateSettings(settingsForm, session.token);
      setSettingsForm({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
      setMessage("Website settings updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const quickStock = async (product, stock) => {
    try {
      await storeService.updateStock(product._id, { stock: Number(stock), reason: "Admin stock quick update" }, session.token);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const changeOrderStatus = async (order, status, paymentStatus = order.paymentStatus) => {
    try {
      await storeService.updateOrderStatus(order._id, { status, paymentStatus, note: `Marked ${status}` }, session.token);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await storeService.createUser(userForm, session.token);
      setUserForm({ name: "", email: "", password: "test1234", role: "customer" });
      setMessage("User created.");
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateUserRole = async (user, role) => {
    try {
      await storeService.updateUser(user.id || user._id, { name: user.name, email: user.email, role }, session.token);
      setMessage("Role updated.");
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="admin-page page-section">
      <div className="admin-head">
        <div>
          <span className="eyebrow">Admin panel</span>
          <h1>Store operations</h1>
          <p>Logged in as {session.user.name} with <strong>{roleLabel(session.user.role)}</strong> access. Product creation is available to admin, manager, and inventory roles only.</p>
        </div>
        <div className="admin-head-actions">
          {canOrders && <button className="secondary-btn" type="button" onClick={() => selectTab("orders")}>Orders</button>}
          <button className="secondary-btn" onClick={refresh}>Refresh</button>
        </div>
      </div>
      {error && <Alert message={error} />}
      {message && <Alert type="success" message={message} />}
      <div className="admin-tabs">
        <button className={tab === "dashboard" ? "active" : ""} onClick={() => selectTab("dashboard")}>Dashboard</button>
        {canProducts && <button className={tab === "catalog" ? "active" : ""} onClick={() => selectTab("catalog")}>Store catalog</button>}
        {canProducts && <button className={tab === "addProduct" ? "active" : ""} onClick={() => selectTab("addProduct")}>Add product</button>}
        {canProducts && <button className={tab === "collections" ? "active" : ""} onClick={() => selectTab("collections")}>Collections</button>}
        {canOrders && <button className={tab === "orders" ? "active" : ""} onClick={() => selectTab("orders")}>Orders</button>}
        {canUsers && <button className={tab === "users" ? "active" : ""} onClick={() => selectTab("users")}>User roles</button>}
        {session.user.role === "admin" && <button className={tab === "settings" ? "active" : ""} onClick={() => selectTab("settings")}>Website settings</button>}
      </div>

      {tab === "dashboard" && <AdminDashboard dashboard={dashboard} />}
      {(tab === "catalog" || tab === "addProduct") && canProducts && (
        <InventoryTab mode={tab} selectTab={selectTab} products={products} movements={movements} productForm={productForm} setProductForm={setProductForm} saveProduct={saveProduct} quickStock={quickStock} setError={setError} session={session} refresh={refresh} />
      )}
      {tab === "collections" && canProducts && <CollectionsTab collections={collections} products={products} collectionForm={collectionForm} setCollectionForm={setCollectionForm} saveCollection={saveCollection} setError={setError} session={session} refresh={refresh} />}
      {tab === "orders" && canOrders && <OrdersTab orders={orders} changeOrderStatus={changeOrderStatus} />}
      {tab === "users" && canUsers && <UsersTab users={users} userForm={userForm} setUserForm={setUserForm} createUser={createUser} updateUserRole={updateUserRole} />}
      {tab === "settings" && session.user.role === "admin" && <SettingsTab settingsForm={settingsForm} setSettingsForm={setSettingsForm} saveSettings={saveSettings} />}
    </section>
  );
}

function AdminDashboard({ dashboard }) {
  if (!dashboard) return <SkeletonGrid />;
  const stats = dashboard.stats || {};
  return (
    <div className="admin-dashboard-ui">
      <div className="admin-metric-grid">
      <Stat title="Revenue" value={formatMoney(stats.revenue)} />
      <Stat title="Orders" value={stats.orderCount || 0} />
      <Stat title="Pending" value={stats.pendingOrders || 0} />
      <Stat title="Active products" value={stats.activeProducts || 0} />
      </div>
      <div className="panel span-2 admin-insight-panel">
        <h2>Low stock alerts</h2>
        {dashboard.lowStockProducts?.length ? dashboard.lowStockProducts.map((product) => <p key={product._id}>{product.name} / {product.stock} left</p>) : <p>No low stock items.</p>}
      </div>
      <div className="panel span-2 admin-insight-panel">
        <h2>Recent orders</h2>
        {dashboard.recentOrders?.map((order) => <p key={order._id}>{order.orderNumber} / {formatMoney(order.total)} / {roleLabel(order.status)}</p>)}
      </div>
    </div>
  );
}

function InventoryTab({ mode = "catalog", selectTab, products, movements, productForm, setProductForm, saveProduct, quickStock, setError, session, refresh }) {
  const setField = (field, value) => setProductForm((current) => ({ ...current, [field]: value }));
  const images = parseImagesForPreview(productForm.images);
  const menTemplates = [
    {
      name: "Men's Commuter Overshirt",
      sku: "UW-MN-NEW",
      category: "Men",
      brand: "UrbanWear Studio",
      description: "Structured overshirt for everyday city layering.",
      highlights: "Structured cotton, Utility pocket, Layer-ready",
      price: "58",
      compareAtPrice: "76",
      variants: "S/Stone/10, M/Stone/12, L/Stone/8, S/Black/8, M/Black/10, L/Black/7",
      images: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=900&q=72&fm=webp",
      tags: "men, overshirt, city, layer",
      isFeatured: true,
    },
    {
      name: "Men's Relaxed Cargo Trouser",
      sku: "UW-MN-NEW2",
      category: "Men",
      brand: "UrbanWear Utility",
      description: "Relaxed cargo trouser with clean utility pockets and adjustable hems.",
      highlights: "Relaxed fit, Utility pockets, Adjustable hem",
      price: "64",
      compareAtPrice: "84",
      variants: "S/Olive/9, M/Olive/12, L/Olive/8, S/Black/8, M/Black/11, L/Black/7",
      images: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=72&fm=webp",
      tags: "men, cargo, trouser, utility",
      isFeatured: true,
    },
  ];
  const applyTemplate = (template) => setProductForm({ ...EMPTY_PRODUCT, ...template, sku: `${template.sku}-${Date.now().toString().slice(-5)}`, slug: "", lowStockThreshold: 6, isActive: true });
  const uploadImages = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    try {
      const converted = await Promise.all(files.map(fileToWebpDataUrl));
      const nextImages = [...images.filter(Boolean), ...converted];
      setField("images", JSON.stringify(nextImages));
    } catch (err) {
      setError(err.message || "Could not upload image.");
    } finally {
      event.target.value = "";
    }
  };
  const editProduct = (product) => {
    setProductForm({
      ...product,
      highlights: (product.highlights || []).join(", "),
      images: (product.images || []).join(", "),
      tags: (product.tags || []).join(", "),
      variants: (product.variants || []).map((variant) => `${variant.size}/${variant.color}/${variant.stock}`).join(", "),
    });
    selectTab?.("addProduct");
  };
  const unpublish = async (product) => {
    try {
      await storeService.deleteProduct(product._id, session.token);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className={`product-admin-layout ${mode === "addProduct" ? "single-form" : "single-catalog"}`}>
      {mode === "addProduct" && <form className="panel form-grid product-admin-form" onSubmit={saveProduct}>
        <div className="wide product-form-head">
          <span className="eyebrow">Product manager</span>
          <h2>{productForm._id ? "Edit product" : "Add product"}</h2>
          <p>Admins, managers, and inventory staff can add products here. Customer accounts never see this form.</p>
          <div className="template-actions">
            {menTemplates.map((template) => <button key={template.sku} type="button" className="ghost-btn" onClick={() => applyTemplate(template)}>{template.name}</button>)}
          </div>
        </div>
        <label>Name<input value={productForm.name} onChange={(event) => setField("name", event.target.value)} required /></label>
        <label>SKU<input value={productForm.sku} onChange={(event) => setField("sku", event.target.value)} required /></label>
        <label>Category<select value={productForm.category} onChange={(event) => setField("category", event.target.value)} required><option value="">Choose category</option>{FASHION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label>Brand<input value={productForm.brand || ""} onChange={(event) => setField("brand", event.target.value)} /></label>
        <label>Price<input type="number" value={productForm.price} onChange={(event) => setField("price", event.target.value)} required /></label>
        <label>Compare price<input type="number" value={productForm.compareAtPrice || ""} onChange={(event) => setField("compareAtPrice", event.target.value)} /></label>
        <label>Fallback stock<input type="number" value={productForm.stock} onChange={(event) => setField("stock", event.target.value)} /></label>
        <label>Low stock alert<input type="number" value={productForm.lowStockThreshold} onChange={(event) => setField("lowStockThreshold", event.target.value)} /></label>
        <label className="wide">Variants size/color/stock<textarea value={productForm.variants || ""} onChange={(event) => setField("variants", event.target.value)} placeholder="S/Black/10, M/Black/8, L/White/5" required /></label>
        <label className="wide">Description<textarea value={productForm.description} onChange={(event) => setField("description", event.target.value)} required /></label>
        <label className="wide">Highlights comma separated<input value={productForm.highlights || ""} onChange={(event) => setField("highlights", event.target.value)} /></label>
        <label className="wide">Image URL, theme, or uploaded WebP<input value={productForm.images || ""} onChange={(event) => setField("images", event.target.value)} placeholder="https://images.unsplash.com/..., gradient-bag" /></label>
        <label className="wide upload-dropzone">Upload product images as WebP<input type="file" accept="image/*" multiple onChange={uploadImages} /><span>Images are converted in-browser to WebP data URLs before saving.</span></label>
        {!!images.length && <div className="wide upload-preview-grid">{images.slice(0, 6).map((image, imageIndex) => <ProductVisual key={`${imageIndex}-${image.slice(0, 12)}`} image={image} name={productForm.name || "Uploaded product"} />)}</div>}
        <label>Featured<select value={String(productForm.isFeatured)} onChange={(event) => setField("isFeatured", event.target.value === "true")}><option value="false">No</option><option value="true">Yes</option></select></label>
        <label>Active<select value={String(productForm.isActive)} onChange={(event) => setField("isActive", event.target.value === "true")}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="wide">SEO title<input value={productForm.seoTitle || ""} onChange={(event) => setField("seoTitle", event.target.value)} /></label>
        <label className="wide">SEO description<textarea value={productForm.seoDescription || ""} onChange={(event) => setField("seoDescription", event.target.value)} /></label>
        <button className="primary-btn wide">{productForm._id ? "Update product" : "Add product to store"}</button>
      </form>}

      {mode === "catalog" && <div className="panel table-panel product-admin-table">
        <div className="table-title-row">
          <div>
            <span className="eyebrow">Store catalog</span>
            <h2>Products on the store</h2>
          </div>
          <strong>{products.length} products</strong>
        </div>
        <div className="inventory-card-list">
          {products.length ? products.map((product) => (
            <article className="inventory-card" key={product._id}>
              <ProductVisual image={product.images?.[0]} name={product.name} />
              <div className="inventory-card-copy">
                <span>{product.category} / {product.sku}</span>
                <strong>{product.name}</strong>
                <em>{product.brand || "UrbanWear"} / {formatMoney(product.price)}{product.compareAtPrice > product.price ? ` / Compare ${formatMoney(product.compareAtPrice)}` : ""}</em>
                <p>{product.description}</p>
                <div className="inventory-variant-list">
                  {(product.variants || []).slice(0, 6).map((variant) => <small key={`${product._id}-${variant.size}-${variant.color}`}>{variant.size} / {variant.color}: {variant.stock}</small>)}
                  {(product.variants || []).length > 6 && <small>+{product.variants.length - 6} more</small>}
                </div>
              </div>
              <div className="inventory-card-stock">
                <b>{product.stock}</b>
                <span>Total stock</span>
                <StockBadge product={product} />
              </div>
              <label className="quick-stock-label">Stock<input type="number" defaultValue={product.stock} onBlur={(event) => Number(event.target.value) !== Number(product.stock) && quickStock(product, event.target.value)} /></label>
              <div className="inventory-actions">
                <button className="ghost-btn" type="button" onClick={() => editProduct(product)}>Edit</button>
                <button className="ghost-btn danger" type="button" onClick={() => unpublish(product)}>Unpublish</button>
              </div>
            </article>
          )) : (
            <div className="inventory-empty-state">
              <strong>No products in this catalog yet</strong>
              <span>Use the product form to add store items with image, category, price, variants, and live stock.</span>
            </div>
          )}
        </div>
        <h2 className="legacy-inventory-title">Inventory</h2>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Product</th><th>Stock</th><th>Status</th><th>Quick update</th><th></th></tr></thead>
            <tbody>{products.map((product) => <tr key={product._id}>
              <td><strong>{product.name}</strong><br /><span>{product.sku}</span><br /><small>{(product.variants || []).slice(0, 3).map((variant) => `${variant.size}/${variant.color}: ${variant.stock}`).join(" / ")}</small></td>
              <td>{product.stock}</td>
              <td><StockBadge product={product} /></td>
              <td><input type="number" defaultValue={product.stock} onBlur={(event) => Number(event.target.value) !== Number(product.stock) && quickStock(product, event.target.value)} /></td>
              <td><button className="ghost-btn" onClick={() => editProduct(product)}>Edit</button><button className="ghost-btn danger" onClick={() => unpublish(product)}>Unpublish</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <h2>Recent stock movements</h2>
        <div className="history-list compact-history">
          {movements.map((movement) => <div key={movement._id}><strong>{movement.sku} / {movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong><span>{movement.reason} / {formatDate(movement.createdAt)}</span></div>)}
        </div>
      </div>}
    </div>
  );
}

function CollectionsTab({ collections, products, collectionForm, setCollectionForm, saveCollection, setError, session, refresh }) {
  const setField = (field, value) => setCollectionForm((current) => ({ ...current, [field]: value }));
  const editCollection = (collection) => setCollectionForm({
    _id: collection._id,
    name: collection.name || "",
    season: collection.season || "",
    description: collection.description || "",
    products: (collection.products || []).map((product) => product._id || product),
    isActive: collection.isActive !== false,
  });
  const toggleProduct = (productId) => {
    setCollectionForm((current) => {
      const exists = (current.products || []).includes(productId);
      return { ...current, products: exists ? current.products.filter((id) => id !== productId) : [...(current.products || []), productId] };
    });
  };
  const removeCollection = async (collection) => {
    try {
      await storeService.deleteCollection(collection._id, session.token);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="admin-split">
      <form className="panel form-grid" onSubmit={saveCollection}>
        <h2>{collectionForm._id ? "Edit collection" : "Create collection"}</h2>
        <label>Name<input value={collectionForm.name} onChange={(event) => setField("name", event.target.value)} required /></label>
        <label>Season<input value={collectionForm.season} onChange={(event) => setField("season", event.target.value)} placeholder="Summer 2026" /></label>
        <label className="wide">Description<textarea value={collectionForm.description} onChange={(event) => setField("description", event.target.value)} /></label>
        <div className="wide product-checkbox-list">
          <strong>Assign products</strong>
          {products.map((product) => (
            <label key={product._id} className="checkbox-filter"><input type="checkbox" checked={(collectionForm.products || []).includes(product._id)} onChange={() => toggleProduct(product._id)} /> {product.name}</label>
          ))}
        </div>
        <button className="primary-btn wide">Save collection</button>
      </form>
      <div className="panel table-panel">
        <h2>Seasonal collections</h2>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Name</th><th>Season</th><th>Products</th><th></th></tr></thead>
            <tbody>{collections.map((collection) => <tr key={collection._id}>
              <td><strong>{collection.name}</strong><br /><span>{collection.description}</span></td>
              <td>{collection.season || "Core"}</td>
              <td>{collection.products?.length || 0}</td>
              <td><button className="ghost-btn" onClick={() => editCollection(collection)}>Edit</button><button className="ghost-btn danger" onClick={() => removeCollection(collection)}>Unpublish</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ orders, changeOrderStatus }) {
  const statuses = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];
  const paymentStatuses = ["pending", "paid", "failed", "refunded"];
  return (
    <div className="panel table-panel">
      <h2>Orders and delivery statuses</h2>
      <div className="responsive-table">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Delivery</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order._id}>
            <td><strong>{order.orderNumber}</strong><br /><span>{order.trackingNumber}</span></td>
            <td>{order.customerInfo?.name}<br /><span>{order.customerInfo?.phone}</span></td>
            <td>{formatMoney(order.total)}<br /><span>{order.couponCode || "No coupon"}</span></td>
            <td><select value={order.paymentStatus} onChange={(event) => changeOrderStatus(order, order.status, event.target.value)}>{paymentStatuses.map((status) => <option key={status} value={status}>{roleLabel(status)}</option>)}</select><br /><span>{order.paymentReference || order.paymentMethod}</span></td>
            <td><StatusPill status={order.status} /></td>
            <td><select value={order.status} onChange={(event) => changeOrderStatus(order, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{roleLabel(status)}</option>)}</select></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ users, userForm, setUserForm, createUser, updateUserRole }) {
  const setField = (field, value) => setUserForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="admin-split">
      <form className="panel form-grid" onSubmit={createUser}>
        <h2>Create user</h2>
        <label>Name<input value={userForm.name} onChange={(event) => setField("name", event.target.value)} required /></label>
        <label>Email<input type="email" value={userForm.email} onChange={(event) => setField("email", event.target.value)} required /></label>
        <label>Password<input value={userForm.password} onChange={(event) => setField("password", event.target.value)} required minLength="6" /></label>
        <label>Role<select value={userForm.role} onChange={(event) => setField("role", event.target.value)}>{ALL_STORE_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
        <button className="primary-btn wide">Create user</button>
      </form>
      <div className="panel table-panel">
        <h2>Role assignments</h2>
        <div className="responsive-table">
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id || user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td><select value={user.role} onChange={(event) => updateUserRole(user, event.target.value)}>{ALL_STORE_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ settingsForm, setSettingsForm, saveSettings }) {
  const setField = (field, value) => setSettingsForm((current) => ({ ...current, [field]: value }));
  return (
    <form className="panel form-grid settings-admin-card" onSubmit={saveSettings}>
      <div className="wide settings-card-head">
        <span className="eyebrow">Website settings</span>
        <h2>Notice, coupon, logo, and footer details</h2>
        <p>Update the customer notice shown at the top of the site, the WELCOME10 code, contact blocks, and footer.</p>
      </div>
      <label>Logo text<input value={settingsForm.logoText || ""} onChange={(event) => setField("logoText", event.target.value)} /></label>
      <label>Logo subtext<input value={settingsForm.logoSubtext || ""} onChange={(event) => setField("logoSubtext", event.target.value)} /></label>
      <label>Primary phone<input value={settingsForm.phonePrimary || ""} onChange={(event) => setField("phonePrimary", event.target.value)} /></label>
      <label>Secondary phone<input value={settingsForm.phoneSecondary || ""} onChange={(event) => setField("phoneSecondary", event.target.value)} /></label>
      <label>Support email<input type="email" value={settingsForm.supportEmail || ""} onChange={(event) => setField("supportEmail", event.target.value)} /></label>
      <label>Coupon code<input value={settingsForm.couponCode || ""} onChange={(event) => setField("couponCode", event.target.value.toUpperCase())} placeholder="WELCOME10" /></label>
      <label className="wide">Customer notice<textarea value={settingsForm.announcement || ""} onChange={(event) => setField("announcement", event.target.value)} placeholder="Use coupon WELCOME10 for 10% off your first UrbanWear order." /></label>
      <label className="wide">Address<input value={settingsForm.address || ""} onChange={(event) => setField("address", event.target.value)} /></label>
      <label className="wide">Footer note<textarea value={settingsForm.footerNote || ""} onChange={(event) => setField("footerNote", event.target.value)} /></label>
      <button className="primary-btn wide">Save website settings</button>
    </form>
  );
}

function AboutPage() {
  useSEO("About UrbanWear | Modern Fashion", "Learn about UrbanWear, a clean fashion ecommerce brand focused on essentials and variant-based shopping.");
  return (
    <section className="page-section content-page">
      <span className="eyebrow">About</span>
      <h1>UrbanWear is built for clean city wardrobes.</h1>
      <p>We focus on practical essentials, soft colors, strong typography, and simple shopping flows. Every product supports size and color stock so customers know exactly what they can buy.</p>
      <div className="content-card-grid">
        <InfoCard title="Minimal fashion" text="Sharp daily pieces for men, women, streetwear, and accessories without overwhelming the customer." />
        <InfoCard title="Better shopping" text="Cleaner menus, live variant stock, wishlist, authenticated checkout, and order tracking." />
        <InfoCard title="Admin friendly" text="Staff can manage products, collections, orders, users, and website settings from one panel." />
      </div>
    </section>
  );
}

function BlogPage() {
  useSEO("UrbanWear Blog | Style Notes", "Read UrbanWear style notes, shopping guides, and fashion edits.");
  const posts = [
    { title: "How to build a black-and-white wardrobe", tag: "Style guide", text: "Start with heavyweight tees, clean trousers, structured outerwear, and small accessories." },
    { title: "Choosing size and color variants online", tag: "Shopping help", text: "Check the available stock on every product detail page before adding items to your bag." },
    { title: "Streetwear without clutter", tag: "Editorial", text: "Use one oversized piece, one clean base, and one functional accessory to balance a fit." },
  ];
  return (
    <section className="page-section content-page">
      <span className="eyebrow">Blog</span>
      <h1>Style notes for better everyday outfits.</h1>
      <div className="blog-grid">
        {posts.map((post) => <article className="blog-card" key={post.title}><span>{post.tag}</span><h2>{post.title}</h2><p>{post.text}</p><Link to="/products">Shop related pieces</Link></article>)}
      </div>
    </section>
  );
}

function CollectionsPage({ addToCart, wishlist, toggleWishlist }) {
  useSEO("UrbanWear Collections | Curated Fashion", "Shop curated UrbanWear collections for men, women, streetwear, and accessories.");
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    storeService.collections()
      .then((data) => {
        if (!ignore) setCollections(data.collections || []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, []);

  return (
    <section className="collections-page page-section">
      <div className="shop-page-hero">
        <div>
          <span className="eyebrow">Collections</span>
          <h1>Curated UrbanWear edits</h1>
          <p>Shop seasonal drops, everyday essentials, and focused styling stories from the UrbanWear catalog.</p>
        </div>
        <Link className="secondary-btn" to="/products?sort=newest">New arrivals</Link>
      </div>
      {error && <Alert message={error} />}
      {loading ? <SkeletonGrid /> : (
        <div className="collection-showcase-grid">
          {collections.map((collection) => (
            <article className="collection-showcase" key={collection._id || collection.name}>
              <div className="collection-showcase-head">
                <span>{collection.season || "Core"}</span>
                <h2>{collection.name}</h2>
                <p>{collection.description}</p>
              </div>
              <HomeProductGrid products={(collection.products || []).slice(0, 4)} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />
            </article>
          ))}
        </div>
      )}
      {!loading && !collections.length && <EmptyState title="No collections yet" text="Create collections from the admin panel and assign products to publish them here." />}
    </section>
  );
}

function ContactPage() {
  useSEO("Contact UrbanWear | Support", "Contact UrbanWear for delivery, payment, returns, and account support.");
  return (
    <section className="page-section content-page contact-page">
      <span className="eyebrow">Contact</span>
      <h1>Need help with an order or product?</h1>
      <div className="contact-layout">
        <div className="panel contact-info-card">
          <h2>Customer support</h2>
          <p>Phone: +880 1700 000 000</p>
          <p>Email: support@urbanwear.test</p>
          <p>Address: Banani, Dhaka, Bangladesh</p>
          <Link className="primary-btn" to="/track">Track an order</Link>
        </div>
        <form className="panel form-grid contact-form-ui">
          <label>Name<input placeholder="Your name" /></label>
          <label>Email<input type="email" placeholder="you@example.com" /></label>
          <label className="wide">Message<textarea placeholder="Tell us how we can help" /></label>
          <button type="button" className="primary-btn wide">Send message</button>
        </form>
      </div>
    </section>
  );
}

function StatusPill({ status }) {
  return <span className={`status-pill ${status}`}>{roleLabel(status)}</span>;
}

function Stat({ title, value }) {
  return <div className="stat-card"><span>{title}</span><strong>{value}</strong></div>;
}

function InfoCard({ title, text }) {
  return <article className="info-card"><h3>{title}</h3><p>{text}</p></article>;
}

function Alert({ message, type = "error" }) {
  return <div className={`alert ${type}`}>{message}</div>;
}

function EmptyState({ title, text, action }) {
  return <div className="empty-state"><h2>{title}</h2><p>{text}</p>{action}</div>;
}

function SkeletonGrid() {
  return <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton" key={item} />)}</div>;
}

export default App;



