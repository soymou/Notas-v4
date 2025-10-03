// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSiteGraph from 'starlight-site-graph'
import remarkTypst from "./plugins/remark-typst.js";
import rehypeTypst from "./plugins/rehype-typst.js";
import starlightThemeGalaxy from 'starlight-theme-galaxy';
import starlightUtils from '@lorenzo_lewis/starlight-utils';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [
			remarkTypst
		],
		rehypePlugins: [rehypeTypst],
	},
	integrations: [
		starlight({
			plugins: [
				starlightSiteGraph(),
				starlightThemeGalaxy(),
				starlightUtils({
					multiSidebar: {
						switcherStyle: "horizontalList"
					}
				})
			],
			customCss: ['./src/style.css'],
			title: 'Junoy',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/soymou' }],
			sidebar: [
				{
					label: 'Teoría de tipos',
					autogenerate: { directory: 'tipos' },
				},
				{
					label: "Teoría de categorías",
					autogenerate: { directory: "categorias" },
				}
			],
		}),
		mdx(),
	],
	vite: {
		define: {
			process: { env: {} },
		},
	}
});
