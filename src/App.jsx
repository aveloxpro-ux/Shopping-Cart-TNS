import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Cart Builder — v8
 * - Panel uses ItemName + (Qty, Amount); we compute unit price = amount/qty
 * - Rows are not directly editable; edit via panel
 * - Small "X" remove button
 * - Mobile: decimal keypad, accepts '.' or ','
 */

export default function App() {
  // ---------- State ----------
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("shopping_cart_items_v8");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(0); // line total (k VND)
  const [errors, setErrors] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // ---------- Refs ----------
  const tableRef = useRef(null);
  const addPanelRef = useRef(null);
  const lastActionRef = useRef(null); // "add" | "save" | "remove" | null

  // ---------- Persistence ----------
  useEffect(() => {
    localStorage.setItem("shopping_cart_items_v8", JSON.stringify(items));
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
    const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.unitPrice), 0);
    const totalQty = items.reduce((s, it) => s + num(it.qty), 0);
    return { subtotal, totalQty };
  }, [items]);

  // ---------- Handlers ----------
  function onRowClick(it) {
    // load the row into the panel for editing
    setEditingId(it.id);
    setName(it.name);
    setQty(num(it.qty));
    const amt = num(it.qty) * num(it.unitPrice);
    setAmount(amt);
    addPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function addItem() {
    const errs = validateForPanel(name, qty, amount);
    setErrors(errs);
    if (errs.length) return;

    const unitPrice = safeDivide(amount, qty);
    const newItem = { id: uid(), name: name.trim(), qty: Number(qty), unitPrice: Number(unitPrice) };
    setItems(prev => [...prev, newItem]); // append bottom
    lastActionRef.current = "add";
    clearForm();
  }

  function saveItem() {
    if (!editingId) return;

    const errs = validateForPanel(name, qty, amount);
    setErrors(errs);
    if (errs.length) return;

    const unitPrice = safeDivide(amount, qty);
    setItems(prev =>
      prev.map(it =>
        it.id === editingId ? { ...it, name: name.trim(), qty: Number(qty), unitPrice: Number(unitPrice) } : it
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
    setAmount(0);
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
          {items.length === 0 ? <div className="empty">No items yet. Add something below.</div> : null}

          {items.map((it, idx) => {
            const lineAmt = num(it.qty) * num(it.unitPrice);
            const selected = editingId === it.id;
            return (
              <div
                className={`row ${selected ? "selected" : ""}`}
                key={it.id}
                onClick={() => onRowClick(it)}
                title="Tap to edit this line"
              >
                <div className="col no">{idx + 1}</div>
                <div className="col item itemCell">{it.name}</div>
                <div className="col qty mono">{num(it.qty)}</div>
                <div className="col unit mono">{num(it.unitPrice).toFixed(1)}</div>
                <div className="col amount mono">{fmtKVND(lineAmt)}</div>
                <div className="col action">
                  <button
                    className="remX"
                    aria-label="Remove"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(it.id);
                    }}
                  >
                    X
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

      {/* Add / Edit panel — matches mockups */}
      <section className="editPanel" ref={addPanelRef}>
        {/* Row 1: Item Name + Add/Save */}
        <div className="rowInputs">
          <div className="field grow">
            <label>Item Name</label>
            <input
              className="in"
              placeholder="e.g. Book"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="actions">
            {isEditing ? (
              <button className="btn add" onClick={saveItem}>SAVE</button>
            ) : (
              <button className="btn add" onClick={addItem}>SAVE</button> /* label SAVE like mockup */
            )}
          </div>
        </div>

        {/* Row 2: Qty + Amount + Cancel */}
        <div className="rowInputs">
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
            <label>Amount</label>
            {/* Accept both "." and "," decimals, show decimal keypad; stop iOS zoom (font-size 16+ via CSS) */}
            <input
              className="in number no-spin"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="e.g. 10.5"
              value={amount}
              onChange={(e) => setAmount(clampFloat(e.target.value, 0))}
            />
          </div>

          <div className="actions">
            <button className="btn ghost" onClick={clearForm}>CANCEL</button>
          </div>
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

/* ---------- Utils ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function safeDivide(amount, qty) {
  const q = num(qty);
  if (!q) return 0;
  return num(amount) / q;
}
function clampInt(v, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const x = Math.round(Number(String(v).replace(",", ".")));
  return Math.min(max, Math.max(min, Number.isFinite(x) ? x : 0));
}
function clampFloat(v, min = 0, max = Number.MAX_VALUE) {
  const x = Number(String(v).replace(",", "."));
  const n = Number.isFinite(x) ? x : 0;
  return Math.min(max, Math.max(min, n));
}
/** 10.0 k VND (number first, unit after) */
function fmtKVND(v) {
  return `${num(v).toFixed(1)} k VND`;
}
function validateForPanel(name, qty, amount) {
  const errs = [];
  if (!name.trim()) errs.push("Item name is required.");
  if (!qty || qty <= 0) errs.push("Qty must be ≥ 1.");
  if (amount < 0) errs.push("Amount must be ≥ 0.");
  return errs;
}
