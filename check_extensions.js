import fs from 'fs';

function parseVRM(filePath) {
  const data = fs.readFileSync(filePath);
  
  const magic = data.slice(0, 4).toString('utf8');
  if (magic !== 'glTF') {
    throw new Error('Not a glTF binary file');
  }
  
  let offset = 12;
  let jsonStr = '';
  
  while (offset < data.length) {
    const chunkLength = data.readUInt32LE(offset);
    const chunkType = data.slice(offset + 4, offset + 8).toString('utf8');
    const chunkData = data.slice(offset + 8, offset + 8 + chunkLength);
    
    if (chunkType === 'JSON') {
      jsonStr = chunkData.toString('utf8');
      break;
    }
    
    offset += 8 + chunkLength;
  }
  
  const gltf = JSON.parse(jsonStr);
  return gltf;
}

const models = [
  { path: 'public/model/Billy.vrm', name: 'Billy' },
  { path: 'public/model/Glenda.vrm', name: 'Glenda' },
  { path: 'public/model/Mega.vrm', name: 'Mega' },
  { path: 'public/model/peach.vrm', name: 'Peach' },
];

console.log('=== Checking VRM Extensions ===\n');

models.forEach(model => {
  console.log(`${model.name}:`);
  try {
    const gltf = parseVRM(model.path);
    
    if (gltf.extensions) {
      console.log(`  Extensions present: ${Object.keys(gltf.extensions).join(', ')}`);
      
      if (gltf.extensions.VRM) {
        console.log(`  VRM extension: PRESENT`);
        const vrm = gltf.extensions.VRM;
        console.log(`    - meta: ${vrm.meta ? 'yes' : 'no'}`);
        console.log(`    - materialProperties: ${vrm.materialProperties ? vrm.materialProperties.length + ' items' : 'no'}`);
        console.log(`    - humanoid: ${vrm.humanoid ? 'yes' : 'no'}`);
        console.log(`    - firstPerson: ${vrm.firstPerson ? 'yes' : 'no'}`);
        console.log(`    - blendShapeMaster: ${vrm.blendShapeMaster ? 'yes' : 'no'}`);
        console.log(`    - secondaryAnimation: ${vrm.secondaryAnimation ? 'yes' : 'no'}`);
      } else {
        console.log(`  VRM extension: MISSING`);
      }
    } else {
      console.log(`  Extensions: NONE`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  console.log('');
});
