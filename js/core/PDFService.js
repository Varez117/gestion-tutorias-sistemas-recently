// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

export class PDFService {
  static VALID_PREFIX =
    "https://verificador.ambar.tecnm.mx/v/APIZACO/CONSTANCIACUMPLIMIENTO/";

  static normalizeText(text) {
    if (!text) return "";
    return text
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  static async scanQRCode(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    return qrResult ? qrResult.data : null;
  }

  static async extractText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    return textContent.items.map((item) => item.str).join(" ");
  }

  static validateData(qrData, pdfTextRaw, alumno, actividadNombre) {
    const pdfText = this.normalizeText(pdfTextRaw);
    const nombreCompleto = this.normalizeText(alumno.nombre);
    const palabras = nombreCompleto.split(" ");
    const n = palabras.length;

    const nombresArr = palabras.slice(0, n - 2);
    const apellidosArr = palabras.slice(n - 2);

    const ordenNatural = palabras.join(" ");
    const ordenInverso = [...apellidosArr, ...nombresArr].join(" ");
    const ordenInversoComa =
      apellidosArr.join(" ") + ", " + nombresArr.join(" ");

    // Validaciones lógicas
    const qrValido = qrData && qrData.startsWith(this.VALID_PREFIX);
    const tieneNombre =
      pdfText.includes(ordenNatural) ||
      pdfText.includes(ordenInverso) ||
      pdfText.includes(this.normalizeText(ordenInversoComa));
    const tieneMatricula = pdfText.includes(
      this.normalizeText(alumno.matricula),
    );
    const tieneActividad = pdfText.includes(
      this.normalizeText(actividadNombre),
    );
    const tieneCarrera =
      pdfText.includes(this.normalizeText(alumno.carrera)) ||
      pdfText.includes(
        this.normalizeText("TECNOLOGIAS DE LA INFORMACION Y COMUNICACION"),
      );

    // --- AUDITORÍA EXTENSA EN CONSOLA ---
    console.group(
      "%c AUDITORÍA TÉCNICA DE DOCUMENTO ",
      "background: #1e293b; color: #38bdf8; font-size: 14px; padding: 4px;",
    );

    console.group("🔍 1. ANÁLISIS DE CÓDIGO QR");
    console.log(
      `- Datos crudos: ${(qrData || "%cNO DETECTADO", "color: red")}`,
    );
    console.log(`- Prefijo Requerido: ${this.VALID_PREFIX}`);
    console.log(
      `- Estado: ${qrValido ? "✅ AUTÉNTICO" : "❌ INVÁLIDO O EXTERNO"}`,
    );
    console.groupEnd();

    console.group("👤 2. VERIFICACIÓN DE IDENTIDAD");
    console.log(`- Nombre esperado: "${ordenNatural}" o "${ordenInverso}"`);
    console.log(`- Matrícula: "${alumno.matricula}"`);
    console.log(`- Match Nombre: ${tieneNombre ? "✅" : "❌"}`);
    console.log(`- Match Matrícula: ${tieneMatricula ? "✅" : "❌"}`);
    console.groupEnd();

    console.group("📋 3. CONTEXTO ACADÉMICO");
    console.log(`- Actividad: "${actividadNombre}"`);
    console.log(`- Carrera: "${alumno.carrera}"`);
    console.log(`- Match Actividad: ${tieneActividad ? "✅" : "❌"}`);
    console.log(`- Match Carrera: ${tieneCarrera ? "✅" : "❌"}`);
    console.groupEnd();

    const resultadoFinal =
      qrValido &&
      tieneNombre &&
      tieneMatricula &&
      tieneActividad &&
      tieneCarrera;
    console.log(
      `%c CONCLUSIÓN FINAL: ${resultadoFinal ? "DOCUMENTO VÁLIDO" : "DOCUMENTO RECHAZADO"} `,
      `background: ${resultadoFinal ? "#065f46" : "#991b1b"}; color: white; font-weight: bold; border-radius: 4px; padding: 2px 10px;`,
    );

    console.groupEnd();

    return resultadoFinal;
  }
}
