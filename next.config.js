/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@opendocsg/pdf2md', '@hyzyla/pdfium'],
};

module.exports = nextConfig;
