import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import apiClient from "../../utils/apiClient"; // ✅ axios امن با interceptor
import AdminLayout from "../../components/admin/AdminLayout";

export default function NewBusiness() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    category: "",
    city: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🧭 بررسی نقش admin و وجود JWT قبل از بارگذاری
  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    const role = localStorage.getItem("iran_role");

    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    if (role !== "admin") {
      window.location.href = "/";
      return;
    }
  }, []);

  // ✏️ مدیریت ورودی‌ها
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // 💾 ارسال فرم
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiClient.post(`/api/admin/businesses`, form);
      alert("✅ Business added successfully!");
      router.push("/admin");
    } catch (err) {
      console.error("❌ Error creating business:", err);
      setError(err.response?.data?.error || "Failed to create business.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <section className="section-gap max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-6 text-[var(--text)]">
          ➕ Add New Business
        </h1>

        {error && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]
          shadow-[5px_5px_15px_var(--shadow-dark),-5px_-5px_15px_var(--shadow-light)] space-y-4"
        >
          <div>
            <label className="block mb-1 text-sm font-medium">Business Name</label>
            <input
              name="name"
              placeholder="Enter business name..."
              className="admin-input w-full"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Category</label>
            <input
              name="category"
              placeholder="Enter category..."
              className="admin-input w-full"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">City</label>
            <input
              name="city"
              placeholder="Enter city..."
              className="admin-input w-full"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Description</label>
            <textarea
              name="description"
              placeholder="Write a short description..."
              rows="4"
              className="admin-input w-full"
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary w-full mt-4"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Business"}
          </button>
        </form>
      </section>
    </AdminLayout>
  );
}
