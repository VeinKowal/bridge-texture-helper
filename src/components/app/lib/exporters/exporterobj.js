import { FileFormat, GetFileName } from './io/fileutils.js';
import {
  Base64DataURIToArrayBuffer,
  GetFileExtensionFromMimeType
} from './io/bufferutils.js';
import { TextWriter } from './io/textwriter.js';
import { MaterialType } from './model/material.js';
import { ExportedFile, ExporterBase } from './exporterbase.js';
import { Matrix } from './geometry/matrix.js';
import { Transformation } from './geometry/transformation.js';
import { PhongMaterial, TextureMap } from './model/material.js';
import { Model } from './model/model.js';
import { Node } from './model/node.js';
import { FinalizeModel } from './model/modelfinalization.js';
import {
  ConvertThreeColorToColor,
  ConvertThreeGeometryToMesh,
  ThreeLinearToSRGBColorConverter
} from './threejs/threeutils.js';
import * as THREE from 'three';

export class ExporterObj extends ExporterBase {
  constructor() {
    super();
    this.model = new Model();
    this.materialIdToIndex = new Map();
    this.colorConverter = new ThreeLinearToSRGBColorConverter();
  }

  CanExport(format, extension) {
    return format === FileFormat.Text && extension === 'obj';
  }

  ConvertThreeMesh(threeMesh) {
    let mesh = null;
    if (Array.isArray(threeMesh.material)) {
      mesh = ConvertThreeGeometryToMesh(
        threeMesh.geometry,
        null,
        this.colorConverter
      );
      if (
        threeMesh.geometry.attributes.color === undefined ||
        threeMesh.geometry.attributes.color === null
      ) {
        let materialIndices = [];
        for (let i = 0; i < threeMesh.material.length; i++) {
          const material = threeMesh.material[i];
          const materialIndex = this.FindOrCreateMaterial(material);
          materialIndices.push(materialIndex);
        }
        for (let i = 0; i < threeMesh.geometry.groups.length; i++) {
          let group = threeMesh.geometry.groups[i];
          let groupEnd = null;
          if (group.count === Infinity) {
            groupEnd = mesh.TriangleCount();
          } else {
            groupEnd = group.start / 3 + group.count / 3;
          }
          for (let j = group.start / 3; j < groupEnd; j++) {
            let triangle = mesh.GetTriangle(j);
            triangle.SetMaterial(materialIndices[group.materialIndex]);
          }
        }
      }
    } else {
      const materialIndex = this.FindOrCreateMaterial(threeMesh.material);
      mesh = ConvertThreeGeometryToMesh(
        threeMesh.geometry,
        materialIndex,
        this.colorConverter
      );
    }
    if (threeMesh.name !== undefined && threeMesh.name !== null) {
      mesh.SetName(threeMesh.name);
    }
    return mesh;
  }

  FindOrCreateMaterial(threeMaterial) {
    if (this.materialIdToIndex.has(threeMaterial.id)) {
      return this.materialIdToIndex.get(threeMaterial.id);
    }
    let material = this.ConvertThreeMaterial(threeMaterial);
    let materialIndex = null;
    if (material !== null) {
      materialIndex = this.model.AddMaterial(material);
    }
    this.materialIdToIndex.set(threeMaterial.id, materialIndex);
    return materialIndex;
  }

  ConvertThreeMaterial(threeMaterial) {
    function CreateTexture(threeMap, objectUrlToFileName) {
      function GetDataUrl(img) {
        if (img.data !== undefined && img.data !== null) {
          let imageData = new ImageData(img.width, img.height);
          let imageSize = img.width * img.height * 4;
          for (let i = 0; i < imageSize; i++) {
            imageData.data[i] = img.data[i];
          }
          return THREE.ImageUtils.getDataURL(imageData);
        } else {
          return THREE.ImageUtils.getDataURL(img);
        }
      }

      if (threeMap === undefined || threeMap === null) {
        return null;
      }

      if (threeMap.image === undefined || threeMap.image === null) {
        return null;
      }

      try {
        const dataUrl = GetDataUrl(threeMap.image);
        const base64Buffer = Base64DataURIToArrayBuffer(dataUrl);
        let texture = new TextureMap();
        let textureName = null;
        if (objectUrlToFileName.has(threeMap.image.src)) {
          textureName = objectUrlToFileName.get(threeMap.image.src);
        } else if (threeMap.name !== undefined && threeMap.name !== null) {
          textureName =
            threeMap.name +
            '.' +
            GetFileExtensionFromMimeType(base64Buffer.mimeType);
        } else {
          textureName =
            'Embedded_' +
            threeMap.id.toString() +
            '.' +
            GetFileExtensionFromMimeType(base64Buffer.mimeType);
        }
        texture.name = textureName;
        texture.mimeType = base64Buffer.mimeType;
        texture.buffer = base64Buffer.buffer;
        texture.rotation = threeMap.rotation;
        texture.offset.x = threeMap.offset.x;
        texture.offset.y = threeMap.offset.y;
        texture.scale.x = threeMap.repeat.x;
        texture.scale.y = threeMap.repeat.y;
        return texture;
      } catch (err) {
        return null;
      }
    }

    if (threeMaterial.name === THREE.Loader.DEFAULT_MATERIAL_NAME) {
      return null;
    }

    let material = new PhongMaterial();
    material.name = threeMaterial.name;
    material.color = this.ConvertThreeColor(threeMaterial.color);
    material.opacity = threeMaterial.opacity;
    material.transparent = threeMaterial.transparent;
    material.alphaTest = threeMaterial.alphaTest;
    if (threeMaterial.type === 'MeshPhongMaterial') {
      material.specular = this.ConvertThreeColor(threeMaterial.specular);
      material.shininess = threeMaterial.shininess / 100.0;
    }
    material.diffuseMap = CreateTexture(
      threeMaterial.map,
      this.objectUrlToFileName
    );
    material.normalMap = CreateTexture(
      threeMaterial.normalMap,
      this.objectUrlToFileName
    );
    material.bumpMap = CreateTexture(
      threeMaterial.bumpMap,
      this.objectUrlToFileName
    );

    return material;
  }

  ConvertThreeColor(threeColor) {
    if (this.colorConverter !== null) {
      threeColor = this.colorConverter.Convert(threeColor);
    }
    return ConvertThreeColorToColor(threeColor);
  }

  GetObjectTransformation = (threeObject) => {
    let matrix = new Matrix().CreateIdentity();
    threeObject.updateMatrix();
    if (threeObject.matrix !== undefined && threeObject.matrix !== null) {
      matrix.Set(threeObject.matrix.elements);
    }
    return new Transformation(matrix);
  };

  OnThreeObjectsLoaded(loadedObject, exporterModel) {
    const AddObject = (model, threeObject, parentNode) => {
      let node = new Node();
      if (threeObject.name !== undefined) {
        node.SetName(threeObject.name);
      }
      node.SetTransformation(this.GetObjectTransformation(threeObject));
      parentNode.AddChildNode(node);

      for (let childObject of threeObject.children) {
        AddObject(model, childObject, node);
      }
      if (threeObject.isMesh) {
        let mesh = this.ConvertThreeMesh(threeObject);
        let meshIndex = model.AddMesh(mesh);
        node.AddMeshIndex(meshIndex);
      }
    };

    let mainObject = loadedObject;
    let rootNode = exporterModel.GetRootNode();
    rootNode.SetTransformation(this.GetObjectTransformation(mainObject));
    for (let childObject of mainObject.children) {
      AddObject(exporterModel, childObject, rootNode);
    }
  }

  ExportContent(model, format, files, onFinish) {
    this.CanExport(format);
    let exporterModel = model;
    if (model.ovImporter) {
      exporterModel = model.ovImporter?.model;
      const child = model.children[0];
      if (child) {
        const rootNode = exporterModel.GetRootNode();
        rootNode.SetTransformation(this.GetObjectTransformation(child));
      }
    } else {
      exporterModel = this.model;
      this.OnThreeObjectsLoaded(model, exporterModel);
      FinalizeModel(exporterModel, {});
    }
    function WriteTexture(mtlWriter, keyword, texture, files) {
      if (texture === null || !texture.IsValid()) {
        return;
      }
      let fileName = GetFileName(texture.name);
      mtlWriter.WriteArrayLine([keyword, fileName]);

      let fileIndex = files.findIndex((file) => {
        return file.GetName() === fileName;
      });
      if (fileIndex === -1) {
        let textureFile = new ExportedFile(fileName);
        textureFile.SetBufferContent(texture.buffer);
        files.push(textureFile);
      }
    }

    let mtlFile = new ExportedFile('model.mtl');
    let objFile = new ExportedFile('model.obj');

    files.push(mtlFile);
    files.push(objFile);

    let mtlWriter = new TextWriter();
    mtlWriter.WriteLine(this.GetHeaderText());
    for (
      let materialIndex = 0;
      materialIndex < exporterModel.MaterialCount();
      materialIndex++
    ) {
      let material = exporterModel.GetMaterial(materialIndex);
      mtlWriter.WriteArrayLine([
        'newmtl',
        this.GetExportedMaterialName(material.name)
      ]);
      mtlWriter.WriteArrayLine([
        'Kd',
        material.color.r / 255.0,
        material.color.g / 255.0,
        material.color.b / 255.0
      ]);
      mtlWriter.WriteArrayLine(['d', material.opacity]);
      if (material.type === MaterialType.Phong) {
        mtlWriter.WriteArrayLine([
          'Ka',
          material.ambient.r / 255.0,
          material.ambient.g / 255.0,
          material.ambient.b / 255.0
        ]);
        mtlWriter.WriteArrayLine([
          'Ks',
          material.specular.r / 255.0,
          material.specular.g / 255.0,
          material.specular.b / 255.0
        ]);
        mtlWriter.WriteArrayLine(['Ns', material.shininess * 1000.0]);
      }
      WriteTexture(mtlWriter, 'map_Kd', material.diffuseMap, files);
      if (material.type === MaterialType.Phong) {
        WriteTexture(mtlWriter, 'map_Ks', material.specularMap, files);
      }
      WriteTexture(mtlWriter, 'bump', material.bumpMap, files);
    }
    mtlFile.SetTextContent(mtlWriter.GetText());

    let objWriter = new TextWriter();
    objWriter.WriteLine(this.GetHeaderText());
    objWriter.WriteArrayLine(['mtllib', mtlFile.GetName()]);
    let vertexOffset = 0;
    let normalOffset = 0;
    let uvOffset = 0;
    let usedMaterialName = null;
    exporterModel.EnumerateTransformedMeshInstances((mesh) => {
      objWriter.WriteArrayLine(['g', this.GetExportedMeshName(mesh.GetName())]);
      for (
        let vertexIndex = 0;
        vertexIndex < mesh.VertexCount();
        vertexIndex++
      ) {
        let vertex = mesh.GetVertex(vertexIndex);
        objWriter.WriteArrayLine(['v', vertex.x, vertex.y, vertex.z]);
      }
      for (
        let normalIndex = 0;
        normalIndex < mesh.NormalCount();
        normalIndex++
      ) {
        let normal = mesh.GetNormal(normalIndex);
        objWriter.WriteArrayLine(['vn', normal.x, normal.y, normal.z]);
      }
      for (
        let textureUVIndex = 0;
        textureUVIndex < mesh.TextureUVCount();
        textureUVIndex++
      ) {
        let uv = mesh.GetTextureUV(textureUVIndex);
        objWriter.WriteArrayLine(['vt', uv.x, uv.y]);
      }
      for (
        let triangleIndex = 0;
        triangleIndex < mesh.TriangleCount();
        triangleIndex++
      ) {
        let triangle = mesh.GetTriangle(triangleIndex);
        let v0 = triangle.v0 + vertexOffset + 1;
        let v1 = triangle.v1 + vertexOffset + 1;
        let v2 = triangle.v2 + vertexOffset + 1;
        let n0 = triangle.n0 + normalOffset + 1;
        let n1 = triangle.n1 + normalOffset + 1;
        let n2 = triangle.n2 + normalOffset + 1;
        let u0 = '';
        let u1 = '';
        let u2 = '';
        if (triangle.HasTextureUVs()) {
          u0 = triangle.u0 + uvOffset + 1;
          u1 = triangle.u1 + uvOffset + 1;
          u2 = triangle.u2 + uvOffset + 1;
        }
        if (triangle.mat !== null) {
          let material = exporterModel.GetMaterial(triangle.mat);
          let materialName = this.GetExportedMaterialName(material.name);
          if (materialName !== usedMaterialName) {
            objWriter.WriteArrayLine(['usemtl', materialName]);
            usedMaterialName = materialName;
          }
        }
        objWriter.WriteArrayLine([
          'f',
          [v0, u0, n0].join('/'),
          [v1, u1, n1].join('/'),
          [v2, u2, n2].join('/')
        ]);
      }
      for (let lineIndex = 0; lineIndex < mesh.LineCount(); lineIndex++) {
        let line = mesh.GetLine(lineIndex);
        let vertexIndices = [];
        for (
          let vertexIndex = 0;
          vertexIndex < line.vertices.length;
          vertexIndex++
        ) {
          vertexIndices.push(line.vertices[vertexIndex] + vertexOffset + 1);
        }
        if (line.mat !== null) {
          let material = exporterModel.GetMaterial(line.mat);
          let materialName = this.GetExportedMaterialName(material.name);
          if (materialName !== usedMaterialName) {
            objWriter.WriteArrayLine(['usemtl', materialName]);
            usedMaterialName = materialName;
          }
        }
        objWriter.WriteArrayLine(['l', vertexIndices.join(' ')]);
      }
      vertexOffset += mesh.VertexCount();
      normalOffset += mesh.NormalCount();
      uvOffset += mesh.TextureUVCount();
    });

    objFile.SetTextContent(objWriter.GetText());
    onFinish();
  }

  GetHeaderText() {
    return '# exported by https://3dviewer.net';
  }
}
