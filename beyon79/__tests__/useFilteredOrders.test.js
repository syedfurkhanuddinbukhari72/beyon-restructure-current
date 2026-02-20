import { renderHook } from '@testing-library/react';
import { useFilteredOrders } from '../hooks/useFilteredOrders';

// Mock dependencies if needed
jest.mock('../models/kotModel', () => ({
    KOT_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PREPARING: 'preparing',
        READY: 'ready',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    }
}));

describe('useFilteredOrders', () => {
    const mockOrders = [
        { _id: '1', status: 'pending', createdAt: '2023-10-26T10:00:00Z', source: 'local' },
        { _id: '2', status: 'ready', createdAt: '2023-10-26T09:00:00Z', source: 'local' },
        { _id: '3', status: 'completed', kotCompleted: true, createdAt: '2023-10-26T08:00:00Z', source: 'local' },
        { _id: '4', status: 'paid', createdAt: '2023-10-26T07:00:00Z', source: 'local' },
        { _id: '5', status: 'cancelled', createdAt: '2023-10-26T06:00:00Z', source: 'local' },
        { _id: '6', status: 'preparing', kotCompleted: true, createdAt: '2023-10-26T09:30:00Z', source: 'local' } // KOT done, status lagging
    ];

    it('should filter Ready orders correctly (status=ready OR kotCompleted=true)', () => {
        const { result } = renderHook(() => useFilteredOrders(mockOrders, 'Ready'));

        // Should include:
        // Order 2 (status: ready)
        // Order 3 (kotCompleted: true, status: completed - wait, completed is valid?)
        // Order 6 (kotCompleted: true, status: preparing)

        // Should exclude:
        // Order 1 (pending)
        // Order 4 (paid) - "Final" state
        // Order 5 (cancelled) - "Final" state

        const ids = result.current.map(o => o._id);
        expect(ids).toContain('2');
        expect(ids).toContain('6');
        expect(ids).not.toContain('1');
        expect(ids).not.toContain('4');
        expect(ids).not.toContain('5');
    });

    it('should filter Active orders correctly', () => {
        const { result } = renderHook(() => useFilteredOrders(mockOrders, 'Active'));
        const ids = result.current.map(o => o._id);

        // Active = pending, confirmed, preparing
        expect(ids).toContain('1'); // pending
        expect(ids).toContain('6'); // preparing
        expect(ids).not.toContain('2'); // ready
    });

    it('should filter Local orders correctly', () => {
        const { result } = renderHook(() => useFilteredOrders(mockOrders, 'Local'));
        expect(result.current.length).toBe(6); // All are source: local
    });
});
