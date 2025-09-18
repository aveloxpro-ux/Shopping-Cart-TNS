import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * Cart Builder — v14
 * Changes:
 * 1) Buttons 10% smaller + slightly smaller font
 * 2) Panel "Amount" = Unit Price (no dividing by qty); table Amount = unitPrice * qty
 * 3) Table Amount column shows plain number (no "k VND"); Total still shows "k VND"
 * Other features kept:
 * - 7 visible table rows
 * - 3-row panel: Row1: Item Name; Row2: Qty | Amount; Row3: Cancel | Save
 * - Tap row to edit; small "X" remove; clear-all modal; mobile-friendly inputs
 */

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("shopping_cart_items_v14");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [name, setName] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [amountStr, setAmountStr] = useState(""); // this is Unit Price in logic
  const [errors, setErrors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const tableRef = useRef(null);
  const panelRef = useRef(null);
  const lastActionRef = useRef(null);

  // persist
  useEffect(() => {
    localStorage.setItem("shopping_cart_items_v14", JSON.stringify(items));
  }, [items]);

  // scroll to bottom after add
  useEffect(() => {
    if (lastActionRef.current === "add" && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
    lastActionRef.current = null;
  }, [items]);

  // totals (subtotal used for Total Amount box)
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.unitPrice), 0);
    const totalQty = items.reduce((s, it) => s + num(it.qty), 0);
    return { subtotal, totalQty };
  }, [items]);

  // click row to edit
  function onRowClick(it) {
    setEditingId(it.id);
    setName(it.name);
    setQtyStr(String(num(it.qty) || ""));          // show qty
    setAmountStr(String(num(it.unitPrice) || "")); // panel Amount holds UNIT PRICE
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // add or save
  function addOrSave() {
    const errs = validateForPanel(name, qtyStr, amountStr);
    setErrors(errs);
    if (errs.length) return;

    const qty = parseIntSafe(qtyStr);
    const unitPrice = parseFloatSafe(amountStr); // <- Amount field is unit price

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
      setItems(prev => [...prev, newItem]); // append to bottom
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

      {/* Table Card */}
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
                {/* Amount column = qty * unitPrice, plain number */}
                <div className="col amount mono">{num(lineAmt).toFixed(1)}</div>
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

      {/* Add / Edit panel (3 rows) */}
      <section className="panel-3rows" ref={panelRef}>
        {/* Row 1: Item Name */}
        <div className="row1">
          <label className="lbl">Item Name</label>
          <input
            className="in"
            placeholder="e.g. Book"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Row 2: Qty | Amount (Amount = Unit Price) */}
        <div className="row2">
          <div className="field">
            <label className="lbl">Qty</label>
            <input
              className="in"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={qtyStr}
              onChange={(e) => setQtyStr(onlyDigits(e.target.value))}
            />
          </div>

          <div className="field">
            <label className="lbl">Amount</label>
            <input
              className="in"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={amountStr}
              onChange={(e) => setAmountStr(onlyDecimal(e.target.value))}
            />
          </div>
        </div>

        {/* Row 3: buttons */}
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

      {/* Clear-all modal */}
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
function fmtKVND(v) {
  return `${num(v).toFixed(1)} k VND`;
}
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
