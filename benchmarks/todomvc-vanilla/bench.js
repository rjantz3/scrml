#!/usr/bin/env bun
/**
 * Vanilla JS TodoMVC runtime benchmark — zero framework.
 *
 * Pure imperative DOM manipulation using raw DOM API:
 *   document.createElement, appendChild, replaceChild, removeChild,
 *   textContent, setAttribute, className.
 *
 * No virtual DOM, no signals, no observable wrappers, no factory helpers.
 * Each operation mutates the DOM surgically — only the affected nodes are
 * touched. This is the per-row cost floor: the irreducible DOM mutation cost
 * for these workloads; any framework above this number is paying overhead.
 *
 * Implementation style mirrors the canonical js-framework-benchmark vanilla-js
 * implementation (https://github.com/krausest/js-framework-benchmark) —
 * handcrafted but not pessimized.
 *
 * Uses happy-dom GlobalRegistrator for DOM environment.
 * Outputs JSON to stdout.
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!globalThis.document) GlobalRegistrator.register();

// ---------------------------------------------------------------------------
// Benchmark utilities (same shape as the other framework benches)
// ---------------------------------------------------------------------------

const WARMUP = 2;
const ITERATIONS = 5;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildTitle(i) {
  const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
  const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
  const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
  return `${adj[i % adj.length]} ${col[i % col.length]} ${noun[i % noun.length]}`;
}

function p95(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.min(idx, sorted.length - 1)];
}

function bench(name, setup, fn, iters = ITERATIONS) {
  for (let i = 0; i < WARMUP; i++) { setup(); fn(); }
  const times = [];
  for (let i = 0; i < iters; i++) {
    setup();
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return { benchmark: name, median: median(times), mean: mean(times), p95: p95(times), min: Math.min(...times), max: Math.max(...times) };
}

// ---------------------------------------------------------------------------
// Vanilla state + surgical DOM operations
//
// State is a plain array of { id, title, completed } objects + a parallel
// array of DOM nodes for direct addressing. Each operation mutates ONLY the
// affected DOM nodes — no full re-render, no reconciliation pass.
// ---------------------------------------------------------------------------

let nextId = 1;
let todos = [];          // [{ id, title, completed }, ...]
let nodes = [];          // parallel array of <li> nodes (indexed same as todos)

let todoAppEl = null;    // outer <div class="todoapp">
let mainSection = null;  // <section class="main">
let todoListEl = null;   // <ul class="todo-list">
let footerEl = null;     // <footer class="footer">
let countStrongEl = null; // <strong> showing active count
let countTextEl = null;   // text node " items left" / " item left"

// Build an <li class="todo-item"> for a given todo. Returns the <li> node.
//
// Structure (matches the other benches' DOM shape):
//   <li class="todo-item">
//     <div class="view">
//       <input class="toggle" type="checkbox">
//       <label>title</label>
//       <button class="destroy"></button>
//     </div>
//   </li>
function buildRow(todo) {
  const li = document.createElement("li");
  li.className = "todo-item";

  const view = document.createElement("div");
  view.className = "view";

  const toggle = document.createElement("input");
  toggle.className = "toggle";
  toggle.type = "checkbox";
  if (todo.completed) toggle.checked = true;

  const label = document.createElement("label");
  label.textContent = todo.title;

  const destroy = document.createElement("button");
  destroy.className = "destroy";

  view.appendChild(toggle);
  view.appendChild(label);
  view.appendChild(destroy);
  li.appendChild(view);
  return li;
}

function createDOM() {
  document.body.innerHTML = "";

  todoAppEl = document.createElement("div");
  todoAppEl.className = "todoapp";

  const header = document.createElement("header");
  header.className = "header";
  const h1 = document.createElement("h1");
  h1.textContent = "todos";
  header.appendChild(h1);
  todoAppEl.appendChild(header);

  mainSection = document.createElement("section");
  mainSection.className = "main";
  mainSection.style.display = "none";
  todoListEl = document.createElement("ul");
  todoListEl.className = "todo-list";
  mainSection.appendChild(todoListEl);
  todoAppEl.appendChild(mainSection);

  footerEl = document.createElement("footer");
  footerEl.className = "footer";
  footerEl.style.display = "none";
  const countSpan = document.createElement("span");
  countSpan.className = "todo-count";
  countStrongEl = document.createElement("strong");
  countStrongEl.textContent = "0";
  countTextEl = document.createTextNode(" items left");
  countSpan.appendChild(countStrongEl);
  countSpan.appendChild(countTextEl);
  footerEl.appendChild(countSpan);
  todoAppEl.appendChild(footerEl);

  document.body.appendChild(todoAppEl);
}

// Update the visible item count + the show/hide of main+footer.
// Only touches text content / display style — no list traversal.
function updateChrome() {
  let activeCount = 0;
  for (let i = 0; i < todos.length; i++) {
    if (!todos[i].completed) activeCount++;
  }
  countStrongEl.textContent = String(activeCount);
  countTextEl.nodeValue = activeCount === 1 ? " item left" : " items left";

  if (todos.length > 0) {
    mainSection.style.display = "";
    footerEl.style.display = "";
  } else {
    mainSection.style.display = "none";
    footerEl.style.display = "none";
  }
}

// ---------------------------------------------------------------------------
// Operations (each is a single surgical DOM mutation pass)
// ---------------------------------------------------------------------------

function resetApp() {
  todos = [];
  nodes = [];
  nextId = 1;
  createDOM();
  updateChrome();
}

// Append n new rows. Builds each <li> and appends directly to the list.
// In a real browser a DocumentFragment intermediate avoids per-append layout
// thrash, but in happy-dom (no layout) direct appendChild is consistently
// faster — matches what js-framework-benchmark vanilla-js does (no fragment).
function createRowsOp(n) {
  for (let i = 0; i < n; i++) {
    const todo = { id: nextId++, title: buildTitle(i), completed: false };
    todos.push(todo);
    const li = buildRow(todo);
    nodes.push(li);
    todoListEl.appendChild(li);
  }
  updateChrome();
}

// Clear all rows — single textContent assignment empties the list.
function clearRowsOp() {
  todos = [];
  nodes = [];
  todoListEl.textContent = "";
  updateChrome();
}

// Update every 10th row's label in place. Touches O(n/10) DOM nodes only.
function updateEvery10thOp() {
  for (let i = 0; i < todos.length; i += 10) {
    todos[i].title = todos[i].title + " !!!";
    // <li> -> <div class="view"> -> <input>, <label>, <button>
    const label = nodes[i].firstChild.childNodes[1];
    label.textContent = todos[i].title;
  }
  // count is unchanged; skip chrome update
}

// "Select row" — toggle a `selected` class on the row at index idx.
// Mirrors the Svelte impl's selectRow (classList toggle, no list traversal).
function selectRowOp(idx) {
  if (nodes[idx]) {
    nodes[idx].className = "todo-item selected";
  }
}

// Swap two rows. Done as a single DOM reorder:
// remove node[b], insert it before node[a], then move node[a] (now at b+1) to
// where node[b] was. We use insertBefore which handles the move correctly.
function swapRowsOp(a, b) {
  if (a === b) return;
  if (!todos[a] || !todos[b]) return;

  // Normalize a < b
  if (a > b) { const t = a; a = b; b = t; }

  const nodeA = nodes[a];
  const nodeB = nodes[b];
  const afterB = nodeB.nextSibling;

  // Move nodeB into nodeA's slot
  todoListEl.insertBefore(nodeB, nodeA);
  // Move nodeA into nodeB's old slot
  todoListEl.insertBefore(nodeA, afterB);

  // Update state arrays
  const tmpT = todos[a]; todos[a] = todos[b]; todos[b] = tmpT;
  const tmpN = nodes[a]; nodes[a] = nodes[b]; nodes[b] = tmpN;
}

// Remove a single row by index.
function removeRowOp(idx) {
  if (idx < 0 || idx >= todos.length) return;
  const node = nodes[idx];
  todoListEl.removeChild(node);
  todos.splice(idx, 1);
  nodes.splice(idx, 1);
  updateChrome();
}

// Delete every 10th row. Collect target indices, then splice in reverse so
// remaining indices stay valid as we go.
function deleteEvery10thOp() {
  const removeAt = [];
  for (let i = 0; i < todos.length; i += 10) removeAt.push(i);
  for (let k = removeAt.length - 1; k >= 0; k--) {
    const i = removeAt[k];
    todoListEl.removeChild(nodes[i]);
    todos.splice(i, 1);
    nodes.splice(i, 1);
  }
  updateChrome();
}

// ---------------------------------------------------------------------------
// Run benchmarks
// ---------------------------------------------------------------------------

createDOM();

const results = [];

results.push(bench("initial-render",
  () => {},
  () => { createDOM(); updateChrome(); },
));

results.push(bench("create-1000",
  () => resetApp(),
  () => createRowsOp(1000),
));

results.push(bench("replace-1000",
  () => { resetApp(); createRowsOp(1000); },
  () => { clearRowsOp(); createRowsOp(1000); },
));

results.push(bench("partial-update",
  () => { resetApp(); createRowsOp(1000); },
  () => updateEvery10thOp(),
));

results.push(bench("delete-every-10th",
  () => { resetApp(); createRowsOp(1000); },
  () => deleteEvery10thOp(),
));

results.push(bench("clear-all",
  () => { resetApp(); createRowsOp(1000); },
  () => clearRowsOp(),
));

results.push(bench("select-row",
  () => { resetApp(); createRowsOp(1000); },
  () => selectRowOp(500),
));

results.push(bench("swap-rows",
  () => { resetApp(); createRowsOp(1000); },
  () => swapRowsOp(1, 998),
));

results.push(bench("remove-row",
  () => { resetApp(); createRowsOp(1000); },
  () => removeRowOp(500),
));

results.push(bench("create-10000",
  () => resetApp(),
  () => createRowsOp(10000),
  3,
));

results.push(bench("append-1000",
  () => { resetApp(); createRowsOp(1000); },
  () => createRowsOp(1000),
));

console.log(JSON.stringify({ framework: "Vanilla JS", results }));
