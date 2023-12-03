import { Vertex } from './copyable/hittable-list.js';
import { vec3 } from 'gl-matrix';
import { isEmpty } from '@tweakpane/core';
import assert from 'assert';

export function readObj(obj: string): [Vertex[], vec3[]] {
  let vertices: vec3[] = [];
  let normals: vec3[] = [];
  // No texture coordinates for the time being
  let faces: vec3[] = [];

  obj.split('\n').forEach((line, i) => {
    const split = line.split(' ');
    let coordinates: number[];
    switch (split[0]) {
      case 'v':
        coordinates = split.slice(1, 4).map(parseFloat);
        vertices.push([coordinates[0], coordinates[1], coordinates[2]]);
        break;
      case 'vn':
        coordinates = split.slice(1, 4).map(parseFloat);
        normals.push([coordinates[0], coordinates[1], coordinates[2]]);
        break;
      case 'f':
        // For now, we'll ignore everything except the actual vertex coordinate
        let vertexIndices = split
          // Get the numbered portion
          .slice(1, 4)
          // Split each numbered portion, removing any
          .map(x => x.split('/'))
          // For now, just get the face index
          .map(x => x[0])
          // Parse it as an integer
          .map(x => parseInt(x))
          // Subtract one to get a zero-indexed number
          .map(x => x - 1);
        faces.push([vertexIndices[0], vertexIndices[1], vertexIndices[2]]);
        break;
    }
  });

  // For now, just do the face and ignore normals/texture mapping
  let lol: Vertex[] = vertices.map(v => {
    let x: Vertex = { px: v[0], py: v[1], pz: v[2] };
    return x;
  });
  return [lol, faces];
}
