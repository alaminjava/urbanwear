# UrbanWear SRS Update Summary

This project was updated from the original general ecommerce implementation into the UrbanWear fashion ecommerce SRS.

## Completed changes

- Rebranded the app and metadata to UrbanWear.
- Added black/white modern fashion UI styling.
- Limited main categories to Men, Women, Streetwear, and Accessories.
- Added variant-level product data: size, color, and stock.
- Added product filtering by size and color.
- Added size/color selection on product detail cards and details pages.
- Updated cart and order items to preserve selected size/color.
- Blocked guest checkout; checkout now requires authentication.
- Added database-backed user wishlist and address storage.
- Added profile and address management to the customer dashboard.
- Added MongoDB Collection model and admin collection management.
- Added SRS API aliases under `/api/products`, `/api/orders`, and `/api/users/...`.
- Added custom API rate limiting middleware.
- Updated demo seed data to UrbanWear fashion products and collections.

## Verification

- `npm run lint` passed.
- `npm run build` passed.
- Server JavaScript syntax check passed.
