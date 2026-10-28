# Actividad R2 - Pablo Morell

## HealthySmile - Idea y objetivo
El objetivo de esta practica es hacer un software para animar a los niños a mirarse los dientes y tener una buena higiene bucodental

## Flujo de interacción
Cuando se abre la aplicación nos encontramos una tematica de halloween, ademas de un boton que nos pide permiso para acceder a la camara.
A partir de ese momento es necesario para abrir la boca y ver progreso, ya que con el paso del tiempo aparecen mas y mas particulas, como las burbujas, calabazas y fantasmas.

## Bibloteca usada para la detección de la cara.
Para la detección de la cara estuve barajando investigando con IA entre las diferentes posibilidades que existen como MediaPipe, ml5, tensowflow face Landmarks etc.
Finalmente me decante por mediapipe porque por su documentación y al ser desarrollada por google me dio mas confianza.

## Estetica
Para la estetica y colores use a la IA para que me listara los diferentes colores tipicos de halloween, a parte de eso la use como fuente de ideas, como por ejemplo usar particulas con forma de fantasmas o la propia calabaza.

## Conversión a Tauri
En mi caso la conversión a tauri no me resulto complicada, ya que he trabajado con tauri previamente para varios proyectos personales.

Para crear una aplicación con tauri, necesitamos node.js y rust.

Haciendo uso de la CLI y el comando ``` npx tauri init --ci --app-name PEC2_morell --window-title PEC2_morell --frontend-dist ../frontend``` podemos generar el proyecto.


## Contenido multimedia usado
Burbujas: https://freesound.org/people/Abacagi/sounds/497198/
Pocima bebiendo: https://freesound.org/people/Jamius/sounds/41529/
Calabaza: https://github.com/hfg-gmuend/openmoji/blob/master/color/svg/1F383.svg

