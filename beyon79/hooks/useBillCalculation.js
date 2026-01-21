import { useMemo, useCallback } from 'react';
import { getActiveDiscountOfferForItem } from '../utils/manualOrderHelpers';

export function useBillCalculation({ cart, menuData, offers }) {
  const computeBillData = useCallback((cartSnapshot) => {
    const rewardsByOffer = {};
    for (const it of (cartSnapshot || [])) {
      if (it.isOfferReward) {
        (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
      }
    }

    let sumCharge = 0;
    for (const it of (cartSnapshot || [])) {
      if (it.isOfferReward) sumCharge += (it.offerPrice ?? 0) * (it.quantity || 0);
    }

    const lines = [];

    const baseItems = (cartSnapshot || []).filter((i) => !i.isOfferReward);
    for (const item of baseItems) {
      const linkedOffers = (offers || []).filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);
      let groupsConsumedTotal = 0;
      for (const ofr of linkedOffers) {
        const rewardEntries = rewardsByOffer[ofr.id] || [];
        const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
        const perRewardQty = ofr.reward?.items?.[0]?.quantity || 1;
        const req = ofr.base?.quantity || 1;
        const groupsConsumed = Math.floor(totalAppliedRewards / perRewardQty) * req;
        groupsConsumedTotal += groupsConsumed;
      }
      const consumed = Math.min(item.quantity || 0, groupsConsumedTotal);
      const leftover = Math.max(0, (item.quantity || 0) - consumed);

      if (consumed > 0) {
        let rewardUnitPrice = 0;
        let rewardCount = 0;
        for (const ofr of linkedOffers) {
          const rewardEntries = rewardsByOffer[ofr.id] || [];
          const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
          rewardCount += totalAppliedRewards;
          const rewardDef = ofr.reward?.items?.[0];
          if (!rewardUnitPrice && rewardDef && typeof rewardDef.price === 'number') {
            rewardUnitPrice = rewardDef.price;
          }
        }
        const displayAmount = (rewardUnitPrice || 0);
        const consumedCharge = (rewardUnitPrice || 0) * Math.max(0, rewardCount || 0);
        lines.push({ desc: `${item.name} (consumed by offer)`, qty: consumed, unitPrice: rewardUnitPrice, amount: displayAmount, displayAmount, chargeAmount: consumedCharge, isOfferConsumed: true });
        sumCharge += consumedCharge;
      }
      if (leftover > 0) {
        const discountOffer = getActiveDiscountOfferForItem(item, menuData, offers);
        let unitPrice = item.price;
        if (discountOffer) {
          const { type, amount } = discountOffer;
          if (type === 'percent') unitPrice = item.price - Math.round((item.price * amount) / 100);
          else if (type === 'flat') unitPrice = item.price - amount;
          if (unitPrice < 0) unitPrice = 0;
        }
        lines.push({ desc: item.name, qty: leftover, unitPrice, amount: unitPrice * leftover });
        sumCharge += unitPrice * leftover;
      }
    }

    for (const r of (cartSnapshot || []).filter(i => i.isOfferReward)) {
      const unitPrice = r.offerPrice ?? 0;
      lines.push({ desc: `${r.name} (Offer Reward)`, qty: r.quantity || 0, unitPrice: 0, amount: 0, chargeAmount: 0, isOfferReward: true, offerPrice: unitPrice });
    }

    const subtotal = sumCharge;
    return { lines, subtotal, total: sumCharge };
  }, [menuData, offers]);

  const { totalAmount, billData } = useMemo(() => {
    const billData = computeBillData(cart);
    const totalAmount = billData.total;
    return { totalAmount, billData };
  }, [cart, computeBillData]);

  return { totalAmount, billData, computeBillData };
}
