# Prompt 07 — Inventory & Costing Pages

## Objective
Build clear, functional UI for the Inventory and Costing sections. These pages have the most direct business value for home and professional bakers — accurate stock tracking and pricing visibility.

**Prerequisites**: Prompts 01, 02, 03 complete.

---

## Files to Read and Edit

Read ALL of these files before making any changes. The inventory and costing pages may already have partial implementations — build on them, don't replace working logic.

- `frontend/src/pages/` — check for `Inventory.tsx`, `Costing.tsx` or similar
- `frontend/src/components/inventory/` — any existing inventory components
- `frontend/src/components/costing/` — any existing costing components
- `frontend/src/services/inventory.service.ts`
- `frontend/src/services/costing.service.ts`
- `frontend/src/store/inventoryStore.ts`

---

## Inventory Page

### Layout
```
Inventory
├── Page header (title + "Add Item" button)
├── Summary row (4 KPI chips)
├── Search + filter bar
├── Stock table (desktop) / card stack (mobile)
└── Add/Edit item modal
```

### Page Header
```tsx
<div className="page-header">
  <div>
    <h1 className="text-2xl font-bold font-display text-neutral-900">Inventory</h1>
    <p className="text-sm text-neutral-500 mt-0.5">Track your ingredient stock levels</p>
  </div>
  <Button leftIcon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
    Add Item
  </Button>
</div>
```

### Summary KPI Chips (horizontal scrollable row)
```tsx
<div className="flex gap-3 overflow-x-auto pb-1 mb-6 scrollbar-hide">
  <KpiChip label="Total Items" value={totalItems} icon={Package} color="secondary" />
  <KpiChip label="Low Stock" value={lowStockCount} icon={AlertTriangle} color={lowStockCount > 0 ? 'error' : 'success'} />
  <KpiChip label="Out of Stock" value={outOfStockCount} icon={XCircle} color={outOfStockCount > 0 ? 'error' : 'success'} />
  <KpiChip label="Total Value" value={formatCurrency(totalValue)} icon={IndianRupee} color="primary" />
</div>
```

`KpiChip` — compact inline card:
```tsx
const KpiChip = ({ label, value, icon: Icon, color }) => (
  <div className={cn('card flex items-center gap-3 px-4 py-3 shrink-0', colorBorder[color])}>
    <Icon size={18} className={colorIcon[color]} />
    <div>
      <p className="text-2xs text-neutral-500 font-medium uppercase tracking-wide leading-none">{label}</p>
      <p className={cn('text-base font-bold leading-tight mt-0.5', colorText[color])}>{value}</p>
    </div>
  </div>
)
```

### Inventory Table

**Desktop** (`hidden sm:block`):
```tsx
<div className="card overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-neutral-50 border-b border-neutral-200">
      <tr>
        <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Ingredient</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Quantity</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Min Stock</th>
        <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cost/unit</th>
        <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Value</th>
        <th className="px-4 py-3 w-20" />
      </tr>
    </thead>
    <tbody className="divide-y divide-neutral-100">
      {items.map(item => (
        <InventoryRow key={item.id} item={item} onEdit={handleEdit} onDeduct={handleDeduct} />
      ))}
    </tbody>
  </table>
</div>
```

**InventoryRow**:
```tsx
<tr className="hover:bg-neutral-50 transition-colors">
  <td className="px-4 py-3">
    <div className="font-medium text-neutral-900">{item.ingredient_name}</div>
    <div className="text-xs text-neutral-400">{item.category}</div>
  </td>
  <td className="px-4 py-3 text-right font-mono text-sm">
    {item.quantity} {item.unit}
  </td>
  <td className="px-4 py-3 text-right text-neutral-500 text-sm">
    {item.min_stock_level} {item.unit}
  </td>
  <td className="px-4 py-3 text-center">
    <StockStatusBadge quantity={item.quantity} minStock={item.min_stock_level} />
  </td>
  <td className="px-4 py-3 text-right text-sm text-neutral-600">
    {formatCurrency(item.cost_per_unit)}
  </td>
  <td className="px-4 py-3 text-right font-medium text-sm">
    {formatCurrency(item.quantity * item.cost_per_unit)}
  </td>
  <td className="px-4 py-3">
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="xs" onClick={() => handleDeduct(item)}><Minus size={14} /></Button>
      <Button variant="ghost" size="xs" onClick={() => handleEdit(item)}><Edit size={14} /></Button>
    </div>
  </td>
</tr>
```

**StockStatusBadge** helper:
```tsx
function StockStatusBadge({ quantity, minStock }: { quantity: number; minStock: number }) {
  if (quantity === 0) return <Badge variant="error" dot>Out of Stock</Badge>
  if (quantity <= minStock) return <Badge variant="warning" dot>Low Stock</Badge>
  return <Badge variant="success" dot>In Stock</Badge>
}
```

**Mobile card view** (`block sm:hidden`):
```tsx
{items.map(item => (
  <div key={item.id} className="card p-4 mb-3 flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm text-neutral-900 truncate">{item.ingredient_name}</p>
        <StockStatusBadge quantity={item.quantity} minStock={item.min_stock_level} />
      </div>
      <p className="text-xs text-neutral-500 mt-0.5">
        {item.quantity} {item.unit} remaining
        {item.cost_per_unit ? ` · ${formatCurrency(item.quantity * item.cost_per_unit)}` : ''}
      </p>
    </div>
    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Edit size={14} /></Button>
  </div>
))}
```

### Add/Edit Item Modal
Use the standardized `Modal` component (size `md`). Form fields:
- Ingredient name (with autocomplete from ingredient master)
- Quantity + unit
- Minimum stock level
- Cost per unit (with `CurrencyInput` component, prefix ₹)
- Supplier (Select from suppliers list)
- Expiry date (optional)

---

## Costing Page

### Layout
```
Costing
├── Page header
├── Recipe selector card
├── Ingredient cost breakdown table
├── Overhead & packaging costs
├── Summary panel (total cost, suggested price, margin)
└── Save/Export actions
```

### Recipe Selector Card
```tsx
<div className="card p-6 mb-6">
  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Select Recipe to Cost</h3>
  <div className="flex gap-3">
    <div className="flex-1">
      <Select
        options={recipeOptions}
        value={selectedRecipeId}
        onChange={setSelectedRecipeId}
        placeholder="Choose a recipe…"
      />
    </div>
    <Input
      type="number"
      min="1"
      value={batchSize}
      onChange={e => setBatchSize(Number(e.target.value))}
      placeholder="Batch size"
      className="w-28"
    />
    <Button onClick={handleCalculate} loading={isCalculating} leftIcon={<Calculator size={14} />}>
      Calculate
    </Button>
  </div>
</div>
```

### Ingredient Cost Breakdown
```tsx
<div className="card overflow-hidden mb-4">
  <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
    <h3 className="font-semibold text-neutral-900">Ingredient Costs</h3>
    <span className="text-sm text-neutral-500">{batchSize} batch</span>
  </div>
  <table className="w-full text-sm">
    <thead className="bg-neutral-50 border-b border-neutral-100">
      <tr>
        <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Ingredient</th>
        <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Qty</th>
        <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Rate</th>
        <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cost</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-neutral-100">
      {breakdown.ingredients.map(ing => (
        <tr key={ing.id} className="hover:bg-neutral-50">
          <td className="px-5 py-3 font-medium text-neutral-800">{ing.name}</td>
          <td className="px-5 py-3 text-right text-neutral-600">{ing.quantity}{ing.unit}</td>
          <td className="px-5 py-3 text-right text-neutral-500 text-xs">{formatCurrency(ing.cost_per_unit)}/{ing.unit}</td>
          <td className="px-5 py-3 text-right font-medium">{formatCurrency(ing.total_cost)}</td>
        </tr>
      ))}
    </tbody>
    <tfoot className="bg-neutral-50 border-t border-neutral-200">
      <tr>
        <td colSpan={3} className="px-5 py-3 font-semibold text-neutral-700">Ingredient Total</td>
        <td className="px-5 py-3 text-right font-bold text-neutral-900">{formatCurrency(breakdown.ingredient_total)}</td>
      </tr>
    </tfoot>
  </table>
</div>
```

### Overhead Section
```tsx
<div className="card p-5 mb-4">
  <h3 className="font-semibold text-neutral-900 mb-4">Overhead & Packaging</h3>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <Input label="Labour (₹)" type="number" value={labour} onChange={e => setLabour(Number(e.target.value))} leftIcon={<IndianRupee size={14} />} />
    <Input label="Packaging (₹)" type="number" value={packaging} onChange={e => setPackaging(Number(e.target.value))} leftIcon={<IndianRupee size={14} />} />
    <Input label="Overhead (%)" type="number" value={overheadPct} onChange={e => setOverheadPct(Number(e.target.value))} rightIcon={<Percent size={14} />} />
    <Input label="Wastage (%)" type="number" value={wastagePct} onChange={e => setWastagePct(Number(e.target.value))} rightIcon={<Percent size={14} />} />
  </div>
</div>
```

### Pricing Summary Panel
```tsx
<div className="card p-6 bg-gradient-to-br from-secondary-900 to-secondary-700 text-white">
  <h3 className="font-semibold text-white/80 mb-5 text-sm uppercase tracking-wide">Pricing Summary</h3>
  <div className="grid grid-cols-2 gap-4 mb-6">
    <SummaryLine label="Total Cost" value={formatCurrency(totalCost)} highlight />
    <SummaryLine label="Cost per unit" value={formatCurrency(costPerUnit)} />
    <div>
      <label className="text-xs text-white/60 font-medium mb-1 block">Target Margin</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="10" max="80" step="5"
          value={margin}
          onChange={e => setMargin(Number(e.target.value))}
          className="flex-1 accent-primary-400"
        />
        <span className="text-white font-bold w-12 text-right">{margin}%</span>
      </div>
    </div>
    <SummaryLine label="Suggested Price" value={formatCurrency(suggestedPrice)} highlight accent />
  </div>
  <div className="flex gap-3 pt-4 border-t border-white/20">
    <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 flex-1" leftIcon={<Save size={14} />} onClick={handleSave}>
      Save Costing
    </Button>
    <Button variant="ghost" className="text-white hover:bg-white/10" leftIcon={<Download size={14} />} onClick={handleExport}>
      Export
    </Button>
  </div>
</div>
```

`SummaryLine` helper:
```tsx
const SummaryLine = ({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) => (
  <div>
    <p className="text-xs text-white/60 font-medium">{label}</p>
    <p className={cn('text-xl font-bold mt-0.5', accent ? 'text-accent-300' : highlight ? 'text-white' : 'text-white/80')}>{value}</p>
  </div>
)
```

### Currency Formatting Helper
```tsx
const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
```

---

## Verification
- [ ] Inventory table renders with StockStatusBadge for each row
- [ ] Mobile shows card stack view
- [ ] Costing calculator shows breakdown table + pricing panel
- [ ] Margin slider updates suggested price in real time
- [ ] All icons from lucide-react
- [ ] formatCurrency uses en-IN locale with INR
- [ ] TypeScript compiles
