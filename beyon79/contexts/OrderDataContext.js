import { createContext, useContext, useReducer } from 'react';

const OrderDataContext = createContext();

const initialState = {
  orders: [],
  loading: true,
  error: null
};

const orderReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      console.log('🔄 OrderReducer: SET_LOADING', { loading: action.payload });
      return { ...state, loading: action.payload };
    case 'SET_ORDERS': {
      // PERFORMANCE: Only log summary for large datasets
      const orderCount = action.payload.length;
      if (orderCount > 1000) {
        console.log('🔄 OrderReducer: SET_ORDERS', {
          ordersCount: orderCount,
          message: `Large dataset detected (${orderCount} orders)`
        });
      } else {
        console.log('🔄 OrderReducer: SET_ORDERS', {
          ordersCount: orderCount,
          orders: action.payload.map(o => ({ id: o._id, status: o.status, kotCompleted: o.kotCompleted }))
        });
      }

      // ✅ FIX: Normalize status values to prevent [object Object] display
      const normalizedOrders = action.payload.map(order => ({
        ...order,
        status:
          typeof order.status === 'string'
            ? order.status
            : order.status?.status || 'pending'
      }));

      return {
        ...state,
        orders: normalizedOrders,
        loading: false,
        error: null
      };
    }
    case 'UPDATE_ORDER_OPTIMISTIC': {
      console.log('🔄 OrderReducer: UPDATE_ORDER_OPTIMISTIC', {
        orderId: action.payload.orderId,
        updates: action.payload.updates
      });

      const normalizedStatus =
        typeof action.payload.updates.status === 'string'
          ? action.payload.updates.status
          : action.payload.updates.status?.status;

      return {
        ...state,
        orders: state.orders.map(order =>
          (order.id === action.payload.orderId || order._id === action.payload.orderId)
            ? {
                ...order,
                ...action.payload.updates,
                ...(normalizedStatus ? { status: normalizedStatus } : {})
              }
            : order
        )
      };
    }
    case 'UPDATE_ORDER': {
      const normalizedStatus =
        typeof action.payload.status === 'string'
          ? action.payload.status
          : action.payload.status?.status || 'pending';

      console.log('🔄 OrderReducer: UPDATE_ORDER', {
        orderId: action.payload._id,
        originalStatus: action.payload.status,
        normalizedStatus: normalizedStatus,
        kotCompleted: action.payload.kotCompleted
      });

      return {
        ...state,
        orders: state.orders.map(order =>
          (order.id === action.payload._id || order._id === action.payload._id)
            ? {
                ...order,
                ...action.payload,
                status: normalizedStatus
              }
            : order
        )
      };
    }
    case 'ADD_ORDER':
      console.log('🔄 OrderReducer: ADD_ORDER', {
        orderId: action.payload._id,
        status: action.payload.status,
        kotCompleted: action.payload.kotCompleted
      });
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'SET_ERROR':
      console.log('🔄 OrderReducer: SET_ERROR', { error: action.payload });
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};

export const OrderDataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  return (
    <OrderDataContext.Provider value={{ state, dispatch }}>
      {children}
    </OrderDataContext.Provider>
  );
};

export const useOrderData = () => {
  const context = useContext(OrderDataContext);
  if (!context) {
    throw new Error('useOrderData must be used within OrderDataProvider');
  }
  return context;
};
