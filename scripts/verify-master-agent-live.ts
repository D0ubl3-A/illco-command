const baseUrl = (process.argv[2] || process.env.MASTER_AGENT_BASE_URL || "https://illco-command.vercel.app").replace(/\/+$/, "");

type CatalogResponse = {
  ok?: boolean;
  catalog?: Array<{
    productId?: string;
    offerId?: string | null;
    detailsHref?: string;
    openHref?: string | null;
  }>;
};

async function requireOk(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response;
}

async function main() {
  await requireOk("/master-agent");
  const catalogResponse = await requireOk("/api/master-agent?catalog=all");
  const catalog = (await catalogResponse.json()) as CatalogResponse;
  if (!catalog.ok || !Array.isArray(catalog.catalog)) {
    throw new Error("Master Agent catalog did not return a valid JSON payload.");
  }
  if (catalog.catalog.length < 100) {
    throw new Error(`Master Agent catalog is too small: ${catalog.catalog.length}`);
  }
  const unsafeLockedOpen = catalog.catalog.find((item) => item.openHref && !item.detailsHref);
  if (unsafeLockedOpen) {
    throw new Error(`Catalog item ${unsafeLockedOpen.productId || unsafeLockedOpen.offerId || "unknown"} has an unsafe open route.`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        catalogItems: catalog.catalog.length,
        offers: catalog.catalog.filter((item) => item.offerId).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
