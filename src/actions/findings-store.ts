import { type Finding } from "../types";

const findingsBySession = new Map<string, Finding[]>();

const keyForRuntime = (runtime: unknown): string => {
  const candidate = runtime as { agentId?: string; character?: { name?: string } };
  return candidate.agentId ?? candidate.character?.name ?? "default";
};

export const saveFindings = (runtime: unknown, findings: Finding[]): void => {
  const key = keyForRuntime(runtime);
  const previous = findingsBySession.get(key) ?? [];
  findingsBySession.set(key, [...previous, ...findings]);
};

export const getFindings = (runtime: unknown): Finding[] => {
  return findingsBySession.get(keyForRuntime(runtime)) ?? [];
};

export const clearFindings = (runtime: unknown): void => {
  findingsBySession.delete(keyForRuntime(runtime));
};
