// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"architecture.mdx": () => import("../content/docs/architecture.mdx?collection=docs"), "dex-aggregation.mdx": () => import("../content/docs/dex-aggregation.mdx?collection=docs"), "fees.mdx": () => import("../content/docs/fees.mdx?collection=docs"), "how-it-works.mdx": () => import("../content/docs/how-it-works.mdx?collection=docs"), "private-swaps.mdx": () => import("../content/docs/private-swaps.mdx?collection=docs"), "quick-start.mdx": () => import("../content/docs/quick-start.mdx?collection=docs"), "railgun-integration.mdx": () => import("../content/docs/railgun-integration.mdx?collection=docs"), "security.mdx": () => import("../content/docs/security.mdx?collection=docs"), "supported-assets.mdx": () => import("../content/docs/supported-assets.mdx?collection=docs"), "supported-networks.mdx": () => import("../content/docs/supported-networks.mdx?collection=docs"), "what-is-voiddex.mdx": () => import("../content/docs/what-is-voiddex.mdx?collection=docs"), }),
};
export default browserCollections;