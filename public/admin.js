(function () {
  const tokenKey = "banamalatiAdminToken";
  const state = {
    token: localStorage.getItem(tokenKey),
    properties: [],
    inquiries: [],
    bookings: [],
    content: []
  };

  const els = {
    loginView: document.querySelector("[data-login-view]"),
    dashboardView: document.querySelector("[data-dashboard-view]"),
    loginForm: document.querySelector("[data-admin-login]"),
    loginStatus: document.querySelector("[data-admin-login-status]"),
    logout: document.querySelector("[data-admin-logout]"),
    statsGrid: document.querySelector("[data-stats-grid]"),
    propertyForm: document.querySelector("[data-property-form]"),
    propertyFormTitle: document.querySelector("[data-property-form-title]"),
    propertyStatus: document.querySelector("[data-property-status]"),
    propertyRows: document.querySelector("[data-admin-properties]"),
    inquiryRows: document.querySelector("[data-admin-inquiries]"),
    bookingRows: document.querySelector("[data-admin-bookings]"),
    contentEditor: document.querySelector("[data-content-editor]")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(element, message, isError) {
    element.textContent = message || "";
    element.classList.toggle("error", Boolean(isError));
  }

  function formToObject(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    data.featured = form.elements.featured?.checked ? 1 : 0;
    return data;
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }
    return data;
  }

  function formatMoney(property) {
    if (property.price_label) return property.price_label;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(property.price || 0));
  }

  function showDashboard(show) {
    els.loginView.hidden = show;
    els.dashboardView.hidden = !show;
  }

  function renderStats(stats) {
    const items = [
      ["Properties", stats.properties],
      ["Inquiries", stats.inquiries],
      ["Bookings", stats.bookings],
      ["Customers", stats.customers]
    ];
    els.statsGrid.innerHTML = items.map(([label, value]) => `
      <div class="stat-card">
        <span>${label}</span>
        <strong>${Number(value || 0).toLocaleString("en-IN")}</strong>
      </div>
    `).join("");
  }

  function renderProperties() {
    if (!state.properties.length) {
      els.propertyRows.innerHTML = '<tr><td colspan="6">No properties yet.</td></tr>';
      return;
    }

    els.propertyRows.innerHTML = state.properties.map((property) => `
      <tr>
        <td><strong>${escapeHtml(property.title)}</strong><br>${escapeHtml(property.address || "")}</td>
        <td>${escapeHtml(property.listing_type)}</td>
        <td>${escapeHtml(property.city)}</td>
        <td><span class="status-pill">${escapeHtml(property.status)}</span></td>
        <td>${escapeHtml(formatMoney(property))}</td>
        <td>
          <div class="row-actions">
            <button class="mini-button" type="button" data-edit-property="${property.id}">Edit</button>
            <button class="mini-button danger" type="button" data-delete-property="${property.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll("[data-edit-property]").forEach((button) => {
      button.addEventListener("click", () => fillPropertyForm(button.dataset.editProperty));
    });
    document.querySelectorAll("[data-delete-property]").forEach((button) => {
      button.addEventListener("click", () => deleteProperty(button.dataset.deleteProperty));
    });
  }

  function renderInquiries() {
    if (!state.inquiries.length) {
      els.inquiryRows.innerHTML = '<tr><td colspan="4">No inquiries yet.</td></tr>';
      return;
    }

    els.inquiryRows.innerHTML = state.inquiries.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.customer_name || "")}</strong><br>${escapeHtml(item.customer_phone || "")}<br>${escapeHtml(item.customer_email || "")}</td>
        <td>${escapeHtml(item.property_title || "General")}</td>
        <td>${escapeHtml(item.message)}</td>
        <td>
          <select class="status-select" data-inquiry-status="${item.id}">
            ${["new", "contacted", "qualified", "closed"].map((status) => `
              <option value="${status}" ${status === item.status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll("[data-inquiry-status]").forEach((select) => {
      select.addEventListener("change", () => updateInquiry(select.dataset.inquiryStatus, select.value));
    });
  }

  function renderBookings() {
    if (!state.bookings.length) {
      els.bookingRows.innerHTML = '<tr><td colspan="5">No bookings yet.</td></tr>';
      return;
    }

    els.bookingRows.innerHTML = state.bookings.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.customer_name || "")}</strong><br>${escapeHtml(item.customer_phone || "")}<br>${escapeHtml(item.customer_email || "")}</td>
        <td>${escapeHtml(item.property_title || "")}</td>
        <td>${escapeHtml(item.preferred_date)} ${escapeHtml(item.preferred_time || "")}</td>
        <td>${escapeHtml(item.notes || "")}</td>
        <td>
          <select class="status-select" data-booking-status="${item.id}">
            ${["requested", "confirmed", "rescheduled", "completed", "cancelled"].map((status) => `
              <option value="${status}" ${status === item.status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll("[data-booking-status]").forEach((select) => {
      select.addEventListener("change", () => updateBooking(select.dataset.bookingStatus, select.value));
    });
  }

  function renderContent() {
    if (!state.content.length) {
      els.contentEditor.innerHTML = '<div class="empty-state">No content blocks yet.</div>';
      return;
    }

    els.contentEditor.innerHTML = state.content.map((block) => `
      <form class="content-card" data-content-form="${escapeHtml(block.slug)}">
        <h2>${escapeHtml(block.section)} / ${escapeHtml(block.slug)}</h2>
        <label>
          <span>Title</span>
          <input type="text" name="title" value="${escapeHtml(block.title)}">
        </label>
        <label>
          <span>Metadata JSON</span>
          <textarea name="metadata" rows="3">${escapeHtml(block.metadata || "{}")}</textarea>
        </label>
        <label class="full-span">
          <span>Body</span>
          <textarea name="body" rows="4">${escapeHtml(block.body || "")}</textarea>
        </label>
        <button class="solid-button full-span" type="submit">Save Content</button>
        <p class="form-status full-span" role="status"></p>
      </form>
    `).join("");

    document.querySelectorAll("[data-content-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = form.querySelector(".form-status");
        try {
          const payload = formToObject(form);
          await api(`/api/content/${form.dataset.contentForm}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          setStatus(status, "Content saved.");
        } catch (error) {
          setStatus(status, error.message, true);
        }
      });
    });
  }

  async function loadDashboard() {
    const [stats, properties, inquiries, bookings, content] = await Promise.all([
      api("/api/admin/stats"),
      api("/api/properties?limit=100"),
      api("/api/inquiries"),
      api("/api/bookings"),
      api("/api/content")
    ]);

    state.properties = properties.data || [];
    state.inquiries = inquiries || [];
    state.bookings = bookings || [];
    state.content = content || [];

    renderStats(stats);
    renderProperties();
    renderInquiries();
    renderBookings();
    renderContent();
  }

  function fillPropertyForm(id) {
    const property = state.properties.find((item) => String(item.id) === String(id));
    if (!property) return;

    els.propertyFormTitle.textContent = "Edit Property";
    Object.entries(property).forEach(([key, value]) => {
      if (!els.propertyForm.elements[key]) return;
      if (key === "featured") {
        els.propertyForm.elements[key].checked = value === true || value === 1 || value === "1";
      } else {
        els.propertyForm.elements[key].value = value ?? "";
      }
    });
    els.propertyForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetPropertyForm() {
    els.propertyForm.reset();
    els.propertyForm.elements.id.value = "";
    els.propertyForm.elements.state.value = "Odisha";
    els.propertyForm.elements.area_unit.value = "sq ft";
    els.propertyForm.elements.bedrooms.value = "0";
    els.propertyForm.elements.bathrooms.value = "0";
    els.propertyFormTitle.textContent = "Add Property";
    setStatus(els.propertyStatus, "");
  }

  async function saveProperty(event) {
    event.preventDefault();
    const payload = formToObject(els.propertyForm);
    const id = payload.id;
    delete payload.id;

    try {
      await api(id ? `/api/properties/${id}` : "/api/properties", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setStatus(els.propertyStatus, id ? "Property updated." : "Property added.");
      resetPropertyForm();
      await loadDashboard();
    } catch (error) {
      setStatus(els.propertyStatus, error.message, true);
    }
  }

  async function deleteProperty(id) {
    if (!window.confirm("Delete this property?")) return;
    await api(`/api/properties/${id}`, { method: "DELETE" });
    await loadDashboard();
  }

  async function updateInquiry(id, status) {
    await api(`/api/inquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadDashboard();
  }

  async function updateBooking(id, status) {
    await api(`/api/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadDashboard();
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(els.loginStatus, "Signing in...");
      try {
        const result = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(formToObject(els.loginForm))
        });
        if (result.user.role !== "admin") {
          throw new Error("This account does not have admin access.");
        }
        state.token = result.token;
        localStorage.setItem(tokenKey, result.token);
        showDashboard(true);
        await loadDashboard();
      } catch (error) {
        setStatus(els.loginStatus, error.message, true);
      }
    });

    els.logout.addEventListener("click", () => {
      state.token = null;
      localStorage.removeItem(tokenKey);
      showDashboard(false);
    });

    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
        document.querySelectorAll("[data-panel]").forEach((panel) => {
          panel.classList.toggle("active", panel.dataset.panel === button.dataset.tab);
        });
      });
    });

    els.propertyForm.addEventListener("submit", saveProperty);
    document.querySelector("[data-property-reset]").addEventListener("click", resetPropertyForm);
    document.querySelector("[data-refresh-properties]").addEventListener("click", loadDashboard);
    document.querySelector("[data-refresh-inquiries]").addEventListener("click", loadDashboard);
    document.querySelector("[data-refresh-bookings]").addEventListener("click", loadDashboard);
  }

  async function init() {
    bindEvents();
    if (!state.token) {
      showDashboard(false);
      return;
    }

    try {
      const me = await api("/api/auth/me");
      if (me.user.role !== "admin") throw new Error("Admin role required.");
      showDashboard(true);
      await loadDashboard();
    } catch (error) {
      localStorage.removeItem(tokenKey);
      state.token = null;
      showDashboard(false);
      setStatus(els.loginStatus, "Please sign in again.");
    }
  }

  init().catch((error) => {
    console.error(error);
    setStatus(els.loginStatus, error.message, true);
  });
})();
