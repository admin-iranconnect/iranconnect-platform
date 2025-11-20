import Link from 'next/link';

export default function BusinessTable({ items = [] }) {
  if (!items.length) {
    return <div className="text-sm text-gray-500">No businesses yet.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-black/5">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Category</th>
            <th className="text-left p-3">City</th>
            <th className="text-left p-3">Avg Rating</th>
            <th className="text-left p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <img
                    src={b.logo_url || '/logo.png'}
                    className="w-8 h-8 rounded object-cover"
                    alt={b.name}
                  />
                  <span className="font-medium text-navy">{b.name}</span>
                </div>
              </td>
              <td className="p-3">{b.category}</td>
              <td className="p-3">{b.city}</td>
              <td className="p-3">{b.avg_rating ?? '—'}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Link
                    href={`/admin/edit/${b.id}`}
                    className="text-turquoise hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    className="text-red-600/80 hover:underline"
                    disabled
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
