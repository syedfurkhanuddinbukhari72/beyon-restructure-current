import { upsertLocalOrder, getAllOrders, getBackendOrders, getLocalOrders, updateLocalOrderStatus } from '../src/localDataService';

export const createOrder = async (orderData) => {
  try {
    const order = await upsertLocalOrder({
      customerNumber: orderData.customerNumber,
      items: orderData.items.map(item => ({
        name: item.name,
        price: typeof item.price === 'number' ? item.price : Number(item.price) || 0,
        quantity: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : Number(item.quantity || item.qty) || 0)
      })),
      total: orderData.total,
      note: orderData.note,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return { success: true, order };
  } catch (error) {
    console.error("Order creation error:", error);
    throw error;
  }
};

export const getOrders = async () => {
  try {
    const orders = await getAllOrders();
    return orders;
  } catch (error) {
    console.error("Orders fetch error:", error);
    throw error;
  }
};
