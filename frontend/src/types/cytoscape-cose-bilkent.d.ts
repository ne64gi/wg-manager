declare module "cytoscape-cose-bilkent" {
  import type cytoscape from "cytoscape";

  const plugin: (cy: typeof cytoscape) => void;
  export default plugin;
}
