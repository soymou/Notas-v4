= Set rules
Como vimos antes, Typst tiene funciones que insertan contenido y otras que lo manipulan.
Con las *set rules*, podemos aplicar propiedades de estilo a todas las ocurrencias de un 
cierto tipo de contenido. Escribimos las set rules con la palabra clave `set` seguida 
por el nombre de la función cuyas propiedades vamos a cambiar y una lista de argumentos 
entre paréntesis.

```typst
#set text(
  font: "New computer Modern"
)
```
#set text(
  font: "New Computer Modern",
)

== Nueva fuente
Esta es la nueva fuente que utilizamos.

= Configurar la página
Cuando usamos las set rules, escogemos la función dependiendo del tipo de elemento al que 
queremos darle estilo. Aquí hay una lista de funciones que se usan comúnmente con las 
set rules:

- text:  Para poner la familia de fuente, tamaño, color y otras propiedades del texto.
- page: Para el tamaño, márgenes, headers, columnas y footers de la página.
- par: Para justificar párrafos, poner el espaciado de líneas y demás.
- heading: Para la apariencia de los headings y habilitar numeración. 
- document: Para poner meta-datos en el PDF, como el título o el autor.

En general sólo los parámetros que le dicen a una función cómo hacer algo, no los que le 
dice qué hacer con ello.

Digamos que queremos márgenes más grandes y una fuente serif. 

```typst 
#set page(
  paper: "a6",
  margin: (x: 1.8cm, y: 1.5cm),
)
#set text(
  font: "New Computer Modern",
  size: 10pt
)
#set par(
  justify: true,
  leading: 0.52em,
)
```

#set page(
  paper: "a6",
  margin: (x: 1.8cm, y: 1.5cm),
)

#set text(
  font: "New Computer Modern",
  size: 10pt,
)

#set par(
  justify: true,
  leading: 0.52em,
)

= Introduction
In this report, we will explore the various factors that influence fluid
dynamics in glaciers and how they contribute to the formation and
behaviour of these natural structures.

#align(center + bottom)[
  #image("Images/logo.svg", width: 70%)
  * Los glaciares forman una parte importante del sistema climático de la tierra.*
]

#set page(
  paper: "us-letter",
  margin: (x: 1.8cm, y: 1.5cm),
)

= Sofisticación
Si queremos numerar los heading podemos usar el parámetro `numbering` de la función 
`heading`

```typst
#set heading(numebering: "1.")
```

#set heading(numbering: "1.")

= Introducción 
#lorem(10)

== Background
#lorem(12)

== Métodos
#lorem(15)

Especificamos el string "1." como el parámetro de numeración. Esto le dice a Typst 
para numerar los headings con números arábigos y puntos entre cada nivel. También podemos
usar letras, números romanos y símbolos.

```typst
#set heading(numbering: "1.a")
```

#set heading(numbering: "1.a")

= Introduction
#lorem(10)

== Background
#lorem(12)

== Methods
#lorem(15)

#set heading(numbering: none)

== Show rules
Con las show rules podemos redefinir cómo muestra Typst ciertos elementos.

```typst
#show "ArtosFlow": name => box[
  #box(image(
    "Images/logo.svg",
    height: 1em,
  ))
  #name
]
```
#show "ArtosFlow": name => box[
  #box(image(
    "Images/logo.svg",
    height: 1em
))
  #name
]

Este reporte esta en el proyecto ArtosFlow.

Escribimos la palabra clave `show` seguida de una cadena de texto que queremos mostrar 
de manera diferente y unos dos puntos. Luego, escribimos una función que toma el contenido
que se va a mostrar como un argumento al que en este ejemplo llamamos `name`.
Ahora podemos usar la variable `name` en el cuerpo de la función para imprimir 
"ArtosFlow". Nuestra show rule agrega el logo al principio y pone el resultado en una box
para prevenir el salto de línea y la imagen está en su propia caja para que no aparezca en
un párrafo nuevo.
