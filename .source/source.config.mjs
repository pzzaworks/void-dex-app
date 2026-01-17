// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
var { docs, meta } = defineDocs({
  dir: "content/docs"
});
var source_config_default = defineConfig({
  mdxOptions: {
    rehypePlugins: [],
    remarkPlugins: [remarkMdxMermaid]
  }
});
export {
  source_config_default as default,
  docs,
  meta
};
