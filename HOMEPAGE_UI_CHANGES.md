# Homepage UI Cleanup

Updated the UrbanWear homepage into a cleaner expert-style storefront.

## Changed
- Removed the old promo bar from the top of the site.
- Simplified the navbar to core shopping links only: Shop, Men, Women, Streetwear, Accessories, Admin when applicable.
- Replaced the cluttered homepage with a clean layout:
  - Minimal hero section
  - Product-focused hero gallery
  - Four clean category cards
  - Four featured product cards
  - Simple three-point benefits strip
- Removed unnecessary homepage sections:
  - Coupon stack / offer block
  - Editor picks duplication
  - Extra deal sections
  - Brand grid
  - Service row clutter
  - Repeated category strip
- Simplified footer to a clean single-row layout.
- Added responsive CSS for desktop, laptop, tablet, and mobile.
- Kept all existing backend, cart, wishlist, auth, checkout, product, variant, and admin functionality intact.

## Verified
- `npm run lint` passes.
- `npm run build` passes.
