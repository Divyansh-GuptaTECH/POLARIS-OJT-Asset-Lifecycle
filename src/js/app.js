let allAssets = [];

// 1. Fetch data from data/assets.json
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

// 2. Render rows into the table
function renderTable(data) {
  const tableBody = document.getElementById('assetTableBody');
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="7" class="text-center text-muted py-4">No assets match your search/filter.</td></tr>
    `;
    return;
  }

  tableBody.innerHTML = data.map(asset => {
    let badgeClass = 'bg-secondary';
    if (asset.status === 'Assigned') badgeClass = 'bg-primary';
    if (asset.status === 'Active') badgeClass = 'bg-success';
    if (asset.status === 'In Repair') badgeClass = 'bg-warning text-dark';

    return `
      <tr>
        <td class="fw-bold">${asset.assetId}</td>
        <td>${asset.name}</td>
        <td><span class="badge bg-light text-dark border">${asset.category}</span></td>
        <td>${asset.assignedTo}</td>
        <td>${asset.department}</td>
        <td>${asset.warrantyExpiry}</td>
        <td><span class="badge ${badgeClass}">${asset.status}</span></td>
      </tr>
    `;
  }).join('');
}

// 3. Update top KPI counters
function updateKPIs(data) {
  document.getElementById('kpi-total').textContent = data.length;
  
  const activeCount = data.filter(a => a.status === 'Assigned' || a.status === 'Active').length;
  document.getElementById('kpi-active').textContent = activeCount;

  const repairCount = data.filter(a => a.status === 'In Repair').length;
  document.getElementById('kpi-repair').textContent = repairCount;
}

// 4. Live Search and Dropdown Filter Event Listeners
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

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);

// Initial Load
document.addEventListener('DOMContentLoaded', loadAssets);