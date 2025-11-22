//frontend/pages/admin/add.js
import { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { Loader } from "@googlemaps/js-api-loader";
import { Country, City } from "country-state-city";
import categoriesList from "../../data/categories";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../utils/apiClient"; // ✅ تغییر امنیتی

/* 🎨 Custom react-select styles */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "var(--bg)",
    border: state.isFocused
      ? "1px solid var(--turquoise)"
      : "1px solid var(--border)",
    boxShadow: state.isFocused
      ? "0 0 0 2px var(--turquoise, #00bfa6)"
      : "5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)",
    borderRadius: "0.5rem",
    padding: "2px 2px",
    transition: "all 0.2s ease",
    color: "var(--text)",
    "&:hover": { borderColor: "var(--turquoise)" },
  }),
  singleValue: (base) => ({ ...base, color: "var(--text)" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--card-bg)",
    border: "1px solid var(--border)",
    boxShadow:
      "5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)",
    borderRadius: "0.75rem",
    marginTop: 4,
    zIndex: 10,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--turquoise)"
      : state.isFocused
      ? "rgba(64,224,208,0.15)"
      : "transparent",
    color:
      state.isSelected || state.isFocused
        ? "var(--navy)"
        : "var(--text)",
    padding: "10px 12px",
    cursor: "pointer",
  }),
  placeholder: (base) => ({
    ...base,
    color: "rgba(150,150,150,0.7)",
  }),
  input: (base) => ({ ...base, color: "var(--text)" }),
};

export default function AddBusinessPage() {
  const [form, setForm] = useState({
    name: "",
    category: "",
    sub_category: "",
    country: "",
    city: "",
    address: "",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
    location: "",
    lat: "",
    lng: "",
    image: null,
  });

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+00");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // ========= COUNTRY & CITY =========
  const countryOptions = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.isoCode,
    phoneCode: c.phonecode,
  }));

  const cityOptions =
    form.country && City.getCitiesOfCountry(form.country)
      ? City.getCitiesOfCountry(form.country).map((city) => ({
          label: city.name,
          value: city.name,
        }))
      : [];

  // ========= CATEGORY & SUBCATEGORY =========
  const categoryOptions = categoriesList.map((c) => ({
    label: c.name,
    value: c.name,
  }));

  const subCategoryOptions =
    form.category &&
    categoriesList
      .find((c) => c.name === form.category)
      ?.subcategories.map((sub) => ({
        label: sub,
        value: sub,
      })) || [];

  // ========= Update phone prefix =========
  useEffect(() => {
    const selectedCountry = countryOptions.find(
      (c) => c.value === form.country
    );
    if (selectedCountry) setCountryCode("+" + selectedCountry.phoneCode);
  }, [form.country]);

  // ========= Input Change =========
  function handleChange(e) {
    const { name, value, files } = e.target;
    if (files) setForm({ ...form, [name]: files[0] });
    else setForm({ ...form, [name]: value });
  }

  // ========= Load Google Map =========
  async function loadMap() {
    if (mapLoaded) return;
    setMapLoaded(true);

    try {
      if (!window.google) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 43.7102, lng: 7.262 },
        zoom: 13,
      });

      const input = document.getElementById("location-input");
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        fields: ["formatted_address", "geometry"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        map.setCenter({ lat, lng });
        map.setZoom(15);

        if (markerRef.current) markerRef.current.setMap(null);

        const marker = new window.google.maps.Marker({
          map,
          position: { lat, lng },
          draggable: true,
        });

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          setForm((prev) => ({
            ...prev,
            lat: pos.lat(),
            lng: pos.lng(),
          }));
        });

        markerRef.current = marker;
        setForm((prev) => ({
          ...prev,
          location: place.formatted_address,
          lat,
          lng,
        }));
      });
    } catch (err) {
      console.error("Google Maps failed to load:", err);
      setError(
        "❌ Failed to load Google Maps. Check your API key or domain restrictions."
      );
    }
  }

  // ========= Validation =========
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function isValidURL(url) {
    return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/.test(url);
  }
  function isValidPhone(phone) {
    return /^[1-9]\d{6,14}$/.test(phone);
  }

  // ========= Submit =========
  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    const required = [
      "name",
      "category",
      "sub_category",
      "country",
      "city",
      "address",
      "postal_code",
      "location",
      "image",
    ];

    for (const f of required) {
      if (!form[f]) {
        setError(`⚠️ ${f.replace("_", " ").toUpperCase()} is required.`);
        return;
      }
    }

    if (form.email && !isValidEmail(form.email)) {
      setError("❌ Invalid email format.");
      return;
    }
    if (form.website && !isValidURL(form.website)) {
      setError("❌ Invalid website URL.");
      return;
    }
    if (form.phone && !isValidPhone(form.phone)) {
      setError("❌ Invalid phone number format (enter without 0).");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();

      for (const [key, value] of Object.entries(form)) {
        if (typeof value === "object" && value !== null && "value" in value) {
          data.append(key, value.value);
        } else {
          data.append(key, value);
        }
      }

      // ✅ تغییر امنیتی اصلی
      await apiClient.post("/admin/businesses", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg("✅ Business added successfully!");
      setForm({
        name: "",
        category: "",
        sub_category: "",
        country: "",
        city: "",
        address: "",
        postal_code: "",
        phone: "",
        email: "",
        website: "",
        location: "",
        lat: "",
        lng: "",
        image: null,
      });
    } catch (err) {
      console.error(err);
      setError("❌ Error saving business.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AdminLayout>
      <main className="admin-container">
        <h2 className="admin-title mb-4">Add New Business</h2>

        <section className="admin-section w-full">
          <form onSubmit={submit} className="space-y-4 w-full">
            {/* NAME */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                NAME <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="admin-input"
                placeholder="Business name"
                required
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                CATEGORY <span className="text-red-500">*</span>
              </label>
              <Select
                options={categoryOptions}
                value={categoryOptions.find((c) => c.value === form.category) || null}
                onChange={(selected) =>
                  setForm((prev) => ({
                    ...prev,
                    category: selected?.value || "",
                    sub_category: "",
                  }))
                }
                placeholder="Select category"
                isClearable
                styles={customSelectStyles}
              />
            </div>

            {/* SUB CATEGORY */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                SUB CATEGORY <span className="text-red-500">*</span>
              </label>
              <Select
                options={subCategoryOptions}
                value={subCategoryOptions.find((s) => s.value === form.sub_category) || null}
                onChange={(selected) =>
                  setForm((prev) => ({
                    ...prev,
                    sub_category: selected?.value || "",
                  }))
                }
                placeholder={
                  form.category
                    ? "Select sub category"
                    : "Select category first"
                }
                isDisabled={!form.category}
                isClearable
                styles={customSelectStyles}
              />
            </div>

            {/* COUNTRY */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                COUNTRY <span className="text-red-500">*</span>
              </label>
              <Select
                options={countryOptions}
                value={countryOptions.find((c) => c.value === form.country) || null}
                onChange={(selected) =>
                  setForm((prev) => ({
                    ...prev,
                    country: selected?.value || "",
                    city: "",
                  }))
                }
                placeholder="Select country"
                isClearable
                styles={customSelectStyles}
              />
            </div>

            {/* CITY */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                CITY <span className="text-red-500">*</span>
              </label>
              <Select
                options={cityOptions}
                value={cityOptions.find((c) => c.value === form.city) || null}
                onChange={(selected) =>
                  setForm((prev) => ({
                    ...prev,
                    city: selected?.value || "",
                  }))
                }
                placeholder={
                  form.country ? "Select city" : "Select country first"
                }
                isDisabled={!form.country}
                isClearable
                styles={customSelectStyles}
              />
            </div>

            {/* ADDRESS */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                ADDRESS <span className="text-red-500">*</span>
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="admin-input"
                required
              />
            </div>

            {/* POSTAL CODE */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                POSTAL CODE <span className="text-red-500">*</span>
              </label>
              <input
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                className="admin-input"
                required
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                PHONE (optional)
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-gray-500">
                  {countryCode}
                </span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter without leading 0"
                  className="flex-1 admin-input placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                EMAIL (optional)
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@mail.com"
                className="admin-input"
              />
            </div>

            {/* WEBSITE */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                WEBSITE (optional)
              </label>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="admin-input"
              />
            </div>

            {/* LOCATION (with map) */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                LOCATION <span className="text-red-500">*</span>
              </label>
              <input
                id="location-input"
                name="location"
                value={form.location}
                onChange={handleChange}
                onFocus={loadMap}
                placeholder="Click to select on Google Map"
                className="admin-input"
                required
              />
              {mapLoaded && (
                <div
                  ref={mapRef}
                  className="mt-3 h-64 w-full rounded-lg border border-[var(--border)]"
                ></div>
              )}
              {form.lat && form.lng && (
                <p className="text-xs mt-1 text-gray-500">
                  📍 Lat: {form.lat.toFixed(5)}, Lng: {form.lng.toFixed(5)}
                </p>
              )}
            </div>

            {/* IMAGE UPLOAD */}
            <div>
              <label className="block text-sm mb-1 font-medium opacity-80">
                UPLOAD PICTURE <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleChange}
                className="block w-full text-sm text-gray-500 border border-[var(--border)] rounded cursor-pointer bg-[var(--bg)] file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-turquoise file:text-navy hover:file:bg-turquoise/90 transition"
                required
              />
            </div>

            {/* BUTTONS */}
            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-turquoise text-navy font-medium rounded shadow hover:bg-turquoise/90 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <a
                href="/admin/businesses"
                className="px-4 py-2 border border-[var(--border)] rounded text-[var(--text)] bg-[var(--bg)] hover:opacity-80 transition"
              >
                Cancel
              </a>
            </div>

            {msg && (
              <p className="text-sm mt-2 text-green-600 font-medium">{msg}</p>
            )}
            {error && (
              <p className="text-sm mt-2 text-red-500 font-medium">{error}</p>
            )}
          </form>
        </section>
      </main>
    </AdminLayout>
  );
}
