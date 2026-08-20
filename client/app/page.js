'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Headphones, ExternalLink, Code2, Globe, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { ProductCard } from '@/components/ProductCard';
import { Img } from '@/components/primitives';
import { ProductGridSkeleton, HeroSkeleton, CategorySkeleton } from '@/components/Skeletons';

function ProductRow({ title, link, items }) {
  if (!items?.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-end justify-between sm:mb-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <Link
          href={link}
          className="flex items-center gap-1 text-sm font-medium text-blue transition hover:gap-2"
        >
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.slice(0, 8).map((p, i) => (
          <ProductCard key={p._id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { settings, toast } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/home')
      .then(setData)
      .catch((e) => {
        setError(e.message);
        toast(e.message, 'error');
      });
  }, [toast]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 px-4 text-center">
        <p className="text-muted">{error}</p>
        <p className="text-sm text-muted">Please try again later or contact support if this persists.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <HeroSkeleton />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <CategorySkeleton />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <ProductGridSkeleton />
        </div>
      </div>
    );
  }

  const heroTitle = settings?.heroTitle || data.settings?.heroTitle || 'Shop the New. Love the Everyday.';
  const heroSubtitle = settings?.heroSubtitle || data.settings?.heroSubtitle || 'Premium products, curated for you.';

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-10 pt-8 sm:gap-8 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div className="anim-fade-up">
            <span className="inline-flex items-center rounded-full border border-hairline bg-card px-3 py-1 text-xs font-medium text-muted">
              New season · New arrivals
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight sm:mt-5 sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-3 max-w-md text-base text-muted sm:mt-4 sm:text-lg">{heroSubtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Link
                href="/shop"
                className="rounded-full bg-blue px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-deep active:scale-[0.98] sm:px-7 sm:text-[15px]"
              >
                Shop now
              </Link>
              <Link
                href="/shop?sort=popular"
                className="rounded-full bg-foreground/10 px-6 py-3 text-sm font-medium transition hover:bg-foreground/15 sm:px-7 sm:text-[15px]"
              >
                Best sellers
              </Link>
            </div>
          </div>
          <div className="relative anim-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {data.featured.slice(0, 4).map((p, i) => (
                <Link
                  key={p._id}
                  href={`/product/${p.slug}`}
                  className={`overflow-hidden rounded-2xl border border-hairline bg-card transition-transform duration-300 hover:-translate-y-1 sm:rounded-3xl ${
                    i % 2 === 1 ? 'sm:translate-y-6' : ''
                  }`}
                >
                  <Img src={p.images?.[0]} alt={p.name} className="aspect-square w-full object-cover" rounded="" loading="lazy" />
                  <div className="p-2.5 sm:p-3">
                    <p className="line-clamp-1 text-xs sm:text-sm font-medium">{p.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {data.categories.map((c) => (
            <Link
              key={c._id}
              href={`/shop?category=${encodeURIComponent(c.name)}`}
              className="group relative overflow-hidden rounded-2xl border border-hairline sm:rounded-3xl"
            >
              <Img
                src={c.image}
                alt={c.name}
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                rounded=""
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <p className="text-sm font-semibold text-white sm:text-base">{c.name}</p>
                <p className="text-[10px] text-white/70 sm:text-xs">{c.subcategories?.length || 0} subcategories</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <ProductRow title="Featured products" link="/shop?sort=featured" items={data.featured} />
      <ProductRow title="New arrivals" link="/shop?sort=newest" items={data.newArrivals} />
      <ProductRow title="Best sellers" link="/shop?sort=popular" items={data.bestSelling} />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { icon: Truck, title: 'Free shipping', sub: 'On orders above the threshold' },
            { icon: RotateCcw, title: 'Easy returns', sub: '30-day hassle-free returns' },
            { icon: ShieldCheck, title: 'Secure payments', sub: 'UPI, cards, netbanking & more' },
            { icon: Headphones, title: '24/7 support', sub: 'We are always here to help' },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border border-hairline bg-card p-4 text-center sm:rounded-3xl sm:p-6">
              <v.icon size={20} className="mx-auto text-blue sm:size-22" />
              <p className="mt-2.5 text-xs font-semibold sm:mt-3 sm:text-sm">{v.title}</p>
              <p className="mt-0.5 text-[10px] text-muted sm:mt-1 sm:text-xs">{v.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-hairline bg-card px-3 py-1 text-xs font-medium text-muted">
            Our Work
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">Built by saco pixels</h2>
          <p className="mt-2 text-sm text-muted sm:text-base">Digital projects crafted with care</p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-hairline bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl sm:p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue/10 sm:size-12">
              <ShoppingCart size={20} className="text-blue" />
            </div>
            <h3 className="mt-3 text-base font-semibold sm:text-lg">saso — E-Commerce Store</h3>
            <p className="mt-1.5 text-xs text-muted sm:text-sm">Full-stack online store with UPI payments, Cashfree gateway, admin dashboard, and mobile-first design.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Next.js', 'Express', 'UPI', 'Cashfree', 'MongoDB'].map((t) => (
                <span key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-muted sm:text-xs">{t}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/shop" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue transition hover:gap-2.5 sm:text-sm">
                Visit store <ArrowRight size={13} />
              </Link>
              <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-foreground sm:text-sm">
                Admin panel <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-dashed border-hairline bg-card/50 p-5 sm:rounded-3xl sm:p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 sm:size-12">
              <Code2 size={20} className="text-muted" />
            </div>
            <h3 className="mt-3 text-base font-semibold sm:text-lg">More coming soon</h3>
            <p className="mt-1.5 text-xs text-muted sm:text-sm">We are building more exciting projects. Stay tuned.</p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-dashed border-hairline bg-card/50 p-5 sm:rounded-3xl sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/5 sm:size-12">
              <Globe size={20} className="text-muted" />
            </div>
            <h3 className="mt-3 text-base font-semibold sm:text-lg">saco pixels</h3>
            <p className="mt-1.5 text-xs text-muted sm:text-sm">A creative tech studio building modern web experiences.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Web Design', 'E-Commerce', 'SaaS', 'UI/UX'].map((t) => (
                <span key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-muted sm:text-xs">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
