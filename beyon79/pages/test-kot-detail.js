import React, { useState } from 'react';
import KOTDetail from '../components/kot/KOTDetail';
import { KOT_STATUS, ITEM_STATUS, PRIORITY } from '../models/kotModel';

// Mock Data reproducing the issue in the screenshot
const BROKEN_KOT = {
    id: 'local-1770560535106-bmn6x',
    status: KOT_STATUS.PREPARING,
    priority: PRIORITY.NORMAL,
    type: 'DINE_IN',
    tableNumber: 'T4',
    createdAt: '2024-02-08T12:00:00.000Z', // Static date to prevent hydration mismatch
    items: [
        {
            id: 'item-1',
            name: 'Shawarma',
            // MISSING QUANTITY to reproduce NaN
            unitPrice: 120,
            status: ITEM_STATUS.PENDING
        },
        {
            id: 'item-2',
            name: 'Cheesy Crispy Chicken Sandwich',
            quantity: null, // Explicit null to reproduce
            unitPrice: 180,
            status: ITEM_STATUS.PENDING
        }
    ],
    totalAmount: 300,
    kitchenNotes: ''
};

export default function TestKOTDetail() {
    const [kot, setKot] = useState(BROKEN_KOT);

    const handleUpdate = (updatedKot) => {
        console.log('🔄 Mock Update:', updatedKot);
        setKot(updatedKot);
    };

    const handleClose = () => {
        console.log('❌ Close requested');
        alert('Close requested');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl overflow-hidden h-[800px]">
                <KOTDetail
                    kot={kot}
                    onUpdate={handleUpdate}
                    onClose={handleClose}
                />
            </div>
        </div>
    );
}
