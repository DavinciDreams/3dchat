import fs from 'fs';

function parseVRM(filePath) {
  const data = fs.readFileSync(filePath);
  
  // glTF binary format:
  // - 12-byte header: magic (4 bytes), version (4 bytes), length (4 bytes)
  // - Chunks: chunkLength (4 bytes), chunkType (4 bytes), chunkData
  
  const magic = data.slice(0, 4).toString('utf8');
  if (magic !== 'glTF') {
    throw new Error('Not a glTF binary file');
  }
  
  const version = data.readUInt32LE(4);
  const totalLength = data.readUInt32LE(8);
  
  console.log(`  glTF version: ${version}, total length: ${totalLength}`);
  
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

function analyzeVRM(filePath, name) {
  console.log(`\n=== Analyzing ${name} ===`);
  try {
    const gltf = parseVRM(filePath);
    
    console.log(`Generator: ${gltf.asset?.generator || 'Unknown'}`);
    console.log(`Version: ${gltf.asset?.version || 'Unknown'}`);
    
    // Check textures
    if (gltf.textures) {
      console.log(`\nTextures (${gltf.textures.length}):`);
      gltf.textures.forEach((tex, i) => {
        console.log(`  [${i}] source: ${tex.source}, sampler: ${tex.sampler || 'default'}`);
        // Check for extensions
        if (tex.extensions) {
          console.log(`    Extensions: ${Object.keys(tex.extensions).join(', ')}`);
        }
      });
    } else {
      console.log('\nNo textures found');
    }
    
    // Check images
    if (gltf.images) {
      console.log(`\nImages (${gltf.images.length}):`);
      gltf.images.forEach((img, i) => {
        console.log(`  [${i}] bufferView: ${img.bufferView}, mimeType: ${img.mimeType || 'unknown'}`);
        if (img.name) console.log(`    name: ${img.name}`);
        if (img.uri) console.log(`    uri: ${img.uri}`);
      });
    }
    
    // Check materials
    if (gltf.materials) {
      console.log(`\nMaterials (${gltf.materials.length}):`);
      gltf.materials.forEach((mat, i) => {
        console.log(`  [${i}] name: ${mat.name || 'unnamed'}`);
        if (mat.pbrMetallicRoughness) {
          const pbr = mat.pbrMetallicRoughness;
          if (pbr.baseColorTexture) console.log(`    baseColorTexture: index=${pbr.baseColorTexture.index}`);
          if (pbr.metallicRoughnessTexture) console.log(`    metallicRoughnessTexture: index=${pbr.metallicRoughnessTexture.index}`);
        }
        if (mat.normalTexture) console.log(`    normalTexture: index=${mat.normalTexture.index}`);
        if (mat.emissiveTexture) console.log(`    emissiveTexture: index=${mat.emissiveTexture.index}`);
        if (mat.occlusionTexture) console.log(`    occlusionTexture: index=${mat.occlusionTexture.index}`);
      });
    }
    
    // Check VRM extension
    if (gltf.extensions && gltf.extensions.VRM) {
      console.log('\nVRM Extension found');
      const vrm = gltf.extensions.VRM;
      if (vrm.materialProperties) {
        console.log(`  Material properties: ${vrm.materialProperties.length} materials`);
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

const results = {};
models.forEach(model => {
  results[model.name] = analyzeVRM(model.path, model.name);
});

// Compare texture counts
console.log('\n\n=== Texture Count Comparison ===');
models.forEach(model => {
  const texCount = results[model.name]?.textures?.length || 0;
  const imgCount = results[model.name]?.images?.length || 0;
  console.log(`${model.name}: ${texCount} textures, ${imgCount} images`);
});

// Check for potential issues
console.log('\n\n=== Potential Issues ===');
models.forEach(model => {
  const gltf = results[model.name];
  if (!gltf) return;
  
  // Check for texture indices that might be out of bounds
  if (gltf.textures && gltf.images) {
    gltf.textures.forEach((tex, i) => {
      if (tex.source !== undefined && tex.source >= gltf.images.length) {
        console.log(`${model.name}: Texture ${i} has source index ${tex.source} but only ${gltf.images.length} images exist`);
      }
    });
  }
  
  // Check materials for invalid texture references
  if (gltf.materials && gltf.textures) {
    gltf.materials.forEach((mat, i) => {
      const checkTex = (texRef, name) => {
        if (texRef && texRef.index !== undefined && texRef.index >= gltf.textures.length) {
          console.log(`${model.name}: Material ${i} (${mat.name}) ${name} references texture ${texRef.index} but only ${gltf.textures.length} textures exist`);
        }
      };
      
      if (mat.pbrMetallicRoughness) {
        checkTex(mat.pbrMetallicRoughness.baseColorTexture, 'baseColorTexture');
        checkTex(mat.pbrMetallicRoughness.metallicRoughnessTexture, 'metallicRoughnessTexture');
      }
      checkTex(mat.normalTexture, 'normalTexture');
      checkTex(mat.emissiveTexture, 'emissiveTexture');
      checkTex(mat.occlusionTexture, 'occlusionTexture');
    });
  }
});
