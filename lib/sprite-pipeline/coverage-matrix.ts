export type CoverageDimension = {
  name: string;
  values: string[];
  minimumPerValue: number;
};

export type CoverageAssignment = {
  assetId: string;
  dimensions: Record<string, string>;
};

export type CoverageResult = {
  assignments: CoverageAssignment[];
  counts: Record<string, Record<string, number>>;
  deficits: string[];
};

function validateDimension(dimension: CoverageDimension): void {
  if (!/^[a-z][a-z0-9_-]*$/.test(dimension.name)) throw new Error(`Invalid dimension name: ${dimension.name}`);
  if (dimension.values.length === 0) throw new Error(`Dimension ${dimension.name} has no values`);
  if (new Set(dimension.values).size !== dimension.values.length) throw new Error(`Dimension ${dimension.name} contains duplicate values`);
  if (!Number.isInteger(dimension.minimumPerValue) || dimension.minimumPerValue < 0) {
    throw new Error(`Dimension ${dimension.name} has invalid minimumPerValue`);
  }
}

export function allocateCoverage(assetIds: string[], dimensions: CoverageDimension[]): CoverageResult {
  if (assetIds.length === 0) throw new Error("At least one asset ID is required");
  if (new Set(assetIds).size !== assetIds.length) throw new Error("Asset IDs must be unique");
  dimensions.forEach(validateDimension);
  if (new Set(dimensions.map((dimension) => dimension.name)).size !== dimensions.length) {
    throw new Error("Coverage dimension names must be unique");
  }

  const counts: Record<string, Record<string, number>> = {};
  for (const dimension of dimensions) {
    counts[dimension.name] = Object.fromEntries(dimension.values.map((value) => [value, 0]));
  }

  const assignments = assetIds.map((assetId, assetIndex) => {
    const selected: Record<string, string> = {};
    dimensions.forEach((dimension, dimensionIndex) => {
      const stride = dimension.values.length === 1 ? 1 : 1 + (dimensionIndex * 2);
      const value = dimension.values[(assetIndex * stride + dimensionIndex) % dimension.values.length];
      selected[dimension.name] = value;
      counts[dimension.name][value] += 1;
    });
    return { assetId, dimensions: selected };
  });

  const deficits: string[] = [];
  for (const dimension of dimensions) {
    for (const value of dimension.values) {
      const count = counts[dimension.name][value];
      if (count < dimension.minimumPerValue) {
        deficits.push(`${dimension.name}:${value} requires ${dimension.minimumPerValue}, assigned ${count}`);
      }
    }
  }

  return { assignments, counts, deficits };
}

export function assertCoverageComplete(result: CoverageResult): void {
  if (result.deficits.length > 0) throw new Error(`Coverage deficits:\n${result.deficits.join("\n")}`);
}
