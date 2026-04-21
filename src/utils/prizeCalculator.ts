import { Draw, Entry, AppSettings } from '../store/useStore';
import { getPaleParts } from './helpers';

export function calculateEntryPrize(entry: Entry, draw: Draw, settings: AppSettings): { prize: number; winningPosition?: '1er' | '2do' | '3er' } {
  if (!draw.results || draw.results.length !== 3) {
    return { prize: 0 };
  }

  const [r1, r2, r3] = draw.results;
  let prize = 0;
  let winningPosition: '1er' | '2do' | '3er' | undefined = undefined;

  // For Chance and Palé, we always use the last 2 digits if the draw is 4 digits
  const win1 = r1.slice(-2);
  const win2 = r2.slice(-2);
  const win3 = r3.slice(-2);

  if (entry.type === 'CHANCE') {
    const chancePayouts = settings.chance?.payouts || { first: 60, second: 8, third: 4 };
    const playedNum = entry.number.slice(-2); // Chance is always 2 digits

    const chanceMatches: Array<{ result: string; payout: number; position: '1er' | '2do' | '3er' }> = [
      { result: win1, payout: chancePayouts.first, position: '1er' },
      { result: win2, payout: chancePayouts.second, position: '2do' },
      { result: win3, payout: chancePayouts.third, position: '3er' },
    ];

    chanceMatches.forEach(({ result, payout, position }) => {
      if (playedNum === result) {
        // If the same number appears multiple times in the draw, each hit pays.
        prize += entry.pieces * payout;
        if (!winningPosition) winningPosition = position;
      }
    });
  } else if (entry.type === 'PALÉ') {
    const paleParts = getPaleParts(entry.number);
    if (!paleParts) {
      return { prize: 0 };
    }
    const [n1, n2] = paleParts;
    
    const has1 = n1 === win1 || n2 === win1;
    const has2 = n1 === win2 || n2 === win2;
    const has3 = n1 === win3 || n2 === win3;
    const palePayouts = settings.pale?.payouts || { firstSecond: 1000, firstThird: 1000, secondThird: 200 };

    // Palé prize is usually per play (amount), but user said "cantidad jugada" for chance.
    // For Palé, amount is usually the "pieces" anyway in my logic.
    if (has1 && has2) prize = entry.pieces * palePayouts.firstSecond;
    else if (has1 && has3) prize = entry.pieces * palePayouts.firstThird;
    else if (has2 && has3) prize = entry.pieces * palePayouts.secondThird;
  } else if (entry.type === 'BILLETE') {
    if (draw.digitsMode === 4) {
      const billeteSettings = settings.billete || { unitPrice: 1.00, payouts: { firstPrize: { exact4: 0, exact3PrefixOrSuffix: 0, exact2PrefixOrSuffix: 0 }, secondPrize: { exact4: 0, exact3PrefixOrSuffix: 0, exact2PrefixOrSuffix: 0 }, thirdPrize: { exact4: 0, exact3PrefixOrSuffix: 0, exact2PrefixOrSuffix: 0 } } };
      const payouts = [billeteSettings.payouts.firstPrize, billeteSettings.payouts.secondPrize, billeteSettings.payouts.thirdPrize];

      draw.results.forEach((result, idx) => {
        const payoutTable = payouts[idx];
        let bestPrizeForThisResult = 0;
        
        if (entry.number === result) {
          bestPrizeForThisResult = payoutTable.exact4;
        } else {
          const played3Prefix = entry.number.substring(0, 3);
          const played3Suffix = entry.number.substring(1, 4);
          const result3Prefix = result.substring(0, 3);
          const result3Suffix = result.substring(1, 4);
          
          if (played3Prefix === result3Prefix || played3Suffix === result3Suffix) {
            bestPrizeForThisResult = payoutTable.exact3PrefixOrSuffix;
          } else {
            const played2Prefix = entry.number.substring(0, 2);
            const played2Suffix = entry.number.substring(2, 4);
            const result2Prefix = result.substring(0, 2);
            const result2Suffix = result.substring(2, 4);
            
            if (played2Prefix === result2Prefix || played2Suffix === result2Suffix) {
              bestPrizeForThisResult = payoutTable.exact2PrefixOrSuffix;
            }
          }
        }
        
        if (bestPrizeForThisResult > 0) {
          // Billete prize is per piece
          prize += entry.pieces * bestPrizeForThisResult;
          if (idx === 0) winningPosition = '1er';
          else if (idx === 1 && !winningPosition) winningPosition = '2do';
          else if (idx === 2 && !winningPosition) winningPosition = '3er';
        }
      });
    }
  }

  return { prize, winningPosition };
}

