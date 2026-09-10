import type { ResourceDefinition } from "./ResourceDefinition";

export interface ItemDefinition extends ResourceDefinition {
  readonly stackable: boolean;
}
