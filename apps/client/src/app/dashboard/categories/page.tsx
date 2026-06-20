"use client";

import { useEffect, useState } from "react";
import { categoryService } from "../../../features/categories/services/categoryService";
import type { CategoryNode, CategoryCreateInput } from "../../../features/categories/types/categorySchema";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);

  const [formData, setFormData] = useState<CategoryCreateInput>({
    name: "",
    slug: "",
    parentId: undefined,
  });

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await categoryService.getTree();
      setCategories(res.data as any || []); 
    } catch (error) {
      console.error("Failed to load categories", error);
      alert("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category?: CategoryNode) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        parentId: category.parentId || undefined,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        slug: "",
        parentId: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        parentId: formData.parentId || null,
      };

      if (editingCategory) {
        await categoryService.update(editingCategory.id, payload);
        alert("Category updated successfully");
      } else {
        await categoryService.create(payload);
        alert("Category created successfully");
      }
      handleCloseModal();
      fetchCategories();
    } catch (error: any) {
      console.error("Save failed", error);
      alert(error?.response?.data?.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? It will fail if products exist under it.")) {
      try {
        await categoryService.delete(id);
        alert("Category deleted successfully");
        fetchCategories();
      } catch (error: any) {
        alert(error?.response?.data?.message || "Failed to delete category");
      }
    }
  };

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  // Flatten categories to avoid mapping the tree manually in select dropdown
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

  const flatCategoriesList = flattenCategories(categories);

  // A very simple recursive renderer for categories tree
  const renderTree = (nodes: CategoryNode[], depth = 0): React.ReactNode[] => {
    let result: React.ReactNode[] = [];
    nodes.forEach(node => {
      result.push(
        <tr key={node.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <td style={{ padding: "1rem", color: "var(--color-text-muted)" }}>{node.id.slice(0, 8)}...</td>
          <td style={{ padding: "1rem", paddingLeft: `${1 + depth * 2}rem`, fontWeight: depth === 0 ? 600 : 400 }}>
            {depth > 0 && <span style={{ marginRight: "0.5rem", color: "var(--color-text-muted)" }}>|_</span>}
            {node.name}
          </td>
          <td style={{ padding: "1rem" }}>{node.slug}</td>
          <td style={{ padding: "1rem" }}>
            <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem", marginRight: "0.5rem" }} onClick={() => handleOpenModal(node)}>Edit</button>
            <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }} onClick={() => handleDelete(node.id)}>Delete</button>
          </td>
        </tr>
      );
      if (node.children && node.children.length > 0) {
        result = result.concat(renderTree(node.children, depth + 1));
      }
    });
    return result;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>Category Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>Add Category</button>
      </div>

      <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "var(--color-background)" }}>
            <tr>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>ID</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Name</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Slug</th>
              <th style={{ padding: "1rem", borderBottom: "1px solid var(--color-border)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length > 0 ? renderTree(categories) : (
              <tr>
                <td colSpan={4} style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-muted)" }}>No categories found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>{editingCategory ? "Edit Category" : "Add Category"}</h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Name</label>
                <input required type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: "100%" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Slug (optional)</label>
                <input type="text" className="input" value={formData.slug || ""} onChange={e => setFormData({...formData, slug: e.target.value})} style={{ width: "100%" }} placeholder="Auto-generated if left blank" />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Parent Category</label>
                <select className="input" value={formData.parentId || ""} onChange={e => setFormData({...formData, parentId: e.target.value || undefined})} style={{ width: "100%" }}>
                  <option value="">None (Top-Level)</option>
                  {flatCategoriesList.filter(c => c.id !== editingCategory?.id).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
