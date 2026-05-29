(function () {
  const state = {
    properties: [],
    content: {},
    user: null,
    accountMode: "login",
    leadMode: "inquiry"
  };

  const tokenKey = "banamalatiToken";

  const els = {
    propertyGrid: document.querySelector("[data-property-grid]"),
    landGrid: document.querySelector("[data-land-grid]"),
    projectGallery: document.querySelector("[data-project-gallery]"),
    searchForm: document.querySelector("[data-search-form]"),
    typeFilter: document.querySelector("[data-type-filter]"),
    cityFilter: document.querySelector("[data-city-filter]"),
    propertySelect: document.querySelector("[data-property-select]"),
    inquiryForm: document.querySelector("[data-inquiry-form]"),
    inquiryStatus: document.querySelector("[data-inquiry-status]"),
    leadModal: document.querySelector("[data-lead-modal]"),
    leadForm: document.querySelector("[data-lead-form]"),
    leadStatus: document.querySelector("[data-lead-status]"),
    leadTitle: document.querySelector("[data-lead-title]"),
    leadSubtitle: document.querySelector("[data-lead-subtitle]"),
    leadPropertyId: document.querySelector("[data-lead-property-id]"),
    accountButton: document.querySelector("[data-account-button]"),
    accountModal: document.querySelector("[data-account-modal]"),
    accountForm: document.querySelector("[data-account-form]"),
    accountTitle: document.querySelector("[data-account-title]"),
    accountCopy: document.querySelector("[data-account-copy]"),
    accountSubmit: document.querySelector("[data-account-submit]"),
    accountToggle: document.querySelector("[data-account-toggle]"),
    accountLogout: document.querySelector("[data-account-logout]"),
    accountStatus: document.querySelector("[data-account-status]")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(property) {
    if (property.price_label) return property.price_label;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(property.price || 0));
  }

  function asBool(value) {
    return value === true || value === 1 || value === "1";
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    const token = localStorage.getItem(tokenKey);
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }
    return data;
  }

  function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function setStatus(element, message, isError) {
    element.textContent = message || "";
    element.classList.toggle("error", Boolean(isError));
  }

  function propertyCard(property) {
    const details = [
      property.area ? `${Number(property.area).toLocaleString("en-IN")} ${escapeHtml(property.area_unit)}` : "",
      property.bedrooms ? `${property.bedrooms} bed` : "",
      property.bathrooms ? `${property.bathrooms} bath` : ""
    ].filter(Boolean).join(" / ");

    return `
      <article class="property-card">
        <img src="${escapeHtml(property.image_url)}" alt="${escapeHtml(property.title)}">
        <div class="property-card-body">
          <div class="card-topline">
            <span class="badge">${escapeHtml(property.listing_type)}</span>
            <span class="badge alt">${escapeHtml(property.status)}</span>
            <span class="price">${escapeHtml(formatMoney(property))}</span>
          </div>
          <h3>${escapeHtml(property.title)}</h3>
          <p>${escapeHtml(property.address || property.city)}, ${escapeHtml(property.state)}</p>
          <div class="card-meta">${escapeHtml(details || property.highlights || "Contact for details")}</div>
          <div class="card-actions">
            <button class="solid-button compact" type="button" data-card-action="booking" data-property-id="${property.id}">Book Visit</button>
            <button class="ghost-button compact" type="button" data-card-action="inquiry" data-property-id="${property.id}">Inquire</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderProperties() {
    const regular = state.properties.filter((item) => !["Land", "Farmland"].includes(item.listing_type));
    const land = state.properties.filter((item) => ["Land", "Farmland"].includes(item.listing_type));

    els.propertyGrid.innerHTML = regular.length
      ? regular.map(propertyCard).join("")
      : '<div class="empty-state">No matching properties found.</div>';

    els.landGrid.innerHTML = land.length
      ? land.map(propertyCard).join("")
      : '<div class="empty-state">No matching land listings found.</div>';

    const galleryItems = state.properties.slice(0, 5);
    els.projectGallery.innerHTML = galleryItems.map((property) => `
      <figure class="gallery-item">
        <img src="${escapeHtml(property.image_url)}" alt="${escapeHtml(property.title)}">
        <span>${escapeHtml(property.title)}</span>
      </figure>
    `).join("");

    renderPropertySelect();
    attachCardActions();
  }

  function renderPropertySelect() {
    const options = state.properties
      .map((property) => `<option value="${property.id}">${escapeHtml(property.title)}</option>`)
      .join("");
    els.propertySelect.innerHTML = `<option value="">General inquiry</option>${options}`;
  }

  function renderFilters() {
    const types = [...new Set(state.properties.map((item) => item.listing_type).filter(Boolean))].sort();
    const cities = [...new Set(state.properties.map((item) => item.city).filter(Boolean))].sort();

    els.typeFilter.innerHTML = '<option value="">All types</option>' + types
      .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
      .join("");
    els.cityFilter.innerHTML = '<option value="">All cities</option>' + cities
      .map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)
      .join("");
  }

  function renderContent() {
    const hero = state.content.hero;
    const contact = state.content.contact;

    if (hero) {
      document.querySelector("[data-content='hero-title']").textContent = hero.title;
      document.querySelector("[data-content='hero-body']").textContent = hero.body;
    }

    if (contact) {
      document.querySelector("[data-content='contact-title']").textContent = contact.title;
      document.querySelector("[data-content='contact-body']").textContent = contact.body;
      try {
        const metadata = JSON.parse(contact.metadata || "{}");
        document.querySelector("[data-contact='phone']").textContent = metadata.phone || "";
        document.querySelector("[data-contact='email']").textContent = metadata.email || "";
        document.querySelector("[data-contact='hours']").textContent = metadata.hours || "";
      } catch (error) {
        console.warn(error);
      }
    }
  }

  async function loadContent() {
    const rows = await api("/api/content");
    state.content = rows.reduce((map, row) => ({ ...map, [row.slug]: row }), {});
    renderContent();
  }

  async function loadProperties(params = new URLSearchParams()) {
    const query = params.toString();
    const result = await api(`/api/properties${query ? `?${query}` : ""}`);
    state.properties = result.data || [];
    renderProperties();
    if (!params.toString()) renderFilters();
  }

  function attachCardActions() {
    document.querySelectorAll("[data-card-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const property = state.properties.find((item) => String(item.id) === String(button.dataset.propertyId));
        openLeadModal(button.dataset.cardAction, property);
      });
    });
  }

  function openLeadModal(mode, property) {
    state.leadMode = mode || "inquiry";
    els.leadForm.reset();
    setStatus(els.leadStatus, "");
    els.leadPropertyId.value = property?.id || "";

    const booking = state.leadMode === "booking";
    els.leadTitle.textContent = booking ? "Book a Site Visit" : "Property Inquiry";
    els.leadSubtitle.textContent = property
      ? `${property.title} - ${property.city}`
      : "Our team will contact you with suitable options.";

    document.querySelectorAll("[data-booking-only]").forEach((field) => {
      field.hidden = !booking;
      const input = field.querySelector("input");
      if (input) input.required = booking && input.name === "preferred_date";
    });

    const message = els.leadForm.elements.message;
    message.placeholder = booking ? "Preferred visit details or notes" : "Tell us what you would like to know";
    message.required = !booking;

    els.leadModal.showModal();
    document.body.classList.add("modal-open");
  }

  async function submitLead(event) {
    event.preventDefault();
    const payload = formToObject(els.leadForm);
    const booking = state.leadMode === "booking";
    const path = booking ? "/api/bookings" : "/api/inquiries";

    if (booking) {
      payload.notes = payload.message || "";
      delete payload.message;
    }

    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setStatus(els.leadStatus, booking ? "Visit request saved." : "Inquiry sent.");
      els.leadForm.reset();
      setTimeout(() => closeDialog(els.leadModal), 900);
    } catch (error) {
      setStatus(els.leadStatus, error.message, true);
    }
  }

  function closeDialog(dialog) {
    dialog.close();
    document.body.classList.remove("modal-open");
  }

  function updateAccountUi() {
    if (state.user) {
      els.accountButton.textContent = state.user.name || "My account";
      els.accountTitle.textContent = "Signed in";
      els.accountCopy.textContent = `${state.user.name} (${state.user.email})`;
      els.accountSubmit.hidden = true;
      els.accountToggle.hidden = true;
      els.accountLogout.hidden = false;
      els.accountForm.querySelectorAll("label").forEach((label) => {
        label.hidden = true;
      });
      return;
    }

    const register = state.accountMode === "register";
    els.accountButton.textContent = "Sign in";
    els.accountTitle.textContent = register ? "Create Customer Account" : "Customer Sign In";
    els.accountCopy.textContent = register ? "Save your contact details for future inquiries." : "Access your BanaMalati Infra account.";
    els.accountSubmit.hidden = false;
    els.accountSubmit.textContent = register ? "Create account" : "Sign in";
    els.accountToggle.hidden = false;
    els.accountToggle.textContent = register ? "Use existing account" : "Create account";
    els.accountLogout.hidden = true;
    els.accountForm.querySelectorAll("label").forEach((label) => {
      label.hidden = label.hasAttribute("data-register-only") && !register;
    });
  }

  async function checkSession() {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      updateAccountUi();
      return;
    }
    try {
      const result = await api("/api/auth/me");
      state.user = result.user;
    } catch (error) {
      localStorage.removeItem(tokenKey);
      state.user = null;
    }
    updateAccountUi();
  }

  async function submitAccount(event) {
    event.preventDefault();
    if (state.user) return;

    const payload = formToObject(els.accountForm);
    const path = state.accountMode === "register" ? "/api/auth/register" : "/api/auth/login";

    try {
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem(tokenKey, result.token);
      state.user = result.user;
      setStatus(els.accountStatus, "Signed in.");
      updateAccountUi();
      setTimeout(() => closeDialog(els.accountModal), 700);
    } catch (error) {
      setStatus(els.accountStatus, error.message, true);
    }
  }

  function bindEvents() {
    els.searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formToObject(els.searchForm);
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      await loadProperties(params);
    });

    els.inquiryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(els.inquiryStatus, "Sending...");
      try {
        await api("/api/inquiries", {
          method: "POST",
          body: JSON.stringify(formToObject(els.inquiryForm))
        });
        setStatus(els.inquiryStatus, "Inquiry sent. Our team will contact you shortly.");
        els.inquiryForm.reset();
      } catch (error) {
        setStatus(els.inquiryStatus, error.message, true);
      }
    });

    document.querySelectorAll("[data-open-lead]").forEach((button) => {
      button.addEventListener("click", () => openLeadModal(button.dataset.openLead));
    });

    document.querySelector("[data-close-lead]").addEventListener("click", () => closeDialog(els.leadModal));
    document.querySelector("[data-close-account]").addEventListener("click", () => closeDialog(els.accountModal));
    els.leadForm.addEventListener("submit", submitLead);

    els.accountButton.addEventListener("click", () => {
      setStatus(els.accountStatus, "");
      updateAccountUi();
      els.accountModal.showModal();
      document.body.classList.add("modal-open");
    });
    els.accountToggle.addEventListener("click", () => {
      state.accountMode = state.accountMode === "login" ? "register" : "login";
      setStatus(els.accountStatus, "");
      updateAccountUi();
    });
    els.accountLogout.addEventListener("click", () => {
      localStorage.removeItem(tokenKey);
      state.user = null;
      updateAccountUi();
      closeDialog(els.accountModal);
    });
    els.accountForm.addEventListener("submit", submitAccount);

    [els.leadModal, els.accountModal].forEach((dialog) => {
      dialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
    });
  }

  async function init() {
    bindEvents();
    await Promise.all([loadContent(), loadProperties(), checkSession()]);
  }

  init().catch((error) => {
    console.error(error);
    if (els.propertyGrid) {
      els.propertyGrid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  });
})();
