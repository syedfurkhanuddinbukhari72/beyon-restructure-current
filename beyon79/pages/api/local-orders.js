import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const ordersPath = path.join(process.cwd(), 'data', 'local-orders.json');
    
    if (req.method === 'GET') {
      // Read existing orders
      const data = await fs.readFile(ordersPath, 'utf8');
      const orders = JSON.parse(data);
      
      res.status(200).json(orders);
    } else if (req.method === 'POST') {
      // Add new order
      const newOrder = req.body;
      
      // Read existing orders
      const data = await fs.readFile(ordersPath, 'utf8');
      const orders = JSON.parse(data);
      
      // Add new order
      orders.push(newOrder);
      
      // Write back to file
      await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
      
      res.status(201).json(newOrder);
    } else if (req.method === 'PUT') {
      // Update existing order
      const updatedOrder = req.body;
      
      // Read existing orders
      const data = await fs.readFile(ordersPath, 'utf8');
      const orders = JSON.parse(data);
      
      // Find and update order
      const index = orders.findIndex(order => order._id === updatedOrder._id);
      if (index !== -1) {
        orders[index] = updatedOrder;
        
        // Write back to file
        await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
        
        res.status(200).json(updatedOrder);
      } else {
        res.status(404).json({ error: 'Order not found' });
      }
    } else if (req.method === 'DELETE') {
      // Delete order
      const orderId = req.query.id;
      
      // Read existing orders
      const data = await fs.readFile(ordersPath, 'utf8');
      const orders = JSON.parse(data);
      
      // Remove order
      const filteredOrders = orders.filter(order => order._id !== orderId);
      
      // Write back to file
      await fs.writeFile(ordersPath, JSON.stringify(filteredOrders, null, 2));
      
      res.status(200).json({ message: 'Order deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
