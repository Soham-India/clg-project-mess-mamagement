'use client';
import { useHeadcountQuery } from '@/store/api';
import { PageHeader, Loading, ErrorBox } from '@/components/ui';
import HeadcountView from '@/components/HeadcountView';

export default function HeadcountPage() {
  const { data, isLoading, error } = useHeadcountQuery(undefined, { pollingInterval: 15000 });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <>
      <PageHeader title="Cook for" sub={`${data.unitName}. Based on: ${data.basis.toLowerCase()}.`} />
      <HeadcountView data={data} />
      <p className="small muted" style={{ marginTop: 14 }}>
        {data.plan === 'coupon'
          ? 'Coupon messes know the exact count: every coupon is for one meal on one date, so you cook only for what was sold.'
          : 'Fixed-plan messes cook for every student allotted here.'}
      </p>
    </>
  );
}
