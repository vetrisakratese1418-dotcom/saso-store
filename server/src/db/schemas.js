import mongoose from 'mongoose';

const { Schema } = mongoose;

const VariantSchema = new Schema(
  {
    name: { type: String, default: '' },
    options: [{ type: String }],
  },
  { _id: false },
);

const ProductVariantValueSchema = new Schema(
  {
    values: { type: Object, default: {} },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    costPrice: { type: Number, default: null },
    category: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    brand: { type: String, default: '' },
    images: [{ type: String }],
    tags: [{ type: String }],
    attributes: { type: Object, default: {} },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    sku: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    variants: [VariantSchema],
    variantValues: [ProductVariantValueSchema],
  },
  { timestamps: true },
);

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    subcategories: [{ name: String, slug: String }],
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const ReviewSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, default: '' },
    userName: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '' },
    comment: { type: String, default: '' },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const OrderItemSchema = new Schema(
  {
    productId: { type: String },
    name: { type: String },
    slug: { type: String },
    image: { type: String },
    price: { type: Number },
    qty: { type: Number },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    userId: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    items: [OrderItemSchema],
    totals: {
      subtotal: Number,
      discount: Number,
      shipping: Number,
      tax: Number,
      grandTotal: Number,
    },
    coupon: { code: String, discount: Number },
    status: { type: String, default: 'pending' },
    payment: {
      method: String,
      status: { type: String, default: 'pending' },
      gateway: String,
      transactionId: String,
      paidAt: Date,
    },
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    timeline: [{ status: String, at: Date, note: String }],
    notes: { type: String, default: '' },
    returnRequest: { type: Object, default: null },
  },
  { timestamps: true },
);

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    appliesTo: { type: String, default: 'all' },
    productIds: [{ type: String }],
    categoryIds: [{ type: String }],
  },
  { timestamps: true },
);

const InventoryLogSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    productName: { type: String, default: '' },
    sku: { type: String, default: '' },
    change: { type: Number, required: true },
    reason: { type: String, default: 'adjustment' },
    reference: { type: String, default: '' },
    stockAfter: { type: Number, default: 0 },
    by: { type: String, default: 'system' },
  },
  { timestamps: true },
);

const NewsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: '' },
  },
  { timestamps: true },
);

const PaymentSessionSchema = new Schema(
  {
    orderNumber: { type: String, unique: true, required: true },
    userId: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    items: [OrderItemSchema],
    totals: {
      subtotal: Number,
      discount: Number,
      shipping: Number,
      tax: Number,
      grandTotal: Number,
    },
    coupon: { code: String, discount: Number },
    paymentMethod: { type: String, required: true },
    payment: {
      method: String,
      status: { type: String, default: 'pending' },
      gateway: String,
      testRef: String,
      upiLink: String,
      vpa: String,
      merchantName: String,
      razorpayOrderId: String,
      paymentIntentId: String,
      paypalOrderId: String,
    },
    status: { type: String, enum: ['pending', 'paid', 'cancelled', 'failed', 'expired'], default: 'pending' },
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    notes: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const PaymentComplaintSchema = new Schema(
  {
    orderNumber: { type: String, default: '' },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    transactionId: { type: String, default: '' },
    paymentTime: { type: Date, default: null },
    errorDetails: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'dismissed'], default: 'open' },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true },
);

const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const EmailVerificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const WishlistSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
  },
  { timestamps: true },
);

const CartSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
    qty: { type: Number, default: 1 },
  },
  { timestamps: true },
);

const ReturnRequestSchema = new Schema(
  {
    orderNumber: { type: String, required: true, index: true },
    userId: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    items: [{ productId: String, name: String, qty: Number, reason: String }],
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'refunded', 'completed'], default: 'pending' },
    refundAmount: { type: Number, default: 0 },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Models = {
  users: mongoose.models.users || mongoose.model('users', UserSchema),
  products: mongoose.models.products || mongoose.model('products', ProductSchema),
  categories: mongoose.models.categories || mongoose.model('categories', CategorySchema),
  reviews: mongoose.models.reviews || mongoose.model('reviews', ReviewSchema),
  orders: mongoose.models.orders || mongoose.model('orders', OrderSchema),
  coupons: mongoose.models.coupons || mongoose.model('coupons', CouponSchema),
  inventoryLogs: mongoose.models.inventoryLogs || mongoose.model('inventoryLogs', InventoryLogSchema),
  newsletterSubscribers:
    mongoose.models.newsletterSubscribers ||
    mongoose.model('newsletterSubscribers', NewsletterSubscriberSchema),
  settings: mongoose.models.settings || mongoose.model('settings', SettingSchema),
  paymentSessions:
    mongoose.models.paymentSessions || mongoose.model('paymentSessions', PaymentSessionSchema),
  paymentComplaints:
    mongoose.models.paymentComplaints || mongoose.model('paymentComplaints', PaymentComplaintSchema),
  passwordResetTokens:
    mongoose.models.passwordResetTokens || mongoose.model('passwordResetTokens', PasswordResetTokenSchema),
  emailVerifications:
    mongoose.models.emailVerifications || mongoose.model('emailVerifications', EmailVerificationSchema),
  wishlists:
    mongoose.models.wishlists || mongoose.model('wishlists', WishlistSchema),
  carts:
    mongoose.models.carts || mongoose.model('carts', CartSchema),
  returnRequests:
    mongoose.models.returnRequests || mongoose.model('returnRequests', ReturnRequestSchema),
};
