const cloudinary = require('cloudinary').v2;
const { PDFDocument } = require('pdf-lib');

const configurar = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
};

const subirMenu = async (fileBuffer, nombreNegocio) => {
  configurar();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'conocecr/menus',
        public_id: `${Date.now()}-${nombreNegocio.replace(/\s+/g, '_')}`,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('Error completo de Cloudinary:', JSON.stringify(error, null, 2));
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(fileBuffer);
  });
};

// Cuenta las páginas de un PDF (para saber cuántas imágenes pedirle a Cloudinary)
const contarPaginasPDF = async (fileBuffer) => {
  try {
    const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch (e) {
    console.error('No se pudo leer el PDF:', e.message);
    return 1;
  }
};

const MAX_PAGINAS = 5;

// Devuelve las URLs de imagen que gpt-4o puede "ver".
// Si es imagen: la URL tal cual. Si es PDF: una URL JPG por página (Cloudinary convierte al vuelo).
const obtenerImagenesDelMenu = async (menuUrl, fileBuffer) => {
  const esPDF = menuUrl.toLowerCase().endsWith('.pdf');

  if (!esPDF) return [menuUrl];

  let paginas = 1;
  if (fileBuffer) {
    paginas = await contarPaginasPDF(fileBuffer);
  }
  paginas = Math.min(paginas, MAX_PAGINAS);

  const urls = [];
  for (let i = 1; i <= paginas; i++) {
    // Cloudinary: pg_N selecciona la página, y cambiar la extensión a .jpg la convierte
    const urlPagina = menuUrl
      .replace('/upload/', `/upload/pg_${i}/`)
      .replace(/\.pdf$/i, '.jpg');
    urls.push(urlPagina);
  }
  return urls;
};

module.exports = { subirMenu, obtenerImagenesDelMenu, contarPaginasPDF };