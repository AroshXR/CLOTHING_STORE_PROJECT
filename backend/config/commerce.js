const defaultPrices = {
  basePrices: { tshirt: 25 },
  sizePrices: { S: 0, M: 0, L: 3, XL: 5, XXL: 8 },
  presetDesigns: [15, 20, 18, 12, 10, 8].map((price, index) => ({
    id: index + 1, name: `Design ${index + 1}`, price,
    preview: `print${index + 1}`, isActive: true
  })),
  customUploadPrice: 25,
  customTextPrice: 0
};

// Preserve the current shop's pricing rules in one server-owned configuration.
const shippingPrices = { standard: 5.99, express: 15.99, overnight: 29.99, collection: 0 };
const taxRate = 0.08;
const giftWrapPrice = 4.99;

module.exports = { defaultPrices, shippingPrices, taxRate, giftWrapPrice };
