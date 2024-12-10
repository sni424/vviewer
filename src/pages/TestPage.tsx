import React from 'react'
import * as THREE from 'three';

type Point = { x: number, y: number };

const points: Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 1 },
    { x: 4, y: 0 },
    { x: 3, y: 4 },
    { x: 1, y: 1 },
    { x: 2, y: 4 }
];

const tests: Point[] = [
    { x: 0.5, y: 0.5 },
    { x: 3, y: 3 },
    { x: 2, y: 2 },
    { x: 3.1, y: 2 },
    { x: 1.1, y: 2 },
    { x: 2, y: 3 }
];

function isPointOnLineSegment(p: Point, v1: Point, v2: Point): boolean {
    const crossProduct = (p.y - v1.y) * (v2.x - v1.x) - (p.x - v1.x) * (v2.y - v1.y);
    if (Math.abs(crossProduct) > 1e-10) return false; // Not on the line
    const dotProduct = (p.x - v1.x) * (v2.x - v1.x) + (p.y - v1.y) * (v2.y - v1.y);
    if (dotProduct < 0) return false; // Before the segment
    const squaredLength = (v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2;
    return dotProduct <= squaredLength; // After the segment
}

function isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
    let count = 0;
    const { x, y } = point;

    for (let i = 0; i < polygon.length; i++) {
        const vertex1 = polygon[i];
        const vertex2 = polygon[(i + 1) % polygon.length];

        // Check if the point lies exactly on the edge
        if (isPointOnLineSegment(point, vertex1, vertex2)) {
            return true; // Point is on the edge
        }

        if ((vertex1.y > y) !== (vertex2.y > y)) {
            const intersectX = (vertex2.x - vertex1.x) * (y - vertex1.y) / (vertex2.y - vertex1.y) + vertex1.x;
            if (x < intersectX) {
                count++;
            }
        }
    }

    return count % 2 === 1; // Odd number of crossings = inside
}

function TestPage() {

    return (
        <div>
            {tests.map((test, i) => {
                return <div>{i + 1}. {isPointInsidePolygon(test, points) ? "true" : "false"}</div>
            })}
        </div>
    )
}

export default TestPage