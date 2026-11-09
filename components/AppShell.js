'use client';
// The frame around every logged-in page: sidebar (desktop), top bar + bottom nav (phone).
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import {
  Home, UtensilsCrossed, Ticket, Wallet, ScanLine, MessageSquareWarning, MonitorSmartphone,
  KeyRound, BarChart3, NotebookPen, LayoutDashboard, Users, Clock, LogOut, Megaphone, ArrowLeftRight,
} from 'lucide-react';
import { api, useMeQuery, useLogoutMutation } from '@/store/api';
import { loggedOut } from '@/store/authSlice';
import { ROLE_LABEL } from '@/lib/constants';
import { Logo, Loading } from './ui';

const NOTICES = { href: '/notices', label: 'Notice board', short: 'Notices', icon: Megaphone };

function navFor(user) {
  if (user.role === 'student') {
    const items = [
      { href: '/home', label: 'Home', icon: Home },
      { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    ];
    if (user.plan === 'coupon') {
      items.push({ href: '/coupons', label: 'Buy coupons', short: 'Buy', icon: Ticket });
      items.push({ href: '/coupons/wallet', label: 'My coupons', short: 'Wallet', icon: Wallet });
      // Sidebar only: on phones it is reached from the wallet page, so the bottom bar stays at 6.
      items.push({ href: '/coupons/exchange', label: 'Coupon exchange', short: 'Exchange', icon: ArrowLeftRight, desktopOnly: true });
    }
    items.push({ href: '/checkin', label: 'Check in', icon: ScanLine });
    items.push({ href: '/complaints', label: 'Complaints', short: 'Issues', icon: MessageSquareWarning });
    items.push(NOTICES);
    return items;
  }
  if (user.role === 'staff') {
    return [
      { href: '/staff/screen', label: 'Entrance screen', short: 'Screen', icon: MonitorSmartphone },
      { href: '/staff/counter', label: 'Counter check-in', short: 'Counter', icon: KeyRound },
      { href: '/staff/headcount', label: 'Cook for', icon: BarChart3 },
      { href: '/staff/menu', label: 'Edit menu', short: 'Menu', icon: NotebookPen },
      { href: '/complaints', label: 'Complaints', short: 'Issues', icon: MessageSquareWarning },
      NOTICES,
    ];
  }
  if (user.role === 'society') {
    return [
      { href: '/society', label: 'Dashboard', icon: LayoutDashboard },
      NOTICES,
      { href: '/complaints', label: 'Complaints', short: 'Issues', icon: MessageSquareWarning },
      { href: '/menu', label: 'Menus', icon: UtensilsCrossed },
    ];
  }
  return [
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/clock', label: 'Demo clock', short: 'Clock', icon: Clock },
    NOTICES,
    { href: '/complaints', label: 'Complaints', short: 'Issues', icon: MessageSquareWarning },
    { href: '/menu', label: 'Menus', icon: UtensilsCrossed },
  ];
}

const initials = (name) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data, isLoading, error } = useMeQuery();
  const [logout] = useLogoutMutation();

  if (isLoading) return <Loading full />;
  if (error || !data) {
    if (typeof window !== 'undefined') router.replace('/login');
    return <Loading full />;
  }
  const user = data.user;
  const nav = navFor(user);
  const isActive = (href) =>
    pathname === href || (href !== '/coupons' && pathname.startsWith(`${href}/`)) || (href === '/coupons' && pathname === '/coupons/review');

  const doLogout = async () => {
    await logout();
    dispatch(loggedOut());
    dispatch(api.util.resetApiState());
    router.replace('/login');
  };

  const meta =
    user.role === 'student'
      ? `${user.rollNo} · ${user.plan === 'coupon' ? 'Coupon' : 'Fixed'} plan`
      : user.role === 'staff'
        ? user.messUnitName
        : ROLE_LABEL[user.role];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <Logo />
          <div>
            <div className="brand-name">CampusBite</div>
            <div className="brand-sub">IIIT Bhubaneswar Mess</div>
          </div>
        </Link>
        <div className="nav-label">{ROLE_LABEL[user.role]}</div>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link ${isActive(href) ? 'active' : ''}`}>
            <Icon size={18} /> {label}
          </Link>
        ))}
        <div className="sidebar-foot">
          <div className="who">
            <div className="avatar">{initials(user.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="who-name">{user.name}</div>
              <div className="who-meta">{meta}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={doLogout} style={{ justifyContent: 'flex-start' }}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <header className="topbar">
        <Link href="/" className="row">
          <Logo size={30} />
          <span className="brand-name" style={{ fontSize: 17 }}>CampusBite</span>
        </Link>
        <div className="row">
          <span className="small muted">{user.name.split(' ')[0]}</span>
          <button className="btn btn-ghost btn-sm" onClick={doLogout} aria-label="Log out"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="main">
        {data.demoClock && (
          <div className="demo-banner">
            <Clock size={15} /> Demo clock is on: the app is running at a simulated date and time.
            {user.role === 'admin' && <Link href="/admin/clock">Change</Link>}
          </div>
        )}
        {children}
      </main>

      <nav className="bottomnav" aria-label="Main">
        {nav.filter((n) => !n.desktopOnly).slice(0, 6).map(({ href, label, short, icon: Icon }) => (
          <Link key={href} href={href} className={isActive(href) ? 'active' : ''}>
            <Icon size={20} />
            {short || label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
