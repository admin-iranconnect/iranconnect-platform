//frontend/pages/index.js
import { useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BusinessCard from '../components/BusinessCard';

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    fetchCountries();
    fetchList();

    const current =
      document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current);
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme');
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  async function fetchCountries() {
    try {
      const res = await axios.get(`${apiBase}/api/businesses/countries`);
      setCountries(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchCities(selectedCountry) {
    if (!selectedCountry) {
      setCities([]);
      setCity('');
      return;
    }
    setLoadingCities(true);
    try {
      const res = await axios.get(`${apiBase}/api/businesses/cities`, {
        params: { country: selectedCountry },
      });
      setCities(res.data || []);
      setCity('');
      setCategories([]);
      setCategory('');
      setSubcategories([]);
      setSubcategory('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCities(false);
    }
  }

  async function fetchCategories(selectedCountry, selectedCity) {
    if (!selectedCountry || !selectedCity) {
      setCategories([]);
      return;
    }
    try {
      const res = await axios.get(`${apiBase}/api/businesses/categories`, {
        params: { country: selectedCountry, city: selectedCity },
      });
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSubcategories(selectedCountry, selectedCity, selectedCategory) {
    if (!selectedCountry || !selectedCity || !selectedCategory) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await axios.get(`${apiBase}/api/businesses/subcategories`, {
        params: { country: selectedCountry, city: selectedCity, category: selectedCategory },
      });
      setSubcategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchList() {
    setLoading(true);
    try {
      const params = { limit: 10 };
      if (country) params.country = country;
      if (city) params.city = city;
      if (category) params.category = category;
      if (subcategory) params.subcategory = subcategory;
      if (q) params.q = q;
      const res = await axios.get(`${apiBase}/api/businesses`, { params });
      setBusinesses(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const handleCountryChange = async (e) => {
    const value = e.target.value;
    setCountry(value);
    await fetchCities(value);
  };

  const handleCityChange = async (e) => {
    const value = e.target.value;
    setCity(value);
    setCategory('');
    setSubcategory('');
    await fetchCategories(country, value);
  };

  const handleCategoryChange = async (e) => {
    const selected = e.target.value;
    setCategory(selected);
    setSubcategory('');
    await fetchSubcategories(country, city, selected);
  };

  const handleSearch = (e) => {
    e?.preventDefault?.();
    fetchList();
  };

  const selectClass = 'input-default w-full';

  return (
    <div
      className="flex flex-col min-h-screen transition-colors"
      style={{
        backgroundColor: theme === 'dark' ? '#ffffff' : '#ffffff',
      }}
    >
      <Header />

      <main
        className="flex-1 container-mobile"
        style={{
          paddingTop: '48px',
          paddingBottom: '48px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {/* 🔍 Filters & Search */}
        <section style={{ marginBottom: 28 }}>
          <form
            onSubmit={handleSearch}
            className="
              grid grid-cols-1 gap-3 w-full
              sm:grid-cols-4 sm:grid-rows-2 sm:gap-x-4 sm:gap-y-3
            "
          >
            {/* Country */}
            <select className={selectClass} value={country} onChange={handleCountryChange}>
              <option value="">Country</option>
              {countries.map((c, idx) => (
                <option key={idx} value={c.country}>{c.country}</option>
              ))}
            </select>

            {/* City */}
            <select
              className={selectClass}
              value={city}
              onChange={handleCityChange}
              disabled={!country || loadingCities}
            >
              <option value="">{loadingCities ? 'Loading cities...' : 'City'}</option>
              {cities.map((ct, idx) => (
                <option key={idx} value={ct.city}>{ct.city}</option>
              ))}
            </select>

            {/* Category */}
            <select
              className={selectClass}
              value={category}
              onChange={handleCategoryChange}
              disabled={!city}
            >
              <option value="">Category</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat.category}>{cat.category}</option>
              ))}
            </select>

            {/* Subcategory */}
            <select
              className={selectClass}
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!category}
            >
              <option value="">Subcategory</option>
              {subcategories.map((sub, idx) => (
                <option key={idx} value={sub.sub_category}>{sub.sub_category}</option>
              ))}
            </select>

            {/* Search input – پایین فیلترها فقط در دسکتاپ */}
            <input
              className="input-default w-full sm:col-span-3 sm:row-start-2"
              placeholder="Search by name or address"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {/* Search button – کنار input در دسکتاپ */}
            <button
              className="btn-primary w-full sm:col-span-1 sm:row-start-2"
              type="submit"
            >
              Search
            </button>
          </form>
        </section>

        {/* 🧾 Results */}
        <section>
          {loading ? (
            <p>Loading...</p>
          ) : businesses.length === 0 ? (
            <p className="text-muted">No results found.</p>
          ) : (
            <div className="space-y-4">
              {businesses.slice(0, 10).map((b) => (
                <BusinessCard key={b.id} b={b} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
