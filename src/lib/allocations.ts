import { Project, StoreData } from "@/lib/types";

export function projectAllocationUserIds(store: StoreData, projectId: string) {
  return store.projectAllocations
    .filter((allocation) => allocation.projectId === projectId)
    .map((allocation) => allocation.colaboradorId);
}

export function isProjectAllocatedToUser(
  store: StoreData,
  projectId: string,
  colaboradorId: string,
) {
  return store.projectAllocations.some(
    (allocation) =>
      allocation.projectId === projectId &&
      allocation.colaboradorId === colaboradorId,
  );
}

export function sortProjectsByAllocation(
  projects: Project[],
  store: StoreData,
  colaboradorId: string,
) {
  return [...projects].sort((first, second) => {
    const firstAllocated = isProjectAllocatedToUser(store, first.id, colaboradorId);
    const secondAllocated = isProjectAllocatedToUser(store, second.id, colaboradorId);

    if (firstAllocated !== secondAllocated) return firstAllocated ? -1 : 1;
    return first.nome.localeCompare(second.nome, "pt-BR");
  });
}
