(function () {
  const WKEY = "shop_wishlist";
  const OKEY = "shop_orders";
  const SHIPPING_OPTIONS = {
    standard: {
      label: "Same-day market route",
      eta: "Today, 14:00 - 18:00",
      fee: 4.9,
    },
    express: {
      label: "Priority fresh delivery",
      eta: "Within 90 minutes",
      fee: 9.9,
    },
  };
  const DELIVERY_SLOTS = {
    soon: "As soon as possible",
    afternoon: "Today, 14:00 - 18:00",
    evening: "Today, 18:00 - 21:00",
    tomorrow: "Tomorrow morning, 09:00 - 12:00",
  };
  const PAYMENT_OPTIONS = {
    cash: "Cash on delivery",
    card: "Card on delivery",
  };

  const readStore = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeStore = (key, value) =>
    localStorage.setItem(key, JSON.stringify(value));

  const readWishlist = () => readStore(WKEY, []);
  const saveWishlist = (items) => writeStore(WKEY, items);
  const removeWishlistItems = (ids) => {
    const idSet = new Set(ids.map((id) => String(id)));
    saveWishlist(readWishlist().filter((item) => !idSet.has(String(item.id))));
  };
  const readOrders = () => readStore(OKEY, []);
  const saveOrder = (order) => {
    const orders = readOrders();
    orders.unshift(order);
    writeStore(OKEY, orders.slice(0, 30));
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return map[char] || char;
    });

  const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

  const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const getProductFromSource = (element) => {
    const source = element.closest("[data-id][data-title][data-price]");
    if (!source) return null;

    return {
      id: String(source.dataset.id),
      title: source.dataset.title,
      price: Number(source.dataset.price || 0),
      oldPrice: Number(source.dataset.oldPrice || source.dataset.price || 0),
      image: source.dataset.image,
      category: source.dataset.category || "",
    };
  };

  const normalizeProduct = (product) => ({
    id: String(product.id),
    title: product.title,
    price: Number(product.price || 0),
    oldPrice: Number(product.oldPrice || product.price || 0),
    image: product.image,
    category: product.category || "",
  });

  const createCheckoutItem = (product, quantity = 1) => ({
    ...normalizeProduct(product),
    quantity: Math.max(1, Number(quantity || 1)),
  });

  const mergeCheckoutItems = (products) => {
    const map = new Map();

    products.forEach((entry) => {
      const item = createCheckoutItem(entry, entry.quantity);
      const current = map.get(item.id);

      if (current) {
        current.quantity += item.quantity;
      } else {
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
  };

  const getCheckoutTotals = (state) => {
    const itemsPrice = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const oldTotal = state.items.reduce(
      (sum, item) => sum + item.oldPrice * item.quantity,
      0
    );
    const shipping = SHIPPING_OPTIONS[state.shipping];
    const shippingFee = state.items.length ? shipping.fee : 0;
    const savings = Math.max(oldTotal - itemsPrice, 0);

    return {
      itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
      lineCount: state.items.length,
      itemsPrice,
      oldTotal,
      savings,
      shippingFee,
      total: itemsPrice + shippingFee,
      shipping,
    };
  };

  const estimateDeliveryDate = (shippingKey) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + (shippingKey === "express" ? 0 : 1));
    return date.toISOString();
  };

  const isInWishlist = (id) =>
    readWishlist().some((item) => String(item.id) === String(id));

  const toggleWishlist = (product) => {
    let items = readWishlist();
    const exists = isInWishlist(product.id);

    if (exists) {
      items = items.filter((item) => String(item.id) !== String(product.id));
    } else {
      items.push(normalizeProduct(product));
    }

    saveWishlist(items);
    return !exists;
  };

  const animateWishlistButton = (button, added) => {
    const stateClass = added ? "is-animating" : "is-unwishing";
    button.classList.remove("is-animating", "is-unwishing");
    void button.offsetWidth;
    button.classList.add(stateClass);
    window.setTimeout(() => {
      button.classList.remove(stateClass);
    }, added ? 550 : 300);
  };

  const updateWishlistUI = () => {
    document.querySelectorAll(".product-card").forEach((card) => {
      const button = card.querySelector(".wishlist-btn");
      if (!button) return;

      const wished = isInWishlist(card.dataset.id);
      button.classList.toggle("is-wish", wished);
      button.setAttribute("aria-pressed", wished ? "true" : "false");
    });
  };

  const ensureBuyActionsOnCards = () => {
    document.querySelectorAll(".product-card .product-body").forEach((body) => {
      if (body.querySelector(".buy-block")) return;

      const product = getProductFromSource(body);
      if (!product) return;

      const savings = Math.max(product.oldPrice - product.price, 0);
      const block = document.createElement("div");
      block.className = "buy-block";
      block.innerHTML = `
        <div class="buy-note">
          <span>${savings > 0 ? `Save ${formatMoney(savings)}` : "Picked fresh today"}</span>
          <span>Fast grocery checkout</span>
        </div>
        <button type="button" class="buy-btn" aria-label="Buy ${escapeHtml(product.title)} now">
          <span>Buy Now</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;

      body.appendChild(block);
    });
  };

  const checkout = {
    state: {
      items: [],
      shipping: "standard",
      slot: "soon",
      payment: "cash",
      source: "single",
    },
    elements: null,
  };

  const ensureCheckoutModal = () => {
    if (checkout.elements) return;

    const wrapper = document.createElement("div");
    wrapper.id = "checkoutModal";
    wrapper.className = "checkout-modal";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="checkout-backdrop" data-close-checkout></div>
      <div class="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
        <button type="button" class="checkout-close" data-close-checkout aria-label="Close checkout">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="checkout-layout">
          <section class="checkout-main">
            <div id="checkoutFlow">
              <p class="checkout-kicker">Fresh basket checkout</p>
              <h2 id="checkoutTitle" class="checkout-title">Complete your grocery order</h2>
              <p class="checkout-copy" id="checkoutLeadCopy">
                Review your basket, choose delivery, and we will prepare the freshest items for dispatch.
              </p>

              <div class="checkout-items" id="checkoutItems"></div>

              <form id="checkoutForm" class="checkout-form">
                <div class="checkout-form-grid">
                  <label class="checkout-field">
                    <span>Full name</span>
                    <input name="name" type="text" placeholder="Aziza Karimova" required>
                  </label>
                  <label class="checkout-field">
                    <span>Phone number</span>
                    <input name="phone" type="tel" placeholder="+998 90 123 45 67" required>
                  </label>
                  <label class="checkout-field">
                    <span>City</span>
                    <input name="city" type="text" placeholder="Tashkent" required>
                  </label>
                  <label class="checkout-field">
                    <span>Zip code</span>
                    <input name="zip" type="text" placeholder="100047" required>
                  </label>
                  <label class="checkout-field checkout-field--wide">
                    <span>Street address</span>
                    <input name="address" type="text" placeholder="12 Amir Temur street, house 8" required>
                  </label>
                  <label class="checkout-field">
                    <span>Apartment / entrance</span>
                    <input name="apartment" type="text" placeholder="Apartment 21, entrance B">
                  </label>
                  <label class="checkout-field">
                    <span>Delivery note</span>
                    <input name="note" type="text" placeholder="Call before arrival or leave at reception">
                  </label>
                </div>

                <div class="checkout-shipping">
                  <p class="checkout-section-title">Delivery option</p>
                  <label class="shipping-option">
                    <input type="radio" name="shipping" value="standard" checked>
                    <span>
                      <strong>${SHIPPING_OPTIONS.standard.label}</strong>
                      <small>${SHIPPING_OPTIONS.standard.eta}</small>
                    </span>
                    <em>${formatMoney(SHIPPING_OPTIONS.standard.fee)}</em>
                  </label>
                  <label class="shipping-option">
                    <input type="radio" name="shipping" value="express">
                    <span>
                      <strong>${SHIPPING_OPTIONS.express.label}</strong>
                      <small>${SHIPPING_OPTIONS.express.eta}</small>
                    </span>
                    <em>${formatMoney(SHIPPING_OPTIONS.express.fee)}</em>
                  </label>
                </div>

                <div class="checkout-extra-grid">
                  <label class="checkout-field">
                    <span>Delivery time</span>
                    <select name="slot" id="checkoutSlot">
                      <option value="soon">${DELIVERY_SLOTS.soon}</option>
                      <option value="afternoon">${DELIVERY_SLOTS.afternoon}</option>
                      <option value="evening">${DELIVERY_SLOTS.evening}</option>
                      <option value="tomorrow">${DELIVERY_SLOTS.tomorrow}</option>
                    </select>
                  </label>
                  <label class="checkout-field">
                    <span>Payment method</span>
                    <select name="payment" id="checkoutPayment">
                      <option value="cash">${PAYMENT_OPTIONS.cash}</option>
                      <option value="card">${PAYMENT_OPTIONS.card}</option>
                    </select>
                  </label>
                </div>

                <button type="submit" class="checkout-submit">
                  Place Grocery Order
                  <i class="fa-solid fa-basket-shopping"></i>
                </button>
              </form>
            </div>

            <div class="checkout-success" id="checkoutSuccess" hidden>
              <div class="checkout-success-icon">
                <i class="fa-solid fa-check"></i>
              </div>
              <p class="checkout-kicker">Order confirmed</p>
              <h2 class="checkout-title">Your fresh basket is booked</h2>
              <p class="checkout-copy" id="checkoutSuccessCopy"></p>
              <div class="checkout-success-actions">
                <button type="button" class="checkout-secondary-btn" data-checkout="close">Continue shopping</button>
                <button type="button" class="checkout-primary-btn" data-checkout="another">Order more products</button>
              </div>
            </div>
          </section>

          <aside class="checkout-summary">
            <div class="checkout-summary-card">
              <p class="checkout-summary-kicker">Basket summary</p>
              <div class="checkout-summary-row">
                <span>Products</span>
                <strong id="summaryItemsLabel">0 items</strong>
              </div>
              <div class="checkout-summary-row">
                <span>Subtotal</span>
                <strong id="summaryItemsPrice">$0.00</strong>
              </div>
              <div class="checkout-summary-row">
                <span>Shipping</span>
                <strong id="summaryShippingPrice">$0.00</strong>
              </div>
              <div class="checkout-summary-row">
                <span>Savings</span>
                <strong id="summarySavings" class="checkout-savings">$0.00</strong>
              </div>
              <div class="checkout-summary-total">
                <span>Total</span>
                <strong id="summaryTotal">$0.00</strong>
              </div>
              <div class="checkout-summary-points">
                <div>
                  <i class="fa-solid fa-basket-shopping"></i>
                  <span id="summaryBasketHint">Review and edit basket quantities before you place the order.</span>
                </div>
                <div>
                  <i class="fa-solid fa-truck-fast"></i>
                  <span id="summaryDeliveryLabel">${SHIPPING_OPTIONS.standard.label} • ${SHIPPING_OPTIONS.standard.eta}</span>
                </div>
                <div>
                  <i class="fa-solid fa-receipt"></i>
                  <span id="summaryOrderHint">After confirmation we save the order locally with a tracking number.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const form = wrapper.querySelector("#checkoutForm");
    checkout.elements = {
      modal: wrapper,
      flow: wrapper.querySelector("#checkoutFlow"),
      success: wrapper.querySelector("#checkoutSuccess"),
      successCopy: wrapper.querySelector("#checkoutSuccessCopy"),
      leadCopy: wrapper.querySelector("#checkoutLeadCopy"),
      items: wrapper.querySelector("#checkoutItems"),
      form,
      slot: wrapper.querySelector("#checkoutSlot"),
      payment: wrapper.querySelector("#checkoutPayment"),
      summaryItemsLabel: wrapper.querySelector("#summaryItemsLabel"),
      summaryItemsPrice: wrapper.querySelector("#summaryItemsPrice"),
      summaryShippingPrice: wrapper.querySelector("#summaryShippingPrice"),
      summarySavings: wrapper.querySelector("#summarySavings"),
      summaryTotal: wrapper.querySelector("#summaryTotal"),
      summaryBasketHint: wrapper.querySelector("#summaryBasketHint"),
      summaryDeliveryLabel: wrapper.querySelector("#summaryDeliveryLabel"),
      summaryOrderHint: wrapper.querySelector("#summaryOrderHint"),
    };

    wrapper.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-checkout]")) {
        closeCheckout();
        return;
      }

      const quantityButton = event.target.closest("[data-qty-action]");
      if (quantityButton) {
        const { itemId, qtyAction } = quantityButton.dataset;
        const target = checkout.state.items.find((item) => item.id === itemId);
        if (!target) return;

        target.quantity =
          qtyAction === "increase"
            ? target.quantity + 1
            : Math.max(1, target.quantity - 1);
        renderCheckout();
        return;
      }

      const removeButton = event.target.closest("[data-remove-checkout-item]");
      if (removeButton) {
        checkout.state.items = checkout.state.items.filter(
          (item) => item.id !== removeButton.dataset.removeCheckoutItem
        );
        if (!checkout.state.items.length) {
          closeCheckout();
          return;
        }
        renderCheckout();
        return;
      }

      const actionButton = event.target.closest("[data-checkout]");
      if (!actionButton) return;

      if (actionButton.dataset.checkout === "close") {
        closeCheckout();
      }

      if (actionButton.dataset.checkout === "another") {
        wrapper.classList.remove("is-success");
        checkout.elements.success.hidden = true;
        checkout.elements.flow.hidden = false;
        checkout.elements.form.reset();
        checkout.state.shipping = "standard";
        checkout.state.slot = "soon";
        checkout.state.payment = "cash";
        renderCheckout();
      }
    });

    form.addEventListener("change", (event) => {
      const shippingInput = event.target.closest('input[name="shipping"]');
      if (shippingInput) {
        checkout.state.shipping = shippingInput.value;
      }

      if (event.target.id === "checkoutSlot") {
        checkout.state.slot = event.target.value;
      }

      if (event.target.id === "checkoutPayment") {
        checkout.state.payment = event.target.value;
      }

      renderCheckout();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!checkout.state.items.length) return;

      const formData = new FormData(form);
      const totals = getCheckoutTotals(checkout.state);
      const orderNumber = `ORD-${String(Date.now()).slice(-8)}`;
      const deliveryDate = estimateDeliveryDate(checkout.state.shipping);
      const order = {
        orderNumber,
        createdAt: new Date().toISOString(),
        shipping: checkout.state.shipping,
        shippingLabel: totals.shipping.label,
        shippingEta: totals.shipping.eta,
        slot: checkout.state.slot,
        slotLabel: DELIVERY_SLOTS[checkout.state.slot],
        payment: checkout.state.payment,
        paymentLabel: PAYMENT_OPTIONS[checkout.state.payment],
        estimatedDeliveryDate: deliveryDate,
        items: checkout.state.items.map((item) => ({ ...item })),
        itemCount: totals.itemCount,
        itemsPrice: totals.itemsPrice,
        shippingFee: totals.shippingFee,
        total: totals.total,
        customer: {
          name: formData.get("name"),
          phone: formData.get("phone"),
          city: formData.get("city"),
          zip: formData.get("zip"),
          address: formData.get("address"),
          apartment: formData.get("apartment"),
          note: formData.get("note"),
        },
      };

      saveOrder(order);
      removeWishlistItems(checkout.state.items.map((item) => item.id));
      refreshWishlistViews();

      checkout.elements.summaryOrderHint.textContent = `Order ${orderNumber} is confirmed. Delivery window: ${DELIVERY_SLOTS[checkout.state.slot]} on ${formatDate(deliveryDate)}.`;
      checkout.elements.successCopy.textContent = `${totals.itemCount} item(s) from your fresh basket will be delivered to ${order.customer.address}, ${order.customer.city}. Payment: ${PAYMENT_OPTIONS[checkout.state.payment].toLowerCase()}.`;
      checkout.elements.flow.hidden = true;
      checkout.elements.success.hidden = false;
      wrapper.classList.add("is-success");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && wrapper.classList.contains("is-open")) {
        closeCheckout();
      }
    });
  };

  const renderCheckout = () => {
    ensureCheckoutModal();
    if (!checkout.state.items.length) return;

    const totals = getCheckoutTotals(checkout.state);
    const multipleItems = checkout.state.items.length > 1;

    checkout.elements.items.innerHTML = checkout.state.items
      .map(
        (item) => `
          <article class="checkout-item-row">
            <div class="checkout-item-media">
              <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
            </div>
            <div class="checkout-item-copy">
              <p class="checkout-item-category">${escapeHtml(item.category || "Organic pick")}</p>
              <h3 class="checkout-item-title">${escapeHtml(item.title)}</h3>
              <div class="checkout-item-pricing">
                ${item.oldPrice > item.price ? `<span class="checkout-old-price">${formatMoney(item.oldPrice)}</span>` : ""}
                <span class="checkout-current-price">${formatMoney(item.price)}</span>
              </div>
            </div>
            <div class="checkout-item-actions">
              <div class="checkout-stepper">
                <button type="button" class="checkout-stepper-btn" data-qty-action="decrease" data-item-id="${escapeHtml(item.id)}" aria-label="Decrease ${escapeHtml(item.title)} quantity">-</button>
                <span class="checkout-stepper-value">${item.quantity}</span>
                <button type="button" class="checkout-stepper-btn" data-qty-action="increase" data-item-id="${escapeHtml(item.id)}" aria-label="Increase ${escapeHtml(item.title)} quantity">+</button>
              </div>
              <strong class="checkout-line-total">${formatMoney(item.price * item.quantity)}</strong>
              <button type="button" class="checkout-remove-item" data-remove-checkout-item="${escapeHtml(item.id)}">Remove</button>
            </div>
          </article>
        `
      )
      .join("");

    checkout.elements.leadCopy.textContent = multipleItems
      ? "Review every saved product, adjust quantities, and place one complete grocery order."
      : "Review your product, choose delivery, and we will prepare it fresh for dispatch.";

    checkout.elements.summaryItemsLabel.textContent = `${totals.itemCount} item${
      totals.itemCount > 1 ? "s" : ""
    }`;
    checkout.elements.summaryItemsPrice.textContent = formatMoney(totals.itemsPrice);
    checkout.elements.summaryShippingPrice.textContent = formatMoney(
      totals.shippingFee
    );
    checkout.elements.summarySavings.textContent = totals.savings
      ? `-${formatMoney(totals.savings)}`
      : "$0.00";
    checkout.elements.summaryTotal.textContent = formatMoney(totals.total);
    checkout.elements.summaryBasketHint.textContent = multipleItems
      ? `${totals.lineCount} saved products are combined into one checkout.`
      : "You can still change quantity before placing the order.";
    checkout.elements.summaryDeliveryLabel.textContent = `${totals.shipping.label} • ${totals.shipping.eta}`;
    checkout.elements.summaryOrderHint.textContent =
      "After confirmation we save the order locally with a tracking number.";

    checkout.elements.form
      .querySelectorAll('input[name="shipping"]')
      .forEach((input) => {
        input.checked = input.value === checkout.state.shipping;
      });
    checkout.elements.slot.value = checkout.state.slot;
    checkout.elements.payment.value = checkout.state.payment;
  };

  const openCheckout = (products, source = "single") => {
    const entries = Array.isArray(products) ? products : [products];
    const items = mergeCheckoutItems(entries.filter(Boolean));
    if (!items.length) return;

    ensureCheckoutModal();
    checkout.state.items = items;
    checkout.state.shipping = "standard";
    checkout.state.slot = source === "wishlist-all" ? "afternoon" : "soon";
    checkout.state.payment = "cash";
    checkout.state.source = source;

    checkout.elements.form.reset();
    checkout.elements.flow.hidden = false;
    checkout.elements.success.hidden = true;
    checkout.elements.modal.classList.remove("is-success");
    renderCheckout();

    checkout.elements.modal.classList.add("is-open");
    checkout.elements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("checkout-open");
  };

  const closeCheckout = () => {
    ensureCheckoutModal();
    checkout.elements.modal.classList.remove("is-open", "is-success");
    checkout.elements.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("checkout-open");
  };

  const renderWishlist = (container) => {
    const items = readWishlist();

    if (!items.length) {
      container.innerHTML = `
        <section class="wishlist-shell wishlist-shell--empty">
          <div class="wishlist-empty-card">
            <div class="wishlist-empty-icon"><i class="fa-solid fa-heart-circle-plus"></i></div>
            <h2>Build your fresh basket</h2>
            <p>Save vegetables, fruits, and pantry goods here. When you are ready, you can order them together in one checkout.</p>
            <a href="index.html" class="wishlist-primary-link">Back to shop</a>
          </div>
        </section>
      `;
      return;
    }

    const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const savings = items.reduce(
      (sum, item) =>
        sum + Math.max(Number(item.oldPrice || item.price || 0) - Number(item.price || 0), 0),
      0
    );

    container.innerHTML = `
      <section class="wishlist-shell">
        <div class="wishlist-hero">
          <div>
            <p class="wishlist-kicker">Saved for later</p>
            <h2 class="wishlist-title">Your farm-fresh wishlist</h2>
            <p class="wishlist-copy">Keep favorites ready, compare prices, and place one basket order when you are set.</p>
          </div>
          <div class="wishlist-summary">
            <div class="wishlist-stat">
              <span>Products</span>
              <strong>${items.length}</strong>
            </div>
            <div class="wishlist-stat">
              <span>Current total</span>
              <strong>${formatMoney(total)}</strong>
            </div>
            <div class="wishlist-stat">
              <span>You save</span>
              <strong>${formatMoney(savings)}</strong>
            </div>
          </div>
        </div>

        <div class="wishlist-toolbar">
          <button type="button" id="buyAllWishlist" class="buy-btn wishlist-buy-all">
            <span>Buy All Saved Products</span>
            <i class="fa-solid fa-basket-shopping"></i>
          </button>
          <p class="wishlist-toolbar-copy">All wishlist products can be checked out together in one order.</p>
        </div>

        <div class="wishlist-grid">
          ${items
            .map(
              (item) => `
                <article class="wishlist-item-card"
                  data-id="${escapeHtml(item.id)}"
                  data-title="${escapeHtml(item.title)}"
                  data-price="${escapeHtml(item.price)}"
                  data-old-price="${escapeHtml(item.oldPrice || item.price)}"
                  data-image="${escapeHtml(item.image)}"
                  data-category="${escapeHtml(item.category || "")}">
                  <div class="wishlist-item-top">
                    <span class="wishlist-item-tag">${escapeHtml(item.category || "Organic pick")}</span>
                    <button class="remove-btn wishlist-remove" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)}">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                  <div class="wishlist-item-media">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
                  </div>
                  <div class="wishlist-item-body">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p class="wishlist-item-copy">Fresh grocery pick, ready for your next basket.</p>
                    <div class="wishlist-item-meta">
                      <div>
                        <div class="wishlist-old-price">${formatMoney(item.oldPrice || item.price)}</div>
                        <div class="wishlist-current-price">${formatMoney(item.price)}</div>
                      </div>
                      <button type="button" class="buy-btn buy-btn--compact">
                        <span>Buy Now</span>
                        <i class="fa-solid fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  };

  const refreshWishlistViews = () => {
    updateWishlistUI();
    const container = document.getElementById("wishlistContainer");
    if (container) {
      renderWishlist(container);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureCheckoutModal();
    ensureBuyActionsOnCards();
    updateWishlistUI();

    const grid = document.getElementById("productsGrid");
    if (grid) {
      grid.addEventListener("click", (event) => {
        const wishlistButton = event.target.closest(".wishlist-btn");
        if (wishlistButton) {
          const product = getProductFromSource(wishlistButton);
          if (!product) return;

          const added = toggleWishlist(product);
          updateWishlistUI();
          animateWishlistButton(wishlistButton, added);
          return;
        }

        const buyButton = event.target.closest(".buy-btn");
        if (!buyButton) return;
        openCheckout(getProductFromSource(buyButton), "single");
      });
    }

    const container = document.getElementById("wishlistContainer");
    if (container) {
      renderWishlist(container);

      container.addEventListener("click", (event) => {
        const removeButton = event.target.closest(".remove-btn");
        if (removeButton) {
          const id = removeButton.dataset.id;
          const items = readWishlist().filter((item) => String(item.id) !== String(id));
          saveWishlist(items);
          renderWishlist(container);
          return;
        }

        const buyAllButton = event.target.closest("#buyAllWishlist");
        if (buyAllButton) {
          openCheckout(readWishlist(), "wishlist-all");
          return;
        }

        const buyButton = event.target.closest(".buy-btn");
        if (buyButton) {
          openCheckout(getProductFromSource(buyButton), "wishlist-single");
        }
      });

      const clearButton = document.getElementById("clearWishlist");
      if (clearButton) {
        clearButton.addEventListener("click", () => {
          if (!confirm("Are you sure you want to clear your wishlist?")) return;
          saveWishlist([]);
          renderWishlist(container);
        });
      }
    }
  });
})();
