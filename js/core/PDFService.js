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

    // --- AUDITORÍA EXTENSA EN CONSOLA (OFUSCADA SIN DATOS SENSIBLES) ---
    console.group("[SYS-F9A1]");

    console.group("[SYS-Q1B7]");
    console.log("[SYS-3E8D]", qrValido ? 1 : 0);
    console.groupEnd();

    console.group("[SYS-H8C3]");
    console.log("[SYS-8X1A]", tieneNombre ? 1 : 0);
    console.log("[SYS-6T2N]", tieneMatricula ? 1 : 0);
    console.groupEnd();

    console.group("[SYS-J7D2]");
    console.log("[SYS-4P0S]", tieneActividad ? 1 : 0);
    console.log("[SYS-9K3E]", tieneCarrera ? 1 : 0);
    console.groupEnd();

    const resultadoFinal =
      qrValido &&
      tieneNombre &&
      tieneMatricula &&
      tieneActividad &&
      tieneCarrera;

    console.log("[SYS-Z9X0]", resultadoFinal ? 1 : 0);

    console.groupEnd();

    return resultadoFinal;
  }
}
