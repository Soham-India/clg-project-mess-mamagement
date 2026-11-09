// Which mess does a student eat in? Never chosen by hand: derived from
// batch (year), plan and gender.
//
//  1st year                -> First-Year mess (boys and girls together), always fixed plan
//  2nd year                -> Main mess (boys / girls), always fixed plan
//  3rd / 4th year, fixed   -> Main mess (boys / girls)
//  3rd / 4th year, coupon  -> Coupon mess (boys / girls)

export function planFor(batch, requestedPlan) {
  // 1st and 2nd years (and all future batches) can only be on the fixed plan.
  if (batch <= 2) return 'fixed';
  return requestedPlan === 'coupon' ? 'coupon' : 'fixed';
}

export function messUnitFor({ batch, plan, gender }) {
  const effectivePlan = planFor(batch, plan);
  if (batch === 1) return 'FY';
  const g = gender === 'F' ? 'G' : 'B';
  return effectivePlan === 'coupon' ? `CPN-${g}` : `MAIN-${g}`;
}
