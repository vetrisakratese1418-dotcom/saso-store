'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api, getToken, setToken, getUser, setUser, fetchSettings, API_URL } from './api';

const StoreContext = createContext(null);

const CART_KEY = 'shopora_cart';
const WISH_KEY = 'shopora_wishlist';

function loadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [booted, setBooted] = useState(false);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [theme, setThemeState] = useState('light');
  const [settings, setSettings] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    setCart(loadJson(CART_KEY, []));
    setWishlist(loadJson(WISH_KEY, []));
    const savedTheme = localStorage.getItem('shopora_theme') || 'light';
    applyTheme(savedTheme);
    setThemeState(savedTheme);
    setBooted(true);

    if (token && u) {
      setUserState(u);
      api('/auth/me', { token })
        .then((data) => {
          setUserState(data.user);
          setUser(data.user);
        })
        .catch(() => {});
    }
    fetchSettings().then((s) => s && setSettings(s));
  }, []);

  const applyTheme = (t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    localStorage.setItem('shopora_theme', t);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  };

  const persistCart = (next) => {
    setCart(next);
    if (typeof window !== 'undefined') localStorage.setItem(CART_KEY, JSON.stringify(next));
  };

  const persistWishlist = (next) => {
    setWishlist(next);
    if (typeof window !== 'undefined') localStorage.setItem(WISH_KEY, JSON.stringify(next));
  };

  const toast = useCallback((message, type = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(data.token);
      setUserState(data.user);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const register = useCallback(
    async (payload) => {
      const data = await api('/auth/register', { method: 'POST', body: payload });
      setToken(data.token);
      setUserState(data.user);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUserState(null);
  }, []);

  const updateUser = useCallback(async (patch) => {
    const data = await api('/auth/me', { method: 'PUT', body: patch, token: getToken() });
    setUserState(data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const addToCart = useCallback(
    (product, qty = 1) => {
      const q = Math.max(1, parseInt(qty) || 1);
      let added = false;
      setCart((prev) => {
        const found = prev.find((i) => i.productId === product._id);
        let next;
        if (found) {
          next = prev.map((i) =>
            i.productId === product._id ? { ...i, qty: Math.min(product.stock, i.qty + q) } : i,
          );
        } else {
          next = [
            ...prev,
            {
              productId: product._id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image: product.images?.[0] || '',
              stock: product.stock,
              qty: q,
            },
          ];
        }
        if (typeof window !== 'undefined') localStorage.setItem(CART_KEY, JSON.stringify(next));
        return next;
      });
      toast(`${product.name} added to cart`, 'success');
      return added;
    },
    [toast],
  );

  const updateQty = useCallback((productId, qty) => {
    setCart((prev) => {
      const next = prev
        .map((i) => (i.productId === productId ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0);
      if (typeof window !== 'undefined') localStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      if (typeof window !== 'undefined') localStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    persistCart([]);
  }, [persistCart]);

  const toggleWishlist = useCallback(
    (product) => {
      setWishlist((prev) => {
        const exists = prev.some((w) => w._id === product._id);
        const next = exists ? prev.filter((w) => w._id !== product._id) : [...prev, product];
        if (typeof window !== 'undefined') localStorage.setItem(WISH_KEY, JSON.stringify(next));
        toast(exists ? 'Removed from wishlist' : 'Added to wishlist', exists ? 'info' : 'success');
        return next;
      });
    },
    [toast],
  );

  const isWishlisted = useCallback(
    (productId) => wishlist.some((w) => w._id === productId),
    [wishlist],
  );

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return null;
    try {
      const data = await api('/auth/me', { token });
      setUserState(data.user);
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      API_URL,
      user,
      booted,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      cart,
      cartCount,
      cartSubtotal,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      wishlist,
      toggleWishlist,
      isWishlisted,
      theme,
      toggleTheme,
      settings,
      toast,
      toasts,
    }),
    [
      user, booted, login, register, logout, updateUser, refreshUser, cart, cartCount, cartSubtotal,
      addToCart, updateQty, removeFromCart, clearCart, wishlist, toggleWishlist, isWishlisted,
      theme, toggleTheme, settings, toast, toasts,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
