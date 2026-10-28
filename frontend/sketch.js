/**
    El workflow, al abrir la aplicación, conectamos con el cdn de mediapipe para descargar lo mas rapido posible este JS ademas de cargar las imagenes y sonido, entre otras cosas como dibujar los botones etc. No me espero a tener el permiso del usuario de la camara ya que presuponemos que lo vamos a tener y asi no hacemos esperar al usuario.


    Una vez tenermos el permiso detecto la camara y mediapipe ya descargado y listo, detectamos la cara. Si la detectamos, intentamos identificar los labios y fijamos 4 puntos.

    Cuando detectamos que la boca esta abierta en funcion de las ditancia de los puntos anteriores, a continuación comenzamos a generar las burbujas, sonidos y temporizadores.
    Cuando se alcanzan 20 segundos con la boca abierta, se activa el sonido para dar la poción por terminada.


    Cuando se cierra la boca, se actualizan los marcadores de record en caso de ser necesario y se reinician los diferentes efectos.

 */

//Variables iniciales
let camara;
let camara_ancho = 960;
let camara_alto = 540;
let boton_inicio;
let texto_bienvenida;
let detector_cara;
let camara_lista = false;
let error_mediapipe = false;
let fotograma;
let ultimo_fotograma = -1;
let resultado_cara;
let segundo_anterior = 0;
let seguncos_boca_abierta = 0;
let segundos_boca_abiertos_maximo = 0;
let progreso = 0;
let contedor_burbujas = [];
let imagen_calabaza;
let sonido_burbujas;
let sonido_pocima;
let burbujas_sonando = false;
let pocima_reproducida = false;

async function setup() {
    // Creamos el texto de bienvenida
    createElement("h1", "Bienvenido a HealthySmile, vamos a prepararnos para Halloween");
    texto_bienvenida = createP(
        "Pulsa en Activar el espejo magico para iniciar el juego"
    );

    //Creamos el boton
    boton_inicio = createButton("Activar el espejo magico");
    //cuando se pulsa el boton, se llama a la funcion que solicita acceso a la camara
    boton_inicio.mousePressed(iniciarCamara);

    // creamos el canvas aunque no tengamos todavia acceso a la camara
    createCanvas(camara_ancho, camara_alto);

    // La detección y el dibujo usarán la misma imagen.
    fotograma = createGraphics(camara_ancho, camara_alto);
    fotograma.pixelDensity(1);

    // ademas nada mas entrar ya empezamos a descargar los ficheros de los cdn
    configurarMediaPipe();

    imagen_calabaza = await loadImage("assets/calabaza.svg");

    sonido_burbujas = new Audio("assets/burbujas_explotando.mp3");
    sonido_burbujas.loop = true;
    sonido_burbujas.volume = 0.2;

    sonido_pocima = new Audio("assets/pocima_bebiendo.mp3");
    sonido_pocima.volume = 0.6;

}




function draw() {
    background("#281B38");

    if (!camara_lista) return; // Esperamos a que la cámara esté activada.

    const video = camara.elt; //Obtiene el elmento html camara para poder analizarlo con mediapipe

    /*
        Como draw se ejecuta constatemente, comparo la imagen anterior con la actual en caso de ser igual no se analiza
    */
    if (video.currentTime !== ultimo_fotograma) {
        fotograma.drawingContext.drawImage(
            video, 0, 0, fotograma.width, fotograma.height
        );

        //Se mira si el modelo ya ha terminado de cargar
        if (detector_cara) {
            //detectForVideo es la funcion que analiza la imagen y devuleve los puntos de la cara
            resultado_cara = detector_cara.detectForVideo(
                fotograma.canvas, performance.now()
            );

            if (resultado_cara.faceLandmarks.length > 0) { //Cuando se detecta la cara se informa
                texto_bienvenida.html("Cara detectada")
            } else {
                texto_bienvenida.html("Ponte frente al espejo para ver tu sonrisa") //Cuando no se detecta cara se informa tambien
            }
        }

        ultimo_fotograma = video.currentTime;
    }

    image(fotograma, 0, 0, width, height);

    push();
    translate(width, 0);
    scale(-1, 1); //Para que se vea en modo espejo la camara
    image(fotograma, 0, 0, width, height);

    if (resultado_cara && resultado_cara.faceLandmarks.length > 0) {
        const puntos = resultado_cara.faceLandmarks[0];
        dibujarPuntosCara(puntos);
        dibujar_burbujas();
    }

    /* Paras las burbujas me he apoyado en chatgpt de la siguiente manera.
    1º 
    2º Me sugiero dividor este en tres funciones diferentes para delegar la responsabilidad

    */


    pop(); // Recupera la configuración anterior.
}

function dibujarPuntosCara(puntos) {

    //https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/face_landmarker/face_landmarks_connections.ts#L20
    //En la linea 20 de ese repositorio aparecen todos los puntos de la boca, he preguntado a chatgpt cuales son los puntos correspondientes a la comisura
    const indice_boca = {
        superior: puntos[13],
        inferior: puntos[14],
        comisura1: puntos[61],
        comisura2: puntos[291]
    };

    noStroke();
    fill(0, 255, 150);

    //creamos los cirulos en los puntos
    /*for (const punto of Object.values(indice_boca)) {
        const x = punto.x * width;
        const y = punto.y * height;
        circle(x, y, 6);
    }*/

    /*
    Es importante saber que mediapipe devuelve los datos entre 0 y 1
    y como nosotros los queremos en pixeles de nuestro canvas, lo que hacemos
    es multiplicarlo por el ancho y el ato de nuestro canvas
    */

    //aqui obtenemos la distancia entre el labio superior e inferior
    const apertura_boca = dist(
        indice_boca.superior.x * width, indice_boca.superior.y * height,
        indice_boca.inferior.x * width, indice_boca.inferior.y * height
    );

    //aqui obtenemos la distancia entre las comisuras
    const ancho_boca = dist(
        indice_boca.comisura1.x * width, indice_boca.comisura1.y * height,
        indice_boca.comisura2.x * width, indice_boca.comisura2.y * height
    );

    //aqui obtenemos el centro de la boca y lo guardamos con la función crateVector, que permite guardar los puntos x e y
    //https://p5js.org/reference/p5/createVector/
    //Esto luego se usa para obtener la posición de la boca con centro_boca.x e .y
    const centro_boca = createVector(
        ((indice_boca.superior.x + indice_boca.inferior.x) / 2) * width,
        ((indice_boca.superior.y + indice_boca.inferior.y) / 2) * height
    )

    /* 
    Aqui hice uso de chatgpt, ya que no conseguia encontrar el como detectar que la boca esatuviese abierta.
    Y me enseño que como punto de referencia necesitaba la distancia entre la comisura de los labios,
    para asi tener como referencia el tamaño de la boca y poder identifica en que porcentaje esta abierta o cerrada.

    Aunque se puede hacer ancho_boca > 20, que fue mi idea inicial, esto daba problemas segun como de cerca o lejos este de la camara
    */
    if (apertura_boca > ancho_boca * 0.2) {

        //La idea es generar cuanto mas tiempo tengas mas burbujas
        progreso = constrain(seguncos_boca_abierta / 20, 0, 1);
        const intervalo_boca = floor(lerp(16, 4, progreso));

        if (frameCount % intervalo_boca === 0) {
            const lugar = random(0.25, 0.75);

            const x = lerp(
                indice_boca.comisura1.x,
                indice_boca.comisura2.x,
                lugar
            ) * width;

            const y = lerp(
                indice_boca.comisura1.y,
                indice_boca.comisura2.y,
                lugar
            ) * height;

            crear_burbuja(x, y);
        }

        if (frameCount % 15 === 0) {
            crear_burbuja(random(width), random(height));
        }

        if (!burbujas_sonando) {
            sonido_burbujas.play();
            burbujas_sonando = true;
        }

                if (seguncos_boca_abierta >= 20 && !pocima_reproducida) {
            sonido_pocima.play();
            pocima_reproducida = true;
        }



        /*
        Como aprendimos en la practica anterior draw se ejecuta muchas veces por segundo, entonces para solo sumar un segundo 
        cuando la boca este abierta, miramos que el segundo anterior sea diferente al actual para sumar
        */
        if (segundo_anterior != second()) { // en caso se ser diferente
            seguncos_boca_abierta++; // se suma 1
            segundo_anterior = second(); // se actualiza el segundo
            if (seguncos_boca_abierta > segundos_boca_abiertos_maximo) { // se mira si es el record para actualizarlo
                segundos_boca_abiertos_maximo = seguncos_boca_abierta; // se actualiza el record
            }
        }
        
        let mensaje = "Estamos haciendo magia por halloween";

        if (seguncos_boca_abierta >= 20){
            mensaje = "Pocion terminada, manten la boca abierta para mejorar el hechizo";
        }

        texto_bienvenida.html(
            mensaje + "<br>" +
            "Tiempo: " + seguncos_boca_abierta + " segundos · " +
            "Tu mejor hechizo: " + segundos_boca_abiertos_maximo + " segundos"
        );



    } else { // la boca tiene un ancho menor a 0.2
        seguncos_boca_abierta = 0; //se reiniciar el contador de segundos
        contedor_burbujas = [];
        sonido_burbujas.pause();
        sonido_burbujas.currentTime = 0;

        sonido_pocima.pause();
        sonido_pocima.currentTime = 0;

        burbujas_sonando = false;
        pocima_reproducida = false;
        texto_bienvenida.html(
            "Abre la boca para activar la espuma antimonstruos.<br>" +
            "Tu mejor hechizo: " + segundos_boca_abiertos_maximo + " segundos"
        );
    }
}

function crear_burbuja(x, y) {
    //para no saturar vamos a generar un maximo de 200 burbujas
    if (contedor_burbujas.length >= 200) return;

    const tipo_burburja = random(1);

    contedor_burbujas.push({
        posicion: createVector(x, y),
        ruido: random(0, 1000),
        calabaza: tipo_burburja < 0.15,
        fantasma: tipo_burburja >= 0.15 && tipo_burburja < 0.4
    })
}

function dibujar_burbujas() {
    push();
    blendMode(SCREEN);
    noStroke();

    //colores a los que cambia la bola
    const color1 = color(180, 100, 255, 220);
    const color2 = color(80, 255, 160, 220);
    //fijamos el color de la bola con lerp para mezclarlo
    fill(lerpColor(color1, color2, progreso))

    contedor_burbujas.forEach((burbuja) => {
        const desplazamiento = map(
            noise(burbuja.ruido + frameCount * 0.01),
            0, 1,
            -40, 40
        );

        const x = burbuja.posicion.x + desplazamiento;
        const y = burbuja.posicion.y;

        if (burbuja.calabaza) {
            if (imagen_calabaza) {
                push();
                blendMode(BLEND);

                image(
                    imagen_calabaza,
                    x - 14,
                    y - 14,
                    28,
                    28
                );

                pop();
            }
        } else {
            const tamano = burbuja.fantasma ? 24 : 15;
            circle(x, y, tamano);

            if (burbuja.fantasma) {
                push();
                blendMode(BLEND);
                fill(35, 20, 45);

                ellipse(x - 4, y - 1, 3, 5);
                ellipse(x + 4, y - 1, 3, 5);

                pop();
            }
        }
        burbuja.posicion.y -= 1;
    });
    pop();

    contedor_burbujas = contedor_burbujas.filter(
        (burbuja) => burbuja.posicion.y >= -15
    );
}

//Funcion asincrona para que el resto del codigo siga cargando mientras se descargan los ficheros
async function configurarMediaPipe() {
    //https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
    //Segun la guia se necesitan dos cosas el wasm y el faceLandMarker
    //les creo unos alias en javascript para que sea mas faciles de recordar
    try {
        const { FaceLandmarker: faceLandmarker, FilesetResolver: ges_ficheros } = await import(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
        );
        const archivos = await ges_ficheros.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        detector_cara = await faceLandmarker.createFromOptions(archivos, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            },
            runningMode: "VIDEO",
            numFaces: 1,
        });
    } catch (error) {
        console.error("erro: " + error);
    }
}

function iniciarCamara() {
    //cuando se pulsa sobre el boton, se desabilita para que no se pueda hacer doble click
    boton_inicio.attribute("disabled", "");
    //se sustituye el el texto mientras carga la camara
    boton_inicio.html("Iniciando el espejo magico, espera…");
    camara = createCapture({ video: true, audio: false }, () => {
        camara_lista = true; //cuando ya tenemos acceso a la camara, cambiamos el texto inicial
        boton_inicio.hide();//ocultamos el boton
        camara.size(camara_ancho, camara_alto); //le ponemos el tamañano a la camara
        camara.hide(); // ocultamos el video para que no salga repetido
    });
}
