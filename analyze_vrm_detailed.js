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

function analyzeVRMExtension(filePath, name) {
  console.log(`\n=== Detailed VRM Analysis: ${name} ===`);
  try {
    const gltf = parseVRM(filePath);
    
    if (!gltf.extensions || !gltf.extensions.VRM) {
      console.log('No VRM extension found');
      return;
    }
    
    const vrm = gltf.extensions.VRM;
    
    // Check VRM version
    if (vrm.meta) {
      console.log(`\nVRM Meta:`);
      console.log(`  version: ${vrm.meta.version || 'not specified'}`);
      console.log(`  author: ${vrm.meta.author || 'not specified'}`);
    }
    
    // Check material properties - this is where texture issues often occur
    if (vrm.materialProperties) {
      console.log(`\nVRM Material Properties (${vrm.materialProperties.length}):`);
      vrm.materialProperties.forEach((prop, i) => {
        console.log(`  [${i}] name: ${prop.name || 'unnamed'}`);
        console.log(`    shader: ${prop.shader || 'default'}`);
        console.log(`    renderQueue: ${prop.renderQueue || 'default'}`);
        
        // Check for texture properties that might be null/undefined
        if (prop.textureProperties) {
          const texProps = prop.textureProperties;
          console.log(`    textureProperties:`);
          if (texProps._MainTex !== undefined) console.log(`      _MainTex: ${texProps._MainTex}`);
          if (texProps._BumpMap !== undefined) console.log(`      _BumpMap: ${texProps._BumpMap}`);
          if (texProps._RimTex !== undefined) console.log(`      _RimTex: ${texProps._RimTex}`);
          if (texProps._UvAnimMaskTex !== undefined) console.log(`      _UvAnimMaskTex: ${texProps._UvAnimMaskTex}`);
          if (texProps._OutlineWidthTexture !== undefined) console.log(`      _OutlineWidthTexture: ${texProps._OutlineWidthTexture}`);
          if (texProps._ReceiveShadowTexture !== undefined) console.log(`      _ReceiveShadowTexture: ${texProps._ReceiveShadowTexture}`);
          if (texProps._ShadingGradeTexture !== undefined) console.log(`      _ShadingGradeTexture: ${texProps._ShadingGradeTexture}`);
          if (texProps._MatCapSampler !== undefined) console.log(`      _MatCapSampler: ${texProps._MatCapSampler}`);
          if (texProps._SphereAdd !== undefined) console.log(`      _SphereAdd: ${texProps._SphereAdd}`);
          
          // Check for -1 indices (which indicate no texture)
          Object.entries(texProps).forEach(([key, value]) => {
            if (value === -1) {
              console.log(`      WARNING: ${key} has index -1 (no texture)`);
            }
          });
        }
        
        // Check for vector properties
        if (prop.vectorProperties) {
          console.log(`    vectorProperties: ${JSON.stringify(prop.vectorProperties).substring(0, 100)}...`);
        }
        
        // Check for float properties
        if (prop.floatProperties) {
          console.log(`    floatProperties: ${JSON.stringify(prop.floatProperties).substring(0, 100)}...`);
        }
        
        // Check for color properties
        if (prop.colorProperties) {
          console.log(`    colorProperties: ${JSON.stringify(prop.colorProperties).substring(0, 100)}...`);
        }
        
        // Check for texture offset/tiling
        if (prop.textureOffsetProperties) {
          console.log(`    textureOffsetProperties: ${JSON.stringify(prop.textureOffsetProperties).substring(0, 100)}...`);
        }
        if (prop.textureScaleProperties) {
          console.log(`    textureScaleProperties: ${JSON.stringify(prop.textureScaleProperties).substring(0, 100)}...`);
        }
      });
    }
    
    // Check for firstPerson settings
    if (vrm.firstPerson) {
      console.log(`\nFirst Person Settings:`);
      if (vrm.firstPerson.firstPersonBone) {
        console.log(`  firstPersonBone: ${vrm.firstPerson.firstPersonBone}`);
      }
      if (vrm.firstPerson.meshAnnotations) {
        console.log(`  meshAnnotations: ${vrm.firstPerson.meshAnnotations.length} annotations`);
      }
    }
    
    // Check for blendShapeMaster
    if (vrm.blendShapeMaster) {
      console.log(`\nBlend Shape Master:`);
      if (vrm.blendShapeMaster.blendShapeGroups) {
        console.log(`  blendShapeGroups: ${vrm.blendShapeMaster.blendShapeGroups.length} groups`);
      }
    }
    
    return gltf;
  } catch (error) {
    console.error(`Error parsing ${name}:`, error.message);
    return null;
  }
}

// Analyze all VRM files
const models = [
  { path: 'public/model/Billy.vrm', name: 'Billy' },
  { path: 'public/model/Glenda.vrm', name: 'Glenda' },
  { path: 'public/model/Mega.vrm', name: 'Mega' },
  { path: 'public/model/peach.vrm', name: 'Peach' },
];

models.forEach(model => {
  analyzeVRMExtension(model.path, model.name);
});

// Compare texture properties
console.log('\n\n=== Texture Property Comparison ===');
models.forEach(model => {
  const gltf = parseVRM(model.path);
  if (gltf.extensions && gltf.extensions.VRM && gltf.extensions.VRM.materialProperties) {
    const matProps = gltf.extensions.VRM.materialProperties;
    console.log(`\n${model.name}:`);
    matProps.forEach((prop, i) => {
      if (prop.textureProperties) {
        const texCount = Object.values(prop.textureProperties).filter(v => v !== undefined && v !== -1).length;
        console.log(`  Material ${i} (${prop.name}): ${texCount} active textures`);
        
        // Check for potential issues
        Object.entries(prop.textureProperties).forEach(([key, value]) => {
          if (value !== undefined && value !== -1) {
            // Check if the texture index is valid
            if (gltf.textures && value >= gltf.textures.length) {
              console.log(`    WARNING: ${key} = ${value} (out of bounds, max: ${gltf.textures.length - 1})`);
            }
          }
        });
      }
    });
  }
});
