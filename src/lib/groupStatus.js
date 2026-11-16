import { colors } from '../theme';

// Turns a raw counter row into what the UI should say.
export function describeGroup(countRow, settings) {
  const min = settings?.min_group_size ?? 5;
  const best = settings?.best_group_size ?? 10;
  const n = countRow?.interested ?? 0;
  const status = countRow?.status ?? 'forming';

  if (status === 'deal_live') {
    return {
      n, min, best,
      chip: 'Deal live',
      chipColor: colors.purple,
      chipBg: colors.purpleSoft,
      headline: 'Your group deal is ready',
      detail: countRow?.deal_note || 'We will contact every member with the negotiated price.',
    };
  }
  if (status === 'negotiating') {
    return {
      n, min, best,
      chip: 'Negotiating',
      chipColor: colors.primary,
      chipBg: colors.primarySoft,
      headline: 'We are negotiating with dealers',
      detail: n < best
        ? `More buyers still help — ${best - n} more for the best-deal group size.`
        : 'Best-deal group size reached.',
    };
  }
  if (status === 'closed') {
    return {
      n, min, best,
      chip: 'Closed',
      chipColor: colors.muted,
      chipBg: colors.border,
      headline: 'This group round is closed',
      detail: 'Join again to be part of the next round.',
    };
  }
  if (n >= best) {
    return {
      n, min, best,
      chip: 'Best deal size',
      chipColor: colors.success,
      chipBg: colors.successSoft,
      headline: `${n} buyers — best-deal group size reached!`,
      detail: 'We will start negotiating with dealers for the best group price.',
    };
  }
  if (n >= min) {
    return {
      n, min, best,
      chip: 'Ready',
      chipColor: colors.success,
      chipBg: colors.successSoft,
      headline: `${n} buyers — enough to start negotiating`,
      detail: `${best - n} more ${best - n === 1 ? 'buyer' : 'buyers'} unlock the best-deal group size (${best}).`,
    };
  }
  const need = min - n;
  return {
    n, min, best,
    chip: n === 0 ? 'Be the first' : 'Forming',
    chipColor: colors.warning,
    chipBg: colors.warningSoft,
    headline: n === 0 ? 'No buyers yet' : `${n} ${n === 1 ? 'buyer' : 'buyers'} interested`,
    detail: `${need} more ${need === 1 ? 'buyer' : 'buyers'} needed to start negotiating with dealers.`,
  };
}
