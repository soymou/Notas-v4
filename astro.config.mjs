// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSiteGraph from 'starlight-site-graph'
import remarkTypst from "./plugins/remark-typst.js";
import rehypeTypst from "./plugins/rehype-typst.js";
import catppuccin from '@catppuccin/starlight';
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
				catppuccin(),
				starlightUtils({
					multiSidebar: {
						switcherStyle: "dropdown"
					}
				})
			],
			customCss: ['./src/style.css'],
			head: [
				{
					tag: 'script',
					attrs: {
						src: '/scripts/dropdown-arrow.js',
					},
				},
			],
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
