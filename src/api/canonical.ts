import { apiFetch, toQueryString } from "@/utils/api"

export type Customer = {
  id: string
  companyId: string
  classificationId?: string | null
  classification?: { id: string; name: string; externalId?: string | null } | null
  name: string
  knownName?: string | null
  externalId?: string | null
  document: string | null
  email: string | null
  phone: string | null
  phone2?: string | null
  birthDate?: string | null
  city: string | null
  state: string | null
  route?: string | null
  cityId?: string | null
  stateCode?: string | null
  neighborhood?: string | null
  value?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerClassification = {
  id: string
  companyId: string
  name: string
  externalId?: string | null
  description?: string | null
  notes?: string | null
  percentShare?: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerUpsertInput = Partial<Customer> & {
  name?: string
  classificationId?: string | null
  classificationExternalId?: string | null
}

export type Supplier = {
  id: string
  companyId: string
  name: string
  externalId?: string | null
  document: string | null
  email: string | null
  phone: string | null
  phone2?: string | null
  city: string | null
  state: string | null
  cityId?: string | null
  stateCode?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Product = {
  id: string
  companyId: string
  code: string
  externalId: string | null
  sku: string | null
  barcode: string | null
  name: string
  section: string | null
  group: string | null
  subgroup: string | null
  brandName: string | null
  costPrice: number | null
  salePrice: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ProductSection = {
  id: string
  companyId: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export type ProductGroup = {
  id: string
  companyId: string
  sectionId: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export type ProductSubgroup = {
  id: string
  companyId: string
  groupId: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export type ProductManufacturer = {
  id: string
  companyId: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export type TitleStatus = "OPEN" | "PAID" | "OVERDUE" | "CANCELED"

export type ApTitle = {
  id: string
  companyId: string
  supplierId: string | null
  issueDate: string
  dueDate: string
  paymentDate?: string | null
  amount: number
  openAmount: number
  paidAmount?: number | null
  discountReceived?: number | null
  interestReceived?: number | null
  status: TitleStatus
  documentNumber: string | null
  notes: string | null
  externalId?: string | null
  createdAt: string
}

export type ArTitle = {
  id: string
  companyId: string
  customerId: string | null
  customerExternalId?: string | null
  issueDate: string
  dueDate: string
  paymentDate?: string | null
  amount: number
  openAmount: number
  paidAmount?: number | null
  discountReceived?: number | null
  interestReceived?: number | null
  status: TitleStatus
  documentNumber: string | null
  notes: string | null
  externalId?: string | null
  createdAt: string
}

export async function listCustomers(params?: { q?: string; take?: number; skip?: number; status?: "active" | "inactive" | "all" }) {
  return apiFetch<{ items: Customer[]; total: number; take: number; skip: number }>(`/customers${toQueryString(params ?? {})}`)
}

export async function createCustomer(body: CustomerUpsertInput & { name: string }) {
  return apiFetch<Customer>("/customers", { method: "POST", body: JSON.stringify(body) })
}

export async function updateCustomer(id: string, body: CustomerUpsertInput) {
  return apiFetch<Customer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteCustomer(id: string) {
  return apiFetch<{ ok: true }>(`/customers/${id}`, { method: "DELETE" })
}

export async function listCustomerDeactivations() {
  return apiFetch<
    Array<{
      id: string
      customerId: string
      value: number | null
      reason: string | null
      reasonId: string | null
      deactivatedAt: string
      customer: { name: string; document: string | null; externalId: string | null }
      reasonRef: { id: string; description: string; externalId: string | null } | null
    }>
  >("/customers/deactivations")
}

export async function createCustomerDeactivation(id: string, body: { value?: number | null; reason?: string | null; reasonId?: string | null; deactivatedAt?: string }) {
  return apiFetch<{ id: string }>(`/customers/${id}/deactivations`, { method: "POST", body: JSON.stringify(body) })
}

export type CustomerDeactivationReason = {
  id: string
  companyId: string
  description: string
  externalId?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export async function listCustomerDeactivationReasons() {
  return apiFetch<CustomerDeactivationReason[]>("/customers/deactivation-reasons")
}

export async function createCustomerDeactivationReason(body: { description: string; externalId?: string | null; active?: boolean }) {
  return apiFetch<CustomerDeactivationReason>("/customers/deactivation-reasons", { method: "POST", body: JSON.stringify(body) })
}

export async function updateCustomerDeactivationReason(id: string, body: Partial<CustomerDeactivationReason>) {
  return apiFetch<CustomerDeactivationReason>(`/customers/deactivation-reasons/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function listCustomerClassifications(params?: { q?: string }) {
  return apiFetch<CustomerClassification[]>(`/customers/classifications${toQueryString(params ?? {})}`)
}

export async function createCustomerClassification(body: { name: string; externalId?: string | null; description?: string | null; notes?: string | null; percentShare?: number | null; active?: boolean }) {
  return apiFetch<CustomerClassification>("/customers/classifications", { method: "POST", body: JSON.stringify(body) })
}

export async function updateCustomerClassification(id: string, body: Partial<CustomerClassification>) {
  return apiFetch<CustomerClassification>(`/customers/classifications/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteCustomerClassification(id: string) {
  return apiFetch<{ ok: true }>(`/customers/classifications/${id}`, { method: "DELETE" })
}

export async function listSuppliers(params?: { q?: string; take?: number; skip?: number; status?: "active" | "inactive" | "all" }) {
  return apiFetch<{ items: Supplier[]; total: number; take: number; skip: number }>(`/suppliers${toQueryString(params ?? {})}`)
}

export async function createSupplier(body: Partial<Supplier> & { name: string }) {
  return apiFetch<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(body) })
}

export async function updateSupplier(id: string, body: Partial<Supplier>) {
  return apiFetch<Supplier>(`/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteSupplier(id: string) {
  return apiFetch<{ ok: true }>(`/suppliers/${id}`, { method: "DELETE" })
}

export async function listProducts(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: Product[]; total: number; take: number; skip: number }>(`/products${toQueryString(params ?? {})}`)
}

export async function createProduct(body: Partial<Product> & { name: string }) {
  return apiFetch<Product>("/products", { method: "POST", body: JSON.stringify(body) })
}

export async function updateProduct(id: string, body: Partial<Product>) {
  return apiFetch<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteProduct(id: string) {
  return apiFetch<{ ok: true }>(`/products/${id}`, { method: "DELETE" })
}

export async function listProductSections(params?: { q?: string }) {
  return apiFetch<ProductSection[]>(`/products/sections${toQueryString(params ?? {})}`)
}

export async function createProductSection(body: { code?: string; name: string }) {
  return apiFetch<ProductSection>("/products/sections", { method: "POST", body: JSON.stringify(body) })
}

export async function updateProductSection(id: string, body: Partial<{ code: string; name: string }>) {
  return apiFetch<ProductSection>(`/products/sections/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteProductSection(id: string) {
  return apiFetch<{ ok: true }>(`/products/sections/${id}`, { method: "DELETE" })
}

export async function listProductGroups(params?: { q?: string }) {
  return apiFetch<ProductGroup[]>(`/products/groups${toQueryString(params ?? {})}`)
}

export async function createProductGroup(body: { sectionId: string; code?: string; name: string }) {
  return apiFetch<ProductGroup>("/products/groups", { method: "POST", body: JSON.stringify(body) })
}

export async function updateProductGroup(id: string, body: Partial<{ sectionId: string; code: string; name: string }>) {
  return apiFetch<ProductGroup>(`/products/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteProductGroup(id: string) {
  return apiFetch<{ ok: true }>(`/products/groups/${id}`, { method: "DELETE" })
}

export async function listProductSubgroups(params?: { q?: string }) {
  return apiFetch<ProductSubgroup[]>(`/products/subgroups${toQueryString(params ?? {})}`)
}

export async function createProductSubgroup(body: { groupId: string; code?: string; name: string }) {
  return apiFetch<ProductSubgroup>("/products/subgroups", { method: "POST", body: JSON.stringify(body) })
}

export async function updateProductSubgroup(id: string, body: Partial<{ groupId: string; code: string; name: string }>) {
  return apiFetch<ProductSubgroup>(`/products/subgroups/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteProductSubgroup(id: string) {
  return apiFetch<{ ok: true }>(`/products/subgroups/${id}`, { method: "DELETE" })
}

export async function listProductManufacturers(params?: { q?: string }) {
  return apiFetch<ProductManufacturer[]>(`/products/manufacturers${toQueryString(params ?? {})}`)
}

export async function createProductManufacturer(body: { code?: string; name: string }) {
  return apiFetch<ProductManufacturer>("/products/manufacturers", { method: "POST", body: JSON.stringify(body) })
}

export async function updateProductManufacturer(id: string, body: Partial<{ code: string; name: string }>) {
  return apiFetch<ProductManufacturer>(`/products/manufacturers/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteProductManufacturer(id: string) {
  return apiFetch<{ ok: true }>(`/products/manufacturers/${id}`, { method: "DELETE" })
}

export type InventoryItem = {
  id: string
  externalProductId: string
  externalLocationId: string | null
  locationName: string | null
  qtyOnHand: number
  ead?: string | null
  deactivated?: boolean
  updatedAtSource: string | null
  productName?: string | null
}

export async function listInventory(params?: { q?: string; take?: number; skip?: number; externalLocationId?: string; locationName?: string; dateFrom?: string; dateTo?: string }) {
  const qp = new URLSearchParams()
  if (params?.q) qp.set("q", params.q)
  if (params?.take) qp.set("take", String(params.take))
  if (params?.skip) qp.set("skip", String(params.skip))
  if (params?.externalLocationId) qp.set("externalLocationId", params.externalLocationId)
  if (params?.locationName) qp.set("locationName", params.locationName)
  if (params?.dateFrom) qp.set("dateFrom", params.dateFrom)
  if (params?.dateTo) qp.set("dateTo", params.dateTo)
  const qs = qp.toString()
  return apiFetch<{ items: InventoryItem[]; total: number; take: number; skip: number }>(`/inventory${qs ? `?${qs}` : ""}`)
}

export type InventoryItemInput = {
  externalProductId: string
  externalLocationId?: string | null
  locationName?: string | null
  qtyOnHand: number
  ead?: string | null
  deactivated?: boolean
  updatedAtSource?: string | null
}

export async function upsertInventory(items: InventoryItemInput[] | InventoryItemInput) {
  return apiFetch<{ ok: true; created: number; updated: number }>(`/inventory`, {
    method: "POST",
    body: JSON.stringify(Array.isArray(items) ? { items } : items),
  })
}

export type InventoryLocation = {
  id: string
  companyId: string
  externalId?: string | null
  name: string
  hashTable?: string | null
  updatedAtSource?: string | null
  ignoreConsolidation: boolean
  createdAt: string
  updatedAt: string
}

export type InventoryLocationInput = {
  externalId?: string | null
  name: string
  hashTable?: string | null
  updatedAtSource?: string | null
  ignoreConsolidation?: boolean
}

export async function listInventoryLocations(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: InventoryLocation[]; total: number; take: number; skip: number }>(`/inventory/locations${toQueryString(params ?? {})}`)
}

export async function upsertInventoryLocations(items: InventoryLocationInput[] | InventoryLocationInput) {
  return apiFetch<{ ok: true; created: number; updated: number }>(`/inventory/locations`, {
    method: "POST",
    body: JSON.stringify(Array.isArray(items) ? { items } : items),
  })
}

export async function updateInventoryLocation(id: string, body: Partial<InventoryLocationInput>) {
  return apiFetch<InventoryLocation>(`/inventory/locations/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}
export async function listApTitles(params?: { status?: TitleStatus; take?: number; skip?: number; from?: string; to?: string }) {
  return apiFetch<{ items: ApTitle[]; total: number; take: number; skip: number }>(`/ap-titles${toQueryString(params ?? {})}`)
}

export type ApTitleInput = {
  supplierId?: string | null
  supplierExternalId?: string | null
  issueDate: string
  dueDate: string
  paymentDate?: string | null
  amount: number
  openAmount: number
  paidAmount?: number | null
  discountReceived?: number | null
  interestReceived?: number | null
  status: TitleStatus
  documentNumber?: string | null
  notes?: string | null
  externalId?: string | null
}

export async function createApTitle(body: ApTitleInput) {
  return apiFetch<ApTitle>("/ap-titles", { method: "POST", body: JSON.stringify(body) })
}

export async function updateApTitle(id: string, body: Partial<ApTitleInput>) {
  return apiFetch<ApTitle>(`/ap-titles/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteApTitle(id: string) {
  return apiFetch<{ ok: true }>(`/ap-titles/${id}`, { method: "DELETE" })
}

export async function listArTitles(params?: { status?: TitleStatus; take?: number; skip?: number; from?: string; to?: string }) {
  return apiFetch<{ items: ArTitle[]; total: number; take: number; skip: number }>(`/ar-titles${toQueryString(params ?? {})}`)
}

export type ArTitleInput = {
  customerId?: string | null
  customerExternalId?: string | null
  issueDate: string
  dueDate: string
  paymentDate?: string | null
  amount: number
  openAmount: number
  paidAmount?: number | null
  discountReceived?: number | null
  interestReceived?: number | null
  status: TitleStatus
  documentNumber?: string | null
  notes?: string | null
  externalId?: string | null
}

export async function createArTitle(body: ArTitleInput) {
  return apiFetch<ArTitle>("/ar-titles", { method: "POST", body: JSON.stringify(body) })
}

export async function updateArTitle(id: string, body: Partial<ArTitleInput>) {
  return apiFetch<ArTitle>(`/ar-titles/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteArTitle(id: string) {
  return apiFetch<{ ok: true }>(`/ar-titles/${id}`, { method: "DELETE" })
}

export async function reconcileArTitleCustomers() {
  return apiFetch<{ updated: number; total: number }>("/ar-titles/reconcile-customers", { method: "POST" })
}

export type SaleItem = {
  id: string
  saleId: string
  externalId?: string | null
  productId?: string | null
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
  product?: Product | null
  sale?: Sale
}

export type PaymentMethod = {
  id: string
  companyId: string
  name: string
  externalId?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type SalePayment = {
  id: string
  saleId: string
  paymentMethodId?: string | null
  paymentMethod?: PaymentMethod | null
  externalPaymentMethodId?: string | null
  amount: number
  createdAt: string
}

export type Seller = {
  id: string
  companyId: string
  name: string
  externalId?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type Cashier = {
  id: string
  companyId: string
  name: string
  externalId?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type Sale = {
  id: string
  companyId: string
  customerId?: string | null
  customer?: Customer | null
  externalId?: string | null
  sellerId?: string | null
  seller?: Seller | null
  cashierId?: string | null
  cashier?: Cashier | null
  date: string
  total: number
  status?: string | null
  paymentMethodId?: string | null
  paymentMethod?: PaymentMethod | null
  payments?: SalePayment[]
  items: SaleItem[]
  createdAt: string
  updatedAt: string
}

export async function listSales(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: Sale[]; total: number; take: number; skip: number }>(`/sales${toQueryString(params ?? {})}`)
}

export type SaleItemInput = {
  id?: string
  productId?: string | null
  productExternalId?: string | null
  description?: string
  quantity?: number
  unitPrice?: number
}

export type SalePaymentInput = {
  paymentMethodId?: string | null
  paymentMethodExternalId?: string | null
  paymentMethodName?: string | null
  amount?: number
}

export type SaleInput = {
  customerId?: string | null
  customerExternalId?: string | null
  externalId?: string | null
  date?: string
  status?: string | null
  paymentMethodId?: string | null
  paymentMethodExternalId?: string | null
  sellerId?: string | null
  sellerExternalId?: string | null
  sellerName?: string | null
  cashierId?: string | null
  cashierExternalId?: string | null
  cashierName?: string | null
  items?: SaleItemInput[]
  payments?: SalePaymentInput[]
}

export async function createSale(body: SaleInput) {
  return apiFetch<Sale>("/sales", { method: "POST", body: JSON.stringify(body) })
}

export async function updateSale(id: string, body: SaleInput) {
  return apiFetch<Sale>(`/sales/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteSale(id: string) {
  return apiFetch<{ ok: true }>(`/sales/${id}`, { method: "DELETE" })
}

export async function listSaleItems(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: SaleItem[]; total: number; take: number; skip: number }>(`/sale-items${toQueryString(params ?? {})}`)
}

export async function listPaymentMethods(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: PaymentMethod[]; total: number; take: number; skip: number }>(`/payment-methods${toQueryString(params ?? {})}`)
}

export async function createPaymentMethod(body: { name: string; enabled?: boolean; externalId?: string | null }) {
  return apiFetch<PaymentMethod>("/payment-methods", { method: "POST", body: JSON.stringify(body) })
}

export async function updatePaymentMethod(id: string, body: Partial<PaymentMethod>) {
  return apiFetch<PaymentMethod>(`/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deletePaymentMethod(id: string) {
  return apiFetch<{ ok: true }>(`/payment-methods/${id}`, { method: "DELETE" })
}

export type PaymentMethodInput = {
  name: string
  enabled?: boolean
  externalId?: string | null
}

export async function upsertPaymentMethods(items: PaymentMethodInput[] | PaymentMethodInput) {
  return apiFetch<{ ok: true; created: number; updated: number }>(`/payment-methods`, {
    method: "POST",
    body: JSON.stringify(Array.isArray(items) ? { items } : items),
  })
}

export type SellerInput = {
  name: string
  externalId?: string | null
  active?: boolean
}

export async function listSellers(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: Seller[]; total: number; take: number; skip: number }>(`/sellers${toQueryString(params ?? {})}`)
}

export async function upsertSellers(items: SellerInput[] | SellerInput) {
  return apiFetch<{ ok: true; created: number; updated: number }>(`/sellers`, {
    method: "POST",
    body: JSON.stringify(Array.isArray(items) ? { items } : items),
  })
}

export async function updateSeller(id: string, body: Partial<SellerInput>) {
  return apiFetch<Seller>(`/sellers/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteSeller(id: string) {
  return apiFetch<{ ok: true }>(`/sellers/${id}`, { method: "DELETE" })
}

export type CashierInput = {
  name: string
  externalId?: string | null
  active?: boolean
}

export async function listCashiers(params?: { q?: string; take?: number; skip?: number }) {
  return apiFetch<{ items: Cashier[]; total: number; take: number; skip: number }>(`/cashiers${toQueryString(params ?? {})}`)
}

export async function upsertCashiers(items: CashierInput[] | CashierInput) {
  return apiFetch<{ ok: true; created: number; updated: number }>(`/cashiers`, {
    method: "POST",
    body: JSON.stringify(Array.isArray(items) ? { items } : items),
  })
}

export async function updateCashier(id: string, body: Partial<CashierInput>) {
  return apiFetch<Cashier>(`/cashiers/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteCashier(id: string) {
  return apiFetch<{ ok: true }>(`/cashiers/${id}`, { method: "DELETE" })
}
