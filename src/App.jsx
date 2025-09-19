import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Cart Builder — v17
 */

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("shopping_cart_items_v17");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [amountStr, setAmountStr] = useState(""); // panel Amount = unit price
  const [errors, setErrors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const tableRef = useRef(null);
  const panelRef = useRef(null);
  const lastActionRef = useRef(null);

  // refs for Enter-to-next
  const nameRef = useRef(null);
  const qtyRef = useRef(null);
  const amountRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("shopping_cart_items_v17", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (lastActionRef.current === "add" && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
    lastActionRef.current = null;
  }, [items]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.unitPrice), 0);
    const totalQty = items.reduce((s, it) => s + num(it.qty), 0);
    return { subtotal, totalQty };
  }, [items]);

  function onRowClick(it) {
    setEditingId(it.id);
    setName(it.name);
    setQtyStr(String(num(it.qty) || ""));
    setAmountStr(String(num(it.unitPrice) || "")); // panel shows unit price
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    nameRef.current?.focus();
  }

  function addOrSave() {
    const errs = validateForPanel(name, qtyStr, amountStr);
    setErrors(errs);
    if (errs.length) return;

    const qty = parseIntSafe(qtyStr);
    const unitPrice = parseFloatSafe(amountStr); // Amount = unit price

    if (editingId) {
      setItems(prev =>
        prev.map(it =>
          it.id === editingId ? { ...it, name: name.trim(), qty, unitPrice } : it
        )
      );
      lastActionRef.current = "save";
    } else {
      setItems(prev => [...prev, { id: uid(), name: name.trim(), qty, unitPrice }]);
      lastActionRef.current = "add";
    }
    clearForm();
  }

  function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id));
    if (editingId === id) clearForm();
    lastActionRef.current = "remove";
  }

  function requestClearAll() { setShowConfirm(true); }
  function respondClearAll(yes) {
    setShowConfirm(false);
    if (yes) { setItems([]); clearForm(); }
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setQtyStr("");
    setAmountStr("");
    setErrors([]);
    nameRef.current?.focus();
  }

  // Enter -> next input; last -> blur() to close keyboard
  function handleEnterAdvance(e, nextRef) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) nextRef.current.focus();
      else e.currentTarget.blur();
    }
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

      {/* Table */}
      <section className="card">
        <div className="tableHeader">
          <div className="col no">No.</div>
          <div className="col item">Item</div>
          <div className="col qty">Qty</div>
          <div className="col unit">Unit Price</div>
          <div className="col amount">Amount</div>
          <div className="col action" />
        </div>

        <div className="tableBody" ref={tableRef}>
          {items.length === 0 && (
            <div className="empty">No items yet. Add something below.</div>
          )}

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
                <div className="col amount mono">{num(lineAmt).toFixed(1)}</div>
                <div className="col action">
                  <button
                    className="remX"
                    aria-label="Remove"
                    title="Remove"
                    onClick={(e) => { e.stopPropagation(); removeItem(it.id); }}
                  >X</button>
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

      {/* Add/Edit Panel */}
      <section className="panel-3rows" ref={panelRef}>
        {/* Row 1 */}
        <div className="row1">
          <label className="lbl">Item Name</label>
          <input
            ref={nameRef}
            className="in"
            placeholder="e.g. Book"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => handleEnterAdvance(e, qtyRef)}
            enterKeyHint="next"
          />
        </div>

        {/* Row 2 — 40% / 60% */}
        <div className="row2">
          <div className="field">
            <label className="lbl">Qty</label>
            <input
              ref={qtyRef}
              className="in"
              type="text"
              inputMode="decimal"      // iOS shows Return/Next
              pattern="[0-9]*"
              value={qtyStr}
              onChange={(e) => setQtyStr(onlyDigits(e.target.value))}
              onKeyDown={(e) => handleEnterAdvance(e, amountRef)}
              enterKeyHint="next"
            />
          </div>

          <div className="field">
            <label className="lbl">Amount</label>
            <input
              ref={amountRef}
              className="in"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={amountStr}
              onChange={(e) => setAmountStr(onlyDecimal(e.target.value))}
              onKeyDown={(e) => handleEnterAdvance(e, null)}
              enterKeyHint="done"
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="row3">
          <button className="btn ghost" onClick={clearForm}>CANCEL</button>
          <button className="btn add" onClick={addOrSave}>SAVE</button>
        </div>
      </section>

      {/* Errors */}
      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {/* Clear all modal */}
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

/* ---------- utils ---------- */
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
function fmtKVND(v) { return `${num(v).toFixed(1)} k VND`; }
function validateForPanel(name, qtyStr, amountStr) {
  const errs = [];
  if (!name.trim()) errs.push("Item name is required.");
  if (String(qtyStr).trim() === "") errs.push("Qty is required.");
  if (String(amountStr).trim() === "") errs.push("Amount (unit price) is required.");
  const qty = parseIntSafe(qtyStr);
  const unitPrice = parseFloatSafe(amountStr);
  if (qty <= 0) errs.push("Qty must be ≥ 1.");
  if (unitPrice < 0) errs.push("Amount (unit price) must be ≥ 0.");
  return errs;
}
function onlyDigits(s) { return String(s).replace(/[^\d]/g, ""); }
function onlyDecimal(s) {
  s = String(s).replace(/[^0-9\.,]/g, "");
  const i = s.search(/[.,]/);
  if (i !== -1) {
    const head = s.slice(0, i + 1);
    const tail = s.slice(i + 1).replace(/[.,]/g, "");
    return head + tail;
  }
  return s;
}
