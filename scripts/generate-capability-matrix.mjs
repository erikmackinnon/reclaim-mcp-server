import { globSync, readFileSync, writeFileSync } from "node:fs";

function parseEndpointRegistry(filePath) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const endpoints = [];
  const policyNotes = {};

  const policyNotesBlockMatch = text.match(
    /EXCLUSION_POLICY_NOTES[\s\S]*?=\s*\{([\s\S]*?)\n\};/,
  );
  if (policyNotesBlockMatch) {
    const policyEntryRegex = /([a-z_]+)\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = policyEntryRegex.exec(policyNotesBlockMatch[1])) !== null) {
      policyNotes[match[1]] = match[2];
    }
  }

  let inEntry = false;
  let current = {};
  for (const line of lines) {
    if (/^  \{$/.test(line)) {
      inEntry = true;
      current = {};
      continue;
    }

    if (!inEntry) {
      continue;
    }

    let match;
    if ((match = line.match(/^    domain: "([^"]+)",/))) {
      current.domain = match[1];
    }
    if ((match = line.match(/^    pathTemplate: "([^"]+)",/))) {
      current.pathTemplate = match[1];
    }
    if ((match = line.match(/^    method: "([A-Z]+)",/))) {
      current.method = match[1];
    }
    if ((match = line.match(/^    mode: "([a-z]+)",/))) {
      current.mode = match[1];
    }
    if ((match = line.match(/^    isExcluded: (true|false),/))) {
      current.isExcluded = match[1] === "true";
    }
    if (
      (match = line.match(
        /^    exclusionCategory: (?:"([a-z_]+)"|undefined),/,
      ))
    ) {
      current.exclusionCategory = match[1] ?? null;
    }
    if ((match = line.match(/^      readOnly: (true|false),/))) {
      current.readOnly = match[1] === "true";
    }
    if ((match = line.match(/^      destructive: (true|false),/))) {
      current.destructive = match[1] === "true";
    }
    if ((match = line.match(/^      bulk: (true|false),/))) {
      current.bulk = match[1] === "true";
    }
    if ((match = line.match(/^      highRisk: (true|false),/))) {
      current.highRisk = match[1] === "true";
    }

    if (/^  },?$/.test(line)) {
      if (current.pathTemplate && current.method && current.mode) {
        endpoints.push(current);
      }
      inEntry = false;
      current = {};
    }
  }

  return { endpoints, policyNotes };
}

function parseTools() {
  const files = globSync("src/tools/*.ts").sort();
  const tools = [];

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const regex = /reclaimToolName\("([a-zA-Z0-9_]+)"\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tools.push({ name: `reclaim_${match[1]}`, file });
    }
  }

  return Array.from(new Map(tools.map((tool) => [tool.name, tool])).values())
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseResources() {
  const files = ["src/resources/tasks.ts", "src/resources/curated.ts"];
  const resources = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].includes("server.registerResource(")) {
        continue;
      }

      let internalName = null;
      let uri = null;
      for (let j = i + 1; j < Math.min(i + 14, lines.length); j += 1) {
        const line = lines[j].trim();
        const match = line.match(/^"([^"]+)"/);
        if (!match) {
          continue;
        }
        if (!internalName) {
          internalName = match[1];
          continue;
        }
        if (!uri) {
          uri = match[1];
          break;
        }
      }

      if (internalName && uri) {
        resources.push({ internalName, uri, file });
      }
    }
  }

  return resources.sort((a, b) => a.uri.localeCompare(b.uri));
}

function boolMark(value) {
  return value ? "yes" : "no";
}

function buildDomainRows(endpoints) {
  return [...new Set(endpoints.map((entry) => entry.domain))]
    .sort()
    .map((domain) => {
      const subset = endpoints.filter((entry) => entry.domain === domain);
      return {
        domain,
        typed: subset.filter((entry) => entry.mode === "typed").length,
        raw: subset.filter((entry) => entry.mode === "raw").length,
        excluded: subset.filter((entry) => entry.mode === "excluded").length,
        total: subset.length,
      };
    });
}

function buildExclusionCategoryRows(excludedEndpoints, policyNotes) {
  return [
    ...new Set(
      excludedEndpoints.map((entry) => entry.exclusionCategory ?? "uncategorized"),
    ),
  ]
    .sort()
    .map((category) => ({
      category,
      count: excludedEndpoints.filter(
        (entry) => (entry.exclusionCategory ?? "uncategorized") === category,
      ).length,
      note: policyNotes[category] ?? "No policy note found in registry constants.",
    }));
}

function sortEndpointSignatures(endpoints) {
  return [...endpoints].sort((a, b) =>
    `${a.domain}:${a.method}:${a.pathTemplate}`.localeCompare(
      `${b.domain}:${b.method}:${b.pathTemplate}`,
    ),
  );
}

function generateArtifacts() {
  const { endpoints, policyNotes } = parseEndpointRegistry(
    "src/endpoint-registry.ts",
  );
  const tools = parseTools();
  const resources = parseResources();

  const typedEndpoints = endpoints.filter((entry) => entry.mode === "typed");
  const rawEndpoints = endpoints.filter((entry) => entry.mode === "raw");
  const excludedEndpoints = endpoints.filter((entry) => entry.mode === "excluded");
  const typedTools = tools.filter((tool) => tool.name !== "reclaim_call_api");
  const rawTools = tools.filter((tool) => tool.name === "reclaim_call_api");
  const domains = buildDomainRows(endpoints);
  const exclusionCategoryRows = buildExclusionCategoryRows(
    excludedEndpoints,
    policyNotes,
  );

  const jsonArtifact = {
    generatedFrom: {
      endpointRegistry: "src/endpoint-registry.ts",
      toolsGlob: "src/tools/*.ts",
      resources: ["src/resources/tasks.ts", "src/resources/curated.ts"],
    },
    counts: {
      endpointsTotal: endpoints.length,
      typedEndpoints: typedEndpoints.length,
      rawEndpoints: rawEndpoints.length,
      excludedEndpoints: excludedEndpoints.length,
      toolsTotal: tools.length,
      typedTools: typedTools.length,
      rawFallbackTools: rawTools.length,
      resourcesTotal: resources.length,
    },
    domains,
    typedTools: typedTools.map((tool) => tool.name),
    rawTools: rawTools.map((tool) => tool.name),
    resources,
    typedEndpoints: sortEndpointSignatures(typedEndpoints),
    rawEndpoints: sortEndpointSignatures(rawEndpoints),
    excludedEndpoints: sortEndpointSignatures(excludedEndpoints),
    exclusionCategories: exclusionCategoryRows,
  };
  writeFileSync("CAPABILITY-MATRIX.json", JSON.stringify(jsonArtifact, null, 2));

  const lines = [];
  lines.push("# Capability Matrix");
  lines.push("");
  lines.push(
    "Generated from `src/endpoint-registry.ts`, `src/tools/*.ts`, `src/resources/tasks.ts`, and `src/resources/curated.ts`.",
  );
  lines.push("");
  lines.push("## Surface Summary");
  lines.push("");
  lines.push("| Surface | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Typed MCP tools | ${typedTools.length} |`);
  lines.push(`| Raw fallback MCP tools | ${rawTools.length} |`);
  lines.push(`| MCP resources | ${resources.length} |`);
  lines.push(`| Typed endpoint signatures | ${typedEndpoints.length} |`);
  lines.push(`| Raw-available endpoint signatures | ${rawEndpoints.length} |`);
  lines.push(`| Excluded endpoint signatures | ${excludedEndpoints.length} |`);
  lines.push(`| Total endpoint signatures in registry | ${endpoints.length} |`);
  lines.push("");
  lines.push("## Domain Coverage");
  lines.push("");
  lines.push("| Domain | Typed | Raw | Excluded | Total |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  for (const row of domains) {
    lines.push(
      `| ${row.domain} | ${row.typed} | ${row.raw} | ${row.excluded} | ${row.total} |`,
    );
  }
  lines.push("");
  lines.push("## Typed Resources");
  lines.push("");
  lines.push("| Resource URI | Internal Registration Name | Source |");
  lines.push("| --- | --- | --- |");
  for (const resource of resources) {
    lines.push(
      `| \`${resource.uri}\` | \`${resource.internalName}\` | \`${resource.file}\` |`,
    );
  }
  lines.push("");
  lines.push("## Typed Tools");
  lines.push("");
  lines.push("All typed tools are prefixed with `reclaim_`.");
  lines.push("");
  for (const tool of typedTools) {
    lines.push(`- \`${tool.name}\``);
  }
  lines.push("");
  lines.push("## Typed Endpoint Signatures");
  lines.push("");
  lines.push(
    "| Method | Path Template | Domain | Read Only | Destructive | Bulk | High Risk |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const endpoint of sortEndpointSignatures(typedEndpoints)) {
    lines.push(
      `| \`${endpoint.method}\` | \`${endpoint.pathTemplate}\` | ${endpoint.domain} | ${boolMark(endpoint.readOnly)} | ${boolMark(endpoint.destructive)} | ${boolMark(endpoint.bulk)} | ${boolMark(endpoint.highRisk)} |`,
    );
  }
  lines.push("");
  lines.push("## Raw Fallback Tool");
  lines.push("");
  for (const tool of rawTools) {
    lines.push(`- \`${tool.name}\``);
  }
  lines.push("");
  lines.push("## Raw-Available Endpoints");
  lines.push("");
  lines.push(
    "These endpoint signatures are callable only through `reclaim_call_api` after registry allowlist checks.",
  );
  lines.push("");
  lines.push(
    "| Method | Path Template | Domain | Read Only | Destructive | Bulk | High Risk |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const endpoint of sortEndpointSignatures(rawEndpoints)) {
    lines.push(
      `| \`${endpoint.method}\` | \`${endpoint.pathTemplate}\` | ${endpoint.domain} | ${boolMark(endpoint.readOnly)} | ${boolMark(endpoint.destructive)} | ${boolMark(endpoint.bulk)} | ${boolMark(endpoint.highRisk)} |`,
    );
  }
  lines.push("");
  lines.push("## Exclusion Categories");
  lines.push("");
  lines.push("| Category | Excluded Endpoints | Policy Note |");
  lines.push("| --- | ---: | --- |");
  for (const row of exclusionCategoryRows) {
    lines.push(`| \`${row.category}\` | ${row.count} | ${row.note} |`);
  }
  lines.push("");
  lines.push("## Excluded Endpoints");
  lines.push("");
  lines.push(
    "| Category | Method | Path Template | Domain | Read Only | Destructive | Bulk | High Risk |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const endpoint of [...excludedEndpoints].sort((a, b) =>
    `${a.exclusionCategory}:${a.domain}:${a.method}:${a.pathTemplate}`.localeCompare(
      `${b.exclusionCategory}:${b.domain}:${b.method}:${b.pathTemplate}`,
    ),
  )) {
    lines.push(
      `| \`${endpoint.exclusionCategory ?? "uncategorized"}\` | \`${endpoint.method}\` | \`${endpoint.pathTemplate}\` | ${endpoint.domain} | ${boolMark(endpoint.readOnly)} | ${boolMark(endpoint.destructive)} | ${boolMark(endpoint.bulk)} | ${boolMark(endpoint.highRisk)} |`,
    );
  }

  writeFileSync("CAPABILITY-MATRIX.md", `${lines.join("\n")}\n`);
}

generateArtifacts();
