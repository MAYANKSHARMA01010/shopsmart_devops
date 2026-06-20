"use client";

import { useEffect, useState } from "react";
import { productService } from "../../../features/products/services/productService";
import { categoryService } from "../../../features/categories/services/categoryService";
import type { Product, ProductData } from "../../../features/products/types/productSchema";
import type { CategoryNode } from "../../../features/categories/types/categorySchema";
import { formatPrice } from "../../../features/products/types/productSchema";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<ProductData>({
    name: "",
    description: "",
    basePrice: 0,
    stock: 0,
    images: [],
    categoryId: "",
    isVisible: true,
  });

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const [prodRes, catRes] = await Promise.all([
        productService.getAll(),
        categoryService.getTree()
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (error) {
      console.error("Failed to load products/categories", error);
      alert("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        basePrice: product.basePrice,
        stock: product.stock,
        images: product.images || [],
        categoryId: product.categoryId,
        isVisible: product.isVisible,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        basePrice: 0,
        stock: 0,
        images: [],
        categoryId: categories.length > 0 ? categories[0].id : "",
        isVisible: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        alert("Product updated successfully");
      } else {
        await productService.create(formData);
        alert("Product created successfully");
      }
      handleCloseModal();
      fetchProducts();
    } catch (error: any) {
      console.error("Save failed", error);
      alert(error?.response?.data?.message || "Failed to save product");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await productService.delete(id);
        alert("Product deleted successfully");
        fetchProducts();
      } catch (error: any) {
        alert(error?.response?.data?.message || "Failed to delete product");
      }
    }
  };

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  // Helper to flatten categories for the select dropdown
  const flattenCategories = (nodes: CategoryNode[], prefix = ""): { id: string; name: string }[] => {
    let result: { id: string; name: string }[] = [];
    for (const node of nodes) {
      result.push({ id: node.id, name: `${prefix}${node.name}` });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenCategories(node.children, prefix + "— "));
      }
    }
    return result;
  };

  const flatCategories = flattenCategories(categories);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Inventory Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>Add Product</button>
      </div>

      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "var(--color-background)" }}>
            <tr>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>ID</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Name</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Price</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Stock</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Visible</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "1rem", color: "var(--color-text-muted)" }}>{product.id.slice(0, 8)}...</td>
                <td style={{ padding: "1rem", fontWeight: 500 }}>{product.name}</td>
                <td style={{ padding: "1rem" }}>${formatPrice(product.basePrice)}</td>
                <td style={{ padding: "1rem" }}>{product.stock}</td>
                <td style={{ padding: "1rem" }}>{product.isVisible ? "Yes" : "No"}</td>
                <td style={{ padding: "1rem" }}>
                  <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem", marginRight: "0.5rem" }} onClick={() => handleOpenModal(product)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }} onClick={() => handleDelete(product.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>{editingProduct ? "Edit Product" : "Add Product"}</h2>
            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Name</label>
                <input required type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: "100%" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Description</label>
                <textarea className="input" value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: "100%", minHeight: "80px" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Base Price ($)</label>
                  <input required type="number" step="0.01" min="0" className="input" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})} style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Stock Quantity</label>
                  <input required type="number" min="0" className="input" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} style={{ width: "100%" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Category</label>
                <select required className="input" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} style={{ width: "100%" }}>
                  <option value="" disabled>Select a category</option>
                  {flatCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Image URLs (comma separated)</label>
                <input type="text" className="input" value={formData.images?.join(", ")} onChange={e => setFormData({...formData, images: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} style={{ width: "100%" }} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" />
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
                  <input type="checkbox" checked={formData.isVisible} onChange={e => setFormData({...formData, isVisible: e.target.checked})} />
                  Product is Visible
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
