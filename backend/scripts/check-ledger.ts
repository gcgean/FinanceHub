
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking last 5 ledger entries...");
  const entries = await prisma.bankLedgerEntry.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  console.log("Found:", entries.length);
  entries.forEach((e) => {
    console.log("ID:", e.id);
    console.log("Company:", e.company.name, "(", e.companyId, ")");
    console.log("Issue Date:", e.issueDate.toISOString());
    console.log("Created At:", e.createdAt.toISOString());
    console.log("Amount:", e.amount);
    console.log("-------------------");
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
