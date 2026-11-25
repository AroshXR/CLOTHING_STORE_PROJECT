const Supplier = require('../models/SupplierModel');
const SupplierOrder = require('../models/SupplierOrderModel');
const MaterialInventory = require('../models/MaterialInventoryModel');

// Helper function to parse items string and add to inventory
const addItemsToInventory = async (order) => {
  try {
    // Parse items string (assuming format: "Item1 x10, Item2 x5, Item3 x20")
    const itemsString = order.items;
    const itemsArray = itemsString.split(',').map(item => item.trim());
    
    const inventoryItems = [];
    
    const computeInventoryStatus = (quantity, minimumStock = 10) => (
      quantity === 0 ? 'out_of_stock' : quantity <= minimumStock ? 'low_stock' : 'available'
    );

    // Parse and merge duplicate item names within the same order
    const mergedItemsMap = new Map();
    const lineValue = itemsArray.length ? order.total / itemsArray.length : 0;
    for (const itemString of itemsArray) {
      if (!itemString) continue;
      const match = itemString.match(/^(.+?)\s*x(\d+)$/i);
      const itemName = match ? match[1].trim() : itemString;
      const quantity = match ? parseInt(match[2], 10) : 1;
      const prev = mergedItemsMap.get(itemName);
      if (prev) {
        prev.quantity += quantity;
        prev.totalLineValue += lineValue;
      } else {
        mergedItemsMap.set(itemName, { itemName, quantity, totalLineValue: lineValue });
      }
    }
    const parsedItems = [...mergedItemsMap.values()].map(({ itemName, quantity, totalLineValue }) => ({
      itemName,
      quantity,
      unitPrice: quantity > 0 ? totalLineValue / quantity : 0
    }));

    const existingDocs = parsedItems.length
      ? await MaterialInventory.find({
          supplierId: order.supplierId,
          itemName: { $in: parsedItems.map(i => i.itemName) }
        })
      : [];
    const existingMap = new Map(existingDocs.map(doc => [doc.itemName, doc]));
    const bulkOps = [];
    const toCreate = [];

    for (const { itemName, quantity, unitPrice } of parsedItems) {
      const existingItem = existingMap.get(itemName);
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.totalValue = existingItem.quantity * existingItem.unitPrice;
        existingItem.status = computeInventoryStatus(existingItem.quantity, existingItem.minimumStock ?? 10);
        existingItem.lastUpdated = new Date();
        bulkOps.push({
          updateOne: {
            filter: { _id: existingItem._id },
            update: {
              $set: {
                quantity: existingItem.quantity,
                totalValue: existingItem.totalValue,
                status: existingItem.status,
                lastUpdated: existingItem.lastUpdated
              }
            }
          }
        });
        inventoryItems.push(existingItem);
      } else {
        toCreate.push({
          itemName,
          quantity,
          unitPrice,
          totalValue: quantity * unitPrice,
          status: computeInventoryStatus(quantity, 10),
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          orderId: order._id,
          description: `Added from order #${order._id}`,
          category: 'Materials',
          unit: 'pieces',
          lastUpdated: new Date()
        });
      }
    }

    if (bulkOps.length) await MaterialInventory.bulkWrite(bulkOps);
    if (toCreate.length) {
      const createdDocs = await MaterialInventory.insertMany(toCreate);
      inventoryItems.push(...createdDocs);
    }
    
    console.log(`Added ${inventoryItems.length} items to inventory from order ${order._id}`);
    return inventoryItems;
  } catch (error) {
    console.error('Error adding items to inventory:', error);
    throw error;
  }
};

const getSupplierOrderStatsMap = async (supplierIds) => {
  if (!supplierIds.length) return new Map();
  const rows = await SupplierOrder.aggregate([
    { $match: { supplierId: { $in: supplierIds } } },
    { $group: { _id: '$supplierId', totalOrders: { $sum: 1 }, lastOrder: { $max: '$orderDate' } } }
  ]);
  return new Map(rows.map(r => [String(r._id), { totalOrders: r.totalOrders, lastOrder: r.lastOrder || 'Never' }]));
};

// Get all suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    const statsMap = await getSupplierOrderStatsMap(suppliers.map(s => s._id));
    const suppliersWithOrderCounts = suppliers.map((supplier) => {
      const stats = statsMap.get(String(supplier._id)) || { totalOrders: 0, lastOrder: 'Never' };
      return {
        ...supplier.toObject(),
        totalOrders: stats.totalOrders,
        lastOrder: stats.lastOrder
      };
    });

    res.status(200).json(suppliersWithOrderCounts);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
};

// Get single supplier
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier', error: error.message });
  }
};

// Create new supplier
exports.createSupplier = async (req, res) => {
  try {
    console.log('Creating supplier with data:', req.body);
    
    // Handle empty registration number
    if (req.body.companyDetails && !req.body.companyDetails.registrationNumber) {
      delete req.body.companyDetails.registrationNumber;
    }
    
    const supplier = new Supplier(req.body);
    console.log('Supplier model created:', supplier);
    const savedSupplier = await supplier.save();
    console.log('Supplier saved successfully:', savedSupplier);
    res.status(201).json(savedSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(400).json({ message: 'Error creating supplier', error: error.message });
  }
};

// Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json(supplier);
  } catch (error) {
    res.status(400).json({ message: 'Error updating supplier', error: error.message });
  }
};

// Delete supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    // Also delete all orders associated with this supplier
    await SupplierOrder.deleteMany({ supplierId: req.params.id });
    
    res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await SupplierOrder.find().populate('supplierId').sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id).populate('supplierId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const order = new SupplierOrder(req.body);
    const savedOrder = await order.save();
    
    // Update supplier's total orders and last order date
    const supplier = await Supplier.findById(req.body.supplierId);
    if (supplier) {
      supplier.totalOrders += 1;
      supplier.lastOrder = req.body.orderDate;
      await supplier.save();
    }
    
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error: error.message });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    // Get the current order to check status change
    const currentOrder = await SupplierOrder.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = await SupplierOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // If status changed to 'completed', add items to inventory
    if (currentOrder.status !== 'completed' && req.body.status === 'completed') {
      try {
        const inventoryItems = await addItemsToInventory(order);
        console.log(`Order ${order._id} completed. Added ${inventoryItems.length} items to inventory.`);
        
        return res.status(200).json({
          order,
          message: `Order completed successfully. ${inventoryItems.length} items added to inventory.`,
          inventoryItems
        });
      } catch (inventoryError) {
        console.error('Error adding items to inventory:', inventoryError);
        // Still return the updated order even if inventory update fails
        return res.status(200).json({
          order,
          warning: 'Order updated but failed to add items to inventory',
          error: inventoryError.message
        });
      }
    }
    
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await SupplierOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update supplier's total orders count
    const supplier = await Supplier.findById(order.supplierId);
    if (supplier && supplier.totalOrders > 0) {
      supplier.totalOrders -= 1;
      await supplier.save();
    }
    
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [supplierStats, orderStats] = await Promise.all([
      Supplier.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      SupplierOrder.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$total' } } }])
    ]);

    const supplierMap = new Map(supplierStats.map(s => [s._id, s.count]));
    const orderMap = new Map(orderStats.map(s => [s._id, s.count]));

    res.status(200).json({
      totalSuppliers: supplierStats.reduce((sum, s) => sum + s.count, 0),
      activeSuppliers: supplierMap.get('active') || 0,
      totalOrders: orderStats.reduce((sum, s) => sum + s.count, 0),
      pendingOrders: orderMap.get('pending') || 0,
      totalValue: orderStats.reduce((sum, s) => sum + (s.totalValue || 0), 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};

// Fix supplier order counts - recalculate totalOrders for all suppliers
exports.fixSupplierOrderCounts = async (req, res) => {
  try {
    console.log('Starting supplier order count fix...');
    
    const suppliers = await Supplier.find();
    const statsMap = await getSupplierOrderStatsMap(suppliers.map(s => s._id));
    const bulkOps = [];

    for (const supplier of suppliers) {
      const stats = statsMap.get(String(supplier._id)) || { totalOrders: 0, lastOrder: 'Never' };
      if (supplier.totalOrders !== stats.totalOrders || supplier.lastOrder !== stats.lastOrder) {
        supplier.totalOrders = stats.totalOrders;
        supplier.lastOrder = stats.lastOrder;
        bulkOps.push({
          updateOne: {
            filter: { _id: supplier._id },
            update: { $set: { totalOrders: stats.totalOrders, lastOrder: stats.lastOrder, updatedAt: new Date() } }
          }
        });
      }
    }

    if (bulkOps.length) await Supplier.bulkWrite(bulkOps);

    res.status(200).json({
      message: 'Supplier order counts fixed successfully',
      totalSuppliers: suppliers.length,
      updatedSuppliers: bulkOps.length,
      details: suppliers.map(s => ({
        name: s.name,
        totalOrders: s.totalOrders,
        lastOrder: s.lastOrder
      }))
    });
  } catch (error) {
    console.error('Error fixing supplier order counts:', error);
    res.status(500).json({ message: 'Error fixing supplier order counts', error: error.message });
  }
};
