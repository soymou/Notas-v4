// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkTypst from "./plugins/remark-typst.js";
import { remarkExecutableCode } from "./src/plugins/remark-executable-code.js";
import { remarkCodeOutput } from "./src/plugins/remark-code-output.js";
import remarkLatexUnicode from "./src/plugins/remark-latex-unicode.js";
import rehypeTypst from "./plugins/rehype-typst.js";
import starlightThemeObsidian from 'starlight-theme-obsidian'
import starlightUtils from '@lorenzo_lewis/starlight-utils';
import mdx from '@astrojs/mdx';
import { typst } from 'astro-typst';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [
			remarkTypst,
			remarkLatexUnicode,
			remarkExecutableCode,
			remarkCodeOutput
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
				{
					tag: 'script',
					attrs: {
						src: '/scripts/add-code-headers.js',
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
          label: "Lógica categórica",
          collapsed: true,
          autogenerate: { directory: "logica-categorica" },
        },
				{
					label: "Nix",
					collapsed: true,
					autogenerate: { directory: "nix" },
				},
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
