#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

= Escribiendo en Typst

#figure(
  image("logo.svg", width: 20%),
  caption: [
    Esto es una caption 
  ]
) <logo>

Lo puedes ver en el @logo.


#diagram(cell-size: 15mm, $
	G edge(f, ->) edge("d", pi, ->>) & im(f) \
	G slash ker(f) edge("ur", tilde(f), "hook-->")
$)
