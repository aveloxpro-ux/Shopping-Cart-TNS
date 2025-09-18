import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Cart Builder — v11
 * - Panel:
 *   Row 1: Item Name (label + full-width input)
 *   Row 2: Qty (label+input), Amount (label+input), then SAVE + CANCEL on the right
 * - Qty & Amount start empty; users must type
 * - No inline editing in the table
 * - Accepts '.' or ',' for decimals. Inputs are >=16px to avoid iOS zoom
 * - Clear-all modal (Yes/No)
 */

export default function App() {
  // ---------- State ----------
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("shopping_cart_items_v11");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [qtyStr, setQtyStr] = useState("");       // keep as string so it can be blank
  const [amountStr, setAmountStr] = useState(""); // keep as string so it can be blank
  const [errors, setErrors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ---------- Refs ----------
  const tableRef = useRef(null);
  const panelRef = useRef(null);
  const lastActionRef = useRef(null); // "add" | "save" | "remove" | null

  // ---------- Persistence ----------
  useEffect(() => {
    localStorage.setItem("shopping_cart_items_v11", JSON.stringify(items));
  }, [items]);

  // Scroll to bottom after add
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
    setEditingId(it.id);
    setName(it.name);
    setQtyStr(String(num(it.qty) || ""));
    const amt = num(it.qty) * num(it.unitPrice);
    setAmountStr(amt ? String(amt) : "");
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function addOrSave() {
    const errs = validateForPanel(name, qtyStr, amountStr);
    setErrors(errs);
    if (errs.length) return;

    const qty = parseIntSafe(qtyStr);
    const amount = parseFloatSafe(amountStr);
    const unitPrice = safeDivide(amount, qty);

    if (editingId) {
      setItems(prev =>
        prev.map(it =>
          it.id === editingId
            ? { ...it, name: name.trim(), qty, unitPrice: Number(unitPrice) }
            : it
        )
      );
      lastActionRef.current = "save";
    } else {
      const newItem = { id: uid(), name: name.trim(), qty, unitPrice: Number(unitPrice) };
      setItems(prev => [...prev, newItem]); // append at bottom
      lastActionRef.current = "add";
    }
    clearForm();
  }

  function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id));
    if (editingId === id) clearForm();
    lastActionRef.current = "remove";
  }

  function requestClearAll() {
    setShowConfirm(true);
  }
  function respondClearAll(yes) {
    setShowConfirm(false);
    if (yes) {
      setItems([]);
      clearForm();
    }
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setQtyStr("");
    setAmountStr("");
    setErrors([]);
  }

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
            <button className="btn ghost" onClick={requestClearAll} disabled={items.length === 0}>
              Clear all
            </button>
            <div className="muted">Total items: <b>{totals.totalQty}</b></div>
          </div>
        </div>
      </section>

      {/* Add / Edit panel — Row1: Item; Row2: Qty + Amount + [SAVE][CANCEL] */}
      <section className="panel-2rows" ref={panelRef}>
        {/* Row 1 */}
        <div className="row1">
          <label className="lbl">Item Name</label>
          <input
            className="in"
            placeholder="e.g. Book"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Row 2 */}
        <div className="row2">
          <label className="lbl">Qty</label>
          <input
            className="in number"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyStr}
            onChange={(e) => setQtyStr(onlyDigits(e.target.value))}
          />

          <label className="lbl">Amount</label>
          <input
            className="in number no-spin"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={amountStr}
            onChange={(e) => setAmountStr(onlyDecimal(e.target.value))}
          />

          <div className="buttons">
            <button className="btn add equal" onClick={addOrSave}>SAVE</button>
            <button className="btn ghost equal" onClick={clearForm}>CANCEL</button>
          </div>
        </div>
      </section>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {/* Clear All Modal */}
      {showConfirm && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalBox">
            <div className="modalTitle">Clear all items?</div>
            <div className="modalBody">Do you want to clear all items in the cart?</div>
            <div className="modalActions">
              <button className="btn ghost equal" onClick={() => respondClearAll(false)}>NO</button>
              <button className="btn add equal" onClick={() => respondClearAll(true)}>YES</button>
            </div>
          </div>
        </div>
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
function parseIntSafe(s) {
  const n = Number(String(s).replace(/\D+/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
function parseFloatSafe(s) {
  const cleaned = String(s).replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
function safeDivide(amount, qty) {
  const q = num(qty);
  if (!q) return 0;
  return num(amount) / q;
}
function fmtKVND(v) {
  return `${num(v).toFixed(1)} k VND`;
}
function validateForPanel(name, qtyStr, amountStr) {
  const errs = [];
  if (!name.trim()) errs.push("Item name is required.");
  if (String(qtyStr).trim() === "") errs.push("Qty is required.");
  if (String(amountStr).trim() === "") errs.push("Amount is required.");

  const qty = parseIntSafe(qtyStr);
  const amt = parseFloatSafe(amountStr);

  if (qty <= 0) errs.push("Qty must be ≥ 1.");
  if (amt < 0) errs.push("Amount must be ≥ 0.");
  return errs;
}
function onlyDigits(s) {
  return String(s).replace(/[^\d]/g, "");
}
function onlyDecimal(s) {
  // keep digits and a single '.' or ','
  s = String(s).replace(/[^0-9\.,]/g, "");
  const firstSep = s.search(/[.,]/);
  if (firstSep !== -1) {
    const head = s.slice(0, firstSep + 1);
    const tail = s.slice(firstSep + 1).replace(/[.,]/g, "");
    return head + tail;
  }
  return s;
}
