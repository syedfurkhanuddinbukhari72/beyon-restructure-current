import React, { useState } from 'react';
import KOTProgressBar from '../components/kot/KOTProgressBar';

export default function TestProgressBar() {
    // Test State
    const [items, setItems] = useState([
        { name: 'Burger', status: 'pending' },
        { name: 'Fries', status: 'pending' },
        { name: 'Coke', status: 'pending' }
    ]);

    const updateStatus = (index, status) => {
        const newItems = [...items];
        newItems[index].status = status;
        setItems(newItems);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-10 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">KOT Progress Bar Tester</h1>

            {/* The component under test */}
            <div className="bg-white p-8 rounded-xl shadow-lg mb-8 w-64 flex flex-col items-center">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Visual Output</h2>
                <div className="transform scale-150 p-4 border border-dashed border-gray-300 rounded-lg">
                    <KOTProgressBar items={items} />
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl">
                <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-700">Control Panel</h2>

                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <span className="font-medium text-gray-700 w-20">{item.name}</span>

                            <div className="flex gap-2">
                                {['pending', 'preparing', 'ready', 'completed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => updateStatus(idx, status)}
                                        className={`px-3 py-1 rounded text-sm capitalize transition-colors ${item.status === status
                                                ? getStatusColor(status)
                                                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <button
                        onClick={() => setItems(items.map(i => ({ ...i, status: 'pending' })))}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Reset All
                    </button>
                    <button
                        onClick={() => setItems(items.map(i => ({ ...i, status: 'preparing' })))}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                    >
                        All Preparing
                    </button>
                    <button
                        onClick={() => setItems(items.map(i => ({ ...i, status: 'ready' })))}
                        className="px-4 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                    >
                        All Ready
                    </button>
                </div>
            </div>
        </div>
    );
}

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400';
        case 'preparing': return 'bg-blue-500 text-white ring-2 ring-blue-600';
        case 'ready': return 'bg-green-500 text-white ring-2 ring-green-600';
        case 'completed': return 'bg-gray-800 text-white ring-2 ring-gray-900';
        default: return 'bg-gray-100';
    }
}
