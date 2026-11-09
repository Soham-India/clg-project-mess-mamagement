'use client';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ArrowLeftRight, HandCoins, Tag, ShoppingBag, Info } from 'lucide-react';
import {
  useExchangeQuery, useCreateExchangePostMutation, useTakeExchangePostMutation, useCancelExchangePostMutation, errorText,
} from '@/store/api';
import { toastAdded } from '@/store/uiSlice';
import { mealLabel } from '@/lib/constants';
import { PageHeader, Loading, ErrorBox, Badge, Empty, Modal } from '@/components/ui';

const fmtDay = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const slot = (x) => `${mealLabel(x.meal)} · ${fmtDay(x.date)}`;

const MINE_STATE = {
  open: ['Waiting', 'warn'],
  done: ['Done', 'ok'],
  cancelled: ['Cancelled', undefined],
  expired: ['Expired', 'bad'],
};

export default function ExchangePage() {
  const { data, isLoading, isFetching, error } = useExchangeQuery(undefined, { pollingInterval: 30000 });
  const [tab, setTab] = useState('sale');
  const [modal, setModal] = useState(null); // { type: 'buy' | 'fill' | 'sell' | 'ask', post?, couponId? }

  // Coming from the wallet's "Sell" button: /coupons/exchange?sell=<couponId>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('sell');
    if (id) setModal({ type: 'sell', couponId: Number(id) });
  }, []);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const openMine = data.mine.filter((p) => p.state === 'open').length;
  const tabs = [
    ['sale', 'For sale', data.forSale.length],
    ['wanted', 'Wanted', data.wanted.length],
    ['mine', 'My posts', openMine],
  ];

  return (
    <>
      <PageHeader title="Coupon exchange" sub="Buy spare coupons from students of your mess, or sell the ones you won't use.">
        <button className="btn" onClick={() => setModal({ type: 'ask' })}><HandCoins size={18} /> Ask for a meal</button>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'sell' })}><Tag size={18} /> Sell a coupon</button>
      </PageHeader>

      <div className="card card-tight row" style={{ alignItems: 'flex-start', gap: 10, marginBottom: 16, background: 'var(--accent-soft)', boxShadow: 'none' }}>
        <Info size={18} color="var(--warn)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p className="small">
          Every trade is at the coupon&apos;s own price (₹20 / ₹55 / ₹44), only within your mess, and only before the meal starts.
          If nobody takes your coupon in time, it expires like any unused coupon, with no refund.
        </p>
      </div>

      <div className="segmented" style={{ marginBottom: 16 }}>
        {tabs.map(([k, label, n]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label} <span className="faint">{n}</span>
          </button>
        ))}
      </div>

      <div style={{ opacity: isFetching ? 0.6 : 1 }}>
        {tab === 'sale' && (
          <PostList
            items={data.forSale}
            empty={['Nothing on sale right now', 'Ask for the meal you need, and students with a spare coupon can sell it to you.']}
            render={(p) => (
              <button className="btn btn-primary btn-sm" disabled={!p.canTake} title={p.reason || undefined} onClick={() => setModal({ type: 'buy', post: p })}>
                <ShoppingBag size={14} /> Buy ₹{p.price}
              </button>
            )}
            who={(p) => `Sold by ${p.by}`}
          />
        )}
        {tab === 'wanted' && (
          <PostList
            items={data.wanted}
            empty={['Nobody is asking right now', 'When students of your mess ask for a meal, it shows up here.']}
            render={(p) => (
              <button className="btn btn-green btn-sm" disabled={!p.canTake} title={p.reason || undefined} onClick={() => setModal({ type: 'fill', post: p })}>
                <Tag size={14} /> Sell mine ₹{p.price}
              </button>
            )}
            who={(p) => `Needed by ${p.by}`}
          />
        )}
        {tab === 'mine' && <MyPosts items={data.mine} />}
      </div>

      {modal?.type === 'buy' && <TakeModal post={modal.post} kind="buy" onClose={() => setModal(null)} />}
      {modal?.type === 'fill' && <TakeModal post={modal.post} kind="fill" onClose={() => setModal(null)} />}
      {modal?.type === 'sell' && <SellModal options={data.sellable} preselect={modal.couponId} onClose={() => setModal(null)} onDone={() => setTab('mine')} />}
      {modal?.type === 'ask' && <AskModal options={data.requestable} onClose={() => setModal(null)} onDone={() => setTab('mine')} />}
    </>
  );
}

function PostList({ items, empty, render, who }) {
  if (items.length === 0) {
    return <div className="card"><Empty icon={ArrowLeftRight} title={empty[0]}>{empty[1]}</Empty></div>;
  }
  return (
    <div className="grid grid-3" style={{ gap: 10 }}>
      {items.map((p) => (
        <div key={p.id} className="card card-tight stack" style={{ gap: 8 }}>
          <div className="row between">
            <b>{mealLabel(p.meal)}</b>
            <span className="small muted">{fmtDay(p.date)}</span>
          </div>
          <div className="small muted">{who(p)}</div>
          <div className="row between" style={{ flexWrap: 'wrap', gap: 6 }}>
            {p.reason ? <span className="tiny muted">{p.reason}</span> : <span />}
            {render(p)}
          </div>
        </div>
      ))}
    </div>
  );
}

function MyPosts({ items }) {
  const dispatch = useDispatch();
  const [cancel, { isLoading, error, originalArgs }] = useCancelExchangePostMutation();
  if (items.length === 0) {
    return <div className="card"><Empty icon={ArrowLeftRight} title="No posts yet">Sell a coupon you won&apos;t use, or ask for a meal you need.</Empty></div>;
  }
  const detail = (p) => {
    if (p.state === 'done') return p.kind === 'sell' ? `Sold to ${p.with} for ₹${p.price}` : `Bought from ${p.with} for ₹${p.price}`;
    if (p.state === 'expired') return p.kind === 'sell' ? 'Nobody bought it before the meal. No refund.' : 'Nobody had a spare coupon.';
    if (p.state === 'cancelled') return 'Closed';
    return p.kind === 'sell' ? `On sale for ₹${p.price}` : `Asking to buy for ₹${p.price}`;
  };
  return (
    <div className="card">
      {error && <div style={{ marginBottom: 10 }}><ErrorBox>{errorText(error)}</ErrorBox></div>}
      <div className="stack" style={{ gap: 0 }}>
        {items.map((p, i) => (
          <div key={p.id} className="row between" style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <Badge tone={p.kind === 'sell' ? 'brand' : 'info'}>{p.kind === 'sell' ? 'Selling' : 'Asking'}</Badge>
                <b>{slot(p)}</b>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>{detail(p)}</div>
            </div>
            <div className="row">
              <Badge tone={MINE_STATE[p.state][1]}>{MINE_STATE[p.state][0]}</Badge>
              {p.state === 'open' && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={isLoading && originalArgs === p.id}
                  onClick={async () => {
                    const res = await cancel(p.id);
                    if (res.data) dispatch(toastAdded(p.kind === 'sell' ? 'Taken off sale. The coupon is still yours.' : 'Request cancelled.'));
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TakeModal({ post, kind, onClose }) {
  const dispatch = useDispatch();
  const [take, { isLoading, error }] = useTakeExchangePostMutation();
  const go = async () => {
    const res = await take(post.id);
    if (res.data) {
      dispatch(toastAdded(res.data.message));
      onClose();
    }
  };
  const buying = kind === 'buy';
  return (
    <Modal title={buying ? 'Buy this coupon' : 'Sell your coupon'} onClose={onClose}>
      <div className="stack">
        <div className="card card-tight" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
          <b>{slot(post)}</b> · ₹{post.price}
          <div className="small muted">{buying ? `From ${post.by}` : `To ${post.by}`}</div>
        </div>
        <p className="small">
          {buying
            ? `The coupon moves to your wallet right away and ₹${post.price} goes to ${post.by}.`
            : `Your coupon moves to ${post.by} right away and you get ₹${post.price}. You won't be able to eat this meal with it.`}
        </p>
        {error && <ErrorBox>{errorText(error)}</ErrorBox>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={isLoading} onClick={go}>
            {isLoading ? 'Processing…' : buying ? `Pay ₹${post.price}` : `Sell for ₹${post.price}`}
          </button>
        </div>
        <p className="tiny muted">Demo payment: no real money is charged.</p>
      </div>
    </Modal>
  );
}

function SellModal({ options, preselect, onClose, onDone }) {
  const dispatch = useDispatch();
  const valid = options.some((o) => o.id === preselect);
  const [couponId, setCouponId] = useState(valid ? preselect : options[0]?.id ?? '');
  const [create, { isLoading, error }] = useCreateExchangePostMutation();
  const chosen = options.find((o) => o.id === Number(couponId));
  const submit = async (e) => {
    e.preventDefault();
    const res = await create({ kind: 'sell', couponId: Number(couponId) });
    if (res.data) {
      dispatch(toastAdded('Your coupon is on sale. You can still use it yourself until someone buys it.'));
      onDone();
      onClose();
    }
  };
  return (
    <Modal title="Sell a coupon" onClose={onClose}>
      {options.length === 0 ? (
        <div className="stack">
          <p className="small muted">You have no unused coupons for meals that haven&apos;t started yet, or they&apos;re all on sale already.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Close</button></div>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <label className="field">
            <span className="label">Which coupon?</span>
            <select className="select" value={couponId} onChange={(e) => setCouponId(Number(e.target.value))}>
              {options.map((o) => <option key={o.id} value={o.id}>{slot(o)} · ₹{o.price}</option>)}
            </select>
            <span className="hint">Students of your mess can buy it for ₹{chosen?.price} until the meal starts.</span>
          </label>
          {error && <ErrorBox>{errorText(error)}</ErrorBox>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={isLoading || !chosen}>{isLoading ? 'Posting…' : 'Put on sale'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function AskModal({ options, onClose, onDone }) {
  const dispatch = useDispatch();
  const [pick, setPick] = useState(options[0] ? `${options[0].date}|${options[0].meal}` : '');
  const [create, { isLoading, error }] = useCreateExchangePostMutation();
  const [date, meal] = pick.split('|');
  const chosen = options.find((o) => o.date === date && o.meal === meal);
  const submit = async (e) => {
    e.preventDefault();
    const res = await create({ kind: 'request', date, meal });
    if (res.data) {
      dispatch(toastAdded('Request posted. Students of your mess with a spare coupon can sell it to you.'));
      onDone();
      onClose();
    }
  };
  return (
    <Modal title="Ask for a meal" onClose={onClose}>
      {options.length === 0 ? (
        <div className="stack">
          <p className="small muted">You already have a coupon (or an open request) for every meal in the next 7 days.</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Close</button></div>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <label className="field">
            <span className="label">Which meal do you need?</span>
            <select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
              {options.map((o) => <option key={`${o.date}|${o.meal}`} value={`${o.date}|${o.meal}`}>{slot(o)} · ₹{o.price}</option>)}
            </select>
            <span className="hint">When someone sells you their coupon, you pay ₹{chosen?.price} and it lands in your wallet right away.</span>
          </label>
          {error && <ErrorBox>{errorText(error)}</ErrorBox>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={isLoading || !chosen}>{isLoading ? 'Posting…' : 'Post request'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
