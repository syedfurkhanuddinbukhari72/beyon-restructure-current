import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import KOTTab from '../components/admin/tabs/KOTTab'

// Mock the OrderDataContext
jest.mock('../contexts/OrderDataContext', () => ({
  useOrderData: () => ({
    orders: [
      {
        _id: 'test-order-1',
        status: 'pending',
        source: 'local',
        items: [
          { name: 'Test Item', quantity: 2, price: 10 }
        ],
        customerName: 'Test Customer',
        total: 20,
        createdAt: new Date().toISOString()
      }
    ],
    loading: false,
    error: null
  })
}))

// Mock toast
jest.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
}))

describe('KOTTab', () => {
  it('renders KOT dashboard correctly', () => {
    render(<KOTTab />)
    
    // Check if the component renders
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
  })

  it('displays orders when available', async () => {
    render(<KOTTab />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Customer')).toBeInTheDocument()
    })
  })

  it('shows pending orders by default', async () => {
    render(<KOTTab />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Customer')).toBeInTheDocument()
    })
  })
})
