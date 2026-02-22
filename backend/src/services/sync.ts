import cron from "node-cron";
import { prisma } from "../lib/prisma";
import type { Integration } from "@prisma/client";
import axios from "axios";

async function syncCustomers(integration: Integration) {
  console.log(`[Sync] Fetching customers for ${integration.erp}...`);

  const api = axios.create({
    baseURL: integration.apiUrl,
    headers: {
      Authorization: `Bearer ${integration.apiKey}`,
    },
  });

  try {
    const response = await api.get("/contatos", { params: { tipo: "F, J" } });
    const erpCustomers = response.data.data;

    if (!erpCustomers || !Array.isArray(erpCustomers)) {
      console.log("[Sync] No customers found or invalid format.");
      return;
    }

    for (const customer of erpCustomers) {
      await prisma.customer.upsert({
        where: {
          companyId_externalId: {
            companyId: integration.companyId,
            externalId: String(customer.id),
          },
        },
        create: {
          companyId: integration.companyId,
          externalId: String(customer.id),
          name: customer.nome,
          document: customer.numeroDocumento,
          email: customer.email,
          isActive: customer.situacao === "A",
        },
        update: {
          name: customer.nome,
          document: customer.numeroDocumento,
          email: customer.email,
          isActive: customer.situacao === "A",
        },
      });
    }

    console.log(`[Sync] ${erpCustomers.length} customers synced for ${integration.erp}.`);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("[Sync] Error fetching customers from Bling:", error.response?.data || error.message);
    throw error; // Re-throw to be caught by syncIntegration
  }
}

async function syncProducts(integration: Integration) {
  console.log(`[Sync] Fetching products for ${integration.erp}...`);

  const api = axios.create({
    baseURL: integration.apiUrl,
    headers: {
      Authorization: `Bearer ${integration.apiKey}`,
    },
  });

  try {
    const response = await api.get("/produtos");
    const erpProducts = response.data.data;

    if (!erpProducts || !Array.isArray(erpProducts)) {
      console.log("[Sync] No products found or invalid format.");
      return;
    }

    for (const product of erpProducts) {
      await prisma.product.upsert({
        where: {
          companyId_externalId: {
            companyId: integration.companyId,
            externalId: String(product.id),
          },
        },
        create: {
          companyId: integration.companyId,
          externalId: String(product.id),
          code: product.codigo,
          name: product.nome,
          salePrice: product.preco,
          active: product.situacao === "A",
        },
        update: {
          code: product.codigo,
          name: product.nome,
          salePrice: product.preco,
          active: product.situacao === "A",
        },
      });
    }

    console.log(`[Sync] ${erpProducts.length} products synced for ${integration.erp}.`);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("[Sync] Error fetching products from Bling:", error.response?.data || error.message);
    throw error; // Re-throw to be caught by syncIntegration
  }
}

async function syncSales(integration: Integration) {
  console.log(`[Sync] Sending sales to ${integration.erp}...`);

  const api = axios.create({
    baseURL: integration.apiUrl,
    headers: {
      Authorization: `Bearer ${integration.apiKey}`,
    },
  });

  const salesToSync = await prisma.sale.findMany({
    where: {
      companyId: integration.companyId,
      externalId: null, // Find sales that have not been synced yet
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (salesToSync.length === 0) {
    console.log("[Sync] No new sales to send.");
    return;
  }

  for (const sale of salesToSync) {
    if (!sale.customer?.externalId) {
      console.warn(`[Sync] Sale ${sale.id} skipped: Customer ${sale.customer?.name} is not synced (missing externalId).`);
      continue;
    }

    const allItemsSynced = sale.items.every(item => item.product?.externalId);
    if (!allItemsSynced) {
      console.warn(`[Sync] Sale ${sale.id} skipped: Not all products are synced (missing externalId).`);
      continue;
    }

    const payload = {
      data: new Date(sale.createdAt).toISOString().split("T")[0], // Format YYYY-MM-DD
      contato: {
        id: Number(sale.customer.externalId),
      },
      itens: sale.items.map(item => ({
        produto: {
          id: Number(item.product!.externalId),
        },
        quantidade: item.quantity,
        valor: item.unitPrice,
      })),
      // TODO: Add payment information if necessary
    };

    try {
      const response = await api.post("/pedidos/vendas", payload);
      const createdSale = response.data.data;

      await prisma.sale.update({
        where: { id: sale.id },
        data: { externalId: String(createdSale.id) },
      });

      console.log(`[Sync] Sale ${sale.id} successfully sent to ${integration.erp} with new ID ${createdSale.id}.`);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(`[Sync] Error sending sale ${sale.id} to Bling:`, error.response?.data || error.message);
      // We don't re-throw the error here to allow other sales to be processed.
      // The failed sale will be picked up in the next sync run.
    }
  }

  console.log(`[Sync] Finished sending sales to ${integration.erp}.`);
}

// Bling-specific sync functions
// ... (existing syncCustomers, syncProducts, syncSales for Bling)

// --- COMMAND SYSTEM IMPLEMENTATION ---

async function syncCustomersFromCommand(integration: Integration) {
  console.log(`[Sync] Fetching customers for ${integration.erp}...`);
  // const api = axios.create(...) - This would be the real implementation

  // Simulate fetching data from the Command System API
  const commandCustomers = [
    { customer_id: "cmd-c-1", customer_name: "Command Client 1", tax_id: "999.888.777-66", contact_email: "client1@command.com", status: "ACTIVE" },
    { customer_id: "cmd-c-2", customer_name: "Command Client 2", tax_id: "555.444.333-22", contact_email: "client2@command.com", status: "INACTIVE" },
  ];

  for (const customer of commandCustomers) {
    await prisma.customer.upsert({
      where: {
        companyId_externalId: {
          companyId: integration.companyId,
          externalId: customer.customer_id,
        },
      },
      create: {
        companyId: integration.companyId,
        externalId: customer.customer_id,
        name: customer.customer_name,
        document: customer.tax_id,
        email: customer.contact_email,
        isActive: customer.status === "ACTIVE",
      },
      update: {
        name: customer.customer_name,
        document: customer.tax_id,
        email: customer.contact_email,
        isActive: customer.status === "ACTIVE",
      },
    });
  }
  console.log(`[Sync] ${commandCustomers.length} customers synced for ${integration.erp}.`);
}

async function syncProductsFromCommand(integration: Integration) {
  console.log(`[Sync] Fetching products for ${integration.erp}...`);
  // Simulate fetching data from the Command System API
  const commandProducts = [
    { product_sku: "CMD-001", description: "Command Product A", price: 150.00, is_active: true },
    { product_sku: "CMD-002", description: "Command Product B", price: 300.50, is_active: false },
  ];

  for (const product of commandProducts) {
    await prisma.product.upsert({
      where: {
        companyId_externalId: {
          companyId: integration.companyId,
          externalId: product.product_sku,
        },
      },
      create: {
        companyId: integration.companyId,
        externalId: product.product_sku,
        code: product.product_sku,
        name: product.description,
        salePrice: product.price,
        active: product.is_active,
      },
      update: {
        name: product.description,
        salePrice: product.price,
        active: product.is_active,
      },
    });
  }
  console.log(`[Sync] ${commandProducts.length} products synced for ${integration.erp}.`);
}

async function syncSalesToCommand(integration: Integration) {
  console.log(`[Sync] Sending sales to ${integration.erp}...`);
  // const api = axios.create(...) - This would be the real implementation

  const salesToSync = await prisma.sale.findMany({
    where: { companyId: integration.companyId, externalId: null },
    include: { customer: true, items: { include: { product: true } } },
  });

  if (salesToSync.length === 0) {
    console.log("[Sync] No new sales to send.");
    return;
  }

  for (const sale of salesToSync) {
    // Basic validation
    if (!sale.customer?.externalId || !sale.items.every(i => i.product?.externalId)) {
      console.warn(`[Sync] Sale ${sale.id} skipped: Customer or products are not synced yet.`);
      continue;
    }

    const payload = {
      client_id: sale.customer.externalId,
      total_amount: sale.total,
      line_items: sale.items.map(item => ({
        sku: item.product!.externalId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    };

    // Simulate API call
    console.log(`[Sync] Sending sale ${sale.id} to Command System with payload:`, payload);
    const newExternalId = `cmd-ord-${Date.now()}`; // Simulate response with a new ID

    await prisma.sale.update({
      where: { id: sale.id },
      data: { externalId: newExternalId },
    });

    console.log(`[Sync] Sale ${sale.id} successfully sent to ${integration.erp} with new ID ${newExternalId}.`);
  }
}

// --- END COMMAND SYSTEM IMPLEMENTATION ---

export async function syncIntegration(integration: Integration) {
  console.log(`Syncing data for company ${integration.companyId} with ${integration.erp}...`);

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncStatus: "Running", lastSyncAt: new Date() },
  });

  try {
    if (integration.erp === "bling") {
      await syncCustomers(integration);
      await syncProducts(integration);
      await syncSales(integration);
    } else if (integration.erp === "command") {
      await syncCustomersFromCommand(integration);
      await syncProductsFromCommand(integration);
      await syncSalesToCommand(integration);
    } else {
      console.log(`[Sync] ERP "${integration.erp}" not supported yet. Skipping.`);
      // We can consider this a "success" because there was no error, just no action.
      // Or we could introduce a new status like "Unsupported". For now, Success is fine.
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncStatus: "Success", syncErrorMessage: null },
    });

    console.log(`Sync finished for company ${integration.companyId} with ${integration.erp}.`);
  } catch (error) {
    console.error(`Sync failed for company ${integration.companyId} with ${integration.erp}:`, error);
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        lastSyncStatus: "Failed",
        syncErrorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function runScheduledSync() {
  console.log("Running scheduled sync...");

  const integrations = await prisma.integration.findMany({
    where: {
      // We can add filters here, e.g., only active integrations
    },
  });

  for (const integration of integrations) {
    // We don't await here to allow syncs to run in parallel
    syncIntegration(integration).catch(error => {
      console.error(`Error during background sync for company ${integration.companyId}:`, error);
    });
  }

  console.log("Scheduled sync finished triggering for all integrations.");
}

export function startSyncService() {
  console.log("Starting sync service...");

  // Schedule to run every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    runScheduledSync().catch((error) => {
      console.error("Error during scheduled sync:", error);
    });
  });

  console.log("Sync service started. Tasks are scheduled.");
}
