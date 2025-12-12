export const SYSTEM_PROMPT = `You are a senior code reviewer specializing in Solana/blockchain development and Web3 applications.
Your task is to evaluate GitHub submissions against specific bounty requirements for Superteam Earn.

CRITICAL RULES:
1. ONLY reference code that actually exists in the provided context. Never invent file names, function names, or code.
2. If you cannot verify something, mark confidence as LOW and explain why in your response.
3. Be specific: cite exact file paths and line numbers when making claims about the code.
4. For Solana/Anchor code, check for common vulnerabilities:
   - Missing signer checks
   - Improper PDA validation
   - Arithmetic overflow/underflow
   - Missing account validation
   - Reentrancy vulnerabilities
5. Score conservatively: 70+ means genuinely good work, 90+ is exceptional and rare.

SCORING GUIDE:
- 0-30: Does not meet basic requirements or has critical issues
- 31-50: Partially meets requirements, significant gaps or major issues
- 51-70: Meets most requirements, some issues or missing elements
- 71-85: Meets all requirements well, minor improvements possible
- 86-100: Exceeds requirements, production-quality code

LABEL GUIDE:
- "high-quality": Score >= 75, no critical issues
- "excellent": Score >= 90, exceptional work
- "needs-review": Score 50-74 or has concerns worth human review
- "incomplete": Missing significant required features
- "security-concern": Has security issues that need addressing
- "potential-plagiarism": Code appears copied from common tutorials/templates without modification
- "needs-revision": Has issues that could be fixed with revisions

When evaluating Solana projects, pay special attention to:
- Proper use of Anchor framework (if applicable)
- Account structure and PDA design
- Error handling
- Test coverage for smart contracts
- Security best practices`;

export function buildUserPrompt(
  bountyTitle: string,
  bountyDescription: string,
  requirements: string[],
  techStack: string[],
  codeContext: {
    type: "repository" | "pr";
    fileTree: string;
    keyFiles: Array<{ path: string; language: string; content: string }>;
    diff?: string;
    prTitle?: string;
    prDescription?: string;
    commits?: Array<{ message: string }>;
  }
): string {
  const requirementsList = requirements
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");

  const keyFilesContent = codeContext.keyFiles
    .map(
      (f) => `
#### ${f.path}
\`\`\`${f.language}
${f.content.slice(0, 10000)}${f.content.length > 10000 ? "\n// ... truncated ..." : ""}
\`\`\``
    )
    .join("\n");

  let submissionSection = "";

  if (codeContext.type === "pr") {
    submissionSection = `
### Pull Request Information
**Title:** ${codeContext.prTitle || "N/A"}
**Description:** ${codeContext.prDescription || "No description provided"}

### Commits
${codeContext.commits?.map((c) => `- ${c.message}`).join("\n") || "No commits"}

### Changes (Diff)
\`\`\`diff
${codeContext.diff?.slice(0, 15000) || "No diff available"}${(codeContext.diff?.length || 0) > 15000 ? "\n// ... truncated ..." : ""}
\`\`\``;
  } else {
    submissionSection = `
### Repository Structure
\`\`\`
${codeContext.fileTree}
\`\`\``;
  }

  return `
## Bounty Information

### Title
${bountyTitle}

### Description
${bountyDescription}

### Specific Requirements to Verify
${requirementsList || "No specific requirements provided - evaluate general code quality"}

### Expected Tech Stack
${techStack.join(", ") || "Not specified"}

---

## Submission Details

**Type:** ${codeContext.type === "pr" ? "Pull Request" : "Full Repository"}

${submissionSection}

### Key Files Content
${keyFilesContent}

---

Analyze this submission thoroughly and provide a structured review. Remember to:
1. Verify each requirement against actual code
2. Check for security issues, especially in smart contract code
3. Evaluate code quality and best practices
4. Identify any red flags
5. Provide actionable feedback in the detailed notes`;
}
