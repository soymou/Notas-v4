
= Headings
Typst usa markup simple para la mayoría de tareas de formateo de documentos. Para 
añadir un titular usamos el caracter `=` y, para enfatizar un texto con itálicas lo
encerramos entre `_`.

```typst
= Introducción
Esta es la introducción
```
= Introducción

Para añadir un nuevo párrafo, simplemente añadimos una línea en blanco entre dos líneas 
de texto. Si el párrafo necesita un sub-titular podemos escribir `==` en lugar de `=`. 
El número de caracteres `=` determina el nivel del titular.

También podemos escribir listas numeradas. Para cada elemento de la lista usamos un `+`
al principio de la línea. Typst automáticamente numera los elementos:

```typst
+ El clima
+ La topografía
+ La geología
```

+ El clima
+ La topografía
+ La geología

Si queremos una lista con bullets usamos el caracter `-` en lugar de `+`. Podemos también 
anidar listas:

```typst
+ El clima 
  - Temperatura
  - Precipitación
+ La topografía
+ La geología 
```

+ El clima 
  - Temperatura
  - Precipitación
+ La topografía
+ La geología 

== Añadir figuras
Typst reserva los símbolos de markup solamente para las cosas más comunes. Lo demás se 
inserta usando funciones. Para que mostremos una imagen en nuestra página usamos la función
`image`:

```typst
#image("Images/logo.svg")
```

En general, una función produce una salida dado un conjunto de argumentos. Cuando 
llamamos una función en markup, le damos argumentos y Typst inserta el resultado en el
documento. En nuestro caso, la función `image` toma un argumento: el path a nuestro archivo.
Para llamar una función en markup, primero necesitamos escribir el símbolo `#` seguido del
nombre de la función. Después, encerramos los argumentos entre paréntesis.

La imagen insertada usa todo el ancho de nuestro documento. Para cambiar esto, podemos pasar
el argumento `width` a la función `image`. Este es un argumento con nombre y se especifica 
como una pareja `name: value`. Si hay múltiples argumentos, estos se separan con comas.

```typst
#image("Images/logo.svg", width: 50%)
```

#image("Images/logo.svg", width: 50%)


El argumento `width` es una *longitud relativa*. En nuestro caso, la especificamos con un 
porcentaje de la página. También podríamos haber usado un valor absoluto como `1cm` o
`0.7in`. 
Como el texto, la imagen está alineada a la izquierda de la página por defecto. También le 
falta una caption. Lo podemos arreglar con la función `figure`. Esta función toma 
el contenido como argumento posicional y una caption opcional como un argumento nombrado.

Dentro de la lista de argumentos de la función `figure`, Typst ya está en modo código. Esto 
significa que ya no necesitamos el `#` antes de llamar una función. El caption consiste 
de markup arbitrario. Para darle markup a una función hay que encerrarlo entre paréntesis 
cuadrados. A esta construcción se le llama un *content block*.


```typst
#figure(
  image("Images/logo.svg"),
  caption: [Esta es una _caption_]
)
```

#figure(
  image("Images/logo.svg", width: 50%),
  caption: [Esta es una _caption_]
) <glaciar>



