export interface Component {}

export type ComponentCtor<T extends Component = Component> = new (...args: never[]) => T;
