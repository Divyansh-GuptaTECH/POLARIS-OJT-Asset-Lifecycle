let allAssets = [];

// 1. JSON file se data load karna
async function loadAssets() {
  try {
    const response = await fetch('data/assets.json');
    if (!response.ok) throw new Error('Failed to load JSON');
    allAssets = await response.json();
    renderTable(allAssets);
    updateKPIs(allAssets);
  } catch (err) {
    console.error('Error fetching assets:', err);
    document.getElementById('assetTableBody').innerHTML = `
      <tr><td colspan="7" class="text-center text-danger py-4">Error loading asset data.</td></tr>
    `;
  }
}

// Helper Function: Check karna ki expiry kitne din bachi hai
function getDaysUntilExpiry(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Sirf date compare karne ke liye time zero kiya
  const expiryDate = new Date(expiryDateStr);
  
  const diffTime = expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 2. Table mein rows render karna
function renderTable(data) {
  const tableBody = document.getElementById('assetTableBody');
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="7" class="text-center text-muted py-4">No assets match your search/filter.</td></tr>
    `;
    return;
  }

  tableBody.innerHTML = data.map(asset => {
    // Status Badge colors
    let badgeClass = 'bg-secondary';
    if (asset.status === 'Assigned') badgeClass = 'bg-primary';
    if (asset.status === 'Active') badgeClass = 'bg-success';
    if (asset.status === 'In Repair') badgeClass = 'bg-warning text-dark';

    // Dynamic Expiry Calculation & Alert Badge
    const daysLeft = getDaysUntilExpiry(asset.warrantyExpiry);
    let expiryHtml = `<span>${asset.warrantyExpiry}</span>`;

    if (daysLeft < 0) {
      expiryHtml += ` <span class="badge bg-dark ms-1">Expired</span>`;
    } else if (daysLeft <= 30) {
      expiryHtml += ` <span class="badge bg-danger ms-1">Expiring Soon (${daysLeft}d)</span>`;
    }

    return `
      <tr>
        <td class="fw-bold">${asset.assetId}</td>
        <td>${asset.name}</td>
        <td><span class="badge bg-light text-dark border">${asset.category}</span></td>
        <td>${asset.assignedTo}</td>
        <td>${asset.department}</td>
        <td>${expiryHtml}</td>
        <td><span class="badge ${badgeClass}">${asset.status}</span></td>
      </tr>
    `;
  }).join('');
}

// 3. Top KPI cards ko dynamic calculate karna
function updateKPIs(data) {
  // Total Assets
  document.getElementById('kpi-total').textContent = data.length;
  
  // Active / Assigned Assets
  const activeCount = data.filter(a => a.status === 'Assigned' || a.status === 'Active').length;
  document.getElementById('kpi-active').textContent = activeCount;

  // In Repair Assets
  const repairCount = data.filter(a => a.status === 'In Repair').length;
  document.getElementById('kpi-repair').textContent = repairCount;

  // DYNAMIC: Expiring in <= 30 Days (Static '2' hat kar dynamic count)
  const expiringCount = data.filter(a => {
    const daysLeft = getDaysUntilExpiry(a.warrantyExpiry);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;
  document.getElementById('kpi-expiring').textContent = expiringCount;
}

// 4. Search aur Filters Logic
function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const selectedStatus = document.getElementById('statusFilter').value;
  const selectedCategory = document.getElementById('categoryFilter').value;

  const filtered = allAssets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(query) ||
      asset.assetId.toLowerCase().includes(query) ||
      asset.assignedTo.toLowerCase().includes(query);

    const matchesStatus = (selectedStatus === 'ALL') || (asset.status === selectedStatus);
    const matchesCategory = (selectedCategory === 'ALL') || (asset.category === selectedCategory);

    return matchesSearch && matchesStatus && matchesCategory;
  });

  renderTable(filtered);
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);

// Start
document.addEventListener('DOMContentLoaded', loadAssets);