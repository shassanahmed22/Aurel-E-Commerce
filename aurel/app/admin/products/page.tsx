import { createClient } from "@/lib/supabase/server";
import PublishToggle from "@/components/admin/PublishToggle";

export default async function AdminProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku_prefix, price_cents, is_published, collections(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="container-aurel py-12">
      <h1 className="text-3xl mb-8">Products</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-sand">
            <th className="py-2">Name</th>
            <th className="py-2">Collection</th>
            <th className="py-2">SKU</th>
            <th className="py-2">Price</th>
            <th className="py-2">Published</th>
          </tr>
        </thead>
        <tbody>
          {(products ?? []).map((p: any) => (
            <tr key={p.id} className="border-b border-sand/50">
              <td className="py-3">{p.name}</td>
              <td className="py-3">{p.collections?.name}</td>
              <td className="py-3">{p.sku_prefix}</td>
              <td className="py-3">${(p.price_cents / 100).toFixed(2)}</td>
              <td className="py-3">
                <PublishToggle productId={p.id} initialValue={p.is_published} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
