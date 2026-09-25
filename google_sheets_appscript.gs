/*
 * Jakalburg — Google Sheets order sync (Apps Script).
 *
 * Paste this whole file into the Apps Script editor of the spreadsheet that
 * should hold the orders, set the two Script Properties below, run
 * setupOrderSheet() once, then deploy it as a Web App ("Execute as: Me",
 * "Who has access: Anyone"). The Jakalburg server POSTs to that Web App URL.
 *
 * Required Script Properties (Project Settings → Script Properties):
 *   SPREADSHEET_ID   the id in the sheet URL, between /d/ and /edit
 *   WEBHOOK_SECRET   a long random string; the server sends the same value
 *
 * ---------------------------------------------------------------------------
 * Payload contract — every field here exists on the Jakalburg Order model
 * (server/prisma/schema.prisma). Nothing is invented: there is no payment
 * status, wallet, partial-COD, tracking, or invoice data in this store, so no
 * column exists for any of it.
 *
 *   POST { secret, action: "upsertOrder", order: {
 *     orderId,        // Order.id (cuid) — hidden key + the View Order link
 *     orderNumber,    // Order.orderNumber, e.g. "JB-284917"
 *     createdAt,      // Order.createdAt, ISO string
 *     customerName,   // shippingAddress.fullName
 *     contact,        // shippingAddress.phone
 *     email,          // Order.email
 *     line1, line2,   // shippingAddress.line1 / .line2
 *     city, state, pincode,
 *     total,          // Order.total — whole rupees (INR), never paise
 *     status,         // Order.adminStatus ?? Order.status
 *     paymentLabel,   // Order.paymentLabel, e.g. "Cash on Delivery"
 *     items: [{ title, quantity, size, color }]   // OrderItem rows
 *   }}
 *
 *   POST { secret, action: "deleteOrder", orderId }
 *
 * Both actions are idempotent: an upsert for an orderId already in the sheet
 * rewrites that row in place, and deleting an order that was never synced (or
 * was already removed) reports success with found: false.
 * ---------------------------------------------------------------------------
 */

const SHEET_NAME = "Orders";

/*
 * Seventeen columns. The first sixteen are visible; Order ID (column Q) is a
 * hidden technical column holding Order.id, which is what keys every upsert
 * and delete and what the View Order link points at. Order No. (column C) is
 * the customer-facing "JB-######" shown in order emails — a different value,
 * kept visible on purpose.
 */
const HEADERS = [
  "Date",
  "Dispatched",
  "Order No.",
  "Name",
  "Order",
  "Total",
  "Price",
  "Contact",
  "Email",
  "Address",
  "City",
  "State",
  "Pincode",
  "Payment Mode",
  "Status",
  "View Order",
  "Order ID"
];

/*
 * 1-indexed column numbers, so nothing below ever repeats a bare magic number
 * for a column. Adding a column means inserting it here and in HEADERS (in
 * the same position) and widening buildOrderRow() to match.
 */
const COLUMN = {
  DATE: 1,
  DISPATCHED: 2,
  ORDER_NO: 3,
  NAME: 4,
  ORDER: 5,
  TOTAL: 6,
  PRICE: 7,
  CONTACT: 8,
  EMAIL: 9,
  ADDRESS: 10,
  CITY: 11,
  STATE: 12,
  PINCODE: 13,
  PAYMENT_MODE: 14,
  STATUS: 15,
  VIEW_ORDER: 16,
  ORDER_ID: 17
};

/*
 * Where "View Order" links point: the admin order detail route, which is
 * keyed on Order.id (admin/src/app/(dashboard)/orders/[id]/page.tsx). Change
 * this constant — not the Script Properties — if the admin domain changes.
 */
const ADMIN_ORDER_BASE_URL = "https://adminjakalburg.vercel.app/orders";

/*
 * The admin status vocabulary (server/src/orders/orders.service.ts
 * ADMIN_STATUS_TO_ENUM) plus the six OrderStatus enum values, mapped to what
 * a human should read in the sheet. Anything unrecognised falls back to
 * title-casing, so a status added later still shows something sensible
 * instead of a raw snake_case key.
 */
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
  returned: "Returned",
  rto_received: "RTO Received",
  refunded: "Refunded"
};

/*
 * Statuses that mean the parcel has left the studio, so the Dispatched
 * checkbox ticks itself on the next sync.
 */
const DISPATCHED_STATUSES = [
  "shipped",
  "out_for_delivery",
  "delivered"
];

/**
 * Run this once from the editor, and it is safe to run again at any time — it
 * never clears the sheet or deletes order rows. It creates the Orders sheet if
 * missing, then (re)writes the header row and reapplies formatting, both of
 * which are harmless to repeat.
 */
function setupOrderSheet() {
  const spreadsheet = getSpreadsheet();

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  writeHeaders(sheet);
  applyColumnFormatting(sheet);
}

function writeHeaders(sheet) {
  sheet
    .getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight("bold")
    .setBackground("#111111")
    .setFontColor("#ffffff");

  sheet.setFrozenRows(1);
}

function applyColumnFormatting(sheet) {
  /*
   * Price is the order total in whole rupees — Jakalburg stores money as Int
   * rupees (never paise), so no decimals are shown.
   */
  sheet
    .getRange("G2:G")
    .setNumberFormat("₹#,##0");

  /*
   * Order No., Contact, Pincode and the hidden Order ID all stay plain text,
   * so Sheets never reformats them as numbers or dates.
   */
  sheet.getRange("C2:C").setNumberFormat("@");
  sheet.getRange("H2:H").setNumberFormat("@");
  sheet.getRange("M2:M").setNumberFormat("@");
  sheet.getRange("Q2:Q").setNumberFormat("@");

  /*
   * Hide only the technical Order ID column.
   */
  sheet.hideColumns(COLUMN.ORDER_ID);

  sheet.setColumnWidth(COLUMN.DATE, 110);
  sheet.setColumnWidth(COLUMN.DISPATCHED, 100);
  sheet.setColumnWidth(COLUMN.ORDER_NO, 120);
  sheet.setColumnWidth(COLUMN.NAME, 180);
  sheet.setColumnWidth(COLUMN.ORDER, 380);
  sheet.setColumnWidth(COLUMN.TOTAL, 70);
  sheet.setColumnWidth(COLUMN.PRICE, 110);
  sheet.setColumnWidth(COLUMN.CONTACT, 150);
  sheet.setColumnWidth(COLUMN.EMAIL, 220);
  sheet.setColumnWidth(COLUMN.ADDRESS, 300);
  sheet.setColumnWidth(COLUMN.CITY, 140);
  sheet.setColumnWidth(COLUMN.STATE, 140);
  sheet.setColumnWidth(COLUMN.PINCODE, 90);
  sheet.setColumnWidth(COLUMN.PAYMENT_MODE, 200);
  sheet.setColumnWidth(COLUMN.STATUS, 140);
  sheet.setColumnWidth(COLUMN.VIEW_ORDER, 110);

  /*
   * The two long free-text columns wrap; everything else stays on one line.
   */
  sheet.getRange("E:E").setWrap(true);
  sheet.getRange("J:J").setWrap(true);

  sheet.getRange("A:Q").setVerticalAlignment("middle");
}

/**
 * One-off maintenance utility — run manually from the editor. The server's
 * deleteOrder action always removes a whole row via sheet.deleteRow(), so it
 * can never leave this mess behind; this exists for rows deleted by hand in
 * the Sheets UI. Because column Q is hidden, a manual selection/delete of just
 * the visible columns (A–P) routinely misses it, leaving a stale Order ID in Q.
 *
 * locateOrderRow() treats column Q as the sole source of truth for where real
 * orders end, so a leftover id like that is exactly what makes the next new
 * order land after the supposedly-deleted row instead of at row 2.
 *
 * Only clears column Q for rows where every order-identifying visible column
 * (Order No., Name, Order, Total, Price, Contact, City) is already blank — a
 * row that still holds real data is left completely untouched.
 */
function cleanupStaleOrderIds() {
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error("Orders sheet not found. Run setupOrderSheet first.");
  }

  const rowCount = sheet.getMaxRows() - 1;

  if (rowCount < 1) {
    return;
  }

  const identifyingColumns = [
    COLUMN.ORDER_NO,
    COLUMN.NAME,
    COLUMN.ORDER,
    COLUMN.TOTAL,
    COLUMN.PRICE,
    COLUMN.CONTACT,
    COLUMN.CITY
  ];

  const minColumn = Math.min.apply(null, identifyingColumns);
  const maxColumn = Math.max.apply(null, identifyingColumns);

  const identifyingValues = sheet
    .getRange(2, minColumn, rowCount, maxColumn - minColumn + 1)
    .getDisplayValues();

  const orderIdRange = sheet.getRange(2, COLUMN.ORDER_ID, rowCount, 1);
  const orderIdValues = orderIdRange.getValues();

  let staleRowsCleared = 0;

  for (let index = 0; index < identifyingValues.length; index++) {
    const row = identifyingValues[index];

    const isVisiblyEmpty = identifyingColumns.every(function (column) {
      return String(row[column - minColumn] || "").trim() === "";
    });

    const hasOrderId = String(orderIdValues[index][0] || "").trim() !== "";

    if (isVisiblyEmpty && hasOrderId) {
      orderIdValues[index][0] = "";
      staleRowsCleared++;
    }
  }

  if (staleRowsCleared > 0) {
    orderIdRange.setValues(orderIdValues);
  }

  console.log(
    "cleanupStaleOrderIds: cleared " +
      staleRowsCleared +
      " stale hidden Order ID(s) from visibly empty rows."
  );
}

/**
 * Health check for the deployed Web App — open the /exec URL in a browser and
 * this confirms the deployment is live. It reads nothing from the sheet and
 * returns no order data, so it is safe on an "Anyone" deployment.
 */
function doGet() {
  return jsonResponse({
    success: true,
    service: "Jakalburg order sync",
    message: "Deployment is live. Orders are posted to this URL."
  });
}

/**
 * Receives new orders, status updates, and deletion requests from the
 * Jakalburg server.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const payload = parsePayload(e);

    validateSecret(payload.secret);

    if (payload.action === "deleteOrder") {
      return jsonResponse(handleDeleteOrder(payload));
    }

    if (payload.action !== "upsertOrder") {
      throw new Error("Unsupported action.");
    }

    const order = validateOrder(payload.order);

    upsertOrder(order);

    return jsonResponse({
      success: true,
      message: "Order added or updated successfully.",
      orderId: order.orderId
    });
  } catch (error) {
    console.error("Jakalburg order sync failed:", error.message);

    return jsonResponse({
      success: false,
      message: error.message || "Unable to synchronize the order."
    });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

/**
 * Deletes the entire row for the given orderId, if one exists. deleteRow()
 * removes every column — including the hidden Order ID — together and shifts
 * everything below up by one, so it can never leave a stale hidden id behind
 * the way a partial manual selection could.
 *
 * A missing row (already deleted, or never synced) is reported as success with
 * found: false rather than an error — the caller only cares that no row for
 * this order exists afterward, and that is already true.
 */
function handleDeleteOrder(payload) {
  const orderId = String(payload.orderId || "").trim();

  if (!orderId) {
    throw new Error("orderId is required.");
  }

  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error("Orders sheet not found. Run setupOrderSheet first.");
  }

  const location = locateOrderRow(sheet, orderId);

  if (!location.existingRow) {
    return {
      success: true,
      message: "No matching row found; nothing to delete.",
      orderId: orderId,
      found: false
    };
  }

  sheet.deleteRow(location.existingRow);

  return {
    success: true,
    message: "Order row deleted successfully.",
    orderId: orderId,
    found: true
  };
}

/**
 * Adds a new order or updates the existing row. The same upsert path handles a
 * brand-new order and every later re-sync (admin status change, "Add to Sheet"
 * retry), keyed on the hidden Order ID in column Q.
 */
function upsertOrder(order) {
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error("Orders sheet not found. Run setupOrderSheet first.");
  }

  const location = locateOrderRow(sheet, order.orderId);
  const rowValues = buildOrderRow(order);
  const rowNumber = location.existingRow || location.nextRow;
  const isNewRow = !location.existingRow;

  /*
   * Columns 1–15 (Date through Status) as plain values.
   */
  sheet
    .getRange(rowNumber, 1, 1, rowValues.length)
    .setValues([rowValues]);

  /*
   * Column 16 (View Order) is a real clickable link, built with
   * newRichTextValue() rather than a HYPERLINK() formula so the Order ID that
   * feeds the URL can never be interpreted as part of a formula. Reapplied on
   * every upsert so the link always points at the current order.
   */
  sheet
    .getRange(rowNumber, COLUMN.VIEW_ORDER)
    .setRichTextValue(buildViewOrderLink(order.orderId));

  /*
   * Column 17 (Order ID) as plain, sanitized text.
   */
  sheet
    .getRange(rowNumber, COLUMN.ORDER_ID)
    .setValue(safeCell(order.orderId));

  if (isNewRow) {
    /*
     * A brand-new row (most commonly row 2, right after every order was
     * deleted) can't rely on formatting only ever having been applied by
     * setupOrderSheet() — reapply what each order row needs directly, so it is
     * correct regardless of when the sheet was last set up.
     */
    sheet
      .getRange(rowNumber, COLUMN.DISPATCHED)
      .insertCheckboxes()
      .setValue(rowValues[COLUMN.DISPATCHED - 1]);

    sheet.getRange(rowNumber, COLUMN.PRICE).setNumberFormat("₹#,##0");
    sheet.getRange(rowNumber, COLUMN.ORDER_NO).setNumberFormat("@");
    sheet.getRange(rowNumber, COLUMN.CONTACT).setNumberFormat("@");
    sheet.getRange(rowNumber, COLUMN.PINCODE).setNumberFormat("@");
    sheet.getRange(rowNumber, COLUMN.ORDER_ID).setNumberFormat("@");
  }
}

/**
 * Builds the "View Order" cell as a real hyperlink (not a formula), so a
 * hostile or malformed Order ID can never be injected as sheet formula text —
 * only ever used as a URL path segment.
 */
function buildViewOrderLink(orderId) {
  const viewOrderUrl =
    ADMIN_ORDER_BASE_URL + "/" + encodeURIComponent(orderId);

  return SpreadsheetApp
    .newRichTextValue()
    .setText("View Order")
    .setLinkUrl(viewOrderUrl)
    .build();
}

/**
 * Scans the hidden Order ID column (Q) once to find both the row matching this
 * orderId (if any) and the correct row to append to. Deliberately does not use
 * getLastRow(): checkboxes, number formatting and stray formatting in visible
 * columns can all make getLastRow() report a row far past where the real
 * orders end — most commonly right after test orders are deleted by clearing
 * only the visible columns.
 *
 * The hidden Order ID column is therefore the ONLY source of truth for "where
 * do real orders end" — a row counts as occupied only if it has a non-empty,
 * trimmed Order ID. See cleanupStaleOrderIds() for clearing ids left behind by
 * an incomplete manual deletion.
 */
function locateOrderRow(sheet, orderId) {
  const rowCount = sheet.getMaxRows() - 1;

  if (rowCount < 1) {
    return { existingRow: null, nextRow: 2 };
  }

  const orderIdColumn = sheet
    .getRange(2, COLUMN.ORDER_ID, rowCount, 1)
    .getDisplayValues();

  const normalizedOrderId = String(orderId || "").trim();

  let existingRow = null;
  let lastRealOrderRow = null;

  for (let index = 0; index < orderIdColumn.length; index++) {
    const rowOrderId = String(orderIdColumn[index][0] || "").trim();

    if (rowOrderId === "") {
      continue;
    }

    const rowNumber = index + 2;

    lastRealOrderRow = rowNumber;

    if (rowOrderId === normalizedOrderId) {
      existingRow = rowNumber;
    }
  }

  const nextRow = lastRealOrderRow ? lastRealOrderRow + 1 : 2;

  return { existingRow: existingRow, nextRow: nextRow };
}

/**
 * Creates the values for columns 1–15 (Date through Status). Columns 16 (View
 * Order) and 17 (Order ID) are written separately by upsertOrder() — View
 * Order needs a rich-text link rather than a plain value, and Order ID is kept
 * out of this array so a caller can never widen it and shift a later column by
 * mistake.
 */
function buildOrderRow(order) {
  const totalQuantity = order.items.reduce(function (total, item) {
    return total + Number(item.quantity || 0);
  }, 0);

  const productSummary = order.items
    .map(function (item) {
      return (
        Number(item.quantity || 0) +
        " × " +
        String(item.title || "") +
        buildVariantSuffix(item)
      );
    })
    .join(", ");

  return [
    formatOrderDate(order.createdAt),
    isDispatched(order.status),
    safeCell(order.orderNumber),
    safeCell(order.customerName),
    safeCell(productSummary),
    totalQuantity,
    toNumber(order.total),
    safeCell(order.contact),
    safeCell(order.email),
    safeCell(buildAddressLine(order)),
    safeCell(order.city),
    safeCell(order.state),
    safeCell(order.pincode),
    safeCell(order.paymentLabel),
    statusLabel(order.status)
  ];
}

/**
 * " (M / Black)" for an item that carries both, " (M)" / " (Black)" when only
 * one is set, and "" when neither is — every Jakalburg OrderItem stores size
 * and color, but an empty string must never render as bare "( / )".
 */
function buildVariantSuffix(item) {
  const parts = [item.size, item.color]
    .map(function (value) {
      return String(value || "").trim();
    })
    .filter(function (value) {
      return value !== "";
    });

  if (parts.length === 0) {
    return "";
  }

  return " (" + parts.join(" / ") + ")";
}

/**
 * The frozen shipping snapshot's line1 + line2 as one cell. Accepts a
 * pre-joined `address` too, so a payload that sends the line already combined
 * still works.
 */
function buildAddressLine(order) {
  const prejoined = String(order.address || "").trim();

  if (prejoined !== "") {
    return prejoined;
  }

  return [order.line1, order.line2]
    .map(function (value) {
      return String(value || "").trim();
    })
    .filter(function (value) {
      return value !== "";
    })
    .join(", ");
}

/**
 * True for the statuses that mean the order has left the studio. Normalizes
 * "Out for Delivery", "out_for_delivery" and "out for delivery" to the same
 * key, so the checkbox is right whether the status came from `adminStatus`
 * (snake_case) or the `OrderStatus` enum.
 */
function isDispatched(status) {
  return DISPATCHED_STATUSES.includes(normalizeStatus(status));
}

/**
 * The human label for a status key. Unknown keys are title-cased rather than
 * dropped, so a status added to the admin later still reads correctly here
 * without a redeploy.
 */
function statusLabel(status) {
  const key = normalizeStatus(status);

  if (key === "") {
    return "";
  }

  if (STATUS_LABELS[key]) {
    return STATUS_LABELS[key];
  }

  return key
    .split("_")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function validateOrder(order) {
  if (!order || typeof order !== "object") {
    throw new Error("Order data is missing.");
  }

  /*
   * Only the fields the sheet cannot be written without are required. A total
   * of 0 is legitimate (a 100% coupon), so the check is an explicit empty
   * check, not a truthiness test.
   *
   * contact / email / address / city / state / pincode / paymentLabel are NOT
   * required: they are always present on a real checkout, but a missing one
   * should leave a blank cell rather than block the whole order from syncing.
   */
  const requiredFields = [
    "orderId",
    "orderNumber",
    "createdAt",
    "customerName",
    "total",
    "status"
  ];

  requiredFields.forEach(function (field) {
    if (
      order[field] === undefined ||
      order[field] === null ||
      order[field] === ""
    ) {
      throw new Error("Missing required field: " + field);
    }
  });

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error("The order must contain at least one product.");
  }

  order.items.forEach(function (item) {
    if (!item.title) {
      throw new Error("A product title is missing.");
    }

    if (
      !Number.isFinite(Number(item.quantity)) ||
      Number(item.quantity) < 1
    ) {
      throw new Error("A product has an invalid quantity.");
    }
  });

  return order;
}

function formatOrderDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid order date.");
  }

  return Utilities.formatDate(date, "Asia/Kolkata", "dd/MM/yyyy");
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Request body is missing.");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Request body is not valid JSON.");
  }
}

function validateSecret(receivedSecret) {
  const expectedSecret = PropertiesService
    .getScriptProperties()
    .getProperty("WEBHOOK_SECRET");

  if (!expectedSecret) {
    throw new Error("Webhook secret is not configured.");
  }

  if (!receivedSecret || receivedSecret !== expectedSecret) {
    throw new Error("Unauthorized request.");
  }
}

function getSpreadsheet() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is not configured.");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function toNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

/**
 * Protect the sheet from formula injection.
 */
function safeCell(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const text = String(value);

  if (/^[=+\-@]/.test(text)) {
    return "'" + text;
  }

  return text;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
 * ---------------------------------------------------------------------------
 * Manual test helpers — run from the editor before wiring the server up, so
 * the layout and formatting can be checked without placing a real order.
 * Neither one touches a real order: both use the fixed id "TEST-ORDER".
 * ---------------------------------------------------------------------------
 */

const SAMPLE_ORDER_ID = "TEST-ORDER";

/** Writes one sample row (or rewrites it, if run twice). */
function insertSampleOrder() {
  upsertOrder({
    orderId: SAMPLE_ORDER_ID,
    orderNumber: "JB-000000",
    createdAt: new Date().toISOString(),
    customerName: "Sample Customer",
    contact: "+91 98200 00000",
    email: "sample@example.com",
    line1: "12 Atelier Lane",
    line2: "Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    total: 4498,
    status: "processing",
    paymentLabel: "Cash on Delivery",
    items: [
      { title: "Linen Shirt", quantity: 2, size: "M", color: "Black" },
      { title: "Cotton Trousers", quantity: 1, size: "32", color: "Ivory" }
    ]
  });
}

/** Removes the sample row again, leaving no stale hidden id behind. */
function removeSampleOrder() {
  console.log(
    JSON.stringify(handleDeleteOrder({ orderId: SAMPLE_ORDER_ID }))
  );
}
