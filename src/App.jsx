import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

export default function App() {
  // ---------- State ----------
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("shopping_cart_items_v7");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [errors, setErrors] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // ---------- Refs ----------
  const tableRef = useRef(null);
  const addPanelRef = useRef(null);
  const lastActionRef = useRef(null); // "add" | "save" | "remove" | null

  // ---------- Persistence ----------
  useEffect(() => {
    localStorage.setItem("shopping_cart_items_v7", JSON.stringify(items));
  }, [items]);

  // Auto-scroll to the BOTTOM when a new row is added
  useEffect(() => {
    if (lastActionRef.current === "add" && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
    lastActionRef.current = null;
  }, [items]);

  // ---------- Derived ----------
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.price), 0);
    const totalQty = items.reduce((s, it) => s + num(it.qty), 0);
    return { subtotal, totalQty };
  }, [items]);

  // ---------- Handlers ----------
  function onRowClick(it) {
    setEditingId(it.id);
    setName(it.name);
    setQty(num(it.qty));
    setPrice(num(it.price));
    addPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function addItem() {
    const errs = validate(name, qty, price);
    setErrors(errs);
    if (errs.length) return;

    const newItem = { id: uid(), name: name.trim(), qty: Number(qty), price: Number(price) };
    setItems(prev => [...prev, newItem]); // append at bottom
    lastActionRef.current = "add";
    clearForm();
  }

  function saveItem() {
    if (!editingId) return;
    const errs = validate(name, qty, price);
    setErrors(errs);
    if (errs.length) return;

    setItems(prev =>
      prev.map(it =>
        it.id === editingId ? { ...it, name: name.trim(), qty: Number(qty), price: Number(price) } : it
      )
    );
    lastActionRef.current = "save";
    clearForm();
  }

  function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id));
    if (editingId === id) clearForm();
    lastActionRef.current = "remove";
  }

  function clearAll() {
    if (confirm("Clear all items?")) {
      setItems([]);
      clearForm();
    }
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setQty(1);
    setPrice(0);
    setErrors([]);
  }

  const isEditing = Boolean(editingId);

  return (
    <div className="wrap">
      {/* Header */}
      <header className="header">
        <div className="title">
          <span className="emoji" aria-hidden>🛒</span>
          <span>Cart Builder</span>
        </div>
        <div className="totalBox">
          <label className="totalLabel">Total Amount</label>
          <div className="totalValue">{fmtKVND(totals.subtotal)}</div>
        </div>
      </header>

      {/* Card with table */}
      <section className="card">
        <div className="tableHeader">
          <div className="col no">No.</div>
          <div className="col item">Item</div>
          <div className="col qty">Qty</div>
          <div className="col unit">Unit Price</div>
          <div className="col amount">Amount</div>
          <div className="col action"></div>
        </div>

        <div className="tableBody" ref={tableRef}>
          {items.length === 0 ? (
            <div className="empty">No items yet. Add something below.</div>
          ) : null}

          {items.map((it, idx) => {
            const amount = num(it.qty) * num(it.price);
            const selected = editingId === it.id;
            return (
              <div
                className={`row ${selected ? "selected" : ""}`}
                key={it.id}
                onClick={() => onRowClick(it)}
                title="Click to edit this line"
              >
                <div className="col no">{idx + 1}</div>
                <div className="col item itemCell">{it.name}</div>
                <div className="col qty mono">
                  <input
                    className="in number small"
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateItem(setItems, it.id, { qty: clampInt(e.target.value, 1) })}
                  />
                </div>
                <div className="col unit mono">
                  {/* keep inline edit, but hide spinners */}
                  <input
                    className="in number small no-spin"
                    type="number"
                    step="0.1"
                    min={0}
                    value={it.price}
                    onChange={(e) => updateItem(setItems, it.id, { price: clampFloat(e.target.value, 0) })}
                  />
                </div>
                <div className="col amount mono">{fmtKVND(amount)}</div>
                <div className="col action">
                  <button
                    className="btn remove"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation(); // don't trigger row edit
                      removeItem(it.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cardFooter">
          <div className="footerLeft">
            <button className="btn ghost" onClick={clearAll} disabled={items.length === 0}>
              Clear all
            </button>
            <div className="muted">Total items: <b>{totals.totalQty}</b></div>
          </div>
        </div>
      </section>

      {/* Add / Edit panel */}
      <section className="addPanel" ref={addPanelRef}>
        <div className="field">
          <label>Item Name</label>
          <input
            className="in"
            placeholder="e.g. Yo Most"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field narrow">
          <label>Qty</label>
          <input
            className="in number"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(clampInt(e.target.value, 1))}
          />
        </div>
        <div className="field narrow">
          <label>Unit Price</label>
          {/* no spinners, numeric keypad on mobile */}
          <input
            className="in number no-spin"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={price}
            onChange={(e) => setPrice(clampFloat(e.target.value, 0))}
          />
        </div>
        <div className="actions">
          {isEditing ? (
            <>
              <button className="btn add" onClick={saveItem}>SAVE</button>
              <button className="btn ghost" onClick={clearForm} style={{ marginLeft: 8 }}>Cancel</button>
            </>
          ) : (
            <button className="btn add" onClick={addItem}>ADD</button>
          )}
        </div>
      </section>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function clampInt(v, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const x = Math.round(num(v));
  return Math.min(max, Math.max(min, x));
}
function clampFloat(v, min = 0, max = Number.MAX_VALUE) {
  // allow "1,5" as 1.5, etc.
  const x = Number(String(v).replace(",", "."));
  const n = Number.isFinite(x) ? x : 0;
  return Math.min(max, Math.max(min, n));
}
/** 10.0 k VND (number first, unit after) */
function fmtKVND(v) {
  return `${num(v).toFixed(1)} k VND`;
}
function validate(name, qty, price) {
  const errs = [];
  if (!name.trim()) errs.push("Item name is required.");
  if (!qty || qty <= 0) errs.push("Qty must be ≥ 1.");
  if (price < 0) errs.push("Unit price must be ≥ 0.");
  return errs;
}
function updateItem(setter, id, patch) {
  setter(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
}
