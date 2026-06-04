# Database Relationship Diagram — Phase 1
> Cross-reference with FINAL_PHASE1_SCHEMA.md for field definitions.

---

## ER Diagram (Mermaid)

```mermaid
erDiagram

    User {
        uuid id PK
        string name
        string username UK
        string email UK
        string password
        string phone
        string avatar
        string gender
        enum role
        bool isEmailVerified
        datetime createdAt
        datetime updatedAt
    }

    RefreshToken {
        uuid id PK
        string token UK
        uuid userId FK
        string deviceInfo
        datetime expiresAt
        bool isRevoked
        datetime createdAt
    }

    PasswordResetToken {
        uuid id PK
        string token UK
        uuid userId FK
        datetime expiresAt
        datetime usedAt
        datetime createdAt
    }

    Category {
        uuid id PK
        string name UK
        string slug UK
        string description
        string image
        uuid parentId FK
        datetime createdAt
        datetime updatedAt
    }

    Product {
        uuid id PK
        string name
        string slug UK
        string description
        decimal basePrice
        decimal comparePrice
        int stock
        string sku UK
        string[] images
        bool isVisible
        uuid categoryId FK
        datetime createdAt
        datetime updatedAt
    }

    Cart {
        uuid id PK
        uuid userId FK UK
        datetime createdAt
        datetime updatedAt
    }

    CartItem {
        uuid id PK
        uuid cartId FK
        uuid productId FK
        int quantity
        datetime createdAt
        datetime updatedAt
    }

    Address {
        uuid id PK
        uuid userId FK
        string name
        string email
        string phone
        string line1
        string line2
        string city
        string state
        string country
        string postalCode
        bool isDefault
        datetime createdAt
        datetime updatedAt
    }

    Order {
        uuid id PK
        uuid userId FK
        uuid addressId FK
        enum status
        decimal subtotal
        decimal discountAmount
        decimal taxAmount
        decimal shippingAmount
        decimal totalAmount
        string couponCode
        string notes
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        uuid id PK
        uuid orderId FK
        uuid productId FK
        string productName
        string productSku
        int quantity
        decimal priceAtPurchase
        datetime createdAt
    }

    User ||--o{ RefreshToken : "has"
    User ||--o{ PasswordResetToken : "has"
    User ||--o| Cart : "owns"
    User ||--o{ Address : "has"
    User ||--o{ Order : "places"

    Category ||--o{ Product : "contains"
    Category ||--o{ Category : "parent of"

    Cart ||--o{ CartItem : "contains"
    Product ||--o{ CartItem : "added to"

    Order }o--|| Address : "delivers to"
    Order ||--o{ OrderItem : "contains"
    Product ||--o{ OrderItem : "sold in"
```

---

## Cardinality Table

| Relationship | Cardinality | Notes |
|-------------|-------------|-------|
| User → RefreshToken | 1 : many | Each login session creates one. Multiple devices supported. |
| User → PasswordResetToken | 1 : many | Multiple in-flight resets allowed (e.g. user clicks "resend"). Only one checked at a time — latest valid one wins. |
| User → Cart | 1 : 0-or-1 | Exactly one cart per user. Auto-created on registration. `@@unique([userId])` enforces this. |
| User → Address | 1 : many | User can have multiple addresses. One marked `isDefault = true`. |
| User → Order | 1 : many | Order history. |
| Category → Category | 1 : many | Self-referential tree. One parent, many children. Children of deleted parent become root-level (SetNull). |
| Category → Product | 1 : many | Every product belongs to exactly one category. Category cannot be deleted if it has products (Restrict). |
| Cart → CartItem | 1 : many | One cart contains multiple line items. |
| Product → CartItem | 1 : many | A product can appear in many users' carts simultaneously. |
| CartItem constraint | unique `(cartId, productId)` | One line per product per cart — duplicate prevention. |
| Order → OrderItem | 1 : many | One order contains multiple line items. |
| Product → OrderItem | 1 : many | A product can appear in many historical orders. |
| OrderItem constraint | unique `(orderId, productId)` | One line per product per order. |
| Order → Address | many : 1 | Many orders can reference the same address. Address Restrict-protected from deletion once used. |

---

## Entity Groups

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTH GROUP                                                                 │
│  User ──── RefreshToken                                                     │
│       └─── PasswordResetToken                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRODUCT GROUP                                                              │
│  Category (self-referential tree) ──── Product                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  CART GROUP                                                                 │
│  Cart ──── CartItem ──── Product                                            │
│  Cart.userId ──── User                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ADDRESS GROUP                                                              │
│  Address.userId ──── User                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ORDER GROUP                                                                │
│  Order ──── OrderItem ──── Product                                          │
│  Order.userId ──── User                                                     │
│  Order.addressId ──── Address                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Full Cascade / Restrict / SetNull Behaviour

### Cascade (child rows deleted automatically)

| If this record is deleted... | These records are also deleted |
|------------------------------|-------------------------------|
| `User` | `RefreshToken`, `PasswordResetToken`, `Cart`, `CartItem` (via Cart), `Address` |
| `Cart` | `CartItem` |
| `Order` | `OrderItem` |
| `Product` | `CartItem` — if a product is deleted, cart lines for it vanish |

> **Note on Product → CartItem cascade:** This is intentional. A deleted product means the item is no longer available. The user's cart silently loses the line. The UI should handle this gracefully by refreshing the cart before checkout.

### Restrict (deletion is blocked — error returned to caller)

| If you try to delete... | It fails because... | Resolution |
|-------------------------|---------------------|-----------|
| `User` with orders | `Order.userId` FK | Anonymize user data instead. Implement soft-delete in Phase 4. |
| `Category` with products | `Product.categoryId` FK | Reassign all products first, then delete. |
| `Product` with order history | `OrderItem.productId` FK | Set `isVisible = false` instead of deleting. |
| `Address` used in an order | `Order.addressId` FK | UI must prevent deletion of addresses in use. |

### SetNull (child's FK becomes NULL)

| If this record is deleted... | These fields become NULL |
|------------------------------|--------------------------|
| `Category` (parent) | `Category.parentId` on children — children become top-level categories |

---

## Critical Design Notes

### 1. `OrderItem` Point-in-Time Snapshots
`OrderItem.productName`, `OrderItem.productSku`, and `OrderItem.priceAtPurchase` are **copies at time of purchase**, not FK references to the current values. This means:
- Renaming a product does not corrupt order history
- Changing a product's price does not affect past orders
- Even if a product is eventually soft-deleted or made invisible, orders still display correctly

### 2. Cart vs Order — Two Separate Models
Cart is the "working list" — mutable, ephemeral, per-session intent.
Order is the "committed record" — immutable intent that triggered stock deduction.
They are deliberately separate. Converting Cart → Order requires:
1. Validate stock for each CartItem
2. Atomically deduct stock (`$transaction`)
3. Create Order + OrderItems with price snapshots
4. Clear the Cart

### 3. Category Tree Depth
The self-referential Category tree has no depth limit in schema, but the application layer should enforce a max depth of 3 (Root > Sub > Sub-sub) to prevent infinite UI recursion. This constraint is applied in the CategoryService, not the schema.

### 4. Address `isDefault`
Only one address per user should have `isDefault = true`. This is NOT enforced at the database level (no partial unique index). It is enforced at the application layer. The seed and registration flow will set the first address as default automatically.

### 5. Order Amount Fields
All five amount fields on Order are Decimal:
```
totalAmount = subtotal - discountAmount + taxAmount + shippingAmount
```
This is calculated and stored during order creation, not derived at query time. Prevents rounding errors in reporting.
