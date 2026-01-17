// @ts-nocheck
import { default as __fd_glob_11 } from "../content/docs/meta.json?collection=meta"
import * as __fd_glob_10 from "../content/docs/what-is-voiddex.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/supported-networks.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/supported-assets.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/security.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/railgun-integration.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/quick-start.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/private-swaps.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/how-it-works.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/fees.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/dex-aggregation.mdx?collection=docs"
import * as __fd_glob_0 from "../content/docs/architecture.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.doc("docs", "content/docs", {"architecture.mdx": __fd_glob_0, "dex-aggregation.mdx": __fd_glob_1, "fees.mdx": __fd_glob_2, "how-it-works.mdx": __fd_glob_3, "private-swaps.mdx": __fd_glob_4, "quick-start.mdx": __fd_glob_5, "railgun-integration.mdx": __fd_glob_6, "security.mdx": __fd_glob_7, "supported-assets.mdx": __fd_glob_8, "supported-networks.mdx": __fd_glob_9, "what-is-voiddex.mdx": __fd_glob_10, });

export const meta = await create.meta("meta", "content/docs", {"meta.json": __fd_glob_11, });