// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkTypst from "./plugins/remark-typst.js";
import rehypeTypst from "./plugins/rehype-typst.js";
import starlightThemeObsidian from 'starlight-theme-obsidian'
import starlightUtils from '@lorenzo_lewis/starlight-utils';
import mdx from '@astrojs/mdx';
import { typst } from 'astro-typst';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [
			remarkTypst
		],
		rehypePlugins: [
			rehypeTypst,
		],
	},
	integrations: [
		starlight({
			plugins: [
				starlightThemeObsidian(),
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
					collapsed: true,
					autogenerate: { directory: 'tipos' },
				},
				{
					label: "Teoría de categorías",
					collapsed: true,
					autogenerate: { directory: "categorias" },
				},
				{
					label: "Typst",
					collapsed: true,
					autogenerate: { directory: "typst" },
				}
			],
		}),
		mdx(),
		typst({
			options: {
				remPx: 14,
			},
			target: (id) => {
				console.debug(`Detecting ${id}`);
				if (id.endsWith('.html.typ') || id.includes('/html/'))
					return "html";
				return "svg";
			},
		}),
	],
	vite: {
		define: {
			process: { env: {} },
		},
	}
});
