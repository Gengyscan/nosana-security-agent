import { type Plugin } from "@elizaos/core";
import { scanRepoAction } from "./actions/scan-repo";
import { analyzeCodeAction } from "./actions/analyze-code";
import { summarizeFindingsAction } from "./actions/summarize";
import { securityContextProvider } from "./providers/security-context";

export const securityReconPlugin: Plugin = {
  name: "security-recon-plugin",
  description: "Security reconnaissance plugin for repository and code analysis.",
  actions: [scanRepoAction, analyzeCodeAction, summarizeFindingsAction],
  providers: [securityContextProvider],
  evaluators: [],
};

export default securityReconPlugin;
