import { beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Mock handlers for GitHub API
const handlers = [
  // Mock rate limit endpoint
  http.get("https://api.github.com/rate_limit", () => {
    return HttpResponse.json({
      resources: {
        core: { limit: 5000, remaining: 4999, reset: Date.now() / 1000 + 3600 },
      },
    });
  }),

  // Mock repo endpoint
  http.get("https://api.github.com/repos/:owner/:repo", ({ params }) => {
    return HttpResponse.json({
      name: params.repo,
      full_name: `${params.owner}/${params.repo}`,
      default_branch: "main",
      description: "Test repository",
    });
  }),

  // Mock tree endpoint
  http.get("https://api.github.com/repos/:owner/:repo/git/trees/:sha", () => {
    return HttpResponse.json({
      sha: "abc123",
      tree: [
        { path: "package.json", type: "blob" },
        { path: "src/index.ts", type: "blob" },
        { path: "README.md", type: "blob" },
      ],
    });
  }),

  // Mock languages endpoint
  http.get("https://api.github.com/repos/:owner/:repo/languages", () => {
    return HttpResponse.json({
      TypeScript: 5000,
      JavaScript: 1000,
    });
  }),

  // Mock content endpoint
  http.get("https://api.github.com/repos/:owner/:repo/contents/:path*", ({ params }) => {
    const rawPath = params.path;
    const pathStr: string = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath || "");
    const content = `// Mock content for ${pathStr}`;
    return HttpResponse.json({
      name: pathStr.split("/").pop() || "file",
      path: pathStr,
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
      type: "file",
    });
  }),

  // Mock PR endpoint
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:number", ({ params }) => {
    return HttpResponse.json({
      number: parseInt(params.number as string),
      title: "Test PR",
      body: "Test PR description",
      state: "open",
      base: { ref: "main" },
      head: { ref: "feature-branch" },
    });
  }),

  // Mock PR files endpoint
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:number/files", () => {
    return HttpResponse.json([
      {
        filename: "src/index.ts",
        status: "modified",
        additions: 10,
        deletions: 5,
        patch: "@@ -1,5 +1,10 @@\n+// New code",
      },
    ]);
  }),

  // Mock PR commits endpoint
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:number/commits", () => {
    return HttpResponse.json([
      {
        sha: "abc123",
        commit: {
          message: "Test commit",
          author: { name: "Test Author" },
        },
      },
    ]);
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
