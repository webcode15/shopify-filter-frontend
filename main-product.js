document.addEventListener("DOMContentLoaded", async () => {
  const collectionHandle = window.location.pathname.split("/").filter(Boolean).pop();
  const apiBaseUrl = "https://staging.fanzaty.net/api/cso/collection";
  // const apiBaseUrl = "http://localhost:3000/collection";
  const filterContainer = document.getElementById("filters");
  const productList = document.getElementById("productList");

  let allProducts = [];
  let currentFilteredProducts = [];
  let currentLocationId = "";
  let filterOrder = ["size", "weight", "vendor", "productType", "location"];

  async function fetchProducts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.locationId) params.append("locationId", filters.locationId);
    if (filters.size?.length) params.append("size", filters.size.join(","));
    if (filters.weight?.length) params.append("weight", filters.weight.join(","));
    if (filters.vendor?.length) params.append("vendor", filters.vendor.join(","));
    if (filters.productType?.length) params.append("productType", filters.productType.join(","));
    
    const url = `${apiBaseUrl}/${collectionHandle}?${params.toString()}`;
    console.log("Fetching:", url);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  }
function normalizeValue(value) {
  return value?.replace(/\s+/g, "").replace(/\//g, "/").toLowerCase().trim();
}

function buildFilterOptions(products) {
  const options = {
    size: new Map(),
    weight: new Map(),
    vendor: new Map(),
    productType: new Map(),
    location: new Map(),
  };

  products.forEach((p) => {
    if (p.size) {
      const norm = normalizeValue(p.size);
      if (!options.size.has(norm)) {
        options.size.set(norm, p.size); // preserve original label
      }
    }

    if (p.weight) {
      const norm = normalizeValue(p.weight);
      if (!options.weight.has(norm)) {
        options.weight.set(norm, p.weight);
      }
    }

    if (p.vendor) {
      const norm = normalizeValue(p.vendor);
      if (!options.vendor.has(norm)) {
        options.vendor.set(norm, p.vendor);
      }
    }

    if (p.productType) {
      const norm = normalizeValue(p.productType);
      if (!options.productType.has(norm)) {
        options.productType.set(norm, p.productType);
      }
    }

    if (p.location) {
      const norm = normalizeValue(p.location);
      if (!options.location.has(norm)) {
        options.location.set(norm, p.location);
      }
    }
  });

  // Convert maps to arrays of unique original values
  return {
    size: Array.from(options.size.values()),
    weight: Array.from(options.weight.values()),
    vendor: Array.from(options.vendor.values()),
    productType: Array.from(options.productType.values()),
    location: Array.from(options.location.values()),
  };
}


  function renderCheckboxGroup(label, name, options) {

    if (!options.length) return null;
    const container = document.createElement("div");
    container.dataset.filter = name;
    container.innerHTML = label === 'Vendor' ? `<strong>Brand</strong><br/>` : `<strong>${label}</strong><br/>`;

    options.forEach((opt, index) => {
      // Create a unique, safe ID
      const safeId = `${name}-${encodeURIComponent(opt).replace(/[%().]/g, "")}-${index}`;

      const wrapper = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = name;
      checkbox.value = opt;
      checkbox.id = safeId;
      checkbox.addEventListener("change", applyFilters);

      const labelEl = document.createElement("label");
      labelEl.htmlFor = safeId;
      labelEl.textContent = opt;

      wrapper.appendChild(checkbox);
      wrapper.appendChild(labelEl);
      container.appendChild(wrapper);
    });

    return container;
  }


  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((cb) => cb.value);
  }

  function renderFilters(options) {
    filterContainer.innerHTML = `
      <div class="Location-filter" style="margin-bottom: 12px">
        <strong>Location</strong>
        <div class="location-filter">
          <select id="locationSelect">
            <option value="all_products" selected>All Locations</option>
            <option value="gid://shopify/Location/68360798375">Cricmax New Jersey</option>
            <option value="gid://shopify/Location/70232211623">Cumming ATL GA (PICKUP ONLY)</option>
            <option value="gid://shopify/Location/76107481255">Online Only Warehouse</option>
          </select>
        </div>
      </div>
    `;

    // Attach listener to location dropdown
    const locationSelect = document.getElementById("locationSelect");
    locationSelect.value = currentLocationId;
    locationSelect.addEventListener("change", async (e) => {
      currentLocationId = e.target.value;
      allProducts = await fetchProducts({ locationId: currentLocationId });
      currentFilteredProducts = allProducts;

      const newOptions = buildFilterOptions(allProducts);
      renderFilters(newOptions);
      renderProducts(allProducts);
    });

    // Render checkbox filters
    const groups = [
      renderCheckboxGroup("Size", "size", options.size),
      renderCheckboxGroup("Weight", "weight", options.weight),
      renderCheckboxGroup("Vendor", "vendor", options.vendor),
      renderCheckboxGroup("Grade", "productType", options.productType),
      renderCheckboxGroup("Location (Tag)", "location", options.location),
    ];

    groups.forEach((group) => {
      if (group) {
        group.style.marginBottom = "12px";
        filterContainer.appendChild(group);
      }
    });
  }

  function renderProducts(products) {
    productList.innerHTML = "";
    if (!products.length) {
      productList.innerHTML = "<p>No products found.</p>";
      return;
    }

    products.forEach((prod) => {
      console.log(prod);
      const div = document.createElement("div");
      div.className = "product";
      div.style.padding = "10px";
      div.innerHTML = `
        <a href="${prod.url}">
          <div class="product-image">
            <img src="${prod.image}" alt="${prod.title}">
          </div>
          <h3 class="title">${prod.title}</h3>
          <p class="prod-available">Available : ${prod.available}</p>
          <p class="product-price">
            ${prod.compareAtPrice ? `<span class="compare-price">$${prod.compareAtPrice}</span>` : ''}
            <span class="product-price-s">$${prod.price}</span>
            ${prod.compareAtPrice && prod.compareAtPrice > prod.price 
            ? `<span class="you-save-s">Save ${(((prod.compareAtPrice - prod.price) / prod.compareAtPrice) * 100).toFixed(0)}%</span>` 
            : ''}
          </p>
        </a>
      `;
      productList.appendChild(div);
    });
  }

  async function applyFilters(e) {
    const clickedFilterName = e.target.name;
    const selectedFilters = {};

    filterOrder.forEach((name) => {
      selectedFilters[name] = getCheckedValues(name);
    });

    let filtered = allProducts.filter((p) => {
      return (
        (!selectedFilters.size.length || selectedFilters.size.includes(p.size)) &&
        (!selectedFilters.weight.length || selectedFilters.weight.includes(p.weight)) &&
        (!selectedFilters.vendor.length || selectedFilters.vendor.includes(p.vendor)) &&
        (!selectedFilters.productType.length || selectedFilters.productType.includes(p.productType)) &&
        (!selectedFilters.location.length || selectedFilters.location.includes(p.location))
      );
    });

    renderProducts(filtered);
    currentFilteredProducts = filtered;

    const clickedIndex = filterOrder.indexOf(clickedFilterName);
    const newOptions = buildFilterOptions(filtered);

    filterOrder.forEach((name, index) => {
      const section = document.querySelector(`[data-filter="${name}"]`);
      if (!section) return;
      if (index <= clickedIndex) return;

      section.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        const available = newOptions[name].includes(cb.value);
        const label = cb.parentElement;
        label.style.display = available ? "block" : "none";
      });
    });
  }

  // ---- INITIALIZE ----
  currentLocationId = ""; // default: all
  allProducts = await fetchProducts();
  currentFilteredProducts = allProducts;

  const filterOptions = buildFilterOptions(allProducts);
  renderFilters(filterOptions);
  renderProducts(allProducts);
});
document.addEventListener("DOMContentLoaded", function () {
 setTimeout(function () {
  const select = document.getElementById("locationSelect");
  if (select) {
    select.selectedIndex = 0;
    select.dispatchEvent(new Event("change"));
  }
}, 1000);
});
