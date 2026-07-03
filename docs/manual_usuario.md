# Manual de Usuario — Plataforma de Corrección Académica Asistida por IA

---

## 1. Introducción

### 1.1 Objetivo de la aplicación

La **Plataforma de Corrección Académica (Academic Correction Platform)** es una herramienta web diseñada para asistir a docentes y evaluadores en el proceso de corrección de informes académicos y trabajos escritos en español. Utiliza inteligencia artificial (IA) para detectar automáticamente errores en siete categorías definidas por una rúbrica de escritura científica, y permite al evaluador revisar, aceptar o rechazar cada detección, realizar anotaciones manuales sobre el documento y exportar un PDF completamente anotado.

### 1.2 Público objetivo

- **Profesores universitarios** que corrigen informes, tesis o trabajos finales.
- **Ayudantes de cátedra** y **asistentes académicos** que participan en el proceso de evaluación.
- **Evaluadores externos** y **revisores** de documentos académicos en español.

### 1.3 Requisitos del sistema

- Navegador web moderno: Google Chrome (recomendado), Mozilla Firefox, Microsoft Edge.
- Conexión a internet (para el análisis por IA y funcionamiento general).
- Clave API de Groq (opcional; sin ella el sistema usa datos de demostración simulados).
- Resolución de pantalla recomendada: 1280×720 píxeles o superior.

---

## 2. Primeros pasos

### 2.1 Acceso a la plataforma

1. Abra la aplicación en su navegador.
2. En la pantalla de inicio de sesión, ingrese las siguientes credenciales de demostración:
   - **Correo electrónico:** `escritura@uandes.cl`
   - **Contraseña:** `UANDES2020`
3. Haga clic en el botón **"Sign In"**.

> **Nota:** La autenticación actual es simulada. En futuras versiones se integrará un sistema de autenticación real.

### 2.2 Carga de un documento PDF

1. Una vez autenticado, verá la pantalla **"Document Ingestion"**.
2. Haga clic en el área punteada para seleccionar un archivo PDF desde su computadora.
3. Solo se aceptan archivos con extensión `.pdf`.
4. Una vez seleccionado, se mostrará el nombre y tamaño del archivo.
5. Haga clic en **"Proceed to Workspace"** para comenzar la corrección.
6. Espere unos segundos mientras el sistema procesa el documento y extrae sus páginas.

### 2.3 Navegación entre pantallas

| Pantalla | Descripción | Cómo llegar |
|---|---|---|
| **Login** | Inicio de sesión | Al cargar la aplicación |
| **Upload** | Carga de documento | Tras iniciar sesión |
| **Workspace** | Corrección del documento | Tras cargar un PDF |
| **Summary** | Resumen y exportación | Botón "View Evaluation Summary" en la barra superior |

Para volver a la pantalla anterior, use los botones **"← Back"** o **"Return to Workspace"** disponibles en cada pantalla.

---

## 3. Interfaz de trabajo (Workspace)

La pantalla de trabajo se divide en tres áreas principales:

```
┌─────────────────────────────────────────────────────────────┐
│  Barra superior: nombre del documento │ [Summary] [New Doc] │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│  Panel de    │    Visor de PDF              │  Panel de     │
│  control     │    (3 capas)                 │  estadísticas │
│  izquierdo   │                              │  derecho      │
│              │                              │               │
│  - Analizar  │  Capa 1: PDF renderizado     │  - Barras por │
│  - Errores   │  Capa 2: Texto + resaltados  │    categoría  │
│  - Paginador │  Capa 3: Lápiz               │  - Registro   │
│              │                              │    manual     │
└──────────────┴──────────────────────────────┴───────────────┘
```

### 3.1 Panel de control izquierdo

#### 3.1.1 Analizar página

- Haga clic en el botón **"Analizar"** para ejecutar la detección automática de errores en la página actual.
- El sistema analiza el texto de la página según las 7 categorías de la rúbrica.
- Al finalizar, los errores detectados aparecerán listados bajo la sección **"Error Registry — Page N"**.
- El análisis se realiza página por página. Debe ejecutarlo en cada página que desee revisar.

#### 3.1.2 Lista de errores

Cada error detectado se muestra como una tarjeta con la siguiente información:

- **Severidad:** `minor` (leve), `moderate` (moderado) o `major` (grave), indicada con un color:
  - Amarillo: leve
  - Azul claro: moderado
  - Rojo claro: grave
- **Categoría de la rúbrica:** etiqueta que indica a qué criterio pertenece el error.
- **Descripción del error:** texto explicativo del problema detectado.
- **Texto original:** fragmento del documento donde se encontró el error (en cursiva y fondo oscuro).
- **Sugerencia:** texto corregido sugerido por la IA (en verde cursiva).
- **Botones de acción:**
  - **Accept:** acepta el error como válido. Se resalta automáticamente en el PDF.
  - **Reject:** rechaza el error como falso positivo. Se descarta del registro.

Una vez que un error es aceptado o rechazado, la tarjeta se muestra semi-transparente y los botones de acción desaparecen.

#### 3.1.3 Paginación

En la parte inferior del panel izquierdo se encuentra el control de paginación:

- **← Previous / Next →:** avanza o retrocede una página.
- **Campo numérico + Go:** permite saltar directamente a una página específica.
- Se muestra el número total de páginas del documento (ej. `5 / 20`).

### 3.2 Visor de PDF central

El visor de PDF se compone de tres capas superpuestas:

#### Capa 1: Renderizado del PDF
Muestra la página del PDF a alta resolución (escala 1.5x), con un ancho máximo de 700 píxeles.

#### Capa 2: Texto y resaltados
- Capa transparente que contiene el texto extraído del PDF.
- Cuando **acepta un error**, el texto correspondiente se resalta automáticamente con el color de su categoría.
- Los **resaltados manuales** (consulte la sección 3.2.2) también se muestran aquí.

#### Capa 3: Anotaciones con lápiz (Pen)
Capa superior para dibujo libre. Se activa mediante los botones en la esquina superior izquierda del visor.

#### 3.2.1 Navegación en el visor
En la parte superior del visor hay controles de navegación rápida (◀ ▶) y se indica la página actual: "Folio N of M".

#### 3.2.2 Herramientas de anotación

**Lápiz (Annotation Pen)**
1. Haga clic en **"Activate Annotation Pen"** (el botón se vuelve rojo).
2. Dibuje libremente sobre el PDF manteniendo presionado el botón del mouse y moviendo el cursor.
3. Para desactivar, haga clic en **"Deactivate Annotation Pen"**.
4. Para deshacer el último trazo, haga clic en **"Revert Annotation (N)"**, donde N es el número de trazos en la página actual.

**Resaltado de texto (Highlight Mode)**
- Actualmente en desarrollo. Cuando esté disponible, podrá activar **"Activate Highlight Mode"**, seleccionar texto con el mouse y se creará un resaltado rectangular.

### 3.3 Panel de estadísticas derecho

#### 3.3.1 Estadísticas por criterio
- Muestra un gráfico de barras con la cantidad de errores **aceptados** por cada categoría de la rúbrica.
- Las barras se colorean según la importancia de la categoría (rojo = alta, naranjo = media).
- En la parte superior se muestran dos indicadores rápidos: **Aceptados** (total de errores aceptados) y **Anotaciones** (trazos + resaltados en la página actual).

#### 3.3.2 Colapsar panel
Haga clic en el botón **"›"** para colapsar el panel y ganar espacio para el visor. Para expandirlo nuevamente, haga clic en **"Stats"**.

#### 3.3.3 Registro manual de errores
Puede agregar errores manualmente sin depender de la detección por IA:

1. Seleccione una **categoría** de la rúbrica.
2. Seleccione la **severidad**: Leve / Moderado / Grave.
3. (Opcional) Escriba una **nota** descriptiva.
4. Haga clic en **"Agregar Entrada Manual"**.
5. El error se agrega al registro de errores aceptados y se refleja en las estadísticas.

Las entradas manuales aparecen listadas al final del panel, con opción a **Eliminar** cada una.

---

## 4. Flujo de corrección paso a paso

### Escenario 1: Corrección rápida

1. Cargue el documento PDF.
2. En la primera página, haga clic en **"Analizar"**.
3. Revise los errores detectados:
   - **Accept** para los errores válidos.
   - **Reject** para los falsos positivos.
4. Use **Next →** para ir a la página siguiente y repita los pasos 2-3.
5. Cuando haya terminado todas las páginas, haga clic en **"View Evaluation Summary"**.
6. Revise las métricas, genere el análisis de rendimiento (opcional) y haga clic en **"Make Report"** para descargar el PDF anotado.

### Escenario 2: Corrección con anotaciones manuales

1. Siga los pasos del Escenario 1.
2. Mientras revisa una página, active el **lápiz** y dibuje correcciones o marcas adicionales sobre el PDF.
3. Use el **registro manual** en el panel derecho para agregar errores que la IA no detectó.
4. Continúe con el resumen y exportación como en el Escenario 1.

### Escenario 3: Revisión selectiva

1. Cargue el documento y use el paginador para saltar directamente a una página específica.
2. Analice solo las páginas que le interesa revisar.
3. Acepte o rechace errores según su criterio.
4. Vaya al resumen para visualizar las estadísticas parciales.

---

## 5. Resumen y exportación

### 5.1 Pantalla de resumen (Summary)

Al hacer clic en **"View Evaluation Summary"** se muestra:

- **Métricas generales:** cuatro tarjetas con:
  - Correcciones aceptadas
  - Correcciones rechazadas
  - Anotaciones manuales (trazos + resaltados)
  - Tamaño del documento
- **Distribución por severidad:** conteo de errores aceptados por nivel de gravedad.
- **Análisis de rendimiento:** generado por IA (ver sección 5.2).
- **Exportación de PDF:** botón "Make Report" (ver sección 5.3).

### 5.2 Generar análisis de rendimiento con IA

1. Asegúrese de tener al menos un error aceptado.
2. Haga clic en **"Generate Performance Analysis"**.
3. Espere mientras la IA genera un informe estructurado en español que incluye:
   - Resumen general del desempeño.
   - Análisis por criterio de la rúbrica.
   - Recomendaciones pedagógicas específicas.
   - Áreas de mejora priorizadas.
4. El informe se renderiza como texto formateado en la misma pantalla.

### 5.3 Exportar PDF anotado

1. Haga clic en **"Make Report"**.
2. Espere mientras el sistema genera el PDF final con todas las anotaciones.
3. El navegador descargará automáticamente un archivo llamado `annotated_report_YYYY-MM-DD.pdf`.
4. El PDF exportado incluye:
   - Trazos de lápiz incrustados en las páginas correspondientes.
   - Resaltados de texto (manuales y automáticos por errores aceptados).
   - Barras de color en el margen inferior de cada texto resaltado, según la categoría del error.

---

## 6. Rúbrica de corrección

La plataforma evalúa los documentos según 7 categorías. Las categorías marcadas como **importancia alta** tienen mayor peso en la evaluación:

| ID | Categoría | Importancia | Descripción |
|---|---|---|---|
| `cientifica` | Estructura Científica | Alta | Secciones del informe: resumen, índice, introducción, objetivo general y específicos, metodología, resultados, conclusión y bibliografía. |
| `coherencia` | Coherencia | Alta | Orden lógico de las ideas, párrafos con máximo 1 idea principal. |
| `cohesion` | Cohesión | Alta | Uso de conectores, correferencia, marcadores discursivos y puntuación. |
| `resultados` | Exposición de Resultados | Alta | Explicación de resultados, relación con objetivos y metodología, uso de tablas/figuras. |
| `referencias` | Referencias | Alta | Atribución de fuentes, confiabilidad, estilo Harvard. |
| `gramatica` | Adecuación y Gramática | Media | Registro académico formal, vocabulario preciso, voz impersonal, núcleo verbal. |
| `ortografia` | Formato y Ortografía | Media | Portada, contraportada, tipografía, interlineado, márgenes, ortografía literal y acentual. |

---

## 7. Limitaciones conocidas

1. **Autenticación simulada:** el inicio de sesión usa credenciales fijas de demostración. No hay registro de usuarios ni backend real.
2. **Dependencia de API externa:** el análisis por IA requiere una clave API de Groq configurada en el archivo `.env`. Sin ella, el sistema usa datos simulados (mock).
3. **Análisis página por página:** la detección de errores se ejecuta sobre cada página individualmente, no como un análisis global del documento completo.
4. **Resaltado de texto manual:** la funcionalidad de resaltado manual (Highlight Mode) está desactivada en la interfaz actual. Solo están disponibles los resaltados automáticos de errores aceptados.
5. **Persistencia en sesión:** los datos de corrección se almacenan en `sessionStorage`. Se pierden al cerrar la pestaña del navegador.
6. **Precisión del text-mapping:** los resaltados automáticos de errores aceptados dependen de la precisión con que PDF.js extrae las posiciones del texto. En documentos escaneados o con formatos complejos, el resaltado puede no alinearse correctamente.
7. **Tamaño de documento:** documentos PDF muy grandes (más de 50 páginas) pueden afectar el rendimiento.
8. **Sin historial de estudiantes:** la herramienta no guarda un historial de correcciones anteriores por estudiante.
9. **Sin integración con Excel:** la exportación de datos a formato de hoja de cálculo no está implementada.

---

## 8. Solución de problemas frecuentes

| Problema | Posible causa | Solución |
|---|---|---|
| No se carga el PDF | Archivo muy grande o dañado | Verifique que el PDF sea válido y no supere los 50 MB |
| El análisis no detecta errores | Sin conexión a internet / sin clave API | Verifique su conexión y que la clave API de Groq esté configurada |
| "Error durante el analisis" | Error de comunicación con la API | Intente nuevamente. Si persiste, verifique la clave API |
| Los resaltados no coinciden con el texto | Formato PDF complejo o escaneado | Use el lápiz para anotaciones manuales como alternativa |
| Se perdieron los datos al recargar | Límite de sessionStorage | No recargue la página durante la sesión de corrección |
| El PDF exportado no tiene anotaciones | No se aceptaron errores ni se dibujaron trazos | Acepte al menos un error o dibuje trazos antes de exportar |

---

*Documento generado para la Plataforma de Corrección Académica Asistida por IA — Versión 1.0*
