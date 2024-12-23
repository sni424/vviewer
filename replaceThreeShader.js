const fs = require('fs');
const path = require('path');

const inputFile = 'threeShader/MeshStandardMaterial.js';
const outputFile = 'threeShader/MeshStandardMaterial_out.glsl';
const threeDir = '/home/stan/study/three';

const allFilesInDir = dir => {
  let files = fs.readdirSync(dir);
  let result = [];
  files.forEach(file => {
    let filePath = path.join(dir, file);
    let stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      result = result.concat(allFilesInDir(filePath));
    } else {
      result.push(filePath);
    }
  });
  return result;
};

const glsls = allFilesInDir(threeDir).filter(file => file.endsWith('.glsl.js'));

// read inputFile to string
let input = fs.readFileSync(inputFile, 'utf8');

// replace #include <file> with file content
glsls.forEach(glsl => {
  let glslContent = fs.readFileSync(glsl, 'utf8');

  // 첫줄과 마지막 두 줄 자르기
  glslContent = glslContent.split('\n').slice(1, -2).join('\n');
  input = input.replace(
    `#include <${path.basename(glsl).replace('.glsl.js', '')}>`,
    `// ${path.basename(glsl)}\n` +
      glslContent +
      `\n// !${path.basename(glsl)}`,
  );
});

// write to outputFile
fs.writeFileSync(outputFile, input);
console.log(`Wrote to ${outputFile}`);

console.log('done');
