// server/utils/inventoryEngine.js

/**
 * Resolves the precise ProductVariant ID based on product and size.
 * Handles fallbacks to sizeless variants for accessories.
 */
const resolveVariant = async (productId, size, prisma) => {
  if (!productId) return null;
  const pId = parseInt(productId);
  if (isNaN(pId)) return null;

  let variant = await prisma.productVariant.findFirst({
    where: { 
      productId: pId,
      size: size ? size.trim() : null
    }
  });

  if (!variant && size) {
    variant = await prisma.productVariant.findFirst({
      where: { productId: pId, size: null }
    });
  }

  return variant ? variant.id : null;
};

/**
 * Builds an aggregated map of required quantities by variant ID.
 * Resolves standard items, embedded bundles, hinges, and jambs.
 */
const buildStockMap = async (items, prisma) => {
  const stockMap = {}; // { variantId: quantity }
  
  for (const item of items) {
    const itemQty = parseInt(item.quantity) || 0;
    if (itemQty <= 0) continue;

    if (item.product || item.productId) {
      const pId = parseInt(item.product || item.productId);
      
      // Resolve base variant
      const variantId = await resolveVariant(pId, item.size, prisma);
      if (variantId) {
        stockMap[variantId] = (stockMap[variantId] || 0) + itemQty;
      }
      
      // Resolve bundles
      const product = await prisma.product.findUnique({
        where: { id: pId },
        include: { bundlesAsParent: true }
      });
      
      if (product && product.bundlesAsParent && product.bundlesAsParent.length > 0) {
        for (const bundle of product.bundlesAsParent) {
          const childVariantId = await resolveVariant(bundle.childProductId, null, prisma);
          if (childVariantId) {
            stockMap[childVariantId] = (stockMap[childVariantId] || 0) + (itemQty * bundle.quantity);
          }
        }
      }
    }
    
    // Resolve manually linked Hinge
    if (item.hingeProduct || item.hingeProductId) {
      const hId = parseInt(item.hingeProduct || item.hingeProductId);
      const hingeQty = parseInt(item.hingeQuantity) || 0;
      if (hingeQty > 0) {
        const hingeVariantId = await resolveVariant(hId, null, prisma);
        if (hingeVariantId) {
          stockMap[hingeVariantId] = (stockMap[hingeVariantId] || 0) + hingeQty;
        }
      }
    }
    
    // Resolve manually linked Jamb
    if (item.jambProduct || item.jambProductId) {
      const jId = parseInt(item.jambProduct || item.jambProductId);
      const jambQty = parseInt(item.jambQuantity) || 0;
      if (jambQty > 0) {
        const jambVariantId = await resolveVariant(jId, null, prisma);
        if (jambVariantId) {
          stockMap[jambVariantId] = (stockMap[jambVariantId] || 0) + jambQty;
        }
      }
    }
  }
  
  return stockMap;
};

/**
 * Builds a delta map representing the difference between two states.
 * Positive = need to deduct more stock.
 * Negative = need to restore stock.
 */
const buildDiffMap = async (oldItems, newItems, prisma) => {
  const oldStockMap = await buildStockMap(oldItems || [], prisma);
  const newStockMap = await buildStockMap(newItems || [], prisma);
  const diffMap = {};

  // First subtract old quantities (restoring them)
  for (const [vId, qty] of Object.entries(oldStockMap)) {
    diffMap[vId] = -(qty);
  }

  // Then add new quantities (deducting them)
  for (const [vId, qty] of Object.entries(newStockMap)) {
    diffMap[vId] = (diffMap[vId] || 0) + qty;
  }

  return diffMap;
};

/**
 * Validates if the required stock levels are mathematically available.
 */
const validateStockLevels = async (stockMap, prisma) => {
  for (const [variantId, requiredQty] of Object.entries(stockMap)) {
    if (requiredQty <= 0) continue; // Only validate actual deductions
    
    const vId = parseInt(variantId);
    const variant = await prisma.productVariant.findUnique({
      where: { id: vId },
      include: { product: true }
    });
    
    if (!variant) return { success: false, message: `Product variant not found: ID ${vId}` };
    
    if (variant.quantity < requiredQty) {
      return { 
        success: false, 
        message: `Insufficient stock for ${variant.product.name} (Size: ${variant.size || 'N/A'}). Requested: ${requiredQty}, Available: ${variant.quantity}` 
      };
    }
  }
  return { success: true };
};

module.exports = {
  resolveVariant,
  buildStockMap,
  buildDiffMap,
  validateStockLevels
};
