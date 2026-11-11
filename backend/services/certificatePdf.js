const path = require('node:path');
const { existsSync } = require('node:fs');
const sharp = require('sharp');

const template = path.join(__dirname, '../assets/certificate-template.jpg');
const fontPath = file => path.join(__dirname, '../assets/certificate-fonts', file);
const corsiva = process.env.CERTIFICATE_CORSIVA_FONT ||
  (process.platform === 'win32' ? path.join(process.env.WINDIR || 'C:/Windows', 'Fonts', 'MTCORSVA.TTF') : '');
const nameFont = corsiva && existsSync(corsiva)
  ? ['Monotype Corsiva 50', corsiva]
  : ['Tangerine Bold 50', fontPath('Tangerine-Bold.ttf')];
const courseFont = ['Open Sans Bold 27', fontPath('OpenSans.ttf')];
const footerFont = ['Poppins 8.3', fontPath('Poppins-Regular.ttf')];
const scale = 1654 / 849;
const timeZone = 'Africa/Nairobi';
const yearFormat = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone });
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone,
});

const certificateYear = date => yearFormat.format(date);
const escape = value => String(value).replace(/[&<>]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;',
}[char]));

async function label(value, [font, fontfile], color, x, y, width, height) {
  const maxWidth = Math.round(width * scale);
  const maxHeight = Math.round(height * scale);
  const rendered = await sharp({ text: {
    text: `<span foreground="${color}">${escape(value)}</span>`,
    font, fontfile, dpi: 200, rgba: true,
  } }).png().toBuffer();
  const { data, info } = await sharp(rendered).resize({
    width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true,
  }).png().toBuffer({ resolveWithObject: true });
  return {
    input: data,
    left: Math.round(x * scale + (maxWidth - info.width) / 2),
    top: Math.round(y * scale + (maxHeight - info.height) / 2),
  };
}

function pdfWithImage(jpeg, width, height) {
  const stream = Buffer.from('q 595.276 0 0 841.89 0 0 cm /Artwork Do Q\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Artwork 4 0 R >> >> /Contents 5 0 R >>',
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from('endstream')]),
  ];
  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets = ['0000000000 65535 f \n'];
  objects.forEach((object, index) => {
    offsets.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), Buffer.from(object), Buffer.from('\nendobj\n')]);
    chunks.push(chunk);
    offset += chunk.length;
  });
  chunks.push(Buffer.from(`xref\n0 ${offsets.length}\n${offsets.join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`));
  return Buffer.concat(chunks);
}

async function renderCertificatePdf(certificate) {
  const ink = '#231f20';
  const date = dateFormat.formatToParts(certificate.awardedAt);
  const part = type => date.find(item => item.type === type).value;
  const day = Number(part('day'));
  const ordinal = day >= 11 && day <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
  const line = (value, x, y, width) => label(value, footerFont, ink, x, y, width, 15);
  const layers = await Promise.all([
    label(certificate.studentName, nameFont, ink, 85, 686, 679, 68),
    label(certificate.courseTitle, courseFont, ink, 65, 852, 719, 54),
    line(`Awarded: ${part('month')}`, 253, 1049, 173),
    line(`${day}${ordinal}, ${part('year')}`, 253, 1064, 173),
    line('Course Credit:', 442, 1049, 164),
    line(`${certificate.creditHours} hours`, 442, 1064, 164),
    line('Certificate No:', 617, 1049, 185),
    line(certificate.certificateNo, 617, 1064, 185),
  ]);
  const { data, info } = await sharp(template).composite(layers)
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toBuffer({ resolveWithObject: true });
  return pdfWithImage(data, info.width, info.height);
}

module.exports = { certificateYear, renderCertificatePdf };
