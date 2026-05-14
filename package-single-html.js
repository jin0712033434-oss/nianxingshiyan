const fs = require('fs');
const path = require('path');

console.log('开始打包单个 HTML 文件...');

// 读取源文件
const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'main.css');
const jsPath = path.join(__dirname, 'src', 'main.js');

let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
let cssContent = fs.readFileSync(cssPath, 'utf-8');
let jsContent = fs.readFileSync(jsPath, 'utf-8');

// 1. 将 CSS 内联到 HTML 中
htmlContent = htmlContent.replace(
  /<link\s+rel="stylesheet"\s+href="[^"]*main\.css["'][^>]*>/gi,
  `<style>\n${cssContent}\n</style>`
);

// 2. 移除 Vite 构建的 script 标签（如果有）
htmlContent = htmlContent.replace(
  /<script\s+[^>]*src=["'][^"']*assets\/[^"']*\.js["'][^>]*><\/script>/gi,
  ''
);

// 3. 移除 src="/src/main.js" 的标签（如果有）
htmlContent = htmlContent.replace(
  /<script\s+[^>]*src=["'][^"']*\/src\/main\.js["'][^>]*><\/script>/gi,
  ''
);

// 4. 将 main.js 的内容内联到 HTML 中
const inlineScript = `\n<script>\n${jsContent}\n</script>\n`;
htmlContent = htmlContent.replace('</body>', `${inlineScript}</body>`);

// 5. 确保 UTF-8 编码
if (!htmlContent.includes('charset="UTF-8"')) {
  htmlContent = htmlContent.replace(
    '<head>',
    '<head>\n  <meta charset="UTF-8" />'
  );
}

// 6. 输出打包后的文件
const outputPath = path.join(__dirname, 'dist', '黏性现象仿真模拟器.html');
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
}

fs.writeFileSync(outputPath, htmlContent, 'utf-8');

console.log('✅ 打包完成!');
console.log(`📄 输出文件: ${outputPath}`);
console.log(`📊 文件大小: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
