const cloudinary = require('cloudinary').v2;

const subirMenu = async (fileBuffer, nombreNegocio) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

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

module.exports = { subirMenu };