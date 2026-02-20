import React, { useMemo } from 'react';
import { ITEM_STATUS } from '../../models/kotModel';

const STATUS_PROGRESS = {
    [ITEM_STATUS.PENDING]: 0,
    [ITEM_STATUS.PREPARING]: 50,
    [ITEM_STATUS.READY]: 75,
    [ITEM_STATUS.COMPLETED]: 100
};

const KOTProgressBar = ({ items = [] }) => {
    const progress = useMemo(() => {
        if (!items.length) return 0;

        const activeItems = items.filter(
            item => item.status !== ITEM_STATUS.CANCELLED
        );

        if (!activeItems.length) return 0;

        const totalProgress = activeItems.reduce((sum, item) => {
            // Handle case-insensitive status matching if needed, or rely on strict constants
            const status = (item.status || '').toLowerCase();
            // Map safe status to constant keys
            const mappedStatus = Object.values(ITEM_STATUS).find(s => s === status) || ITEM_STATUS.PENDING;

            return sum + (STATUS_PROGRESS[mappedStatus] || 0);
        }, 0);

        return Math.round(totalProgress / activeItems.length);
    }, [items]);

    return (
        <div className="w-full">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="text-xs text-gray-600 mt-1 text-right">
                {progress}% complete
            </div>
        </div>
    );
};

export default KOTProgressBar;
